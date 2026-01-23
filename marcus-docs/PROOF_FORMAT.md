# ZK Proof Format Specification

**For:** CKay (Anchor Contract Integration)
**Updated:** Jan 23, 2026

---

## Overview

All 3 circuits use **UltraHonk** (Barretenberg). All data is big-endian.

**Note:** VK sizes may differ per circuit due to different constraint counts.

---

# Shuffle Proof

## File Sizes

| File | Size | Description |
|------|------|-------------|
| `proof` | 16,256 bytes | ZK proof |
| `vk` | 3,680 bytes | Verification key |
| `public_inputs` | 480 bytes | 15 fields × 32 bytes |

---

## Public Inputs (15 fields)

Each field is 32 bytes (256-bit big-endian):

| Index | Description | Example Value |
|-------|-------------|---------------|
| 0 | `deck_commitment` | `0x04b91d7c...ed7e` |
| 1-13 | `original_deck[0..12]` | `0x00...00`, `0x00...01`, etc |
| 14 | `deck_commitment` (duplicate return) | Same as index 0 |

---

## NoirJS Proof Object

```javascript
// From backend.generateProof(witness)
const proof = {
  proof: Uint8Array(16256),      // The actual proof bytes
  publicInputs: string[]          // Array of 15 hex strings
};
```

---

## Usage in Anchor

```rust
// Proof data to pass to Solana program
pub struct ShuffleProof {
    pub proof: [u8; 16256],          // Proof bytes
    pub deck_commitment: [u8; 32],   // Public input 0
    pub original_deck: [[u8; 32]; 13], // Public inputs 1-13
}
```

---

## Verification Key

The `vk` file (3,680 bytes) is **fixed** for this circuit. It can be:
1. Embedded in the Anchor program
2. Stored on-chain as a PDA
3. Passed as an account

---

## Test Values

```toml
# From Prover.toml
seed = "12345"                   # Private
shuffled_deck = [5, 2, 11, 0, 8, 3, 12, 6, 1, 9, 4, 10, 7]  # Private
deck_commitment = "0x04b91d7cc07a8e73f8ea50ec08d0457c785953dae3c2624a3a0a4ead6c02ed7e"
original_deck = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
```

---

# Deal Proof

## Public Inputs (4 fields)

Each field is 32 bytes (256-bit big-endian):

| Index | Description | Example Value |
|-------|-------------|---------------|
| 0 | `deck_commitment` | `0x04b91d7c...ed7e` |
| 1 | `card_commitment` | `0x09855b33...552b` |
| 2 | `card_position` | `0x00...00` (position 0) |
| 3 | `card_commitment` (return value) | Same as index 1 |

## NoirJS Proof Object

```javascript
const proof = {
  proof: Uint8Array,              // Proof bytes
  publicInputs: string[]          // Array of 4 hex strings
};
```

## Usage in Anchor

```rust
pub struct DealProof {
    pub proof: Vec<u8>,                  // Proof bytes
    pub deck_commitment: [u8; 32],       // Public input 0
    pub card_commitment: [u8; 32],       // Public input 1
    pub card_position: [u8; 32],         // Public input 2
}
```

---

# Reveal Proof

## Public Inputs (3 fields)

Each field is 32 bytes (256-bit big-endian):

| Index | Description | Example Value |
|-------|-------------|---------------|
| 0 | `card_value` | `0x00...05` (card 5) |
| 1 | `card_commitment` | `0x09855b33...552b` |
| 2 | `card_commitment` (return value) | Same as index 1 |

## NoirJS Proof Object

```javascript
const proof = {
  proof: Uint8Array,              // Proof bytes
  publicInputs: string[]          // Array of 3 hex strings
};
```

## Usage in Anchor

```rust
pub struct RevealProof {
    pub proof: Vec<u8>,                  // Proof bytes
    pub card_value: [u8; 32],            // Public input 0
    pub card_commitment: [u8; 32],       // Public input 1
}
```

---

# Commitment Linking

The three proofs are linked by shared commitments:

```
shuffle_proof.deck_commitment == deal_proof.deck_commitment
deal_proof.card_commitment   == reveal_proof.card_commitment
```

This ensures a card revealed at game end is the same card dealt from the same shuffled deck.

---

## Files

- Shuffle circuit: `circuits/shuffle_proof/src/main.nr`
- Deal circuit: `circuits/deal_proof/src/main.nr`
- Reveal circuit: `circuits/reveal_proof/src/main.nr`
- Test page: `pages/zk-test.js`
- Node test: `lib/noir/test-proof.mjs`
