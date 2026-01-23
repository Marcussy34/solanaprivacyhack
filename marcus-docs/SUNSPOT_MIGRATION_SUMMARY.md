# Sunspot Migration Summary

**Date:** Jan 23, 2026  
**Migration:** Light Protocol → Sunspot for on-chain ZK verification

---

## What Changed

The entire project has been updated to use **Sunspot** (by Reilabs) instead of Light Protocol for on-chain Groth16 verification.

### Why Sunspot?

1. **✅ Works with Noir circuits** - No rewrite needed
2. **✅ Official Solana Foundation support** - Active maintenance
3. **✅ Generates custom verifier programs** - One per circuit
4. **✅ < 200k CU per verification** - Fits within Solana limits
5. **✅ ~5 hour integration time** - Faster than alternatives

### Why Not Light Protocol?

Light Protocol's `groth16-solana` verifier only works with **Circom/snarkjs proofs**, not Noir/Barretenberg proofs. Using it would require rewriting all circuits in Circom (2-3 days effort).

---

## Files Updated

### Core Documentation
- ✅ `README.md` - Updated tech stack
- ✅ `docs/core/ARCHITECTURE.md` - New Sunspot pipeline diagram
- ✅ `docs/core/PROJECT_OVERVIEW.md` - Updated verification approach

### Task Lists & Handovers
- ✅ `worksplit/MARCUS.md` - Updated ZK engineer tasks
- ✅ `worksplit/CKAY.md` - Updated Anchor/frontend tasks  
- ✅ `marcus-docs/HANDOVER.md` - Added Sunspot references
- ✅ `marcus-docs/HANDOVER_TO_CKAY.md` - Updated CKay action items

### Guides
- ✅ `docs/guides/QUICK_START.md` - Updated resources
- ✅ `docs/guides/SMART_CONTRACT_GUIDE.md` - Updated verification code
- ✅ `docs/hackathon/TIMELINE.md` - Updated milestones
- ✅ `docs/hackathon/RISKS_AND_MITIGATIONS.md` - Marked risks resolved

### Code
- ✅ `programs/zk-card-arena/src/lib.rs` - Updated comments for CPI
- ✅ `.cursorrules` - Created comprehensive project rules

### New Documents
- ✅ `marcus-docs/SUNSPOT_INTEGRATION.md` - Complete technical guide
- ✅ `marcus-docs/SUNSPOT_QUICKSTART.md` - Quick start commands
- ✅ `marcus-docs/GROTH16_INTEGRATION.md` - Research & decision log

---

## Key Changes Summary

### Proof Generation Pipeline

**OLD (Light Protocol):**
```
Noir circuit → Barretenberg → UltraHonk proof → ❌ Incompatible with Light Protocol
```

**NEW (Sunspot):**
```
Noir circuit → NoirJS witness (browser) → Sunspot API (backend) → Groth16 proof → Sunspot verifier (on-chain) ✅
```

### Architecture Changes

**Frontend:**
- NoirJS generates **witness only** (not full proof)
- Witness sent to backend API
- Backend calls Sunspot to generate Groth16 proof
- Proof + public_inputs sent to Anchor program

**Backend (NEW):**
- Node.js/Go API endpoint for Sunspot proof generation
- Calls `sunspot prove` with witness
- Returns proof bytes + public witness bytes

**On-chain:**
- Anchor program calls Sunspot verifier via CPI
- Instruction data: `proof_bytes || public_witness_bytes`
- 3 separate verifier programs (one per circuit)

---

## Implementation Steps (For Marcus)

### 1. Install Sunspot (10 min)
```bash
# Install Go
brew install go

# Clone and build Sunspot
git clone https://github.com/reilabs/sunspot.git ~/sunspot
cd ~/sunspot/go
go build -o sunspot .
sudo mv sunspot /usr/local/bin/

# Set environment variable
echo 'export GNARK_VERIFIER_BIN="$HOME/sunspot/gnark-solana/crates/verifier-bin"' >> ~/.zshrc
source ~/.zshrc
```

### 2. Convert Circuits (30 min)
```bash
# For each circuit: shuffle_proof, deal_proof, reveal_proof
cd circuits/shuffle_proof

# Compile ACIR (already done)
nargo compile

# Convert to Groth16
sunspot compile target/shuffle_proof.json
sunspot setup target/shuffle_proof.ccs

# Generate test proof
nargo execute
sunspot prove target/shuffle_proof.json target/shuffle_proof.gz target/shuffle_proof.ccs target/proving_key.pk

# Create verifier program
sunspot deploy target/verifying_key.vk
```

### 3. Deploy Verifiers (10 min)
```bash
# Deploy each verifier to devnet
cd circuits/shuffle_proof
solana program deploy verifier.so --keypair keypair.json --url devnet
# Save Program ID: SHUFFLE_VERIFIER_PROGRAM_ID

cd ../deal_proof  
solana program deploy verifier.so --keypair keypair.json --url devnet
# Save Program ID: DEAL_VERIFIER_PROGRAM_ID

cd ../reveal_proof
solana program deploy verifier.so --keypair keypair.json --url devnet
# Save Program ID: REVEAL_VERIFIER_PROGRAM_ID
```

