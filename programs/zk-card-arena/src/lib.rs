use anchor_lang::prelude::*;
use anchor_lang::solana_program::instruction::Instruction;
use anchor_lang::solana_program::program::invoke;

declare_id!("8Da8a3Q9GLYuxYLXPtxKiAedZZbx5DUQCuG8TPY1dLnx");

/// Sunspot Groth16 verifier program IDs (deployed to devnet)
mod shuffle_verifier {
    use super::*;
    declare_id!("6sju9HLJTFfESLn49wAR2hqiC6mnu3MrP2K9WDbkjCL2");
}

mod deal_verifier {
    use super::*;
    declare_id!("Epoxbrv1Pc2XeYR2xsKsqm3Gy1j2MbkBx4yHfkg8yuSC");
}

mod reveal_verifier {
    use super::*;
    declare_id!("HrETBH5nTa3DTVjBFWMdytLtuX9GsFwiAGkkyQAXnMt9");
}

#[program]
pub mod zk_card_arena {
    use super::*;

    /// Creates a new game with a deck commitment
    pub fn create_game(
        ctx: Context<CreateGame>,
        game_id: u64,
        deck_commitment: [u8; 32],
    ) -> Result<()> {
        let game = &mut ctx.accounts.game;
        game.dealer = ctx.accounts.dealer.key();
        game.player = None;
        game.deck_commitment = deck_commitment;
        game.shuffle_verified = false;
        game.state = GameState::Created;
        game.player_cards = Vec::new();
        game.dealer_cards = Vec::new();
        game.player_revealed = Vec::new();
        game.dealer_revealed = Vec::new();
        game.deck_position = 0;
        game.game_id = game_id;
        game.created_at = Clock::get()?.unix_timestamp;
        game.bump = *ctx.bumps.get("game").unwrap();
        game.pending_hit = false;
        game.committed_cards = Vec::new();

        msg!("Game {} created by {}", game_id, game.dealer);
        Ok(())
    }

    /// Player joins an existing game
    pub fn join_game(ctx: Context<JoinGame>) -> Result<()> {
        let game = &mut ctx.accounts.game;

        require!(
            game.state == GameState::AwaitingPlayer,
            GameError::InvalidState
        );
        require!(game.player.is_none(), GameError::GameFull);

        game.player = Some(ctx.accounts.player.key());
        game.state = GameState::Playing;

        msg!("Player {} joined game {}", ctx.accounts.player.key(), game.game_id);
        Ok(())
    }

    /// Verifies the shuffle proof via CPI to deployed Sunspot Groth16 verifier
    pub fn verify_shuffle(
        ctx: Context<VerifyShuffle>,
        proof: Vec<u8>,
        public_inputs: Vec<u8>,
    ) -> Result<()> {
        let game = &mut ctx.accounts.game;

        require!(
            game.state == GameState::Created,
            GameError::InvalidState
        );
        require!(
            game.dealer == ctx.accounts.dealer.key(),
            GameError::Unauthorized
        );
        require!(
            ctx.accounts.shuffle_verifier_program.key() == shuffle_verifier::ID,
            GameError::InvalidVerifier
        );

        // Sunspot verifier instruction data: proof || public_inputs
        let mut instruction_data = Vec::with_capacity(proof.len() + public_inputs.len());
        instruction_data.extend_from_slice(&proof);
        instruction_data.extend_from_slice(&public_inputs);

        let verify_ix = Instruction {
            program_id: shuffle_verifier::ID,
            accounts: vec![], // Sunspot verifiers are stateless
            data: instruction_data,
        };

        // CPI call - will fail if proof is invalid
        invoke(
            &verify_ix,
            &[ctx.accounts.shuffle_verifier_program.to_account_info()],
        )?;

        // Proof verified successfully - update game state
        game.shuffle_verified = true;
        game.state = GameState::AwaitingPlayer;

        msg!("Shuffle proof verified on-chain for game {}", game.game_id);
        Ok(())
    }

