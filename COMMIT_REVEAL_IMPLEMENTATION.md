# Player-Contributed Entropy: Commit-Reveal Implementation

## Overview

This document describes the implementation of a commit-reveal scheme where both dealer and player contribute entropy to the shuffle seed, ensuring neither party can predict or manipulate the final deck order.

**Problem Solved:** Previously, the dealer controlled 100% of the seed, allowing potential pre-computation of favorable shuffles.

**Solution:** `combined_seed = hash(dealer_entropy XOR player_entropy)`

> Note: We use SHA256 for the XOR combination. Ideally this would be `Poseidon(dealer_entropy, player_entropy)` but on-chain Poseidon is not available without a syscall.

---

## New Game Flow

```
OLD FLOW:                               NEW FLOW:
────────────────────────────            ────────────────────────────
1. Dealer generates seed                1. Dealer generates dealer_entropy
2. Dealer shuffles deck                 2. Dealer computes commitment = SHA256(dealer_entropy)
3. Dealer creates game on-chain         3. Dealer creates game with commitment
4. Dealer submits shuffle proof         4. Player joins with player_entropy
5. Player joins game                    5. Dealer reveals dealer_entropy
6. Deal cards                           6. Contract verifies commitment
                                        7. Frontend computes combined_seed
                                        8. Dealer shuffles with combined_seed
                                        9. Dealer submits shuffle proof + deck_commitment
                                        10. Deal cards
```

---

## State Machine

```
                                    ┌──────────────────┐
                                    │ Created          │
                                    │ (has dealer      │
                                    │  entropy commit) │
                                    └────────┬─────────┘
                                             │ joinGameWithEntropy(player_entropy)
                                             ▼
                                    ┌──────────────────┐
                                    │ AwaitingEntropy  │
                                    │ Reveal           │
                                    │ (has player      │
                                    │  entropy)        │
                                    └────────┬─────────┘
                                             │ revealDealerEntropy(dealer_entropy)
                                             ▼
                                    ┌──────────────────┐
                                    │ AwaitingShuffle  │
                                    │ (entropy_combined│
                                    │  = true)         │
                                    └────────┬─────────┘
                                             │ verifyShuffle(proof, deck_commitment)
                                             ▼
                                    ┌──────────────────┐
                                    │ AwaitingPlayer   │
                                    │ (shuffle_verified│
                                    │  = true)         │
                                    └────────┬─────────┘
                                             │ dealInitialHand()
                                             ▼
                                    ┌──────────────────┐
                                    │ Playing          │
                                    └──────────────────┘
```

---

## Files Modified

### 1. Smart Contract: `programs/zk-card-arena/src/lib.rs`

**New fields in Game struct:**
```rust
// Entropy commit-reveal fields
pub dealer_entropy_commitment: [u8; 32],  // SHA256(dealer_entropy)
pub dealer_entropy: Option<[u8; 32]>,     // Revealed after player joins
pub player_entropy: Option<[u8; 32]>,     // Player's contribution
pub entropy_combined: bool,               // Flag: ready for shuffle
```

**New GameState variants:**
- `AwaitingEntropyReveal` - Player joined, waiting for dealer reveal
- `AwaitingShuffle` - Entropy combined, waiting for shuffle proof

**New instructions:**
- `join_game_with_entropy(player_entropy)` - Player joins and submits entropy
- `reveal_dealer_entropy(dealer_entropy)` - Dealer reveals, contract verifies commitment

**Modified instructions:**
- `create_game` - Now accepts `dealer_entropy_commitment` instead of `deck_commitment`
- `verify_shuffle` - Requires `entropy_combined == true`, accepts `deck_commitment` parameter

### 2. Frontend Hook: `hooks/useZKGame.js`

**New state variables:**
```javascript
const [dealerEntropy, setDealerEntropy] = useState(null);
const [dealerEntropyCommitment, setDealerEntropyCommitment] = useState(null);
const [playerEntropy, setPlayerEntropy] = useState(null);
const [combinedSeed, setCombinedSeed] = useState(null);
```

**New functions:**
- `generateDealerEntropy()` - Step 1a: Dealer generates entropy + commitment
- `generatePlayerEntropy()` - Step 1b: Player generates entropy for submission
- `revealEntropyAndShuffle(playerEntropyFromChain)` - Step 2: Combine, shuffle, prove

