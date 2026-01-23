# Sunspot Implementation - Step-by-Step Guide

**Based on Official Docs:** Jan 23, 2026  
**Your Current Status:** Ready to install Sunspot

---

## ⚠️ CRITICAL VERSION REQUIREMENTS

From the official Sunspot and Solana Foundation docs:

| Tool | Required Version | Your Version | Status |
|------|------------------|--------------|--------|
| **Noir** | v1.0.0-beta.13 OR v1.0.0-beta.18 | v1.0.0-beta.18 | ✅ Compatible |
| **Go** | 1.24+ | Unknown | ❓ Need to check |
| **Sunspot** | Latest (main branch) | Not installed | ❌ Need to install |
| **Solana CLI** | Latest | Installed | ✅ Have it |

**IMPORTANT:** The Solana Foundation examples use Noir v1.0.0-beta.13, but Sunspot README says v1.0.0-beta.18. Your circuits are on v1.0.0-beta.18, which should work fine.

---

## Step 1: Verify Prerequisites (5 minutes)

### Check what you have:

```bash
# Check Noir version (you have v1.0.0-beta.18 ✅)
nargo --version

# Check Go (REQUIRED - 1.24+)
go version

# Check Solana CLI
solana --version

# Check current directory
pwd
```

### Install Go if needed:

**macOS:**
```bash
# Using Homebrew (recommended)
brew install go

# Verify
go version  # Should show 1.24 or higher
```

**Linux:**
```bash
# Download Go 1.24+
wget https://go.dev/dl/go1.24.0.linux-amd64.tar.gz
sudo rm -rf /usr/local/go
sudo tar -C /usr/local -xzf go1.24.0.linux-amd64.tar.gz

# Add to PATH
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
source ~/.bashrc

# Verify
go version
```

---

## Step 2: Install Sunspot (10 minutes)

### Clone and Build:

```bash
# Navigate to home directory
cd ~

# Clone Sunspot
git clone https://github.com/reilabs/sunspot.git

# Build the binary
cd ~/sunspot/go
go build -o sunspot .

# Verify build succeeded
ls -lh sunspot
```

### Add to PATH:

**Option A: System-wide (requires sudo)**
```bash
sudo mv ~/sunspot/go/sunspot /usr/local/bin/

# Verify
sunspot --help
```

**Option B: User bin folder (no sudo)**
```bash
# Create personal bin folder
mkdir -p ~/bin

# Move binary
mv ~/sunspot/go/sunspot ~/bin/

# Add to PATH (for zsh - default on macOS)
echo 'export PATH="$HOME/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Verify
sunspot --help
```

### Set Environment Variable:

```bash
# Add GNARK_VERIFIER_BIN to your shell config
echo 'export GNARK_VERIFIER_BIN="$HOME/sunspot/gnark-solana/crates/verifier-bin"' >> ~/.zshrc

# Reload shell
source ~/.zshrc

# Verify
echo $GNARK_VERIFIER_BIN
```

**Expected output:** `/Users/marcus/sunspot/gnark-solana/crates/verifier-bin`

---

## Step 3: Test Sunspot Installation (2 minutes)

```bash
# Check Sunspot is working
sunspot --help

# Should show:
# Sunspot provides tools to prove and verify noir circuits on solana
# 
# Usage:
#   sunspot [command]
# 
# Available Commands:
#   compile     Compile an ACIR file into a CCS file
#   prove       Generate a Groth16 proof and public witness
#   setup       Generate a proving key (pk) and verifying key (vk)
#   verify      Verify a proof and public witness
#   deploy      Create a verifying solana program executable
#   ...
```

---

## Step 4: Convert Your First Circuit (15 minutes)

Let's start with `shuffle_proof`:

```bash
# Navigate to your project
cd /Users/marcus/Projects/solanaprivacyhack

# Navigate to shuffle_proof circuit
cd circuits/shuffle_proof

# Step 1: Ensure circuit is compiled
nargo compile

# Should show: target/shuffle_proof.json exists
ls -lh target/shuffle_proof.json
```

