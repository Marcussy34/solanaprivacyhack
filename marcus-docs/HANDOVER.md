# ZK Circuit Status - Marcus

**Updated:** Jan 22, 2026 | **Branch:** `marcus`

---

## ✅ Completed

| Task | Result |
|------|--------|
| Nargo | v1.0.0-beta.18 (macOS) |
| BB | v3.0.0-nightly.20260102 |
| Circuit | `circuits/src/main.nr` |
| Constraints | **812** (target: <50k) |
| Native proof | **0.44s** (target: <5s) |
| NoirJS proof | **0.61s** (Node.js) |
| Verification | ✅ Passed |

---

## Files

```
circuits/
├── Nargo.toml          # Package config
├── Prover.toml         # Test inputs
├── src/main.nr         # Shuffle proof circuit
└── target/
    ├── proof           # Generated proof
    ├── vk              # Verification key
    └── public_inputs   # Public inputs
```

---

## Circuit Overview

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

---

## 🎯 Day 2 Tasks

Per [MARCUS.md](../worksplit/MARCUS.md):

- [ ] Set up NoirJS for browser proving
- [ ] Measure browser proof time (target: <15s, blocker: >30s)
- [ ] Document proof format for CKay

---

## Quick Commands (macOS)

```bash
cd circuits

# Compile
nargo compile

# Execute witness
nargo execute

# Generate proof
~/.bb/bb prove -b ./target/shuffle_proof.json -w ./target/shuffle_proof.gz --write_vk -o target

# Verify proof
~/.bb/bb verify -p ./target/proof -k ./target/vk
```

---

## Reference

- [MARCUS.md](../worksplit/MARCUS.md) - Full task list
- [Noir Docs](https://noir-lang.org/docs)
- [Barretenberg](https://barretenberg.aztec.network/docs)
