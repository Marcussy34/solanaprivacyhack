# ZK Card Arena - Test Walkthrough

> **Purpose:** Step-by-step guide to running and understanding the test suite
> **Command:** `npm test`

---

## Running the Tests

```bash
npm test
```

This runs the full game flow on **Solana devnet** - real transactions, real blockchain!

---

## Step-by-Step Breakdown

### 1. Test Setup

**Expected output:**
```
=== Test Setup ===
Program ID: 22BfrTbAzVmwENnyfzk6rFtPaNvCmaATbeWaJKKoqkK4
Dealer: FBbtnQhu1c1kk4x9mGeL4QWbY5khrnbQ2CzoCsJq2M2d
Player: [random pubkey - different each run]
Game PDA: [unique address - different each run]
Game ID: [timestamp - different each run]
```

**What's happening:**
| Action | Description |
|--------|-------------|
| Connect to devnet | `https://api.devnet.solana.com` |
| Load dealer wallet | From `~/.config/solana/id.json` (YOUR wallet) |
| Generate player | Random keypair (new wallet for this test) |
| Compute Game PDA | Unique address = hash("game" + dealer + gameId) |
| Generate Game ID | `Date.now()` timestamp for uniqueness |

---

### 2. Game Creation Test

**Expected output:**
```
Creating game...
Transaction signature: [long base58 string]
Game created successfully!
  State: created
  Dealer: FBbtnQhu1c1kk4x9mGeL4QWbY5khrnbQ2CzoCsJq2M2d
  Deck Position: 0
    ✔ Creates a new game with deck commitment (2000-3000ms)
```

**What's happening:**
```
┌─────────────────────────────────────────────────────────────┐
│  Instruction: create_game(gameId, deckCommitment)           │
├─────────────────────────────────────────────────────────────┤
│  • Creates new account at PDA address                       │
│  • Stores dealer pubkey                                     │
│  • Stores deck commitment (hash of shuffled deck)           │
│  • Sets state = Created                                     │
│  • Sets deck_position = 0                                   │
└─────────────────────────────────────────────────────────────┘
```

