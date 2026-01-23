# ZK Circuit Status - Marcus

**Updated:** Jan 23, 2026 | **Branch:** `marcus`

---

## ✅ Completed

| Task | Result |
|------|--------|
| Nargo | v1.0.0-beta.18 (macOS) |
| BB | v3.0.0-nightly.20260102 |
| shuffle_proof | `circuits/shuffle_proof/src/main.nr` — 812 constraints, 0.44s native |
| deal_proof | `circuits/deal_proof/src/main.nr` — 1,111 constraints, 0.18s native, 3 tests passing |
| NoirJS (Node) | **0.61s** (shuffle_proof) |
| **Browser proof** | **0.64s** (shuffle_proof, target: <15s) |
| Verification | ✅ Passed (both circuits) |

---

## Files

```
circuits/
├── Nargo.toml                    # Workspace config (members: shuffle_proof, deal_proof)
├── shuffle_proof/
│   ├── Nargo.toml                # Package: shuffle_proof
│   ├── Prover.toml               # Test inputs
│   └── src/main.nr               # Shuffle proof circuit
├── deal_proof/
│   ├── Nargo.toml                # Package: deal_proof
│   ├── Prover.toml               # Test inputs
│   └── src/main.nr               # Deal proof circuit
└── target/                       # Compiled artifacts (gitignored)
    ├── shuffle_proof.json
    └── deal_proof.json
```

---

## Circuit Overview

### Shuffle Proof

**Purpose:** Prove a card shuffle is valid without revealing the order.

| Input | Type | Visibility |
|-------|------|------------|
| seed | Field | Private |
| shuffled_deck | [u8; 13] | Private |
| deck_commitment | Field | Public |
| original_deck | [u8; 13] | Public |

**Proves:**
1. `shuffled_deck` contains cards 0-12 exactly once
2. Poseidon(seed, shuffled_deck) == deck_commitment

### Deal Proof

**Purpose:** Prove a card at a given position comes from the committed deck, without revealing other cards.

| Input | Type | Visibility |
|-------|------|------------|
| seed | Field | Private |
| shuffled_deck | [u8; 13] | Private |
| blinding_factor | Field | Private |
| deck_commitment | Field | Public |
| card_commitment | Field | Public |
| card_position | u8 | Public |

**Proves:**
1. Poseidon(seed, shuffled_deck) == deck_commitment (deck is valid)
2. Poseidon(shuffled_deck[card_position], blinding_factor) == card_commitment (card matches)

**Returns:** card_commitment (pub)

**Public inputs:** 4 fields x 32 bytes = 128 bytes total (deck_commitment, card_commitment, card_position, return value)

---

## 🎯 Day 4 Tasks

Per [MARCUS.md](../worksplit/MARCUS.md):

- [ ] Reveal proof circuit (`circuits/reveal_proof/src/main.nr`)
- [ ] Browser proof timing for deal_proof
- [ ] Begin integration with CKay's on-chain verifier

---

## Quick Commands (macOS)

```bash
cd circuits

# Compile all packages
nargo compile

# Run tests for a specific package
nargo test --package deal_proof
nargo test --package shuffle_proof

# Execute witness (per package)
nargo execute --package deal_proof

# Generate proof (per package — note: use --write_vk flag with prove)
~/.bb/bb prove -b ./target/deal_proof.json -w ./target/deal_proof.gz --write_vk -o target

# Verify proof
~/.bb/bb verify -p ./target/proof -k ./target/vk
```

**BB quirk:** Always use `bb prove --write_vk` to generate the VK alongside the proof. Running standalone `bb write_vk` produces a mismatched VK that fails verification.

---

## Reference

- [MARCUS.md](../worksplit/MARCUS.md) - Full task list
- [Noir Docs](https://noir-lang.org/docs)
- [Barretenberg](https://barretenberg.aztec.network/docs)
