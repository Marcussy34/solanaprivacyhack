# GitHub Actions Deployment Guide

**How to build and deploy Sunspot verifiers using GitHub Actions**

---

## 🎯 What This Does

The GitHub Actions workflow will:
1. ✅ Build on Linux (where `cargo-build-sbf` works)
2. ✅ Compile your 3 Noir circuits
3. ✅ Convert them to Groth16 with Sunspot
4. ✅ Build Solana verifier programs (.so files)
5. ✅ (Optional) Deploy to Solana devnet
6. ✅ Give you Program IDs to use in your code

---

## 📋 Setup Steps

### Step 1: Push Your Code to GitHub

```bash
cd /Users/marcus/Projects/solanaprivacyhack

# Check git status
git status

# Add the workflow file
git add .github/workflows/build-sunspot-verifiers.yml

# Add your circuits (if not already committed)
git add circuits/

# Commit
git commit -m "Add Sunspot verifier build workflow"

# Push to GitHub
git push origin main  # or your branch name
```

### Step 2: (Optional) Add Deployer Keypair Secret

If you want to auto-deploy to devnet, you need to add a GitHub secret:

1. **Generate a deployer keypair:**
   ```bash
   solana-keygen new --outfile /tmp/deployer.json --no-bip39-passphrase
   
   # Fund it on devnet
   solana airdrop 5 $(solana address -k /tmp/deployer.json) --url devnet
   
   # Display the keypair (you'll copy this)
   cat /tmp/deployer.json
   ```

2. **Add to GitHub Secrets:**
   - Go to your repo: https://github.com/YOUR_USERNAME/solanaprivacyhack
   - Click **Settings** → **Secrets and variables** → **Actions**
   - Click **New repository secret**
   - Name: `SOLANA_DEPLOYER_KEY`
   - Value: Paste the entire JSON content from `/tmp/deployer.json`
   - Click **Add secret**

3. **Clean up local keypair:**
   ```bash
   rm /tmp/deployer.json  # Don't leave this lying around!
   ```

---

## 🚀 Running the Workflow

### Option A: Build Only (No Deployment)

1. Go to your repo on GitHub
2. Click **Actions** tab
3. Click **Build Sunspot Verifiers** workflow
4. Click **Run workflow** (top right)
5. Leave "Deploy to Solana devnet" **unchecked**
6. Click **Run workflow**

**Result:** Verifier `.so` files will be built and uploaded as artifacts (no deployment)

### Option B: Build + Deploy to Devnet

1. Go to your repo on GitHub
2. Click **Actions** tab
3. Click **Build Sunspot Verifiers** workflow
4. Click **Run workflow**
5. **Check** "Deploy to Solana devnet after building"
6. Click **Run workflow**

**Result:** Verifiers built AND deployed to devnet, Program IDs provided

---

## 📥 Downloading Verifier Files

After the workflow completes:

1. Go to the workflow run
2. Scroll to **Artifacts** section at the bottom
3. Download **solana-verifiers** artifact (contains all `.so` files)
4. If deployed, download **verifier-program-ids** (contains Program IDs)

---

## 🎫 Getting Your Program IDs

If you ran with deployment enabled:

### From GitHub Actions UI:
1. Open the completed workflow run
2. Click on the "Create Program IDs File" step
3. View the Program IDs in the output

### From Artifacts:
1. Download `verifier-program-ids` artifact
2. Extract and open `VERIFIER_PROGRAM_IDS.txt`

### Example Output:
```
Shuffle Verifier: 7xKqW8vY9ZpN3BsHxQq8J9YvZ4AbcXYZ...
Deal Verifier: 9mPrS2tN4DqL6FjKyTw3V8GhNxMnBcD...
Reveal Verifier: 5nQwX9vM7HpJ2GkRyBn4V3ChFzLpAqW...
```

---

## 💻 Using Program IDs in Your Code

### In Anchor Program (Rust):

Create `programs/zk-card-arena/src/constants.rs`:

```rust
use anchor_lang::prelude::*;

declare_id!("YOUR_ANCHOR_PROGRAM_ID");

// Sunspot verifier Program IDs
pub const SHUFFLE_VERIFIER_PROGRAM_ID: Pubkey = pubkey!("PASTE_SHUFFLE_ID_HERE");
pub const DEAL_VERIFIER_PROGRAM_ID: Pubkey = pubkey!("PASTE_DEAL_ID_HERE");
pub const REVEAL_VERIFIER_PROGRAM_ID: Pubkey = pubkey!("PASTE_REVEAL_ID_HERE");
```