**Transaction signature:** You can look this up on [Solana Explorer](https://explorer.solana.com/?cluster=devnet)!

---

### 3. Shuffle Verification Test

**Expected output:**
```
Verifying shuffle...
Transaction signature: [long base58 string]
Shuffle verified!
  State: awaitingPlayer
  Shuffle Verified: true
    ✔ Verifies shuffle proof (stub) (1000-2000ms)
```

**What's happening:**
```
┌─────────────────────────────────────────────────────────────┐
│  Instruction: verify_shuffle(proof, publicInputs)           │
├─────────────────────────────────────────────────────────────┤
│  • CURRENTLY A STUB - doesn't verify real proofs yet!       │
│  • Will integrate Light Protocol Groth16 on Day 5           │
│  • Just marks shuffle_verified = true                       │
│  • State transition: Created → AwaitingPlayer               │
└─────────────────────────────────────────────────────────────┘
```

**State Machine:**
```
  Created ──verify_shuffle()──▶ AwaitingPlayer
```

---

### 4. Player Joins Test

**Expected output:**
```
Player joining game...
  Transferred 0.05 SOL to player
Transaction signature: [long base58 string]
Player joined!
  State: playing
  Player: [player pubkey]
    ✔ Allows a player to join (2000-3000ms)
```

**What's happening:**
```
┌─────────────────────────────────────────────────────────────┐
│  Step 1: Transfer SOL to player                             │
├─────────────────────────────────────────────────────────────┤
│  • Player is a new random wallet with 0 SOL                 │
│  • Needs SOL to pay transaction fees                        │
│  • Dealer sends 0.05 SOL to player                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 2: Instruction: join_game()                           │
├─────────────────────────────────────────────────────────────┤
│  • Signed by PLAYER (not dealer)                            │
│  • Stores player pubkey in game account                     │
│  • State transition: AwaitingPlayer → Playing               │
│  • Game is now active!                                      │
└─────────────────────────────────────────────────────────────┘
```

**Why transfer instead of airdrop?** Devnet airdrops are rate-limited and often fail. Transfer is more reliable.

---

### 5. Card Dealing Test

**Expected output:**
```
Dealing cards...
  Dealt card 1 to player
  Dealt card 2 to player
  Dealt card 1 to dealer
  Dealt card 2 to dealer
Cards dealt!
  Player cards: 2
  Dealer cards: 2
  Deck position: 4
    ✔ Dealer deals cards to player and self (4000-5000ms)
```

**What's happening:**
```
┌─────────────────────────────────────────────────────────────┐
│  4 Separate Transactions (deal_card)                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  TX 1: deal_card(commitment1, to_player=true)               │
│        → player_cards = [commitment1]                       │
│                                                             │
│  TX 2: deal_card(commitment2, to_player=true)               │
│        → player_cards = [commitment1, commitment2]          │
│                                                             │
│  TX 3: deal_card(commitment3, to_player=false)              │
│        → dealer_cards = [commitment3]                       │
│                                                             │
│  TX 4: deal_card(commitment4, to_player=false)              │
│        → dealer_cards = [commitment3, commitment4]          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Key insight:** Cards are stored as **commitments** (hashes), not actual values. Nobody knows what the cards are yet! This is the "ZK" part - cards are hidden until revealed.

---

### 6. Player Action Test

**Expected output:**
```
Player standing...
Transaction signature: [long base58 string]
Player stood!
  State: dealerTurn
    ✔ Player stands (1000-2000ms)
```

**What's happening:**
```
┌─────────────────────────────────────────────────────────────┐
│  Instruction: player_action({ stand: {} })                  │
├─────────────────────────────────────────────────────────────┤
│  • Player decides to keep current cards                     │
│  • No more "hit" requests                                   │
│  • State transition: Playing → DealerTurn                   │
│  • Now it's dealer's turn to reveal cards                   │
└─────────────────────────────────────────────────────────────┘
```

**Available actions:**
| Action | Effect |
|--------|--------|
| `{ hit: {} }` | Request another card (stays in Playing) |
| `{ stand: {} }` | Keep cards, end turn (→ DealerTurn) |
| `{ double: {} }` | Double bet, get one card, end turn (→ DealerTurn) |

---

### 7. Card Reveal & Winner Determination

**Expected output:**
```
Revealing cards...
  Revealed player card 1: Ace (0)
  Revealed player card 2: King (12)
  Revealed dealer card 1: Ten (9)
  Revealed dealer card 2: Seven (6)

=== GAME RESULT ===
  Final State: playerWon
  Player cards revealed: [ 0, 12 ]
  Dealer cards revealed: [ 9, 6 ]

  PLAYER WINS WITH BLACKJACK!
    ✔ Reveals all cards and determines winner (4000-5000ms)
```

**What's happening:**
```
┌─────────────────────────────────────────────────────────────┐
│  4 Separate Transactions (reveal_card)                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  TX 1: reveal_card(index=0, value=0, is_player=true)        │
│        → Ace revealed for player                            │
│                                                             │
│  TX 2: reveal_card(index=1, value=12, is_player=true)       │
│        → King revealed for player                           │
│                                                             │
│  TX 3: reveal_card(index=0, value=9, is_player=false)       │
│        → Ten revealed for dealer                            │
│                                                             │
│  TX 4: reveal_card(index=1, value=6, is_player=false)       │
│        → Seven revealed for dealer                          │
│        → ALL CARDS REVEALED → determine_winner() called!    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Card Value Mapping:**
```
Value 0  = Ace    (1 or 11)
Value 1  = 2
Value 2  = 3
...
Value 8  = 9
Value 9  = 10
Value 10 = Jack   (10)
Value 11 = Queen  (10)
Value 12 = King   (10)
```

**Score Calculation:**
```
Player: Ace (11) + King (10) = 21  ← BLACKJACK!
Dealer: Ten (10) + Seven (7) = 17

21 > 17 → Player Wins!
```

**Winner Logic (from smart contract):**
```rust
if player_total > 21        → DealerWon (player busts)
else if dealer_total > 21   → PlayerWon (dealer busts)
else if player > dealer     → PlayerWon
else if dealer > player     → DealerWon
else                        → Push (tie)
```

---

### 8. Final Summary

**Expected output:**
```
========================================
         FINAL GAME SUMMARY
========================================
Game ID: [timestamp]
Dealer: FBbtnQhu1c1kk4x9mGeL4QWbY5khrnbQ2CzoCsJq2M2d
Player: [player pubkey]
State: playerWon
Shuffle Verified: true
Player Cards (revealed): [ 0, 12 ]
Dealer Cards (revealed): [ 9, 6 ]
Total Cards Dealt: 4
========================================
    ✔ Shows complete game summary
```

This just fetches the final game state and displays it - no transaction needed.

---

## Final Result

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

---

## Verifying on Solana Explorer

Every transaction signature can be verified!

1. Copy any transaction signature from the output
2. Go to [Solana Explorer (Devnet)](https://explorer.solana.com/?cluster=devnet)
3. Paste the signature in the search box
4. See the full transaction details!

---

## Cost Breakdown

Each test run costs approximately:
- Game creation: ~0.003 SOL (account rent)
- Each transaction: ~0.000005 SOL (tx fee)
- Player funding: 0.05 SOL (transferred, not lost)

**Total per run:** ~0.06 SOL

---

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `insufficient funds` | Wallet empty | `solana airdrop 2` |
| `Invalid game state` | Wrong order | Check state machine |
| `Unauthorized` | Wrong signer | Check who should sign |
| `Transaction timeout` | Network slow | Just retry |

---

*Last updated: January 22, 2026*
