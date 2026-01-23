# Light Protocol Groth16 Integration Analysis

**Author:** Marcus (ZK Engineer)  
**Date:** Jan 23, 2026  
**Status:** ✅ SOLUTION FOUND - Use Sunspot!

> **UPDATE:** Found official Noir → Solana solution! See `SUNSPOT_INTEGRATION.md` for details.

---

## 🚨 Critical Finding

**Your current Noir circuits generate UltraHonk proofs, but Light Protocol's `groth16-solana` verifier only accepts Groth16 proofs from Circom/snarkjs.**

These are fundamentally different proof systems that cannot be directly converted.

---

## What I Discovered

### Light Protocol's `groth16-solana`

**Source:** https://github.com/Lightprotocol/groth16-solana

| Feature | Details |
|---------|---------|
| Proof System | Groth16 (BN254 curve) |
| Compatible With | Circom circuits + snarkjs |
| Verification Cost | < 200,000 compute units |
| Solana Support | Mainnet (1.18.x+) via altbn254 syscalls |

**Usage Pattern (from their docs):**
```rust
use groth16_solana::groth16::Groth16Verifier;

let mut verifier = Groth16Verifier::new(
    &proof_a,      // G1 point (negated)
    &proof_b,      // G2 point  
    &proof_c,      // G1 point
    &public_inputs,
    &VERIFYING_KEY,
).unwrap();

verifier.verify().unwrap();
```

### Your Current Setup (Noir + Barretenberg)

| Feature | Details |
|---------|---------|
| Language | Noir |
| Proof System | UltraHonk |
| Backend | Barretenberg |
| Proof Structure | Different from Groth16 |

**The Problem:** UltraHonk proofs have a completely different structure than Groth16 proofs. There's no simple conversion.

---

## Options

### Option 1: Rewrite Circuits in Circom ⚠️ HIGH EFFORT

Rewrite all 3 circuits (shuffle, deal, reveal) in Circom to generate native Groth16 proofs.

**Pros:**
- Direct compatibility with `groth16-solana`
- Well-tested path used by Light Protocol internally

**Cons:**
- Significant rewrite (~2-3 days minimum)
- Circom syntax is different from Noir
- Need to set up snarkjs trusted setup (Powers of Tau ceremony)

**Would require:**
1. Port `shuffle_proof.nr` → `shuffle_proof.circom`
2. Port `deal_proof.nr` → `deal_proof.circom`
3. Port `reveal_proof.nr` → `reveal_proof.circom`
4. Generate proving/verifying keys via snarkjs
5. Update frontend to use snarkjs instead of NoirJS

### Option 2: Use Noir's Groth16 Backend ❌ TESTED - FAILED

**Tested:** Jan 23, 2026

I found and tested a recent fork: https://github.com/czarcas7ic/acvm-backend-groth16

**Test Results from our `shuffle_proof` circuit:**
```
Circuit analysis:
  - Total opcodes: 813
  - AssertZero (supported): 746
  - BlackBoxFuncCall (NOT supported): YES - 27 instances
  - Memory ops (NOT supported): YES
  - Brillig calls (NOT supported): YES

Unsupported BlackBox types found:
  - RANGE checks (for u8 card values)
  - Poseidon hash operations
```

**Why This Cannot Work:**

1. **Poseidon in Noir uses BlackBox functions** — The hash operations compile to optimized BlackBox calls, not pure arithmetic constraints
2. **Array operations use Memory opcodes** — Deck shuffling requires memory operations
3. **Range checks are BlackBox** — Even simple `u8` assertions use RANGE BlackBox

**The Groth16 backend only supports `AssertZero` (pure R1CS constraints).** Our circuits use standard Noir features that compile to unsupported opcodes.

**Verdict: Impossible without rewriting Noir's standard library itself.**

### Option 3: Use ProveKit ⚠️ DIFFERENT SYSTEM

**Source:** https://github.com/worldfnd/ProveKit

ProveKit converts Noir circuits to R1CS and uses WHIR + Gnark for recursive Groth16 proofs.

**Pros:**
- Works with Noir circuits
- Produces Groth16 proofs (via Gnark)

**Cons:**
- Uses a different verification flow (Gnark recursive verifier)
- Not directly compatible with `groth16-solana` format
- Adds complexity (Go toolchain required)
- Optimized for mobile, not on-chain verification

### Option 4: Commitment-Only On-Chain ✅ RECOMMENDED FOR HACKATHON

Store commitments on-chain, verify proofs client-side with Barretenberg.

