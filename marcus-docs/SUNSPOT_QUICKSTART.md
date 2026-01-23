# Sunspot Quick Start - ZK Card Arena

**TL;DR:** Install Sunspot, convert your 3 Noir circuits, deploy verifiers to Solana. ~5 hours total.

---

## Install Sunspot (10 min)

```bash
# 1. Install Go (if not already installed)
brew install go  # macOS
# Or: https://go.dev/dl/

# 2. Clone and build Sunspot
git clone https://github.com/reilabs/sunspot.git ~/sunspot
cd ~/sunspot/go
go build -o sunspot .

# 3. Add to PATH
sudo mv sunspot /usr/local/bin/

# 4. Set environment variable
echo 'export GNARK_VERIFIER_BIN="$HOME/sunspot/gnark-solana/crates/verifier-bin"' >> ~/.zshrc
source ~/.zshrc

# 5. Verify
sunspot --help
```

---

## Convert Your Circuits (30 min)

Run this for each circuit: `shuffle_proof`, `deal_proof`, `reveal_proof`

```bash
cd circuits/shuffle_proof

# Step 1: Compile to ACIR (you already have this)
nargo compile

# Step 2: Convert ACIR → Gnark CCS
sunspot compile target/shuffle_proof.json
# Creates: target/shuffle_proof.ccs

# Step 3: Generate proving/verifying keys
# ⚠️ Uses local trusted setup (fine for hackathon, NOT for production)
sunspot setup target/shuffle_proof.ccs
# Creates: target/proving_key.pk, target/verifying_key.vk

# Step 4: Test proof generation
nargo execute
sunspot prove target/shuffle_proof.json target/shuffle_proof.gz target/shuffle_proof.ccs target/proving_key.pk
# Creates: target/proof.proof, target/public_witness.pw

# Step 5: Create Solana verifier program
sunspot deploy target/verifying_key.vk
# Creates: verifier.so, keypair.json
```

---

## Deploy to Solana Devnet (10 min)

```bash
cd circuits/shuffle_proof

# Deploy the verifier program
solana program deploy verifier.so --keypair keypair.json --url devnet

# ⭐ SAVE THIS PROGRAM ID! You'll need it in your Anchor program
# Example output: Program Id: 7xK...abc

# Repeat for other circuits:
cd ../deal_proof
solana program deploy verifier.so --keypair keypair.json --url devnet
# Save this Program ID too

cd ../reveal_proof
solana program deploy verifier.so --keypair keypair.json --url devnet
# And this one
```

---

## Test On-Chain Verification

```bash
cd circuits/shuffle_proof

# If you already generated a proof (Step 4 above), verify it:
sunspot verify target/verifying_key.vk target/proof.proof target/public_witness.pw

# Should output: ✅ Proof verified!
```

---

## Integration Options

### Option A: Backend API (Recommended for Hackathon)

Create a simple Node.js/Go API:

```javascript
// api/sunspot-prove.js (Node.js backend)
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export default async function handler(req, res) {
  const { circuit, witness } = req.body;
  
  // Save witness to temp file
  await fs.writeFile('/tmp/witness.gz', Buffer.from(witness));
  
  // Run sunspot prove
  const { stdout } = await execAsync(
    `sunspot prove circuits/${circuit}/target/${circuit}.json /tmp/witness.gz circuits/${circuit}/target/${circuit}.ccs circuits/${circuit}/target/proving_key.pk`
  );
  
  // Read proof and public witness
  const proof = await fs.readFile('target/proof.proof');
  const publicInputs = await fs.readFile('target/public_witness.pw');
  
  res.json({ proof: Array.from(proof), publicInputs: Array.from(publicInputs) });
}
```

**Frontend calls this:**
```javascript
const response = await fetch('/api/sunspot-prove', {
  method: 'POST',
  body: JSON.stringify({ circuit: 'shuffle_proof', witness: witnessBytes })
});
const { proof, publicInputs } = await response.json();
```

### Option B: Client-side (Advanced)

Compile Sunspot to WASM - requires more setup, better UX (no backend needed).

---

## Update Anchor Program

```rust
// programs/zk-card-arena/src/lib.rs

pub fn verify_shuffle(
    ctx: Context<VerifyShuffle>,
    proof: Vec<u8>,
    public_inputs: Vec<u8>,
) -> Result<()> {
    // Prepare instruction data for Sunspot verifier
    let mut instruction_data = Vec::new();
    instruction_data.extend_from_slice(&proof);
    instruction_data.extend_from_slice(&public_inputs);
    
    // Call verifier via CPI
    let verify_ix = Instruction {
        program_id: ctx.accounts.shuffle_verifier_program.key(),
        accounts: vec![],
        data: instruction_data,
    };
    
    anchor_lang::solana_program::program::invoke(&verify_ix, &[])?;
    
    // Proof verified! Update game state
    let game = &mut ctx.accounts.game;
    game.shuffle_verified = true;
    
    Ok(())
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

## Update Frontend (useZK.js)

```javascript
const generateShuffleProof = useCallback(async (seed, shuffledDeck) => {
  // 1. Generate witness (existing code)
  const noir = new Noir(circuitsRef.current.shuffle);
  const { witness } = await noir.execute({ seed, shuffled_deck: shuffledDeck });
  
  // 2. Call backend API for Groth16 proof
  const response = await fetch('/api/sunspot-prove', {
    method: 'POST',
    body: JSON.stringify({
      circuit: 'shuffle_proof',
      witness: Array.from(witness.toUint8Array())
    })
  });
  
  const { proof, publicInputs } = await response.json();
  
  return { proof, publicInputs };
}, []);
```

---

## Testing Checklist

- [ ] Sunspot installed and working
- [ ] All 3 circuits converted (shuffle, deal, reveal)
- [ ] All 3 verifier programs deployed to devnet
- [ ] Program IDs saved
- [ ] Backend API created (if using Option A)
- [ ] Frontend updated to call Sunspot
- [ ] Anchor program updated with CPI
- [ ] End-to-end test: Generate proof → Verify on-chain

---

## Resources

- **Sunspot Repo:** https://github.com/reilabs/sunspot
- **Solana Examples:** https://github.com/solana-foundation/noir-examples
- **Full Guide:** See `SUNSPOT_INTEGRATION.md`

---

## Need Help?

1. Check the Solana Foundation examples (especially `smt_exclusion` - uses Poseidon!)
2. Reilabs Twitter: [@reilabs_io](https://twitter.com/reilabs_io)
3. Sunspot Discussions: https://github.com/reilabs/sunspot/discussions

Let's ship this! 🚀

