# ✅ SUNSPOT - Noir on Solana Solution

**Author:** Marcus (ZK Engineer)  
**Date:** Jan 23, 2026  
**Status:** RECOMMENDED SOLUTION

---

## 🎉 Discovery

**Sunspot is the official tool for verifying Noir circuits on Solana!**

- **Repository:** https://github.com/reilabs/sunspot
- **Examples:** https://github.com/solana-foundation/noir-examples
- **Developer:** Reilabs (official Noir tooling partner)
- **Solana Foundation:** Official examples repository exists!

---

## How Sunspot Works

Sunspot is a **Noir backend** that:
1. Takes your **existing Noir circuits** (no rewrite needed!)
2. Converts ACIR → Gnark Constraint System → **Groth16 proofs**
3. Generates a **custom Solana verifier program** for your specific circuit
4. Uses Gnark's high-performance prover (same ZK library as Polygon zkEVM)

**Pipeline:**
```
Noir Circuit (main.nr)
    ↓ [nargo compile]
ACIR bytecode (.json)
    ↓ [sunspot compile]
Gnark CCS (.ccs)
    ↓ [sunspot setup]
Proving Key (.pk) + Verifying Key (.vk)
    ↓ [sunspot prove]
Groth16 Proof (.proof)
    ↓ [sunspot deploy]
Solana Verifier Program (.so) ← Deploy this to Solana!
```

---

## Key Advantages

| Feature | Sunspot | Light Protocol Groth16 | Your Current UltraHonk |
|---------|---------|------------------------|------------------------|
| **Works with Noir** | ✅ Yes | ❌ No (Circom only) | ✅ Yes |
| **On-chain Verification** | ✅ Yes (Solana) | ✅ Yes (Solana) | ❌ Client-side only |
| **Circuit Rewrite** | ❌ Not needed | ✅ Required (Circom) | ❌ Not needed |
| **Proof System** | Groth16 | Groth16 | UltraHonk |
| **Setup Required** | ⚠️ Trusted setup | ⚠️ Trusted setup | ✅ Trustless |
| **Solana Compute** | ~200k CU | ~200k CU | N/A |
| **Noir Version** | v1.0.0-beta.18 | N/A | v1.0.0-beta.18 |

---

## Compatibility with Your Circuits

✅ **All your circuits should work!**

From the Solana Foundation examples:
- **Simple assertions** ✅
- **Poseidon hashing** ✅ (used in `smt_exclusion` example)
- **ECDSA signature verification** ✅
- **Sparse Merkle Trees** ✅

Your circuits use:
- ✅ Poseidon hash (for commitments)
- ✅ Array operations (deck shuffling)
- ✅ u8 constraints (card values)

**All of these are supported by Sunspot!**

---

## Installation

### Prerequisites
```bash
# 1. Go 1.24+ (for Sunspot)
brew install go  # macOS
# Or download from https://go.dev/dl/

# 2. Solana CLI (you already have this)
# solana --version

# 3. Noir (you already have this)
# nargo --version → should be v1.0.0-beta.18
```

### Install Sunspot
```bash
# Clone and build
git clone https://github.com/reilabs/sunspot.git ~/sunspot
cd ~/sunspot/go
go build -o sunspot .

# Add to PATH
sudo mv sunspot /usr/local/bin/

# Set verifier binary path
echo 'export GNARK_VERIFIER_BIN="$HOME/sunspot/gnark-solana/crates/verifier-bin"' >> ~/.zshrc
source ~/.zshrc

# Verify installation
sunspot --help
```

---

## Integration Plan for Your Project

### Step 1: Convert Circuits (10 minutes)

Your circuits are **already compatible**! Just need to generate the Groth16 artifacts:

