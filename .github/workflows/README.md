# GitHub Actions Workflows

## build-sunspot-verifiers.yml

**Purpose:** Build Solana verifier programs from Noir circuits using Sunspot on Linux.

### Quick Start

1. **Push your code to GitHub** (including circuits/)
2. **Go to Actions tab** in your GitHub repo
3. **Run "Build Sunspot Verifiers" workflow**
4. **Download artifacts** or view Program IDs

### Why GitHub Actions?

`cargo-build-sbf` (needed to build Solana programs) doesn't work reliably on macOS. GitHub Actions provides a Linux environment where all tools work perfectly.

### What It Does

- ✅ Installs: Go, Rust, Solana CLI, Noir, Sunspot
- ✅ Compiles your 3 Noir circuits
- ✅ Converts to Groth16 format
- ✅ Builds Solana verifier programs
- ✅ (Optional) Deploys to devnet
- ✅ Provides Program IDs

### Options

**Build only:** Run without "deploy to devnet" checked
- Creates `.so` files
- Upload as artifacts
- Deploy manually later

**Build + Deploy:** Run with "deploy to devnet" checked
- Requires `SOLANA_DEPLOYER_KEY` secret
- Deploys all 3 verifiers
- Returns Program IDs

### Triggers

- **Manual:** Click "Run workflow" button
- **Automatic:** Push to main or change circuits/ (no auto-deploy)

### See Also

- **Detailed Guide:** `marcus-docs/GITHUB_ACTIONS_DEPLOYMENT.md`
- **Setup Help:** `marcus-docs/SUNSPOT_STEP_BY_STEP.md`
- **Progress:** `marcus-docs/SUNSPOT_PROGRESS.md`