### 4. Create Backend API (1 hour)
```javascript
// api/sunspot-prove.js
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';

const execAsync = promisify(exec);

export default async function handler(req, res) {
  const { circuit, witness } = req.body;
  
  // Save witness to temp file
  await fs.writeFile('/tmp/witness.gz', Buffer.from(witness));
  
  // Run sunspot prove
  const circuitPath = `circuits/${circuit}`;
  await execAsync(
    `sunspot prove ${circuitPath}/target/${circuit}.json /tmp/witness.gz ${circuitPath}/target/${circuit}.ccs ${circuitPath}/target/proving_key.pk`
  );
  
  // Read generated proof and public witness
  const proof = await fs.readFile('target/proof.proof');
  const publicInputs = await fs.readFile('target/public_witness.pw');
  
  res.json({
    proof: Array.from(proof),
    publicInputs: Array.from(publicInputs)
  });
}
```

### 5. Update Frontend (1 hour)
```javascript
// hooks/useZK.js (update)
const generateShuffleProof = useCallback(async (seed, shuffledDeck) => {
  // 1. Generate witness (keep existing NoirJS code)
  const noir = new Noir(circuitsRef.current.shuffle);
  const { witness } = await noir.execute({ seed, shuffled_deck: shuffledDeck });
  
  // 2. Call backend API for Groth16 proof
  const response = await fetch('/api/sunspot-prove', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      circuit: 'shuffle_proof',
      witness: Array.from(witness.toUint8Array())
    })
  });
  
  const { proof, publicInputs } = await response.json();
  return { proof, publicInputs };
}, []);
```

### 6. Update Anchor Program (1 hour)
```rust
// programs/zk-card-arena/src/lib.rs

// Add verifier program account
#[derive(Accounts)]
pub struct VerifyShuffle<'info> {
    #[account(mut)]
    pub game: Account<'info, Game>,
    pub dealer: Signer<'info>,
    
    /// CHECK: Sunspot shuffle verifier program
    pub shuffle_verifier_program: AccountInfo<'info>,
}

// Implement CPI
pub fn verify_shuffle(
    ctx: Context<VerifyShuffle>,
    proof: Vec<u8>,
    public_inputs: Vec<u8>,
) -> Result<()> {
    let game = &mut ctx.accounts.game;
    
    // State checks
    require!(game.state == GameState::Created, GameError::InvalidState);
    require!(game.dealer == ctx.accounts.dealer.key(), GameError::Unauthorized);
    
    // Prepare instruction data: proof_bytes || public_witness_bytes
    let mut instruction_data = Vec::new();
    instruction_data.extend_from_slice(&proof);
    instruction_data.extend_from_slice(&public_inputs);
    
    // CPI to Sunspot verifier
    let verify_ix = Instruction {
        program_id: ctx.accounts.shuffle_verifier_program.key(),
        accounts: vec![],
        data: instruction_data,
    };
    
    anchor_lang::solana_program::program::invoke(&verify_ix, &[])?;
    
    // If we reach here, proof is valid!
    game.shuffle_verified = true;
    game.state = GameState::AwaitingPlayer;
    
    Ok(())
}
```

---

## Verification for CKay

### Verifier Program IDs (to be provided by Marcus)
```rust
// constants.rs
pub const SHUFFLE_VERIFIER_PROGRAM_ID: Pubkey = pubkey!("...");
pub const DEAL_VERIFIER_PROGRAM_ID: Pubkey = pubkey!("...");
pub const REVEAL_VERIFIER_PROGRAM_ID: Pubkey = pubkey!("...");
```

### CPI Integration Points
1. **`verify_shuffle`** - Add `shuffle_verifier_program` account + CPI call
2. **`deal_card`** - Add `deal_verifier_program` account + CPI call (future)
3. **`reveal_card`** - Add `reveal_verifier_program` account + CPI call (future)

---

## Testing Checklist

- [ ] Sunspot installed and working (`sunspot --help`)
- [ ] All 3 circuits converted (shuffle, deal, reveal)
- [ ] All 3 verifier programs deployed to devnet
- [ ] Program IDs saved and shared with CKay
- [ ] Backend API endpoint created
- [ ] Backend API tested (witness → proof)
- [ ] Frontend updated to call backend API
- [ ] Anchor program updated with CPI
- [ ] End-to-end test: Generate proof → Verify on-chain

---

## Resources

- **Sunspot Repo:** https://github.com/reilabs/sunspot
- **Solana Foundation Examples:** https://github.com/solana-foundation/noir-examples
- **Complete Guide:** `marcus-docs/SUNSPOT_INTEGRATION.md`
- **Quick Start:** `marcus-docs/SUNSPOT_QUICKSTART.md`
- **Research Log:** `marcus-docs/GROTH16_INTEGRATION.md`

---

## Questions?

Refer to:
1. `marcus-docs/SUNSPOT_QUICKSTART.md` for commands
2. `marcus-docs/SUNSPOT_INTEGRATION.md` for detailed explanations
3. `.cursorrules` for project-wide conventions
4. Solana Foundation's `smt_exclusion` example (uses Poseidon like our circuits)

Good luck! 🚀