```bash
cd circuits

# For each circuit (shuffle_proof, deal_proof, reveal_proof):
cd shuffle_proof

# 1. Compile to ACIR (you already have this)
nargo compile

# 2. Convert ACIR → Gnark CCS
sunspot compile target/shuffle_proof.json

# 3. Generate proving/verifying keys
# ⚠️ Warning: This uses a local trusted setup (insecure for production)
# For production, you'd use a proper Powers of Tau ceremony
sunspot setup target/shuffle_proof.ccs

# 4. Test proof generation
nargo execute
sunspot prove target/shuffle_proof.json target/shuffle_proof.gz target/shuffle_proof.ccs target/proving_key.pk

# 5. Create Solana verifier program
sunspot deploy target/verifying_key.vk
# This creates: verifier.so + keypair.json
```

Repeat for `deal_proof` and `reveal_proof`.

### Step 2: Deploy Verifiers to Solana (5 minutes)

```bash
# Deploy each verifier program to devnet
cd circuits/shuffle_proof
solana program deploy verifier.so --keypair keypair.json --url devnet
# Save the Program ID!

cd ../deal_proof
solana program deploy verifier.so --keypair keypair.json --url devnet
# Save the Program ID!

cd ../reveal_proof
solana program deploy verifier.so --keypair keypair.json --url devnet
# Save the Program ID!
```

### Step 3: Update Frontend (30 minutes)

Replace your current `useZK.js` proof generation with Sunspot workflow:

```javascript
// hooks/useZK.js modifications

const generateShuffleProof = useCallback(async (seed, shuffledDeck) => {
  log('Generating shuffle proof with Sunspot...');
  
  // 1. Generate witness using existing Noir execution
  const noir = new Noir(circuitsRef.current.shuffle);
  const { witness } = await noir.execute({ seed, shuffled_deck: shuffledDeck });
  
  // 2. Call your backend/worker to run Sunspot
  const response = await fetch('/api/sunspot-prove', {
    method: 'POST',
    body: JSON.stringify({
      circuit: 'shuffle_proof',
      witness: Array.from(witness.toUint8Array())
    })
  });
  
  const { proof, publicInputs } = await response.json();
  
  return { proof, publicInputs };
}, [log]);
```

**Option A: Browser-based (WASM)**
- You'd need to compile Sunspot to WASM (advanced)
- Or use NoirJS for execution, then call backend for proving

**Option B: Backend API (Recommended for hackathon)**
- Create a simple Node.js/Go API that calls `sunspot prove`
- Frontend sends witness, backend returns Groth16 proof
- Simpler integration, can optimize later

### Step 4: Update Anchor Program (20 minutes)

```rust
// programs/zk-card-arena/src/lib.rs

use anchor_lang::prelude::*;
use anchor_lang::solana_program::instruction::Instruction;

#[program]
pub mod zk_card_arena {
    use super::*;
    
    pub fn verify_shuffle(
        ctx: Context<VerifyShuffle>,
        proof: Vec<u8>,
        public_inputs: Vec<u8>,
    ) -> Result<()> {
        // Call the Sunspot verifier program via CPI
        let shuffle_verifier_program = ctx.accounts.shuffle_verifier_program.key();
        
        // Instruction data = proof_bytes || public_witness_bytes
        let mut instruction_data = Vec::new();
        instruction_data.extend_from_slice(&proof);
        instruction_data.extend_from_slice(&public_inputs);
        
        let verify_ix = Instruction {
            program_id: shuffle_verifier_program,
            accounts: vec![],
            data: instruction_data,
        };
        
        // Execute CPI to verifier
        anchor_lang::solana_program::program::invoke(
            &verify_ix,
            &[],
        )?;
        
        // If we reach here, proof is valid!
        let game = &mut ctx.accounts.game;
        game.shuffle_verified = true;
        game.deck_commitment = public_inputs[0..32].try_into().unwrap();
        
        Ok(())
    }
}

#[derive(Accounts)]
pub struct VerifyShuffle<'info> {
    #[account(mut)]
    pub game: Account<'info, Game>,
    /// CHECK: Sunspot verifier program
    pub shuffle_verifier_program: AccountInfo<'info>,
}
```

---

## Proof Format

Sunspot generates **standard Groth16 proofs**:

```
instruction_data = proof_bytes || public_witness_bytes

Where:
  proof_bytes = proof from sunspot prove command
  public_witness_bytes = public inputs serialized
```

