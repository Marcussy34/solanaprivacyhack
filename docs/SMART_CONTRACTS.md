# ZK Card Arena - Smart Contract Specifications

## Overview

The ZK Card Arena Anchor program manages game state, verifies ZK proofs, and handles card reveals on Solana.

---

## Program Architecture

```
programs/
└── zk-card-arena/
    ├── Cargo.toml
    └── src/
        ├── lib.rs              # Program entry point
        ├── state/
        │   ├── mod.rs
        │   ├── game.rs         # Game account
        │   └── player.rs       # Player account
        ├── instructions/
        │   ├── mod.rs
        │   ├── create_game.rs
        │   ├── join_game.rs
        │   ├── deal_card.rs
        │   ├── player_action.rs
        │   └── reveal_cards.rs
        └── errors.rs
```

---

## Account Structures

### Game Account

```rust
#[account]
pub struct Game {
    /// Dealer/creator of the game
    pub dealer: Pubkey,
    
    /// Player who joined (None if waiting)
    pub player: Option<Pubkey>,
    
    /// Commitment to shuffled deck (Poseidon hash)
    pub deck_commitment: [u8; 32],
    
    /// Whether shuffle proof has been verified
    pub shuffle_verified: bool,
    
    /// Current game state
    pub state: GameState,
    
    /// Player's dealt card commitments
    pub player_cards: Vec<[u8; 32]>,
    
    /// Dealer's dealt card commitments  
    pub dealer_cards: Vec<[u8; 32]>,
    
    /// Player's revealed card values
    pub player_revealed: Vec<u8>,
    
    /// Dealer's revealed card values
    pub dealer_revealed: Vec<u8>,
    
    /// Next card position in deck
    pub deck_position: u8,
    
    /// Timestamp of creation
    pub created_at: i64,
    
    /// PDA bump seed
    pub bump: u8,
}

impl Game {
    pub const MAX_SIZE: usize = 
        32 +        // dealer
        33 +        // player (Option)
        32 +        // deck_commitment
        1 +         // shuffle_verified
        1 +         // state
        4 + (32 * 10) + // player_cards (max 10)
        4 + (32 * 10) + // dealer_cards (max 10)
        4 + 10 +    // player_revealed
        4 + 10 +    // dealer_revealed
        1 +         // deck_position
        8 +         // created_at
        1;          // bump
}
```

### Game State Enum

```rust
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum GameState {
    /// Game created, awaiting shuffle proof
    Created,
    
    /// Shuffle proof verified, awaiting player
    AwaitingPlayer,
    
    /// Player joined, game in progress
    Playing,
    
    /// Player has stood, dealer's turn
    DealerTurn,
    
    /// All actions complete, revealing cards
    Revealing,
    
    /// Game finished - player won
    PlayerWon,
    
    /// Game finished - dealer won
    DealerWon,
    
    /// Game finished - push (tie)
    Push,
    
    /// Game abandoned/timed out
    Abandoned,
}
```

---

## Instructions

### 1. Create Game

Initializes a new game with deck commitment.

```rust
#[derive(Accounts)]
pub struct CreateGame<'info> {
    #[account(
        init,
        payer = dealer,
        space = 8 + Game::MAX_SIZE,
        seeds = [b"game", dealer.key().as_ref(), &game_id.to_le_bytes()],
        bump
    )]
    pub game: Account<'info, Game>,
    
    #[account(mut)]
    pub dealer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn create_game(
    ctx: Context<CreateGame>,
    game_id: u64,
    deck_commitment: [u8; 32],
) -> Result<()> {
    let game = &mut ctx.accounts.game;
    game.dealer = ctx.accounts.dealer.key();
    game.deck_commitment = deck_commitment;
    game.state = GameState::Created;
    game.created_at = Clock::get()?.unix_timestamp;
    game.bump = ctx.bumps.game;
    Ok(())
}
```

### 2. Verify Shuffle

Verifies the ZK shuffle proof and marks game ready.

```rust
#[derive(Accounts)]
pub struct VerifyShuffle<'info> {
    #[account(
        mut,
        constraint = game.dealer == dealer.key(),
        constraint = game.state == GameState::Created
    )]
    pub game: Account<'info, Game>,
    
    pub dealer: Signer<'info>,
    
    /// Light Protocol verifier account
    pub verifier: AccountInfo<'info>,
}

pub fn verify_shuffle(
    ctx: Context<VerifyShuffle>,
    proof: Vec<u8>,
    public_inputs: Vec<[u8; 32]>,
) -> Result<()> {
    // Verify proof using Light Protocol
    verify_groth16_proof(
        &ctx.accounts.verifier,
        &proof,
        &public_inputs,
    )?;
    
    let game = &mut ctx.accounts.game;
    game.shuffle_verified = true;
    game.state = GameState::AwaitingPlayer;
    Ok(())
}
```

### 3. Join Game

Player joins an available game.

