# ZK Proof Format Specification

**For:** CKay (Anchor Contract Integration)  
**Updated:** Jan 22, 2026

---

## Overview

The shuffle proof uses **UltraHonk** (Barretenberg). All data is big-endian.

---

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

## Files

- Circuit: `circuits/src/main.nr`
- Test page: `pages/zk-test.js`
- Node test: `lib/noir/test-proof.mjs`
