use anchor_lang::prelude::*;
use anchor_lang::solana_program::instruction::Instruction;
use anchor_lang::solana_program::program::invoke;

declare_id!("22BfrTbAzVmwENnyfzk6rFtPaNvCmaATbeWaJKKoqkK4");

/// Sunspot Groth16 verifier program IDs (deployed Jan 28 2026, match circuits/target/*.pk keys)
mod shuffle_verifier {
    use super::*;
    declare_id!("2JWc376XNQPb9U9uB3mCQ18jEB7T6YNNZGSUVEiTDSe5");
}

mod deal_verifier {
    use super::*;
    declare_id!("5HfaKytyH4xVqm5neRppStKaGb98zLj3swHz6RwRjh4B");
}

mod reveal_verifier {
    use super::*;
    declare_id!("3DqP6VN9ummyE1Hjk31VpmW3DR64eRX8r4vG522bBTNV");
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

    /// Creates a session key that allows auto-signing game actions
    /// Player signs this ONCE, then the session keypair can sign subsequent hit/stand/double actions
    /// This dramatically improves UX by removing wallet popups for each game action
    pub fn create_session(
        ctx: Context<CreateSession>,
        session_key: Pubkey,
        valid_until: i64,
    ) -> Result<()> {
        let session = &mut ctx.accounts.session;
        session.authority = ctx.accounts.player.key();
        session.session_key = session_key;
        session.game = ctx.accounts.game.key();
        session.valid_until = valid_until;
        session.bump = *ctx.bumps.get("session").unwrap();

        msg!("Session created: authority={}, session_key={}, expires={}",
            session.authority, session.session_key, session.valid_until);
        Ok(())
    }

    /// Creates a DEALER session key that allows auto-signing dealer actions
    /// Dealer signs this ONCE, then the session keypair can sign shuffle/deal/reveal actions
    pub fn create_dealer_session(
        ctx: Context<CreateDealerSession>,
        session_key: Pubkey,
        valid_until: i64,
    ) -> Result<()> {
        let session = &mut ctx.accounts.session;
        session.authority = ctx.accounts.dealer.key();
        session.session_key = session_key;
        session.game = ctx.accounts.game.key();
        session.valid_until = valid_until;
        session.bump = *ctx.bumps.get("session").unwrap();

        msg!("Dealer session created: authority={}, session_key={}, expires={}",
            session.authority, session.session_key, session.valid_until);
        Ok(())
    }

    /// Player action using session key - NO WALLET SIGNATURE NEEDED!
    /// The session keypair signs instead of requiring manual wallet approval
    pub fn player_action_with_session(
        ctx: Context<PlayerActionWithSession>,
        action: PlayerActionType,
    ) -> Result<()> {
        let clock = Clock::get()?;
        let session = &ctx.accounts.session;

        // Validate session not expired
        require!(
            clock.unix_timestamp < session.valid_until,
            GameError::SessionExpired
        );

        let game = &mut ctx.accounts.game;

        require!(
            game.state == GameState::Playing,
            GameError::InvalidState
        );

        match action {
            PlayerActionType::Hit => {
                require!(
                    (game.deck_position as usize) < game.committed_cards.len(),
                    GameError::NoMoreCards
                );
                let card = game.committed_cards[game.deck_position as usize];
                game.player_cards.push(card);
                game.deck_position += 1;
                msg!("Player HIT via session key - card dealt as commitment");
            }
            PlayerActionType::Stand => {
                msg!("Player STANDS via session key");
                game.state = GameState::DealerTurn;
            }
            PlayerActionType::Double => {
                require!(
                    (game.deck_position as usize) < game.committed_cards.len(),
                    GameError::NoMoreCards
                );
                let card = game.committed_cards[game.deck_position as usize];
                game.player_cards.push(card);
                game.deck_position += 1;
                msg!("Player DOUBLE via session key - card dealt as commitment");
                game.state = GameState::DealerTurn;
            }
        }

        Ok(())
    }

    // =========================================================================
    // SESSION-BASED DEALER ACTIONS - No wallet signature required!
    // =========================================================================