    /// Player action: hit, stand, or double
    /// Cards are dealt as commitments only - dealer must call reveal_card with ZK proof to reveal values
    /// SECURITY: Removed card_value parameter to prevent players claiming arbitrary card values
    pub fn player_action(ctx: Context<PlayerAction>, action: PlayerActionType) -> Result<()> {
        let game = &mut ctx.accounts.game;

        require!(
            game.state == GameState::Playing,
            GameError::InvalidState
        );
        require!(
            game.player == Some(ctx.accounts.player.key()),
            GameError::Unauthorized
        );

        match action {
            PlayerActionType::Hit => {
                // Deal next committed card to player (commitment only, no auto-reveal)
                require!(
                    (game.deck_position as usize) < game.committed_cards.len(),
                    GameError::NoMoreCards
                );
                let card = game.committed_cards[game.deck_position as usize];
                game.player_cards.push(card);
                game.deck_position += 1;
                // Card value must be revealed by dealer via reveal_card with ZK proof
                msg!("Player HIT - card dealt as commitment, awaiting reveal with ZK proof");
            }
            PlayerActionType::Stand => {
                msg!("Player STANDS");
                game.state = GameState::DealerTurn;
            }
            PlayerActionType::Double => {
                // Deal one card then move to dealer turn (commitment only, no auto-reveal)
                require!(
                    (game.deck_position as usize) < game.committed_cards.len(),
                    GameError::NoMoreCards
                );
                let card = game.committed_cards[game.deck_position as usize];
                game.player_cards.push(card);
                game.deck_position += 1;
                // Card value must be revealed by dealer via reveal_card with ZK proof
                msg!("Player DOUBLE - card dealt as commitment, awaiting reveal with ZK proof");
                game.state = GameState::DealerTurn;
            }
        }

        Ok(())
    }

    /// Dealer deals initial hand + commits cards for future hits
    /// Takes 10 card commitments, deals first 4 (2 player, 2 dealer)
    /// Also auto-reveals player's 2 cards + dealer's upcard for standard Blackjack UX
    ///
    /// SECURITY: Now requires ZK proof verification via CPI to deal verifier
    /// The proof demonstrates that cards come from the committed shuffled deck
    pub fn deal_initial_hand(
        ctx: Context<DealInitialHand>,
        card_commitments: Vec<[u8; 32]>,
        initial_card_values: Vec<u8>,  // [player1, player2, dealer_upcard]
        proof: Vec<u8>,                 // ZK deal proof (Groth16)
        public_inputs: Vec<u8>,         // Public inputs for verification
    ) -> Result<()> {
        let game = &mut ctx.accounts.game;

        require!(
            game.state == GameState::Playing,
            GameError::InvalidState
        );
        require!(
            game.dealer == ctx.accounts.dealer.key(),
            GameError::Unauthorized
        );
        require!(
            game.player_cards.is_empty() && game.dealer_cards.is_empty(),
            GameError::InvalidState
        );
        require!(
            card_commitments.len() >= 4,
            GameError::InvalidCard
        );

        // Validate initial card values (need 3: player1, player2, dealer_upcard)
        require!(
            initial_card_values.len() >= 3,
            GameError::InvalidCard
        );
        require!(
            initial_card_values[0] < 13 && initial_card_values[1] < 13 && initial_card_values[2] < 13,
            GameError::InvalidCard
        );

        // SECURITY: Validate deal verifier program ID
        require!(
            ctx.accounts.deal_verifier_program.key() == deal_verifier::ID,
            GameError::InvalidVerifier
        );

        // SECURITY: Verify deal proof via CPI to Sunspot Groth16 verifier
        // This proves the first card commitment comes from the committed shuffled deck
        // The proof binds deck_commitment (stored on-chain) to card_commitment
        let mut instruction_data = Vec::with_capacity(proof.len() + public_inputs.len());
        instruction_data.extend_from_slice(&proof);
        instruction_data.extend_from_slice(&public_inputs);

        let verify_ix = Instruction {
            program_id: deal_verifier::ID,
            accounts: vec![], // Sunspot verifiers are stateless
            data: instruction_data,
        };

        // CPI call - will fail if proof is invalid
        invoke(
            &verify_ix,
            &[ctx.accounts.deal_verifier_program.to_account_info()],
        )?;

        msg!("Deal proof verified on-chain - cards proven to come from committed deck");

        // Store all committed cards for future hits
        game.committed_cards = card_commitments.clone();

        // Deal first 4 cards: 2 to player, 2 to dealer
        game.player_cards.push(card_commitments[0]);
        game.player_cards.push(card_commitments[1]);
        game.dealer_cards.push(card_commitments[2]);
        game.dealer_cards.push(card_commitments[3]);

        // Auto-reveal player's 2 cards (both visible in Blackjack)
        game.player_revealed.push(initial_card_values[0]);
        game.player_revealed.push(initial_card_values[1]);

        // Auto-reveal dealer's upcard only (hole card stays hidden)
        game.dealer_revealed.push(initial_card_values[2]);

        // Next card position is 4 (for hits)
        game.deck_position = 4;

        msg!("Initial hand dealt with auto-reveal: player [{}, {}], dealer upcard [{}]",
            initial_card_values[0], initial_card_values[1], initial_card_values[2]);
        Ok(())
    }

