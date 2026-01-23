# Context for Next Agent: ZK Card Arena Integration

## Project Overview

**ZK Card Arena** is a provably fair Blackjack game on Solana using zero-knowledge proofs (Groth16). The ZK circuits and Solana verifier programs are fully deployed to devnet. Your task is to complete the integration between the frontend, backend proof generation, and on-chain verification.

---

## Current State: What's Been Done ✅

### 1. ZK Circuits (Complete)
- **3 Noir circuits** implemented and tested:
  - `shuffle_proof` - Proves valid deck permutation (812 constraints)
  - `deal_proof` - Proves card from committed deck (1,111 constraints)
  - `reveal_proof` - Proves revealed card matches commitment (333 constraints)
- **Location:** `/circuits/` directory
- **Performance:** All circuits generate proofs in < 1s in browser

### 2. Solana Verifiers (Deployed to Devnet)
All 3 Groth16 verifiers are deployed and operational:

| Verifier | Program ID | Size |
|----------|------------|------|
| Shuffle | `6sju9HLJTFfESLn49wAR2hqiC6mnu3MrP2K9WDbkjCL2` | 198KB |
| Deal | `Epoxbrv1Pc2XeYR2xsKsqm3Gy1j2MbkBx4yHfkg8yuSC` | 197KB |
| Reveal | `HrETBH5nTa3DTVjBFWMdytLtuX9GsFwiAGkkyQAXnMt9` | 196KB |

**Explorer Links:** See `/solana-verifiers/DEPLOYED_PROGRAM_IDS.md`

### 3. Frontend Integration (Partial)
- `hooks/useZK.js` - NoirJS integration for witness generation
- `hooks/useZKGame.js` - Game state + ZK proof orchestration
- `pages/zk-game-test.js` - Test page for proof chain
- **Status:** Frontend can generate witnesses locally but needs backend for Groth16 proofs

### 4. Anchor Program (Needs CPI Integration)
- **Location:** `/programs/zk-card-arena/src/lib.rs`
- **Current state:** Has placeholder `verify_shuffle`, `verify_deal`, `verify_reveal` functions
- **Needs:** Actual CPI calls to the deployed Sunspot verifier programs

---

## What Needs to Be Done: Your Tasks 🎯

### Task 1: Backend API for Groth16 Proof Generation (HIGH PRIORITY)

**Why?** 
- Browsers can generate witnesses (via NoirJS) quickly (~50ms)
- But Groth16 proof generation requires Sunspot CLI on a server (~5-10s)
- We need a backend API endpoint that takes witnesses and returns Groth16 proofs

**What to Build:**

Create an API endpoint (Node.js, Go, or Python) that:

**Endpoint:** `POST /api/prove`

**Request:**
```json
{
  "circuit": "shuffle_proof" | "deal_proof" | "reveal_proof",
  "witness": "base64_encoded_witness_data"
}
```

**Response:**
```json
{
  "proof": "base64_encoded_groth16_proof",
  "publicInputs": "base64_encoded_public_witness"
}
```

**Implementation Steps:**

1. **Install Sunspot on your server:**
```bash
git clone https://github.com/reilabs/sunspot.git
cd sunspot/go
go build -o sunspot .
```

2. **Copy proving keys to server:**
```bash
# These files are in /solana-verifiers/target/
- shuffle_proof.pk  (large file ~500KB)
- deal_proof.pk     (large file ~1.5MB)  
- reveal_proof.pk   (large file ~500KB)
```

3. **Generate proof using Sunspot:**
```bash
# Save witness to temp file (from request body)
echo $witness_data | base64 -d | gzip > /tmp/witness.gz

# Run Sunspot prove command
sunspot prove \
  circuits/target/${circuit}.json \
  /tmp/witness.gz \
  circuits/target/${circuit}.ccs \
  proving-keys/${circuit}.pk \
  > proof_output.json

# Parse output and return proof + public inputs
```