```rust
pub fn join_game(ctx: Context<JoinGame>) -> Result<()> {
    let game = &mut ctx.accounts.game;
    require!(game.state == GameState::AwaitingPlayer, GameError::InvalidState);
    require!(game.player.is_none(), GameError::GameFull);
    
    game.player = Some(ctx.accounts.player.key());
    game.state = GameState::Playing;
    Ok(())
}
```

### 4. Deal Card

Dealer deals a card with commitment.

```rust
pub fn deal_card(
    ctx: Context<DealCard>,
    card_commitment: [u8; 32],
    deal_proof: Vec<u8>,
    to_player: bool,
) -> Result<()> {
    // Verify deal proof
    verify_deal_proof(&deal_proof, &ctx.accounts.game.deck_commitment)?;
    
    let game = &mut ctx.accounts.game;
    
    if to_player {
        game.player_cards.push(card_commitment);
    } else {
        game.dealer_cards.push(card_commitment);
    }
    
    game.deck_position += 1;
    Ok(())
}
```

### 5. Player Action

Player hits, stands, or doubles.

```rust
#[derive(AnchorSerialize, AnchorDeserialize)]
pub enum PlayerAction {
    Hit,
    Stand,
    Double,
}

pub fn player_action(
    ctx: Context<PlayerActionAccounts>,
    action: PlayerAction,
) -> Result<()> {
    let game = &mut ctx.accounts.game;
    require!(game.state == GameState::Playing, GameError::InvalidState);
    
    match action {
        PlayerAction::Hit => {
            // Request another card (dealt in separate instruction)
        }
        PlayerAction::Stand => {
            game.state = GameState::DealerTurn;
        }
        PlayerAction::Double => {
            // Double bet, get one card, then stand
            game.state = GameState::DealerTurn;
        }
    }
    Ok(())
}
```

### 6. Reveal Card

Reveal a committed card with proof.

```rust
pub fn reveal_card(
    ctx: Context<RevealCard>,
    card_index: u8,
    card_value: u8,
    reveal_proof: Vec<u8>,
    is_player_card: bool,
) -> Result<()> {
    let game = &mut ctx.accounts.game;
    
    let commitment = if is_player_card {
        game.player_cards[card_index as usize]
    } else {
        game.dealer_cards[card_index as usize]
    };
    
    // Verify reveal proof
    verify_reveal_proof(&reveal_proof, &commitment, card_value)?;
    
    if is_player_card {
        game.player_revealed.push(card_value);
    } else {
        game.dealer_revealed.push(card_value);
    }
    
    // Check if all cards revealed
    if all_cards_revealed(game) {
        determine_winner(game)?;
    }
    
    Ok(())
}
```

---

## Error Codes

```rust
#[error_code]
pub enum GameError {
    #[msg("Invalid game state for this action")]
    InvalidState,
    
    #[msg("Game is already full")]
    GameFull,
    
    #[msg("Invalid proof")]
    InvalidProof,
    
    #[msg("Not authorized")]
    Unauthorized,
    
    #[msg("Card already revealed")]
    AlreadyRevealed,
    
    #[msg("Game has timed out")]
    Timeout,
}
```

---

## PDA Seeds

| Account | Seeds | Description |
|---------|-------|-------------|
| Game | `["game", dealer, game_id]` | Unique per dealer+id |

---

## CPI Integration: Light Protocol

### Groth16 Verification

```rust
use light_verifier::groth16::verify_proof;

pub fn verify_groth16_proof(
    verifier: &AccountInfo,
    proof: &[u8],
    public_inputs: &[[u8; 32]],
) -> Result<()> {
    // Load verification key (stored in account or hardcoded)
    let vk = load_verification_key();
    
    // Verify using Light Protocol
    let valid = verify_proof(&vk, proof, public_inputs)?;
    require!(valid, GameError::InvalidProof);
    
    Ok(())
}
```

---

## Compute Units Estimate

| Instruction | Estimated CUs | Notes |
|-------------|---------------|-------|
| create_game | ~10,000 | Account init |
| verify_shuffle | ~200,000 | Groth16 verification |
| join_game | ~5,000 | Simple state update |
| deal_card | ~50,000 | Deal proof verification |
| player_action | ~5,000 | State update |
| reveal_card | ~30,000 | Reveal proof verification |

> ⚠️ **Must validate Groth16 verification fits within 400,000 CU limit**

---

## Testing

### Unit Tests

```rust
#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_game_state_transitions() {
        // Test valid state transitions
    }
    
    #[test]
    fn test_blackjack_scoring() {
        // Test hand value calculations
    }
}
```

### Integration Tests

```typescript
describe("ZK Card Arena", () => {
    it("Creates game with valid commitment", async () => {
        // Test game creation
    });
    
    it("Verifies shuffle proof", async () => {
        // Test proof verification
    });
    
    it("Plays complete game", async () => {
        // E2E test
    });
});
```