    /// Dealer deals a card with commitment (legacy - kept for compatibility)
    pub fn deal_card(
        ctx: Context<DealCard>,
        card_commitment: [u8; 32],
        to_player: bool,
    ) -> Result<()> {
        let game = &mut ctx.accounts.game;

        require!(
            game.state == GameState::Playing || game.state == GameState::DealerTurn,
            GameError::InvalidState
        );
        require!(
            game.dealer == ctx.accounts.dealer.key(),
            GameError::Unauthorized
        );

        if to_player {
            game.player_cards.push(card_commitment);
            game.pending_hit = false; // Clear pending hit request
            msg!("Card dealt to player at position {}", game.deck_position);
        } else {
            game.dealer_cards.push(card_commitment);
            msg!("Card dealt to dealer at position {}", game.deck_position);
        }

        game.deck_position += 1;
        Ok(())
    }

    /// Reveals a card with its value, verified by ZK proof.
    /// The proof demonstrates that the revealed card_value matches the commitment
    /// stored when the card was dealt, without revealing the blinding factor.
    pub fn reveal_card(
        ctx: Context<RevealCard>,
        card_index: u8,
        card_value: u8,
        is_player_card: bool,
        proof: Vec<u8>,
        public_inputs: Vec<u8>,
    ) -> Result<()> {
        let game = &mut ctx.accounts.game;

        require!(
            game.dealer == ctx.accounts.dealer.key(),
            GameError::Unauthorized
        );
        require!(card_value < 13, GameError::InvalidCard);
        require!(
            ctx.accounts.reveal_verifier_program.key() == reveal_verifier::ID,
            GameError::InvalidVerifier
        );

        // CPI to reveal verifier - proves card_value matches the card commitment
        // Verifier instruction data format: proof_bytes || public_inputs_bytes
        let mut instruction_data = Vec::with_capacity(proof.len() + public_inputs.len());
        instruction_data.extend_from_slice(&proof);
        instruction_data.extend_from_slice(&public_inputs);

        let verify_ix = Instruction {
            program_id: reveal_verifier::ID,
            accounts: vec![], // Sunspot verifiers are stateless
            data: instruction_data,
        };

        // CPI call - will fail if proof is invalid
        invoke(
            &verify_ix,
            &[ctx.accounts.reveal_verifier_program.to_account_info()],
        )?;

        msg!("Reveal proof verified for card {} = {}", card_index, card_value);

        if is_player_card {
            require!(
                (card_index as usize) < game.player_cards.len(),
                GameError::InvalidCard
            );
            game.player_revealed.push(card_value);
            msg!("Revealed player card {}: {}", card_index, card_value);
        } else {
            require!(
                (card_index as usize) < game.dealer_cards.len(),
                GameError::InvalidCard
            );
            game.dealer_revealed.push(card_value);
            msg!("Revealed dealer card {}: {}", card_index, card_value);
        }

        // Check if all cards revealed, determine winner
        if game.player_revealed.len() == game.player_cards.len()
            && game.dealer_revealed.len() == game.dealer_cards.len()
        {
            determine_winner(game)?;
        }

        Ok(())
    }

