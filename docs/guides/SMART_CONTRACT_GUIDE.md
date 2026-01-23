# ZK Card Arena - Smart Contract Deep Dive

> **For:** CK (Full-Stack Developer)
> **Purpose:** Understand the Blackjack smart contract and how to test it
> **Program ID:** `22BfrTbAzVmwENnyfzk6rFtPaNvCmaATbeWaJKKoqkK4`

---

## Table of Contents

1. [Overview](#overview)
2. [Game State Machine](#game-state-machine)
3. [Instructions (Functions)](#instructions)
4. [Account Structure](#account-structure)
5. [How Testing Works](#how-testing-works)
6. [Running Tests](#running-tests)
7. [Common Patterns](#common-patterns)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The ZK Card Arena smart contract implements a **provably fair Blackjack game** on Solana. Here's the high-level flow:

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Dealer    │    │   Dealer    │    │   Player    │    │   Dealer    │
│ Creates Game│───▶│  Verifies   │───▶│   Joins     │───▶│ Deals Cards │
│             │    │  Shuffle    │    │   Game      │    │             │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                                                │
                                                                ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Winner    │◀───│   Dealer    │◀───│   Player    │◀───│   Player    │
│  Determined │    │ Reveals All │    │   Stands    │    │   Plays     │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

### Key Concepts

| Concept | Description |
|---------|-------------|
| **Dealer** | Creates the game, shuffles deck, deals cards, reveals cards |
| **Player** | Joins game, makes decisions (hit/stand/double) |
| **Commitment** | Hash of card/deck - proves cards weren't changed |
| **PDA** | Program Derived Address - unique account for each game |

---

## Game State Machine

The game progresses through these states:

```
┌──────────┐
│ Created  │  ← Game initialized, deck commitment stored
└────┬─────┘
     │ verify_shuffle()
     ▼
┌──────────────────┐
│ AwaitingPlayer   │  ← Shuffle proof verified, waiting for player
└────────┬─────────┘
         │ join_game()
         ▼
┌──────────┐
│ Playing  │  ← Game active, player can hit/stand/double
└────┬─────┘
     │ player_action(Stand) or player_action(Double)
     ▼
┌────────────┐
│ DealerTurn │  ← Player done, dealer plays & reveals
└─────┬──────┘
      │ reveal_card() (all cards)
      ▼
┌─────────────────────────────────┐
│ PlayerWon / DealerWon / Push    │  ← Final outcome
└─────────────────────────────────┘
```

### State Definitions (from lib.rs:361-380)

```rust
pub enum GameState {
    Created,        // Game created, awaiting shuffle proof
    AwaitingPlayer, // Shuffle verified, awaiting player
    Playing,        // Game in progress
    DealerTurn,     // Player stood, dealer's turn
    Revealing,      // Revealing cards (unused currently)
    PlayerWon,      // Player won
    DealerWon,      // Dealer won
    Push,           // Tie
    Abandoned,      // Game abandoned (unused currently)
}
```

---

## Instructions

### 1. `create_game` (lib.rs:10-32)

**Purpose:** Initialize a new game with a deck commitment.

**Who calls it:** Dealer (game creator)

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `game_id` | `u64` | Unique identifier (we use timestamp) |
| `deck_commitment` | `[u8; 32]` | Poseidon hash of shuffled deck |

**What it does:**
```rust
game.dealer = ctx.accounts.dealer.key();  // Store dealer pubkey
game.player = None;                        // No player yet
game.deck_commitment = deck_commitment;    // Store deck hash
game.shuffle_verified = false;             // Not verified yet
game.state = GameState::Created;           // Initial state
game.deck_position = 0;                    // No cards dealt
```

**State transition:** `None → Created`

---

### 2. `verify_shuffle` (lib.rs:53-76)

**Purpose:** Verify the ZK proof that deck was shuffled fairly.

**Who calls it:** Dealer

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `proof` | `Vec<u8>` | Groth16 proof bytes |
| `public_inputs` | `Vec<[u8; 32]>` | Public inputs for verification |

**What it does (currently stub):**
```rust
// TODO: Implement CPI to Sunspot shuffle verifier
// Instruction data format: proof_bytes || public_witness_bytes
// For now, just mark as verified
game.shuffle_verified = true;
game.state = GameState::AwaitingPlayer;
```

**State transition:** `Created → AwaitingPlayer`

**Note:** This is a stub! Next step is to integrate Sunspot's Groth16 verifier via CPI.

---

### 3. `join_game` (lib.rs:35-49)

**Purpose:** Allow a player to join an existing game.

**Who calls it:** Player

**Parameters:** None (player pubkey comes from signer)

**What it does:**
```rust
game.player = Some(ctx.accounts.player.key());  // Store player
game.state = GameState::Playing;                 // Game starts!
```

**State transition:** `AwaitingPlayer → Playing`

**Constraints:**
- Game must be in `AwaitingPlayer` state
- No player already joined

---

### 4. `player_action` (lib.rs:79-108)

**Purpose:** Player makes a decision (hit, stand, or double).

**Who calls it:** Player

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `action` | `PlayerActionType` | Hit, Stand, or Double |

**What it does:**
```rust
match action {
    PlayerActionType::Hit => {
        // Just log - card dealt separately
    }
    PlayerActionType::Stand => {
        game.state = GameState::DealerTurn;  // Player done
    }
    PlayerActionType::Double => {
        game.state = GameState::DealerTurn;  // Double down
    }
}
```

**State transition:** `Playing → DealerTurn` (on Stand/Double)

---

### 5. `deal_card` (lib.rs:111-137)

**Purpose:** Dealer deals a card (as a commitment, not revealed yet).

**Who calls it:** Dealer

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `card_commitment` | `[u8; 32]` | Hash of the card |
| `to_player` | `bool` | true = player's card, false = dealer's |

**What it does:**
```rust
if to_player {
    game.player_cards.push(card_commitment);
} else {
    game.dealer_cards.push(card_commitment);
}
game.deck_position += 1;  // Track position in deck
```

**State transition:** None (stays in current state)

---

### 6. `reveal_card` (lib.rs:140-178)

**Purpose:** Reveal a card's actual value.

**Who calls it:** Dealer

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `card_index` | `u8` | Which card (0, 1, 2...) |
| `card_value` | `u8` | Card value (0-12) |
| `is_player_card` | `bool` | true = player's card |

**Card Values:**
```
0  = Ace (1 or 11)
1  = 2
2  = 3
...
8  = 9
9  = 10
10 = Jack (10)
11 = Queen (10)
12 = King (10)
```

**What it does:**
```rust
if is_player_card {
    game.player_revealed.push(card_value);
} else {
    game.dealer_revealed.push(card_value);
}

// When all cards revealed, determine winner
if all_revealed {
    determine_winner(game)?;
}
```

**State transition:** When all revealed → `PlayerWon` / `DealerWon` / `Push`

---

## Account Structure

### Game Account (lib.rs:315-358)

```rust
pub struct Game {
    pub dealer: Pubkey,              // 32 bytes - Dealer wallet
    pub player: Option<Pubkey>,      // 33 bytes - Player wallet (or None)
    pub deck_commitment: [u8; 32],   // 32 bytes - Hash of shuffled deck
    pub shuffle_verified: bool,      // 1 byte
    pub state: GameState,            // 1 byte (enum)
    pub player_cards: Vec<[u8; 32]>, // 4 + (32 * max 10) = 324 bytes
    pub dealer_cards: Vec<[u8; 32]>, // 4 + (32 * max 10) = 324 bytes
    pub player_revealed: Vec<u8>,    // 4 + (1 * max 10) = 14 bytes
    pub dealer_revealed: Vec<u8>,    // 4 + (1 * max 10) = 14 bytes
    pub deck_position: u8,           // 1 byte
    pub game_id: u64,                // 8 bytes
    pub created_at: i64,             // 8 bytes
    pub bump: u8,                    // 1 byte
}
```

### PDA (Program Derived Address)

Each game has a unique address derived from:
```
seeds = ["game", dealer_pubkey, game_id_bytes]
```

This means:
- Same dealer can create many games (different game_id)
- Each game has a deterministic, unique address
- Anyone can compute the address if they know dealer + game_id

---

## How Testing Works

### Test File Structure

```
tests/zk-card-arena.ts
├── Setup (before hook)
│   ├── Create connection to devnet
│   ├── Load wallet from ~/.config/solana/id.json
│   ├── Generate unique game ID
│   └── Derive game PDA
│
├── describe("Game Creation")
│   └── it("Creates a new game")
│
├── describe("Shuffle Verification")
│   └── it("Verifies shuffle proof")
│
├── describe("Player Joins Game")
│   └── it("Allows a player to join")
│
├── describe("Card Dealing")
│   └── it("Dealer deals cards")
│
├── describe("Player Actions")
│   └── it("Player stands")
│
├── describe("Card Reveal & Winner")
│   └── it("Reveals all cards and determines winner")
│
└── describe("Final Game State")
    └── it("Shows complete game summary")
```

### Key Testing Concepts

#### 1. Calling Instructions

```typescript
// Pattern: program.methods.instructionName(args).accounts({...}).rpc()

await program.methods
  .createGame(gameId, Array.from(deckCommitment))  // Args
  .accounts({                                       // Accounts
    game: gamePda,
    dealer: dealer.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .rpc();  // Send transaction
```

#### 2. Fetching Account Data

```typescript
// Fetch game account and read its data
const gameAccount = await program.account.game.fetch(gamePda);

console.log(gameAccount.dealer.toBase58());    // Pubkey as string
console.log(gameAccount.state);                // { created: {} }
console.log(gameAccount.deckPosition);         // Number
```

#### 3. Handling Enums in TypeScript

Anchor represents enums as objects with one key:

```typescript
// Rust: GameState::Created
// TypeScript: { created: {} }

// Check state:
const stateName = Object.keys(gameAccount.state)[0];  // "created"

// Pass enum as argument:
.playerAction({ stand: {} })  // PlayerActionType::Stand
.playerAction({ hit: {} })    // PlayerActionType::Hit
```

#### 4. Adding Signers

When someone other than the wallet signs:

```typescript
// Player is a different keypair, needs to sign
await program.methods
  .joinGame()
  .accounts({
    game: gamePda,
    player: player.publicKey,
  })
  .signers([player])  // Add player as signer!
  .rpc();
```

#### 5. Assertions with Chai

```typescript
const { expect } = require("chai");

expect(gameAccount.dealer.toBase58()).to.equal(dealer.publicKey.toBase58());
expect(gameAccount.player).to.be.null;
expect(gameAccount.shuffleVerified).to.be.true;
expect(gameAccount.deckPosition).to.equal(4);
```

---

## Running Tests

### Prerequisites

1. **Solana CLI configured for devnet:**
   ```bash
   solana config set --url devnet
   ```

2. **Wallet with devnet SOL:**
   ```bash
   solana balance  # Should show > 0.5 SOL
   solana airdrop 2  # Get more if needed (may fail, retry)
   ```

3. **Dependencies installed:**
   ```bash
   npm install
   ```

### Run All Tests

```bash
npm test
```

Expected output:
```
  ZK Card Arena
    Game Creation
      ✔ Creates a new game with deck commitment (2145ms)
    Shuffle Verification
      ✔ Verifies shuffle proof (stub) (1447ms)
    Player Joins Game
      ✔ Allows a player to join (2585ms)
    Card Dealing
      ✔ Dealer deals cards to player and self (4626ms)
    Player Actions
      ✔ Player stands (1868ms)
    Card Reveal & Winner Determination
      ✔ Reveals all cards and determines winner (4323ms)
    Final Game State
      ✔ Shows complete game summary (179ms)

  7 passing (17s)
```

### Run Specific Test

```bash
# Run only tests matching a pattern
npm test -- --grep "Game Creation"
```

### Verbose Output

The test file includes `console.log` statements. You'll see:
- Transaction signatures (can verify on Solana Explorer)
- Game state changes
- Card values being revealed

---

## Common Patterns

### 1. Deriving PDAs

```typescript
const [gamePda, gameBump] = PublicKey.findProgramAddressSync(
  [
    Buffer.from("game"),                    // Seed 1: literal string
    dealer.publicKey.toBuffer(),            // Seed 2: dealer pubkey
    gameId.toArrayLike(Buffer, "le", 8),    // Seed 3: game ID (little-endian)
  ],
  programId
);
```

### 2. Converting Arrays

```typescript
// Uint8Array to Array (for instruction args)
Array.from(deckCommitment)

// BN to Buffer (for PDA seeds)
gameId.toArrayLike(Buffer, "le", 8)
```

### 3. Reading Timestamps

```typescript
// Game has created_at as i64
const createdAt = gameAccount.createdAt.toNumber();
const date = new Date(createdAt * 1000);  // Convert to JS Date
```

---

## Troubleshooting

### Error: "Invalid game state for this action"

**Cause:** Trying to call an instruction when game is in wrong state.

**Fix:** Check the state machine diagram. Example:
- Can't `join_game` if state is `Created` (need to verify shuffle first)
- Can't `deal_card` if state is `AwaitingPlayer` (need player to join first)

### Error: "Not authorized for this action"

**Cause:** Wrong signer calling the instruction.

**Fix:**
- `deal_card` / `reveal_card` / `verify_shuffle` → Only dealer can call
- `player_action` / `join_game` → Only player can call

### Error: "Game is already full"

**Cause:** Trying to join a game that already has a player.

**Fix:** Create a new game, or wait for current game to finish.

### Error: Airdrop failed

**Cause:** Devnet airdrop is rate-limited and unreliable.

**Fix:** We use transfer from dealer instead:
```typescript
const transferTx = new anchor.web3.Transaction().add(
  anchor.web3.SystemProgram.transfer({
    fromPubkey: dealer.publicKey,
    toPubkey: player.publicKey,
    lamports: 0.05 * anchor.web3.LAMPORTS_PER_SOL,
  })
);
await provider.sendAndConfirm(transferTx);
```

### Error: Cannot read properties of undefined (reading '_bn')

**Cause:** Anchor SDK version mismatch.

**Fix:** Use `@coral-xyz/anchor` version `0.28.0` to match program's `anchor-lang` version.

---

## Next Steps

After understanding this contract:

1. **Frontend Integration** - Use the IDL to call these instructions from React
2. **NoirJS Integration** - Generate witness for proof generation
3. **Sunspot Backend** - Generate Groth16 proofs via API
4. **CPI Integration** - Replace `verify_shuffle` stub with Sunspot verifier CPI

---

## Quick Reference

| Instruction | Who | State Before | State After |
|-------------|-----|--------------|-------------|
| `create_game` | Dealer | - | Created |
| `verify_shuffle` | Dealer | Created | AwaitingPlayer |
| `join_game` | Player | AwaitingPlayer | Playing |
| `deal_card` | Dealer | Playing/DealerTurn | (unchanged) |
| `player_action(Hit)` | Player | Playing | Playing |
| `player_action(Stand)` | Player | Playing | DealerTurn |
| `reveal_card` | Dealer | DealerTurn | PlayerWon/DealerWon/Push |

---

*Last updated: January 22, 2026*