### 3. Program Interface: `hooks/useGameProgram.js`

**Updated IDL** with new instructions and Game struct fields.

**New functions:**
- `joinGameWithEntropy(gameId, dealerPubkey, playerEntropy)`
- `revealDealerEntropy(gameId, dealerEntropy)`

**Modified functions:**
- `createGame(gameId, dealerEntropyCommitment)` - Changed parameter name
- `verifyShuffle(gameId, proof, publicInputs, deckCommitment)` - Added deckCommitment

---

## Usage Example

### Dealer Flow

```javascript
import { useZKGame } from '@/hooks/useZKGame';
import { useGameProgram } from '@/hooks/useGameProgram';

function DealerComponent() {
  const { generateDealerEntropy, revealEntropyAndShuffle, dealerEntropyCommitment } = useZKGame();
  const { createGame, revealDealerEntropy, verifyShuffle } = useGameProgram();

  // Step 1: Create game with entropy commitment
  const handleCreateGame = async () => {
    const { dealerEntropyCommitment } = await generateDealerEntropy();
    await createGame(gameId, dealerEntropyCommitment);
    // Game is now in "Created" state, waiting for player
  };

  // Step 2: After player joins, reveal entropy and shuffle
  const handleRevealAndShuffle = async (playerEntropyFromChain) => {
    // Reveal entropy on-chain
    const { dealerEntropy } = await generateDealerEntropy(); // Already stored
    await revealDealerEntropy(gameId, dealerEntropy);

    // Now combine entropies, shuffle, and generate proof
    const { deckCommitmentBytes, proof, publicInputs } =
      await revealEntropyAndShuffle(playerEntropyFromChain);

    // Submit shuffle proof
    await verifyShuffle(gameId, proof, publicInputs, deckCommitmentBytes);
    // Game is now in "AwaitingPlayer" state, ready to deal
  };
}
```

### Player Flow

```javascript
function PlayerComponent() {
  const { generatePlayerEntropy } = useZKGame();
  const { joinGameWithEntropy } = useGameProgram();

  const handleJoinGame = async () => {
    const { playerEntropy } = generatePlayerEntropy();
    await joinGameWithEntropy(gameId, dealerPubkey, playerEntropy);
    // Game is now in "AwaitingEntropyReveal" state
  };
}
```

---

## Security Analysis

| Attack Vector | Mitigation |
|--------------|------------|
| Dealer predicts player entropy | Player entropy submitted AFTER dealer commits |
| Player predicts dealer entropy | Dealer commitment is SHA256 hash, not plaintext |
| Dealer changes entropy after seeing player's | On-chain verification: SHA256(revealed) == commitment |
| Replay attacks | Combined seed derived from both entropies + game-specific context |
| Dealer refuses to reveal | Future: Add timeout + player can claim win |

---

## Circuit Compatibility

The shuffle proof circuit (`circuits/shuffle_proof/`) requires NO changes:

```noir
fn main(
    seed: Field,                    // Now: combined_seed
    shuffled_deck: [u8; 13],
    deck_commitment: pub Field,
    original_deck: pub [u8; 13]
)
```

The circuit is agnostic to HOW the seed was derived. It only proves:
1. `deck_commitment == Poseidon(seed, shuffled_deck)`
2. `shuffled_deck` is a valid permutation of `original_deck`

The commit-reveal scheme ensures the `seed` (now `combined_seed`) is unpredictable to both parties.

---

## Testing Checklist

- [ ] Create game with dealer entropy commitment
- [ ] Player joins with entropy
- [ ] Dealer reveals entropy, on-chain verification passes
- [ ] Shuffle proof verification succeeds after entropy combined
- [ ] Legacy flow still works (for existing games)
- [ ] Invalid entropy reveal is rejected (wrong preimage)
- [ ] Shuffle proof rejected if entropy not combined

---

## Future Improvements

1. **On-chain Poseidon**: If Solana adds Poseidon syscall, use `Poseidon(dealer, player)` instead of SHA256(XOR)
2. **Timeout mechanism**: Auto-resolve if dealer doesn't reveal within N slots
3. **Entropy proof**: Optional ZK proof that dealer committed correctly (entropy_proof circuit)
4. **Multi-party entropy**: Allow spectators to contribute entropy for maximum fairness