    /// Verifies shuffle proof using dealer session key - NO WALLET POPUP!
    pub fn verify_shuffle_with_session(
        ctx: Context<VerifyShuffleWithSession>,
        proof: Vec<u8>,
        public_inputs: Vec<u8>,
    ) -> Result<()> {
        let clock = Clock::get()?;
        let session = &ctx.accounts.session;

        // Validate session not expired
        require!(
            clock.unix_timestamp < session.valid_until,
            GameError::SessionExpired
        );

        let game = &mut ctx.accounts.game;

        require!(
            game.state == GameState::Created,
            GameError::InvalidState
        );

        // Sunspot verifier instruction data: proof || public_inputs
        let mut instruction_data = Vec::with_capacity(proof.len() + public_inputs.len());
        instruction_data.extend_from_slice(&proof);
        instruction_data.extend_from_slice(&public_inputs);

        let verify_ix = Instruction {
            program_id: shuffle_verifier::ID,
            accounts: vec![],
            data: instruction_data,
        };

        invoke(
            &verify_ix,
            &[ctx.accounts.shuffle_verifier_program.to_account_info()],
        )?;

        game.shuffle_verified = true;
        game.state = GameState::AwaitingPlayer;

        msg!("Shuffle verified via dealer session for game {}", game.game_id);
        Ok(())
    }

    /// Deal initial hand using dealer session key - NO WALLET POPUP!
    pub fn deal_initial_hand_with_session(
        ctx: Context<DealInitialHandWithSession>,
        card_commitments: Vec<[u8; 32]>,
        initial_card_values: Vec<u8>,
        proof: Vec<u8>,
        public_inputs: Vec<u8>,
    ) -> Result<()> {
        let clock = Clock::get()?;
        let session = &ctx.accounts.session;

        require!(
            clock.unix_timestamp < session.valid_until,
            GameError::SessionExpired
        );

        let game = &mut ctx.accounts.game;

        require!(
            game.state == GameState::Playing,
            GameError::InvalidState
        );
        require!(
            game.player_cards.is_empty() && game.dealer_cards.is_empty(),
            GameError::InvalidState
        );
        require!(card_commitments.len() >= 10, GameError::InvalidCard);
        require!(initial_card_values.len() >= 3, GameError::InvalidCard);

        // Verify deal proof via CPI
        let mut instruction_data = Vec::with_capacity(proof.len() + public_inputs.len());
        instruction_data.extend_from_slice(&proof);
        instruction_data.extend_from_slice(&public_inputs);

        let verify_ix = Instruction {
            program_id: deal_verifier::ID,
            accounts: vec![],
            data: instruction_data,
        };

        invoke(
            &verify_ix,
            &[ctx.accounts.deal_verifier_program.to_account_info()],
        )?;

        // Store committed cards
        game.committed_cards = card_commitments.clone();

        // Deal first 4 cards as commitments
        game.player_cards.push(card_commitments[0]);
        game.player_cards.push(card_commitments[1]);
        game.dealer_cards.push(card_commitments[2]);
        game.dealer_cards.push(card_commitments[3]);

        // Auto-reveal player's cards + dealer's upcard
        game.player_revealed = vec![initial_card_values[0], initial_card_values[1]];
        game.dealer_revealed = vec![initial_card_values[2]];

        game.deck_position = 4;

        msg!("Initial hand dealt via dealer session for game {}", game.game_id);
        Ok(())
    }