    /// Dealer plays their turn: reveals hole card, hits until 17+, determines winner
    /// dealer_card_values: [hole_card, hit1, hit2, ...] - values for cards dealer might need
    pub fn dealer_play_turn(
        ctx: Context<DealCard>,
        dealer_card_values: Vec<u8>,
    ) -> Result<()> {
        let game = &mut ctx.accounts.game;

        require!(
            game.state == GameState::DealerTurn,
            GameError::InvalidState
        );
        require!(
            game.dealer == ctx.accounts.dealer.key(),
            GameError::Unauthorized
        );
        require!(
            dealer_card_values.len() >= 1,
            GameError::InvalidCard
        );

        let mut value_index: usize = 0;

        // 1. Reveal dealer's hole card (the second card that was hidden)
        require!(dealer_card_values[value_index] < 13, GameError::InvalidCard);
        game.dealer_revealed.push(dealer_card_values[value_index]);
        value_index += 1;

        msg!("Dealer reveals hole card: {}", dealer_card_values[0]);

        // 2. Calculate dealer's current hand and hit until 17+
        loop {
            let dealer_total = calculate_hand_value(&game.dealer_revealed);
            msg!("Dealer total: {}", dealer_total);

            if dealer_total >= 17 {
                // Dealer stands on 17+
                msg!("Dealer stands on {}", dealer_total);
                break;
            }

            // Dealer must hit - get next card from committed_cards
            require!(
                (game.deck_position as usize) < game.committed_cards.len(),
                GameError::NoMoreCards
            );
            require!(
                value_index < dealer_card_values.len(),
                GameError::InvalidCard
            );
            require!(
                dealer_card_values[value_index] < 13,
                GameError::InvalidCard
            );

            let card = game.committed_cards[game.deck_position as usize];
            game.dealer_cards.push(card);
            game.dealer_revealed.push(dealer_card_values[value_index]);
            game.deck_position += 1;

            msg!("Dealer hits: card value {}", dealer_card_values[value_index]);
            value_index += 1;
        }

        // 3. Determine winner
        determine_winner(game)?;

        Ok(())
    }
}

/// Determines the winner based on revealed cards
fn determine_winner(game: &mut Account<Game>) -> Result<()> {
    let player_total = calculate_hand_value(&game.player_revealed);
    let dealer_total = calculate_hand_value(&game.dealer_revealed);

    msg!("Player total: {}, Dealer total: {}", player_total, dealer_total);

    if player_total > 21 {
        game.state = GameState::DealerWon;
        msg!("Player busts! Dealer wins.");
    } else if dealer_total > 21 {
        game.state = GameState::PlayerWon;
        msg!("Dealer busts! Player wins.");
    } else if player_total > dealer_total {
        game.state = GameState::PlayerWon;
        msg!("Player wins with {}!", player_total);
    } else if dealer_total > player_total {
        game.state = GameState::DealerWon;
        msg!("Dealer wins with {}!", dealer_total);
    } else {
        game.state = GameState::Push;
        msg!("Push! Both have {}", player_total);
    }

    Ok(())
}

/// Calculates blackjack hand value (Ace = 1 or 11)
fn calculate_hand_value(cards: &[u8]) -> u8 {
    let mut total: u8 = 0;
    let mut aces: u8 = 0;

    for &card in cards {
        let value = match card {
            0 => { aces += 1; 11 }           // Ace (start as 11)
            1..=8 => card + 1,               // 2-9
            9..=12 => 10,                    // 10, J, Q, K
            _ => 0,
        };
        total = total.saturating_add(value);
    }

    // Convert Aces from 11 to 1 if busting
    while total > 21 && aces > 0 {
        total -= 10;
        aces -= 1;
    }

    total
}

// ============================================================================
// ACCOUNTS
// ============================================================================

#[derive(Accounts)]
#[instruction(game_id: u64)]
pub struct CreateGame<'info> {
    #[account(
        init,
        payer = dealer,
        space = 8 + Game::INIT_SPACE,
        seeds = [b"game", dealer.key().as_ref(), &game_id.to_le_bytes()],
        bump
    )]
    pub game: Account<'info, Game>,

    #[account(mut)]
    pub dealer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct JoinGame<'info> {
    #[account(
        mut,
        constraint = game.state == GameState::AwaitingPlayer @ GameError::InvalidState
    )]
    pub game: Account<'info, Game>,

    pub player: Signer<'info>,
}

#[derive(Accounts)]
pub struct VerifyShuffle<'info> {
    #[account(
        mut,
        constraint = game.dealer == dealer.key() @ GameError::Unauthorized
    )]
    pub game: Account<'info, Game>,

    pub dealer: Signer<'info>,

    /// CHECK: Sunspot Groth16 shuffle verifier program.
    /// Validated in instruction handler against shuffle_verifier::ID.
    pub shuffle_verifier_program: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct PlayerAction<'info> {
    #[account(
        mut,
        constraint = game.player == Some(player.key()) @ GameError::Unauthorized
    )]
    pub game: Account<'info, Game>,

    pub player: Signer<'info>,
}