### Convert ACIR to Groth16 CCS:

```bash
# Step 2: Convert ACIR to Gnark CCS format
sunspot compile target/shuffle_proof.json

# This creates: target/shuffle_proof.ccs
# Should see output like:
# "Compiled ACIR to CCS successfully"

ls -lh target/shuffle_proof.ccs
```

### Generate Proving/Verifying Keys:

```bash
# Step 3: Generate keys (⚠️ WARNING: LOCAL TRUSTED SETUP)
sunspot setup target/shuffle_proof.ccs

# This creates:
#   - target/proving_key.pk
#   - target/verifying_key.vk
# 
# ⚠️ This uses a LOCAL trusted setup (insecure for production)
# ✅ Fine for hackathon/demo

ls -lh target/*.pk target/*.vk
```

---

## Step 5: Generate a Test Proof (10 minutes)

### Execute the circuit to get a witness:

```bash
# Make sure you have test inputs in Prover.toml
cat Prover.toml

# Execute to generate witness
nargo execute

# This creates: target/shuffle_proof.gz (the witness)
ls -lh target/shuffle_proof.gz
```

### Generate Groth16 Proof:

```bash
# Generate proof using Sunspot
sunspot prove target/shuffle_proof.json target/shuffle_proof.gz target/shuffle_proof.ccs target/proving_key.pk

# This creates:
#   - target/proof.proof (the Groth16 proof bytes)
#   - target/public_witness.pw (public inputs serialized)

ls -lh target/proof.proof target/public_witness.pw
```

### Verify the Proof (Local):

```bash
# Verify proof locally before deploying
sunspot verify target/verifying_key.vk target/proof.proof target/public_witness.pw

# Should show:
# ✅ Proof verified successfully!
```

---

## Step 6: Create Solana Verifier Program (10 minutes)

### Generate the Verifier Binary:

```bash
# Create Solana verifier program from VK
sunspot deploy target/verifying_key.vk

# This creates:
#   - verifier.so (Solana program binary)
#   - keypair.json (deployer keypair)

ls -lh verifier.so keypair.json
```

### Fund the Deployer Wallet:

```bash
# Check the address
solana address -k keypair.json

# Fund on devnet (may need to do this 2-3 times)
solana airdrop 2 $(solana address -k keypair.json) --url devnet

# Check balance
solana balance -k keypair.json --url devnet
```

**If airdrop fails:** Use https://faucet.solana.com/

### Deploy to Solana Devnet:

```bash
# Deploy the verifier program
solana program deploy verifier.so --keypair keypair.json --url devnet

# ⭐ SAVE THIS PROGRAM ID!
# Example output:
# Program Id: 7xKqW8vY9ZpN3BsHxQq8J9YvZ4Abc123...
```

**CRITICAL:** Save this Program ID! You'll need it for:
1. Your Anchor program (CPI calls)
2. Frontend (calling the verifier)
3. CKay's integration

---

## Step 7: Repeat for Other Circuits (20 minutes)

Now do the same for `deal_proof` and `reveal_proof`:

```bash
cd ../deal_proof
nargo compile
sunspot compile target/deal_proof.json
sunspot setup target/deal_proof.ccs
nargo execute
sunspot prove target/deal_proof.json target/deal_proof.gz target/deal_proof.ccs target/proving_key.pk
sunspot verify target/verifying_key.vk target/proof.proof target/public_witness.pw
sunspot deploy target/verifying_key.vk
solana airdrop 2 $(solana address -k keypair.json) --url devnet
solana program deploy verifier.so --keypair keypair.json --url devnet
# ⭐ SAVE PROGRAM ID #2

cd ../reveal_proof
nargo compile
sunspot compile target/reveal_proof.json
sunspot setup target/reveal_proof.ccs
nargo execute
sunspot prove target/reveal_proof.json target/reveal_proof.gz target/reveal_proof.ccs target/proving_key.pk
sunspot verify target/verifying_key.vk target/proof.proof target/public_witness.pw
sunspot deploy target/verifying_key.vk
solana airdrop 2 $(solana address -k keypair.json) --url devnet
solana program deploy verifier.so --keypair keypair.json --url devnet
# ⭐ SAVE PROGRAM ID #3
```