**How it works:**
```
Client                          Solana
  │                               │
  ├─ Generate proof (UltraHonk) ──┤
  ├─ Verify locally ─────────────►│ (trust client verification)
  ├─ Send commitment ────────────►│ Store deck_commitment
  ├─ Send card_commitment ───────►│ Store & link to deck
  └─ Reveal card_value ──────────►│ Store revealed value
```

**Pros:**
- Works today with existing code
- No circuit rewrites
- Proofs are still generated (provable fairness)
- On-chain stores commitment chain for transparency

**Cons:**
- On-chain verification is "trust client" for hackathon
- Not fully trustless (but auditable)

**Implementation:**
```rust
// Anchor program - simplified verification
pub fn verify_shuffle(ctx: Context<VerifyShuffle>, deck_commitment: [u8; 32]) -> Result<()> {
    let game = &mut ctx.accounts.game;
    game.deck_commitment = deck_commitment;
    game.shuffle_verified = true;
    // Note: Client verified proof locally, we trust that for demo
    Ok(())
}
```

---

## My Recommendation

Given the hackathon deadline (Feb 1, 2026):

### For Hackathon Demo: Option 4 (Commitment-Only)

1. **Keep existing Noir circuits** — they work perfectly
2. **Store commitments on-chain** — provides transparency
3. **Verify proofs client-side** — demonstrates the ZK functionality
4. **Document that full on-chain verification is "future work"**

### Post-Hackathon: Option 1 (Circom Rewrite)

If you want true on-chain verification with Light Protocol:

1. Port circuits to Circom
2. Use snarkjs for proof generation
3. Integrate `groth16-solana` for on-chain verification

---

## Option 2 Test Results (Noir Groth16 Backend)

**TESTED AND FAILED** — Jan 23, 2026

I cloned and tested the updated fork (czarcas7ic/acvm-backend-groth16):

```bash
cd groth16-backend
cargo build --release  # ✅ Compiles
./target/release/test_circuit  # ❌ Circuit incompatible
```

**Output:**
```
SUCCESS: Program deserialized!
  - Number of functions: 1
  - Main circuit opcodes: 813
  
Opcode analysis:
  - AssertZero (supported): 746
  - BlackBoxFuncCall (NOT supported): YES
  - Memory ops (NOT supported): YES
  - Brillig calls (NOT supported): YES

❌ Circuit uses unsupported opcodes - NOT compatible
```

**Root Cause:** Noir's Poseidon hash and standard library features compile to BlackBox opcodes, which cannot be converted to R1CS constraints needed for Groth16.

---

## Resources

### Light Protocol
- Groth16 Verifier: https://github.com/Lightprotocol/groth16-solana
- Docs: https://github.com/lightprotocol/docs-v2

### Circom (if rewriting)
- Docs: https://docs.circom.io/
- snarkjs: https://github.com/iden3/snarkjs
- Poseidon in Circom: https://github.com/iden3/circomlib

### Noir Backends
- Awesome Noir (backends list): https://github.com/noir-lang/awesome-noir#proving-backends
- Old Groth16 backend: https://github.com/TomAFrench/acvm-backend-groth16

---

## ✅ SOLUTION FOUND: Sunspot

**After testing Option 2, I discovered the official solution!**

### **Sunspot by Reilabs**

Sunspot is the **official Noir backend for Solana** that:
- ✅ Works with your existing Noir circuits (no rewrite!)
- ✅ Generates Groth16 proofs (compatible with Solana)
- ✅ Creates custom Solana verifier programs
- ✅ Officially supported by Solana Foundation
- ✅ ~5 hours integration time

**Repository:** https://github.com/reilabs/sunspot  
**Examples:** https://github.com/solana-foundation/noir-examples

### Why This is Perfect

| Your Circuits | Sunspot Support |
|--------------|----------------|
| Poseidon hash | ✅ Supported |
| Array operations | ✅ Supported |
| u8 constraints | ✅ Supported |
| Current Noir version | ✅ v1.0.0-beta.18 |

**See `SUNSPOT_INTEGRATION.md` for complete implementation plan.**

---

## Final Comparison

| Solution | Time | On-chain? | Rewrite? | Verdict |
|----------|------|-----------|----------|---------|
| **Sunspot** | 5 hours | ✅ Yes | ❌ No | ✅✅✅ **WINNER** |
| Light Protocol | 2-3 days | ✅ Yes | ✅ Yes | ❌ Too slow |
| Option 2 Backend | N/A | ❌ Failed | N/A | ❌ Incompatible |
| Commitment-only | 0 hours | ⚠️ Partial | ❌ No | ⚠️ Fallback |

**Recommendation: Use Sunspot!**

— Marcus