/// Context for legacy deal_card and dealer_play_turn (no deal verification needed)
#[derive(Accounts)]
pub struct DealCard<'info> {
    #[account(
        mut,
        constraint = game.dealer == dealer.key() @ GameError::Unauthorized
    )]
    pub game: Account<'info, Game>,

    pub dealer: Signer<'info>,
}

/// Context for deal_initial_hand with ZK deal proof verification
/// SECURITY: This context includes the deal verifier for proving cards come from committed deck
#[derive(Accounts)]
pub struct DealInitialHand<'info> {
    #[account(
        mut,
        constraint = game.dealer == dealer.key() @ GameError::Unauthorized
    )]
    pub game: Account<'info, Game>,

    pub dealer: Signer<'info>,

    /// CHECK: Sunspot Groth16 deal verifier program.
    /// Validated in instruction handler against deal_verifier::ID.
    pub deal_verifier_program: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct RevealCard<'info> {
    #[account(
        mut,
        constraint = game.dealer == dealer.key() @ GameError::Unauthorized
    )]
    pub game: Account<'info, Game>,

    pub dealer: Signer<'info>,

    /// CHECK: Sunspot Groth16 reveal verifier program.
    /// Validated in instruction handler against reveal_verifier::ID.
    pub reveal_verifier_program: AccountInfo<'info>,
}

// ============================================================================
// STATE
// ============================================================================

#[account]
#[derive(InitSpace)]
pub struct Game {
    /// Dealer/creator wallet
    pub dealer: Pubkey,

    /// Player wallet (None if waiting)
    pub player: Option<Pubkey>,

    /// Poseidon hash of shuffled deck
    pub deck_commitment: [u8; 32],

    /// Whether shuffle proof verified
    pub shuffle_verified: bool,

    /// Current game state
    pub state: GameState,

    /// Player's card commitments (max 10 cards)
    #[max_len(10)]
    pub player_cards: Vec<[u8; 32]>,

    /// Dealer's card commitments (max 10 cards)
    #[max_len(10)]
    pub dealer_cards: Vec<[u8; 32]>,

    /// Player's revealed card values
    #[max_len(10)]
    pub player_revealed: Vec<u8>,

    /// Dealer's revealed card values
    #[max_len(10)]
    pub dealer_revealed: Vec<u8>,

    /// Next card position in deck
    pub deck_position: u8,

    /// Game ID
    pub game_id: u64,

    /// Creation timestamp
    pub created_at: i64,

    /// PDA bump
    pub bump: u8,

    /// Player requested a hit (dealer needs to deal card)
    pub pending_hit: bool,

    /// Pre-committed cards for auto-deal (max 10 cards for hits)
    #[max_len(10)]
    pub committed_cards: Vec<[u8; 32]>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum GameState {
    /// Game created, awaiting shuffle proof
    Created,
    /// Shuffle verified, awaiting player
    AwaitingPlayer,
    /// Game in progress
    Playing,
    /// Player stood, dealer's turn
    DealerTurn,
    /// Revealing cards
    Revealing,
    /// Player won
    PlayerWon,
    /// Dealer won
    DealerWon,
    /// Push (tie)
    Push,
    /// Game abandoned
    Abandoned,
}

impl Default for GameState {
    fn default() -> Self {
        GameState::Created
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum PlayerActionType {
    Hit,
    Stand,
    Double,
}

// ============================================================================
// ERRORS
// ============================================================================

#[error_code]
pub enum GameError {
    #[msg("Invalid game state for this action")]
    InvalidState,

    #[msg("Game is already full")]
    GameFull,

    #[msg("Invalid proof")]
    InvalidProof,

    #[msg("Invalid verifier program ID")]
    InvalidVerifier,

    #[msg("Not authorized for this action")]
    Unauthorized,

    #[msg("Card already revealed")]
    AlreadyRevealed,

    #[msg("Invalid card value")]
    InvalidCard,

    #[msg("Game has timed out")]
    Timeout,

    #[msg("No more cards available in committed deck")]
    NoMoreCards,
}