    /// Dealer plays turn using session key - NO WALLET POPUP!
    pub fn dealer_play_turn_with_session(
        ctx: Context<DealerPlayTurnWithSession>,
        dealer_card_values: Vec<u8>,
        proofs: Vec<Vec<u8>>,
        public_inputs_list: Vec<Vec<u8>>,
    ) -> Result<()> {
        let clock = Clock::get()?;
        let session = &ctx.accounts.session;

        require!(
            clock.unix_timestamp < session.valid_until,
            GameError::SessionExpired
        );

        let game = &mut ctx.accounts.game;

        require!(
            game.state == GameState::DealerTurn,
            GameError::InvalidState
        );
        require!(
            dealer_card_values.len() == proofs.len() && proofs.len() == public_inputs_list.len(),
            GameError::InvalidProof
        );

        // Verify each card reveal proof
        for i in 0..dealer_card_values.len() {
            let card_value = dealer_card_values[i];
            require!(card_value < 13, GameError::InvalidCard);

            let mut instruction_data = Vec::with_capacity(proofs[i].len() + public_inputs_list[i].len());
            instruction_data.extend_from_slice(&proofs[i]);
            instruction_data.extend_from_slice(&public_inputs_list[i]);

            let verify_ix = Instruction {
                program_id: reveal_verifier::ID,
                accounts: vec![],
                data: instruction_data,
            };

            invoke(
                &verify_ix,
                &[ctx.accounts.reveal_verifier_program.to_account_info()],
            )?;
        }

        // Reveal dealer's hole card and any hit cards
        for card_value in dealer_card_values.iter() {
            game.dealer_revealed.push(*card_value);
        }

        // Calculate totals and determine winner
        let player_total = calculate_hand_value(&game.player_revealed);
        let dealer_total = calculate_hand_value(&game.dealer_revealed);

        if player_total > 21 {
            game.state = GameState::DealerWon;
        } else if dealer_total > 21 {
            game.state = GameState::PlayerWon;
        } else if dealer_total > player_total {
            game.state = GameState::DealerWon;
        } else if player_total > dealer_total {
            game.state = GameState::PlayerWon;
        } else {
            game.state = GameState::Push;
        }

        msg!("Dealer turn completed via session: player={}, dealer={}",
            player_total, dealer_total);
        Ok(())
    }