4. **Handle errors:**
   - Invalid witness format
   - Proof generation failures
   - Timeout (if proof takes > 30s)

**Files Needed:**
- Circuit JSON files: `/circuits/target/*.json`
- CCS files: `/circuits/target/*.ccs`
- Proving keys: `/solana-verifiers/target/*.pk`

**Testing:**
```javascript
// Test from frontend
const response = await fetch('/api/prove', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    circuit: 'shuffle_proof',
    witness: witnessBase64  // from NoirJS
  })
});
const { proof, publicInputs } = await response.json();
```

---

### Task 2: Anchor Program CPI Integration (HIGH PRIORITY)

**Why?**
The Anchor program needs to call the deployed Sunspot verifiers via Cross-Program Invocation (CPI).

**What to Do:**

Update `/programs/zk-card-arena/src/lib.rs`:

**Step 1: Add verifier program IDs as constants**
```rust
use solana_program::pubkey;

pub const SHUFFLE_VERIFIER_PROGRAM_ID: Pubkey = 
    pubkey!("6sju9HLJTFfESLn49wAR2hqiC6mnu3MrP2K9WDbkjCL2");
pub const DEAL_VERIFIER_PROGRAM_ID: Pubkey = 
    pubkey!("Epoxbrv1Pc2XeYR2xsKsqm3Gy1j2MbkBx4yHfkg8yuSC");
pub const REVEAL_VERIFIER_PROGRAM_ID: Pubkey = 
    pubkey!("HrETBH5nTa3DTVjBFWMdytLtuX9GsFwiAGkkyQAXnMt9");
```

**Step 2: Update account contexts**

Each instruction needs the verifier program as an account:

```rust
#[derive(Accounts)]
pub struct VerifyShuffle<'info> {
    #[account(mut)]
    pub game: Account<'info, Game>,
    pub player: Signer<'info>,
    /// CHECK: Sunspot verifier program
    pub shuffle_verifier_program: AccountInfo<'info>,
}
```

**Step 3: Implement CPI calls**

The instruction data format is: `proof_bytes || public_inputs_bytes`

```rust
pub fn verify_shuffle(
    ctx: Context<VerifyShuffle>,
    proof: Vec<u8>,
    public_inputs: Vec<u8>,
) -> Result<()> {
    // Verify game state
    require!(
        ctx.accounts.game.state == GameState::Created,
        GameError::InvalidState
    );
    
    // Verify correct verifier program
    require!(
        ctx.accounts.shuffle_verifier_program.key() == SHUFFLE_VERIFIER_PROGRAM_ID,
        GameError::InvalidVerifier
    );
    
    // Prepare instruction data for Sunspot verifier
    let mut instruction_data = Vec::new();
    instruction_data.extend_from_slice(&proof);
    instruction_data.extend_from_slice(&public_inputs);
    
    // Create CPI instruction to Sunspot verifier
    let verify_ix = Instruction {
        program_id: *ctx.accounts.shuffle_verifier_program.key,
        accounts: vec![], // Sunspot verifiers are stateless
        data: instruction_data,
    };
    
    // Execute CPI
    solana_program::program::invoke(
        &verify_ix,
        &[ctx.accounts.shuffle_verifier_program.to_account_info()],
    )?;
    
    // If we get here, verification succeeded
    // Update game state
    ctx.accounts.game.deck_commitment = /* extract from public_inputs */;
    ctx.accounts.game.state = GameState::ShuffleVerified;
    
    Ok(())
}
```

**Step 4: Handle public inputs**

Public inputs need to be extracted and stored:
- For shuffle: `deck_commitment` (32 bytes Field element)
- For deal: `card_commitment`, `position` 
- For reveal: `card_value`

**Reference:**
- Sunspot verifier format: https://github.com/reilabs/sunspot
- CPI documentation: See `/marcus-docs/SUNSPOT_INTEGRATION.md`

---

