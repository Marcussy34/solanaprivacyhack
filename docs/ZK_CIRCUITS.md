# ZK Card Arena - Noir Circuit Specifications

## Overview

ZK Card Arena uses three primary Noir circuits to achieve provably fair gameplay:

1. **Shuffle Proof** - Proves deck is valid permutation
2. **Deal Proof** - Proves dealt card comes from committed deck
3. **Reveal Proof** - Proves revealed card matches commitment

---

## Circuit 1: Shuffle Proof

### Purpose
Prove that a shuffled deck is a valid permutation of the original deck without revealing the shuffle order.

### Specification

```noir
// shuffle_proof.nr

use dep::std;

fn main(
    // Private inputs
    seed: Field,                    // Random seed used for shuffle
    shuffled_deck: [u8; 13],        // The shuffled card indices (hidden)
    
    // Public inputs
    deck_commitment: Field,         // Hash of shuffled deck
    original_deck: [u8; 13]         // Standard deck [0,1,2,...,12]
) {
    // 1. Verify shuffled_deck is permutation of original_deck
    let mut used = [false; 13];
    for i in 0..13 {
        let card = shuffled_deck[i];
        assert(card < 13);
        assert(!used[card as Field]);
        used[card as Field] = true;
    }
    
    // 2. Verify commitment matches shuffled deck
    let computed_commitment = std::hash::poseidon::bn254::hash_13(
        shuffled_deck.map(|x| x as Field)
    );
    assert(computed_commitment == deck_commitment);
    
    // 3. Verify seed was used (prevents replay)
    // Implementation depends on shuffle algorithm
}
```

### Inputs/Outputs

| Type | Name | Visibility | Description |
|------|------|------------|-------------|
| Input | `seed` | Private | Random seed for shuffle |
| Input | `shuffled_deck` | Private | Array of 13 card indices |
| Input | `deck_commitment` | Public | Poseidon hash of deck |
| Input | `original_deck` | Public | [0,1,2,...,12] |
| Output | Proof | - | Groth16 proof bytes |

### Constraints Estimate

| Operation | Estimated Constraints |
|-----------|----------------------|
| Permutation check | ~1,000 |
| Poseidon hash | ~5,000 |
| Bounds checks | ~500 |
| **Total** | **~6,500** |

> ⚠️ **Must benchmark actual constraint count on Day 1**

---

## Circuit 2: Deal Proof

### Purpose
Prove that a dealt card comes from the committed deck at a specific position.

### Specification

```noir
// deal_proof.nr

fn main(
    // Private inputs
    shuffled_deck: [u8; 13],
    card_index: u8,
    blinding_factor: Field,
    
    // Public inputs
    deck_commitment: Field,
    card_commitment: Field,
    card_position: u8
) {
    // 1. Verify deck commitment
    let computed_deck_commitment = hash_deck(shuffled_deck);
    assert(computed_deck_commitment == deck_commitment);
    
    // 2. Get card at position
    let card_value = shuffled_deck[card_position as Field];
    assert(card_value == card_index);
    
    // 3. Verify card commitment
    let computed_card_commitment = std::hash::poseidon::bn254::hash_2([
        card_value as Field,
        blinding_factor
    ]);
    assert(computed_card_commitment == card_commitment);
}
```

### Inputs/Outputs

| Type | Name | Visibility | Description |
|------|------|------------|-------------|
| Input | `shuffled_deck` | Private | Full deck (re-provided) |
| Input | `card_index` | Private | Actual card value |
| Input | `blinding_factor` | Private | Random blinding |
| Input | `deck_commitment` | Public | Original deck commitment |
| Input | `card_commitment` | Public | Commitment to this card |
| Input | `card_position` | Public | Position in deck (0-12) |

---

## Circuit 3: Reveal Proof

### Purpose
Prove that a revealed card value matches its previous commitment.

### Specification