---

## Step 8: Document Your Verifier Program IDs (5 minutes)

Create a file to store the Program IDs:

```bash
cd /Users/marcus/Projects/solanaprivacyhack

# Create constants file
cat > VERIFIER_PROGRAM_IDS.md << 'EOF'
# Sunspot Verifier Program IDs

**Deployed:** [DATE]
**Network:** Devnet

## Program IDs

```rust
// For use in Anchor program
pub const SHUFFLE_VERIFIER_PROGRAM_ID: Pubkey = pubkey!("PASTE_YOUR_SHUFFLE_ID_HERE");
pub const DEAL_VERIFIER_PROGRAM_ID: Pubkey = pubkey!("PASTE_YOUR_DEAL_ID_HERE");
pub const REVEAL_VERIFIER_PROGRAM_ID: Pubkey = pubkey!("PASTE_YOUR_REVEAL_ID_HERE");
```

## Links

- Shuffle: https://explorer.solana.com/address/[SHUFFLE_ID]?cluster=devnet
- Deal: https://explorer.solana.com/address/[DEAL_ID]?cluster=devnet
- Reveal: https://explorer.solana.com/address/[REVEAL_ID]?cluster=devnet
EOF
```

**Now edit the file and paste your 3 Program IDs!**

---

## Step 9: Verify Everything Works (5 minutes)

Quick sanity check:

```bash
# 1. Check Sunspot is installed
sunspot --version

# 2. Check all circuits have verifiers deployed
ls circuits/shuffle_proof/verifier.so
ls circuits/deal_proof/verifier.so
ls circuits/reveal_proof/verifier.so

# 3. Check Program IDs file exists
cat VERIFIER_PROGRAM_IDS.md

# 4. Verify one program is on-chain
solana program show [PASTE_ONE_PROGRAM_ID] --url devnet
```

---

## What's Next?

After completing these steps, you'll have:
- ✅ Sunspot installed and working
- ✅ All 3 circuits converted to Groth16
- ✅ All 3 verifier programs deployed to devnet
- ✅ Program IDs documented

**Next steps:**
1. **Backend API** - Create Node.js/Go endpoint for proof generation
2. **Frontend Update** - Update `useZK.js` to call backend API
3. **Anchor CPI** - Add CPI calls to verifiers in your Anchor program
4. **Share with CKay** - Give him the Program IDs for integration

See `marcus-docs/SUNSPOT_MIGRATION_SUMMARY.md` for code examples!

---

## Troubleshooting

### Problem: Go not installed
**Solution:** `brew install go` (macOS) or download from https://go.dev/dl/

### Problem: Sunspot command not found
**Solution:** Check PATH is set correctly, run `source ~/.zshrc`

### Problem: GNARK_VERIFIER_BIN not set
**Solution:** Run `echo 'export GNARK_VERIFIER_BIN="$HOME/sunspot/gnark-solana/crates/verifier-bin"' >> ~/.zshrc && source ~/.zshrc`

### Problem: Airdrop failed
**Solution:** Use https://faucet.solana.com/ or wait and retry

### Problem: Circuit uses unsupported opcodes
**Solution:** This shouldn't happen with Sunspot (it's designed for Noir). If you see this, check Noir version compatibility.

### Problem: Proof verification fails
**Solution:** Ensure witness matches the circuit inputs, check Prover.toml values

---

## Need Help?

1. **Sunspot Issues:** https://github.com/reilabs/sunspot/issues
2. **Examples:** https://github.com/solana-foundation/noir-examples
3. **Reilabs Twitter:** [@reilabs_io](https://twitter.com/reilabs_io)

Good luck! 🚀