### Task 3: Frontend Integration with Backend API (MEDIUM PRIORITY)

**What to Do:**

Update `hooks/useZKGame.js` to call the backend API:

**Current flow (witness only):**
```javascript
const witness = await noir.execute(inputs);
// Witness stays in browser, no proof generated
```

**New flow (witness → backend → Groth16 proof → Anchor):**
```javascript
const handleCreateGame = async () => {
  // 1. Generate witness in browser (fast)
  const witness = await noir.execute({
    seed: seedField,
    shuffled_deck: deckArray,
    deck_commitment: deckCommitmentField,
    original_deck: [0,1,2,3,4,5,6,7,8,9,10,11,12]
  });
  
  // 2. Send witness to backend for Groth16 proof generation
  const { proof, publicInputs } = await fetch('/api/prove', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      circuit: 'shuffle_proof',
      witness: base64Encode(witness)
    })
  }).then(r => r.json());
  
  // 3. Submit proof to Anchor program
  const tx = await program.methods
    .verifyShuffle(
      Array.from(proof),        // Vec<u8>
      Array.from(publicInputs)  // Vec<u8>
    )
    .accounts({
      game: gameAccount,
      player: wallet.publicKey,
      shuffleVerifierProgram: SHUFFLE_VERIFIER_PROGRAM_ID,
    })
    .rpc();
    
  console.log("Game created, proof verified on-chain:", tx);
};
```

**Do the same for:**
- `handleDealCard()` - Uses `deal_proof` circuit
- `handleRevealCard()` - Uses `reveal_proof` circuit

---

### Task 4: Error Handling & Testing (MEDIUM PRIORITY)

**What to Test:**

1. **Invalid proofs:** What happens if proof verification fails on-chain?
   - Should return error from Sunspot verifier
   - Anchor program should catch and handle gracefully

2. **Proof generation timeout:** Backend takes > 30s
   - Implement timeout on frontend
   - Show loading state to user

3. **Network failures:** Devnet RPC issues
   - Retry logic
   - User-friendly error messages

4. **Invalid witness:** Frontend sends malformed data
   - Backend validates witness format
   - Returns clear error message

**Test the full flow:**
```bash
# Start backend API
npm run backend:dev  # or your server command

# Start frontend
npm run dev

# Navigate to test page
open http://localhost:3000/zk-game-test

# Test sequence:
1. Click "Initialize Game" → Should call shuffle_proof
2. Click "Deal Card" → Should call deal_proof  
3. Click "Reveal Card" → Should call reveal_proof
4. Check Solana Explorer for successful transactions
```

---

## Important Technical Details

### Proof Format
- **Groth16 proof:** Binary format, ~256 bytes
- **Public inputs:** Array of Field elements (32 bytes each)
- **Instruction data:** `proof || public_inputs` (concatenated)

### Field Elements
- **Size:** 32 bytes (256 bits)
- **Encoding:** Big-endian
- **Type in Noir:** `Field`
- **Type in JS:** `Uint8Array(32)`

### Poseidon Hash
- **Library:** `poseidon@0.2.2` (Noir)
- **Function:** `hash_14` for deck, `hash_2` for cards
- **Output:** Single Field element (32 bytes)

### Commitment Scheme
```
deck_commitment = Poseidon(seed, deck[0], deck[1], ..., deck[12])
card_commitment = Poseidon(card_value, blinding_factor)
```

---

## File Structure Reference