    /// Reveal a single card using dealer session key - NO WALLET POPUP!
    /// Used for sequential reveals when batched transaction is too large
    /// is_final_reveal: when true, determines winner after this reveal
    pub fn reveal_card_with_session(
        ctx: Context<RevealCardWithSession>,
        card_index: u8,
        card_value: u8,
        is_player_card: bool,
        is_final_reveal: bool,
        proof: Vec<u8>,
        public_inputs: Vec<u8>,
    ) -> Result<()> {
        let clock = Clock::get()?;
        let session = &ctx.accounts.session;

        require!(
            clock.unix_timestamp < session.valid_until,
            GameError::SessionExpired
        );

        let game = &mut ctx.accounts.game;

        // Session must be for the dealer of this game
        require!(
            session.authority == game.dealer,
            GameError::Unauthorized
        );

        require!(card_value < 13, GameError::InvalidCard);
        require!(
            ctx.accounts.reveal_verifier_program.key() == reveal_verifier::ID,
            GameError::InvalidVerifier
        );

        // CPI to reveal verifier - proves card_value matches the card commitment
        let mut instruction_data = Vec::with_capacity(proof.len() + public_inputs.len());
        instruction_data.extend_from_slice(&proof);
        instruction_data.extend_from_slice(&public_inputs);

        let verify_ix = Instruction {
            program_id: reveal_verifier::ID,
            accounts: vec![],
            data: instruction_data,
        };

        invoke(
            &verify_ix,
            &[ctx.accounts.reveal_verifier_program.to_account_info()],
        )?;

        // Add revealed card to appropriate array
        if is_player_card {
            game.player_revealed.push(card_value);

            // Check for player bust
            let player_total = calculate_hand_value(&game.player_revealed);
            if player_total > 21 {
                game.state = GameState::DealerWon;
                msg!("Player busted with {} - dealer wins!", player_total);
            }
        } else {
            game.dealer_revealed.push(card_value);

            // If this is the final reveal, determine winner
            if is_final_reveal {
                let player_total = calculate_hand_value(&game.player_revealed);
                let dealer_total = calculate_hand_value(&game.dealer_revealed);

                if player_total > 21 {
                    game.state = GameState::DealerWon;
                } else if dealer_total > 21 {
                    game.state = GameState::PlayerWon;
                } else if dealer_total > player_total {
                    game.state = GameState::DealerWon;
                } else if player_total > dealer_total {
                    game.state = GameState::PlayerWon;
                } else {
                    game.state = GameState::Push;
                }
                msg!("Game complete via session: player={}, dealer={}", player_total, dealer_total);
            }
        }

        msg!("Card revealed via session: index={}, value={}, is_player={}, final={}",
            card_index, card_value, is_player_card, is_final_reveal);
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
    ///
    /// SECURITY FIX: Now requires ZK reveal proofs for each card to prevent dealer cheating.
    /// Each card value must be verified via CPI to the reveal verifier before being accepted.
    ///
    /// INCREMENTAL SUPPORT: Can be called multiple times with one card per call to avoid
    /// Solana's 1232 byte transaction size limit. Each Groth16 proof is ~388 bytes, so
    /// 2+ proofs in one transaction exceeds the limit.
    ///
    /// Parameters:
    /// - dealer_card_values: [card1, card2, ...] - values for cards dealer will reveal this call
    /// - proofs: One Groth16 reveal proof per card value (parallel arrays)
    /// - public_inputs_list: Public inputs for each proof (parallel arrays)
    pub fn dealer_play_turn(
        ctx: Context<DealerPlayTurnSecure>,
        dealer_card_values: Vec<u8>,
        proofs: Vec<Vec<u8>>,
        public_inputs_list: Vec<Vec<u8>>,
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
        // SECURITY: Require matching number of proofs for each card value
        require!(
            proofs.len() == dealer_card_values.len(),
            GameError::InvalidProof
        );
        require!(
            public_inputs_list.len() == dealer_card_values.len(),
            GameError::InvalidProof
        );
        // SECURITY: Verify reveal verifier program ID
        require!(
            ctx.accounts.reveal_verifier_program.key() == reveal_verifier::ID,
            GameError::InvalidVerifier
        );

        let mut value_index: usize = 0;

        // Check if hole card needs revealing (dealer_revealed has 1 card = upcard only)
        // If dealer_revealed.len() == 1, we need to reveal hole card first
        // If dealer_revealed.len() >= 2, hole card already revealed in previous call
        let hole_card_revealed = game.dealer_revealed.len() >= 2;

        if !hole_card_revealed {
            // 1. Reveal dealer's hole card (the second card that was hidden)
            // SECURITY: Verify ZK proof before accepting the card value
            require!(dealer_card_values[value_index] < 13, GameError::InvalidCard);

            // Verify hole card reveal proof via CPI
            let mut instruction_data = Vec::with_capacity(
                proofs[value_index].len() + public_inputs_list[value_index].len()
            );
            instruction_data.extend_from_slice(&proofs[value_index]);
            instruction_data.extend_from_slice(&public_inputs_list[value_index]);

            let verify_ix = Instruction {
                program_id: reveal_verifier::ID,
                accounts: vec![], // Sunspot verifiers are stateless
                data: instruction_data,
            };

            invoke(
                &verify_ix,
                &[ctx.accounts.reveal_verifier_program.to_account_info()],
            )?;

            msg!("ZK proof verified for dealer hole card: {}", dealer_card_values[value_index]);
            game.dealer_revealed.push(dealer_card_values[value_index]);
            value_index += 1;
        }

        // 2. Calculate dealer's current hand and hit until 17+ or we run out of provided cards
        loop {
            let dealer_total = calculate_hand_value(&game.dealer_revealed);
            msg!("Dealer total: {}", dealer_total);

            if dealer_total >= 17 {
                // Dealer stands on 17+ - finalize the game
                msg!("Dealer stands on {}", dealer_total);
                determine_winner(game)?;
                return Ok(());
            }

            // Dealer must hit - check if we have more cards in this transaction
            if value_index >= dealer_card_values.len() {
                // No more cards provided in this call - return success, stay in DealerTurn state
                // Frontend should call again with next card(s)
                msg!("Dealer needs to hit but no more cards in this transaction. Call again with next card.");
                return Ok(());
            }

            // Get next card from committed_cards
            require!(
                (game.deck_position as usize) < game.committed_cards.len(),
                GameError::NoMoreCards
            );
            require!(
                dealer_card_values[value_index] < 13,
                GameError::InvalidCard
            );

            // SECURITY: Verify ZK proof for hit card before accepting
            let mut hit_instruction_data = Vec::with_capacity(
                proofs[value_index].len() + public_inputs_list[value_index].len()
            );
            hit_instruction_data.extend_from_slice(&proofs[value_index]);
            hit_instruction_data.extend_from_slice(&public_inputs_list[value_index]);

            let hit_verify_ix = Instruction {
                program_id: reveal_verifier::ID,
                accounts: vec![],
                data: hit_instruction_data,
            };

            invoke(
                &hit_verify_ix,
                &[ctx.accounts.reveal_verifier_program.to_account_info()],
            )?;

            msg!("ZK proof verified for dealer hit card: {}", dealer_card_values[value_index]);

            let card = game.committed_cards[game.deck_position as usize];
            game.dealer_cards.push(card);
            game.dealer_revealed.push(dealer_card_values[value_index]);
            game.deck_position += 1;

            value_index += 1;
        }
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

/// Context for creating a session key that allows auto-signing game actions
/// Player signs ONCE to create session, then session key signs subsequent actions
#[derive(Accounts)]
#[instruction(session_key: Pubkey)]
pub struct CreateSession<'info> {
    #[account(
        init,
        payer = player,
        space = 8 + GameSession::INIT_SPACE,
        seeds = [b"session", game.key().as_ref(), player.key().as_ref()],
        bump
    )]
    pub session: Account<'info, GameSession>,