```noir
// reveal_proof.nr

fn main(
    // Private inputs
    blinding_factor: Field,
    
    // Public inputs
    card_value: u8,
    card_commitment: Field
) {
    // Verify commitment opens to claimed value
    let computed_commitment = std::hash::poseidon::bn254::hash_2([
        card_value as Field,
        blinding_factor
    ]);
    assert(computed_commitment == card_commitment);
}
```

### Inputs/Outputs

| Type | Name | Visibility | Description |
|------|------|------------|-------------|
| Input | `blinding_factor` | Private | Same as used in deal |
| Input | `card_value` | Public | Revealed card (0-12) |
| Input | `card_commitment` | Public | Previously committed |

---

## Card Encoding

### 13-Card Mini Deck (MVP)

| Index | Card | Blackjack Value |
|-------|------|-----------------|
| 0 | Ace | 1 or 11 |
| 1 | 2 | 2 |
| 2 | 3 | 3 |
| 3 | 4 | 4 |
| 4 | 5 | 5 |
| 5 | 6 | 6 |
| 6 | 7 | 7 |
| 7 | 8 | 8 |
| 8 | 9 | 9 |
| 9 | 10 | 10 |
| 10 | Jack | 10 |
| 11 | Queen | 10 |
| 12 | King | 10 |

### Full Deck (Future)

52 cards encoded as `suit * 13 + rank` where:
- Suits: 0=Spades, 1=Hearts, 2=Diamonds, 3=Clubs
- Ranks: 0=Ace, 1=2, ..., 12=King

---

## Hash Functions

### Poseidon (Recommended)

- ZK-friendly hash function
- Native to Noir
- ~5,000 constraints per hash

### Usage

```noir
use dep::std::hash::poseidon;

// Hash single field
let h = poseidon::bn254::hash_1([value]);

// Hash multiple fields  
let h = poseidon::bn254::hash_2([a, b]);

// Hash array
let h = poseidon::bn254::hash_13(arr);
```

---

## Proving System

### Groth16

- Proof size: ~256 bytes
- Verification time: ~2-3ms on-chain
- Trusted setup: Required (circuit-specific)

### NoirJS Setup

```javascript
import { Noir } from '@noir-lang/noir_js';
import { BarretenbergBackend } from '@noir-lang/backend_barretenberg';

// Load compiled circuit
const circuit = await fetch('/circuits/shuffle_proof.json')
  .then(r => r.json());

// Initialize backend
const backend = new BarretenbergBackend(circuit);
const noir = new Noir(circuit, backend);

// Generate proof
const { proof, publicInputs } = await noir.generateProof(inputs);
```

---

## Benchmark Requirements

### Day 1 Validation Checklist

- [ ] Shuffle circuit compiles without errors
- [ ] Constraint count < 50,000
- [ ] Proof generation time < 15 seconds (browser)
- [ ] Proof generation time < 5 seconds (native)
- [ ] Proof size < 1KB

### Performance Targets

| Metric | Target | Blocker if |
|--------|--------|-----------|
| Shuffle proof time | < 15s | > 30s |
| Deal proof time | < 5s | > 15s |
| Reveal proof time | < 2s | > 10s |
| Total constraints | < 100k | > 200k |

---

## Directory Structure

```
circuits/
├── Nargo.toml              # Noir project config
├── src/
│   ├── main.nr             # Main entry (or individual circuits)
│   ├── shuffle_proof.nr
│   ├── deal_proof.nr
│   └── reveal_proof.nr
├── target/                 # Compiled artifacts
│   ├── shuffle_proof.json
│   └── ...
└── tests/
    └── shuffle_test.nr
```

---

## Fallback: Commit-Reveal (No ZK)

If circuits don't meet performance targets:

```javascript
// Simple commitment scheme
const commitment = keccak256(cardValue + blindingFactor);

// Reveal
assert(keccak256(revealedValue + blindingFactor) === commitment);
```

This loses ZK properties but maintains provable fairness.