```
/circuits/
  ├── shuffle_proof/src/main.nr       # Shuffle circuit
  ├── deal_proof/src/main.nr          # Deal circuit
  ├── reveal_proof/src/main.nr        # Reveal circuit
  ├── hash_14_helper/src/main.nr      # Deck commitment
  ├── hash_2_helper/src/main.nr       # Card commitment
  └── target/
      ├── shuffle_proof.json          # Compiled circuit
      ├── shuffle_proof.ccs           # Constraint system
      └── ...

/solana-verifiers/
  ├── DEPLOYED_PROGRAM_IDS.md         # All Program IDs
  ├── shuffle_proof_verifier.so       # Deployed to devnet
  ├── deal_proof_verifier.so          
  ├── reveal_proof_verifier.so        
  └── target/
      ├── shuffle_proof.pk            # Proving key (NEED THIS)
      ├── shuffle_proof.vk            # Verification key
      └── ...

/programs/zk-card-arena/src/
  └── lib.rs                          # Anchor program (UPDATE THIS)

/hooks/
  ├── useZK.js                        # NoirJS integration
  ├── useZKGame.js                    # Game + ZK orchestration (UPDATE THIS)
  └── useGameProgram.js               # Anchor program calls

/marcus-docs/
  ├── DEPLOYMENT_COMPLETE.md          # Full deployment record
  ├── HANDOVER_TO_CKAY.md            # Integration guide
  ├── SUNSPOT_INTEGRATION.md          # Technical details
  ├── SUNSPOT_QUICKSTART.md           # Command reference
  └── PROOF_FORMAT.md                 # Data format specs
```

---

## Resources & References

### Documentation
1. **Sunspot:** https://github.com/reilabs/sunspot
2. **Noir:** https://noir-lang.org/docs
3. **Anchor:** https://www.anchor-lang.com/
4. **Solana CPI:** https://solana.com/docs/core/cpi

### Project Documentation
- Read `/marcus-docs/DEPLOYMENT_COMPLETE.md` for full context
- Read `/marcus-docs/HANDOVER_TO_CKAY.md` for integration guide
- Check `/solana-verifiers/DEPLOYED_PROGRAM_IDS.md` for Program IDs

### Testing Tools
- **Solana Explorer (Devnet):** https://explorer.solana.com/?cluster=devnet
- **Anchor Test:** `anchor test --provider.cluster devnet`
- **Frontend Test:** http://localhost:3000/zk-game-test

---

## Expected Timeline

| Task | Estimated Time | Priority |
|------|----------------|----------|
| Backend API Setup | 4-6 hours | HIGH |
| Anchor CPI Integration | 6-8 hours | HIGH |
| Frontend Integration | 2-4 hours | MEDIUM |
| Testing & Debugging | 4-6 hours | MEDIUM |
| **Total** | **16-24 hours** | - |

---

## Success Criteria

When you're done, the system should:

✅ **Frontend generates witness** (~50ms)  
✅ **Backend generates Groth16 proof** (~5-10s)  
✅ **Anchor program calls Sunspot verifier** via CPI  
✅ **On-chain verification succeeds** (< 200k CU)  
✅ **Full game flow works:** Shuffle → Deal → Reveal  
✅ **Error handling works:** Invalid proofs rejected  
✅ **All transactions visible** on Solana Explorer

---

## Questions to Consider

As you work through this, think about:

1. **Backend deployment:** Where will you host the proof generation API?
2. **Proof caching:** Should we cache proofs to avoid regeneration?
3. **Rate limiting:** How to prevent abuse of the proof API?
4. **Cost optimization:** Can we batch multiple proofs?
5. **Frontend UX:** How to show proof generation progress (5-10s)?

---

## Getting Help

If you get stuck:

1. **Check the docs:** `/marcus-docs/` has detailed technical guides
2. **Sunspot issues:** https://github.com/reilabs/sunspot/issues
3. **Anchor Discord:** https://discord.gg/anchorlang
4. **Noir Discord:** https://discord.gg/JtqzkdeQ6G

---

## Final Notes

- All verifiers are **deployed and working** on devnet
- The ZK circuits are **complete and tested**
- Your job is **integration**, not circuit design
- Focus on **backend API first**, then Anchor, then frontend
- **Test frequently** - small iterations are better than big changes

**Good luck! The hard ZK work is done - now it's time to bring it all together.** 🚀