Your public inputs (from `PROOF_FORMAT.md`):
- **Shuffle:** 15 fields (deck commitment + 13 cards + seed)
- **Deal:** 4 fields (deck commitment, position, card commitment, blinding factor)
- **Reveal:** 3 fields (card commitment, card value, blinding factor)

---

## Security Considerations

### ⚠️ Trusted Setup Warning

Groth16 requires a **trusted setup** ceremony. Using `sunspot setup` generates keys locally, which is:
- ✅ **Fine for hackathon/demo**
- ❌ **NOT secure for production**

**For production**, you need a proper Powers of Tau ceremony or use:
- Existing trusted setups (e.g., Hermez/SnarkJS ceremonies)
- Transparent proving systems (PLONK, STARKs)

### 🔒 Hackathon Security Model

For your demo:
1. Generate keys locally with `sunspot setup` ✅
2. Deploy verifiers to devnet ✅
3. Document that production needs proper setup ceremony ✅
4. The **verification is still cryptographically sound** (assuming honest setup)

---

## Timeline Estimate

| Task | Time | Status |
|------|------|--------|
| Install Sunspot | 10 min | ⏳ Next |
| Convert 3 circuits | 30 min | ⏳ |
| Deploy verifiers to devnet | 10 min | ⏳ |
| Create backend API for proving | 1 hour | ⏳ |
| Update frontend (useZK.js) | 1 hour | ⏳ |
| Update Anchor program (CPI) | 1 hour | ⏳ |
| Integration testing | 1 hour | ⏳ |
| **TOTAL** | **~5 hours** | ⏳ |

**Realistic for hackathon:** You can have this working by tomorrow!

---

## Example from Solana Foundation

Check their `smt_exclusion` circuit - it's very similar to yours:
- Uses Poseidon hash ✅
- Has on-chain verification ✅
- Includes CPI example ✅

**File structure:**
```
circuits/smt_exclusion/
├── src/main.nr           # Noir circuit with Poseidon
├── client/               # TypeScript proof generation
├── on_chain_program/     # Rust Anchor program with CPI
└── keypair/              # Deployer keypair
```

Study this for reference: https://github.com/solana-foundation/noir-examples/tree/main/circuits/smt_exclusion

---

## Resources

### Official Docs
- **Sunspot Repo:** https://github.com/reilabs/sunspot
- **Solana Noir Examples:** https://github.com/solana-foundation/noir-examples
- **Gnark (underlying library):** https://docs.gnark.consensys.io/

### Community
- **Reilabs Twitter:** [@reilabs_io](https://twitter.com/reilabs_io)
- **Sunspot Discussions:** https://github.com/reilabs/sunspot/discussions

---

## Comparison with Other Options

| Option | Time | On-chain Verification | Circuit Rewrite |
|--------|------|----------------------|-----------------|
| **Sunspot** ✅ | 5 hours | ✅ Yes | ❌ No |
| Light Protocol Groth16 | 2-3 days | ✅ Yes | ✅ Yes (Circom) |
| Commitment-only | 0 hours | ⚠️ Partial | ❌ No |
| Give up verification | 0 hours | ❌ No | ❌ No |

**Sunspot is the clear winner!**

---

## Next Steps

1. ✅ **Install Sunspot** (10 min)
2. ✅ **Test with one circuit** (shuffle_proof)
3. ✅ **Deploy verifier to devnet**
4. ✅ **Verify proof on-chain**
5. ✅ **Replicate for other 2 circuits**
6. ✅ **Integrate into full game flow**

---

## Questions for You

1. **Backend vs Browser proving?**
   - Backend API (easier, recommended for hackathon)
   - Or compile Sunspot to WASM (harder, better UX)

2. **Where to host backend?**
   - Local (for demo)
   - Vercel/Railway (for deployment)

3. **Commitment computation?**
   - Keep using your `hash_14_helper` + `hash_2_helper` circuits?
   - Or compute in TypeScript using a Poseidon library?

Let me know and I can help implement!

— Marcus