Then in `lib.rs`:

```rust
mod constants;
use constants::*;

#[derive(Accounts)]
pub struct VerifyShuffle<'info> {
    #[account(mut)]
    pub game: Account<'info, Game>,
    pub dealer: Signer<'info>,
    
    /// CHECK: Sunspot shuffle verifier program
    #[account(address = SHUFFLE_VERIFIER_PROGRAM_ID)]
    pub shuffle_verifier_program: AccountInfo<'info>,
}
```

### In Frontend (TypeScript):

Create `lib/constants.ts`:

```typescript
import { PublicKey } from '@solana/web3.js';

export const VERIFIER_PROGRAM_IDS = {
  SHUFFLE: new PublicKey('PASTE_SHUFFLE_ID_HERE'),
  DEAL: new PublicKey('PASTE_DEAL_ID_HERE'),
  REVEAL: new PublicKey('PASTE_REVEAL_ID_HERE'),
};
```

---

## 🔄 Automatic Builds

The workflow also runs automatically when you:
- Push changes to `main` branch
- Modify files in `circuits/` directory
- Modify the workflow file itself

**Note:** Auto-runs will NOT deploy (only manual runs with the checkbox deploy)

---

## 🐛 Troubleshooting

### Workflow fails at "Install Solana CLI"
**Solution:** Solana version might be outdated. Update `SOLANA_VERSION` in workflow file.

### "cargo-build-sbf not found"
**Solution:** This means the Solana install didn't include it. Try updating to a newer Solana version (1.18+).

### "sunspot deploy" fails
**Solution:** Check that `GNARK_VERIFIER_BIN` is set correctly. The workflow should handle this automatically.

### Deployment fails with "insufficient funds"
**Solution:** The deployer keypair needs ~2-3 SOL for deployment. Fund it more:
```bash
solana airdrop 5 YOUR_DEPLOYER_ADDRESS --url devnet
```

### "SOLANA_DEPLOYER_KEY secret not set"
**Solution:** You tried to deploy but didn't add the secret. Either:
- Add the secret (see Step 2 above)
- Or run without deployment and deploy manually later

---

## 📦 What Gets Built

After a successful run, you'll have:

```
Artifacts Downloaded:
├── solana-verifiers/
│   ├── shuffle_proof_verifier.so
│   ├── deal_proof_verifier.so
│   ├── reveal_proof_verifier.so
│   ├── target/
│   │   ├── shuffle_proof.vk
│   │   ├── shuffle_proof.pk
│   │   ├── deal_proof.vk
│   │   ├── deal_proof.pk
│   │   ├── reveal_proof.vk
│   │   └── reveal_proof.pk
│
└── verifier-program-ids/ (if deployed)
    └── VERIFIER_PROGRAM_IDS.txt
```

---

## 🎯 Manual Deployment (Alternative)

If you download the `.so` files but want to deploy manually:

```bash
# Download artifacts first
cd ~/Downloads/solana-verifiers

# Deploy shuffle verifier
solana program deploy shuffle_proof_verifier.so --keypair YOUR_KEYPAIR.json --url devnet

# Deploy deal verifier
solana program deploy deal_proof_verifier.so --keypair YOUR_KEYPAIR.json --url devnet

# Deploy reveal verifier
solana program deploy reveal_proof_verifier.so --keypair YOUR_KEYPAIR.json --url devnet
```

---

## ✅ Next Steps After Deployment

Once you have your Program IDs:

1. ✅ Add them to your Anchor program constants
2. ✅ Add them to frontend constants
3. ✅ Update CPI calls in your Anchor instructions
4. ✅ Share Program IDs with CKay
5. ✅ Test end-to-end proof verification

See `marcus-docs/SUNSPOT_MIGRATION_SUMMARY.md` for code examples!

---

## 📞 Need Help?

- **Workflow fails:** Check the Actions logs for specific errors
- **Sunspot issues:** https://github.com/reilabs/sunspot/issues
- **Solana deploy issues:** https://solana.stackexchange.com/

Good luck! 🚀

