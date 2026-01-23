# ZK Circuit Handover — All 3 Circuits Complete

**Updated:** Jan 23, 2026 | **Branch:** `marcus` | **Deadline:** Feb 1, 2026

---

## Quick Context

**ZK Card Arena** — A provably fair Blackjack game on Solana using zero-knowledge proofs. Players can verify every shuffle, deal, and reveal without seeing the hidden cards. Built for the Solana Privacy Hackathon.

---

## ZK Circuit Status: ALL COMPLETE

| Circuit | Constraints | Native Prove | Tests | Status |
|---------|-------------|-------------|-------|--------|
| shuffle_proof | 812 | 0.44s | 1 | ✅ Complete |
| deal_proof | 1,111 | 0.18s | 3 | ✅ Complete |
| reveal_proof | 333 | 0.011s | 5 | ✅ Complete |

**Browser proof (shuffle_proof only):** 0.64s — well under 15s target.

All circuits compile, test, and generate valid proofs that pass verification.

---

## Circuit Interfaces

### shuffle_proof

```noir
fn main(
    seed: Field,                    // Private
    shuffled_deck: [u8; 13],        // Private
    deck_commitment: pub Field,     // Public
    original_deck: pub [u8; 13]     // Public
) -> pub Field                      // Returns: deck_commitment
```

**Proves:** shuffled_deck is a valid permutation of original_deck, and Poseidon(seed, shuffled_deck) == deck_commitment.

### deal_proof

```noir
fn main(
    seed: Field,                    // Private
    shuffled_deck: [u8; 13],        // Private
    blinding_factor: Field,         // Private
    deck_commitment: pub Field,     // Public
    card_commitment: pub Field,     // Public
    card_position: pub Field        // Public
) -> pub Field                      // Returns: card_commitment
```

**Proves:** (1) Poseidon(seed, shuffled_deck) == deck_commitment, (2) Poseidon(shuffled_deck[position], blinding_factor) == card_commitment.

### reveal_proof

```noir
fn main(
    blinding_factor: Field,         // Private
    card_value: pub Field,          // Public
    card_commitment: pub Field      // Public
) -> pub Field                      // Returns: card_commitment
```

**Proves:** card_value is in range [0,12] and Poseidon(card_value, blinding_factor) == card_commitment.

---

## Proof Chain — How the 3 Circuits Link

```
shuffle_proof                deal_proof                 reveal_proof
─────────────               ──────────                 ────────────
                    deck_commitment                card_commitment
seed + deck ──────► Poseidon hash ──────────┐    ┌──► Poseidon hash ◄── blinding
                         │                  │    │         │
                         ▼                  ▼    │         ▼
                   deck_commitment ═══► deck_commitment    card_commitment
                                        card_position      card_value (revealed!)
                                        blinding ──► card_commitment ═══► card_commitment
```

**The chain of trust:**
1. `shuffle_proof` commits to a deck order → produces `deck_commitment`
2. `deal_proof` proves a card at position N belongs to that committed deck → produces `card_commitment`
3. `reveal_proof` proves a revealed card value matches the commitment → verifies `card_commitment`

**Shared commitment schemes:**
- Deck: `Poseidon(seed, deck[0], ..., deck[12])` — used by shuffle_proof and deal_proof
- Card: `Poseidon(card_value, blinding_factor)` — used by deal_proof and reveal_proof

---

## Key Files to Read

| Path | What |
|------|------|
| `circuits/Nargo.toml` | Workspace config (3 members) |
| `circuits/shuffle_proof/src/main.nr` | Shuffle circuit (812 constraints) |
| `circuits/deal_proof/src/main.nr` | Deal circuit (1,111 constraints) |
| `circuits/reveal_proof/src/main.nr` | Reveal circuit (333 constraints) |
| `circuits/*/Prover.toml` | Test inputs for each circuit |
| `pages/zk-test.js` | Browser proof generation test page |
| `lib/noir/test-proof.mjs` | Node.js proof generation test |
| `marcus-docs/PROOF_FORMAT.md` | Public input specs for on-chain verifier |
| `marcus-docs/flow.md` | Proof flow diagrams |
| `worksplit/MARCUS.md` | Full task breakdown |
| `docs/core/ARCHITECTURE.md` | Overall system architecture |

---

## What's Done

- [x] Nargo v1.0.0-beta.18 installed and configured
- [x] Barretenberg (BB) v3.0.0-nightly.20260102 installed
- [x] shuffle_proof circuit — implemented, tested, proven, verified
- [x] deal_proof circuit — implemented, tested, proven, verified
- [x] reveal_proof circuit — implemented, tested, proven, verified
- [x] Noir workspace structure with all 3 circuits
- [x] NoirJS browser proof generation working for ALL circuits
    - shuffle_proof: 0.54s
    - deal_proof: 0.61s
    - reveal_proof: 0.37s
- [x] `hooks/useZK.js` implemented — unified hook for generating all 3 proofs
- [x] `pages/zk-hook-test.js` — verification page for the hook
- [x] Native proof generation working for all 3
- [x] Proof format documented for CKay's on-chain verifier
- [x] Confirmed 13-card deck (0-12) logic in circuits

---

## What's Next (Week 2 — Ordered)

1.  **Integration testing with on-chain verifier** — CKay's Anchor program + Light Protocol Groth16
    - *Note:* Current proofs are UltraHonk. Need to confirm if we are using Light Protocol's verifier (which usually requires Groth16) or if we are verifying UltraHonk proofs directly/via adapter.
2.  **End-to-end proof chain test** — shuffle→deal→reveal with real game state
3.  **Proof serialization for Solana** — format proof bytes for on-chain submission
4.  **Game loop integration** — connect `useZK` hook to the actual Game UI components

---

## Quick Commands

```bash
cd circuits

# Compile all circuits
nargo compile

# Run all tests
nargo test

# Run tests for specific circuit
nargo test --package shuffle_proof
nargo test --package deal_proof
nargo test --package reveal_proof

# Execute witness
nargo execute --package reveal_proof

# Generate proof (per circuit)
~/.bb/bb prove -b ./target/reveal_proof.json -w ./target/reveal_proof.gz --write_vk -o target

# Verify proof
~/.bb/bb verify -p ./target/proof -k ./target/vk
```

---

## Known Issues / Notes

- **BB quirk:** Always use `bb prove --write_vk` to generate VK alongside the proof. Running standalone `bb write_vk` produces a mismatched VK that fails verification.
- **UltraHonk, not Groth16:** Native proofs use UltraHonk (Barretenberg). On-chain verification will use Light Protocol's Groth16 verifier — conversion/adapter needed.
- **Poseidon v0.2.2:** All circuits depend on `poseidon = { tag = "v0.2.2", git = "https://github.com/noir-lang/poseidon" }`. Do not upgrade without testing.
- **13-card deck:** Currently using a simplified 13-card deck (0-12). Full 52-card deck would increase constraints significantly.
- **VK sizes may differ per circuit** due to different constraint counts.

---

## Reference

- [MARCUS.md](../worksplit/MARCUS.md) — Full task list
- [Noir Docs](https://noir-lang.org/docs)
- [Barretenberg](https://barretenberg.aztec.network/docs)
- [Light Protocol](https://www.lightprotocol.com/)