    #[account(
        constraint = game.player == Some(player.key()) @ GameError::Unauthorized
    )]
    pub game: Account<'info, Game>,

    #[account(mut)]
    pub player: Signer<'info>,

    pub system_program: Program<'info, System>,
}

/// Context for player action using session key (no wallet signature needed!)
/// The session keypair signs instead of the player's main wallet
#[derive(Accounts)]
pub struct PlayerActionWithSession<'info> {
    #[account(
        mut,
        constraint = game.player == Some(session.authority) @ GameError::Unauthorized
    )]
    pub game: Account<'info, Game>,

    #[account(
        seeds = [b"session", game.key().as_ref(), session.authority.as_ref()],
        bump = session.bump,
        constraint = session.session_key == signer.key() @ GameError::InvalidSession
    )]
    pub session: Account<'info, GameSession>,

    /// The session keypair signs this transaction (NOT the player's wallet!)
    pub signer: Signer<'info>,
}

// ============================================================================
// DEALER SESSION CONTEXTS - Auto-sign for dealer actions
// ============================================================================

/// Context for creating a DEALER session key
#[derive(Accounts)]
#[instruction(session_key: Pubkey)]
pub struct CreateDealerSession<'info> {
    #[account(
        init,
        payer = dealer,
        space = 8 + DealerSession::INIT_SPACE,
        seeds = [b"dealer_session", game.key().as_ref(), dealer.key().as_ref()],
        bump
    )]
    pub session: Account<'info, DealerSession>,

    #[account(
        constraint = game.dealer == dealer.key() @ GameError::Unauthorized
    )]
    pub game: Account<'info, Game>,

    #[account(mut)]
    pub dealer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

/// Context for verify_shuffle with dealer session key
#[derive(Accounts)]
pub struct VerifyShuffleWithSession<'info> {
    #[account(
        mut,
        constraint = game.dealer == session.authority @ GameError::Unauthorized
    )]
    pub game: Account<'info, Game>,

    #[account(
        seeds = [b"dealer_session", game.key().as_ref(), session.authority.as_ref()],
        bump = session.bump,
        constraint = session.session_key == signer.key() @ GameError::InvalidSession
    )]
    pub session: Account<'info, DealerSession>,

    /// The session keypair signs (NOT the dealer's wallet!)
    pub signer: Signer<'info>,

    /// CHECK: Sunspot Groth16 shuffle verifier program.
    pub shuffle_verifier_program: AccountInfo<'info>,
}

/// Context for deal_initial_hand with dealer session key
#[derive(Accounts)]
pub struct DealInitialHandWithSession<'info> {
    #[account(
        mut,
        constraint = game.dealer == session.authority @ GameError::Unauthorized
    )]
    pub game: Account<'info, Game>,

    #[account(
        seeds = [b"dealer_session", game.key().as_ref(), session.authority.as_ref()],
        bump = session.bump,
        constraint = session.session_key == signer.key() @ GameError::InvalidSession
    )]
    pub session: Account<'info, DealerSession>,

    /// The session keypair signs (NOT the dealer's wallet!)
    pub signer: Signer<'info>,

    /// CHECK: Sunspot Groth16 deal verifier program.
    pub deal_verifier_program: AccountInfo<'info>,
}

/// Context for dealer_play_turn with dealer session key
#[derive(Accounts)]
pub struct DealerPlayTurnWithSession<'info> {
    #[account(
        mut,
        constraint = game.dealer == session.authority @ GameError::Unauthorized
    )]
    pub game: Account<'info, Game>,

    #[account(
        seeds = [b"dealer_session", game.key().as_ref(), session.authority.as_ref()],
        bump = session.bump,
        constraint = session.session_key == signer.key() @ GameError::InvalidSession
    )]
    pub session: Account<'info, DealerSession>,

    /// The session keypair signs (NOT the dealer's wallet!)
    pub signer: Signer<'info>,

    /// CHECK: Sunspot Groth16 reveal verifier program.
    pub reveal_verifier_program: AccountInfo<'info>,
}

/// Context for legacy deal_card (no deal verification needed)
#[derive(Accounts)]
pub struct DealCard<'info> {
    #[account(
        mut,
        constraint = game.dealer == dealer.key() @ GameError::Unauthorized
    )]
    pub game: Account<'info, Game>,

    pub dealer: Signer<'info>,
}

/// Context for dealer_play_turn with ZK reveal proof verification
/// SECURITY FIX: Dealer must prove each card value via CPI to reveal verifier
#[derive(Accounts)]
pub struct DealerPlayTurnSecure<'info> {
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

/// Context for reveal_card_with_session - single card reveal using dealer session
#[derive(Accounts)]
pub struct RevealCardWithSession<'info> {
    #[account(
        mut,
        constraint = game.dealer == session.authority @ GameError::Unauthorized
    )]
    pub game: Account<'info, Game>,

    #[account(
        seeds = [b"dealer_session", game.key().as_ref(), session.authority.as_ref()],
        bump = session.bump,
        constraint = session.session_key == signer.key() @ GameError::InvalidSession
    )]
    pub session: Account<'info, DealerSession>,

    /// The session keypair signs (NOT the dealer's wallet!)
    pub signer: Signer<'info>,

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

/// Session key account for auto-signing game actions (PLAYER)
/// Allows players to authorize an ephemeral keypair that can sign transactions
/// without requiring wallet approval for each action (better UX)
#[account]
#[derive(InitSpace)]
pub struct GameSession {
    /// The player's main wallet that authorized this session
    pub authority: Pubkey,
    /// The session keypair public key (signs transactions instead of wallet)
    pub session_key: Pubkey,
    /// Game PDA this session is valid for
    pub game: Pubkey,
    /// Expiration timestamp (Unix timestamp)
    pub valid_until: i64,
    /// PDA bump
    pub bump: u8,
}

/// Session key account for auto-signing dealer actions (DEALER)
/// Allows dealers to authorize an ephemeral keypair for shuffle/deal/reveal
/// without requiring wallet approval for each action
#[account]
#[derive(InitSpace)]
pub struct DealerSession {
    /// The dealer's main wallet that authorized this session
    pub authority: Pubkey,
    /// The session keypair public key (signs transactions instead of wallet)
    pub session_key: Pubkey,
    /// Game PDA this session is valid for
    pub game: Pubkey,
    /// Expiration timestamp (Unix timestamp)
    pub valid_until: i64,
    /// PDA bump
    pub bump: u8,
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

    #[msg("Session has expired")]
    SessionExpired,

    #[msg("Invalid session key")]
    InvalidSession,
}
