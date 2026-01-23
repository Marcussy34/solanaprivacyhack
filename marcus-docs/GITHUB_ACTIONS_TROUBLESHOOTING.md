# GitHub Actions Troubleshooting

**Common issues and fixes for the Sunspot verifier workflow**

---

## ❌ Error: `curl: (35) OpenSSL SSL_connect: SSL_ERROR_SYSCALL`

### Problem
```
curl: (35) OpenSSL SSL_connect: SSL_ERROR_SYSCALL in connection to release.solana.com:443
/home/runner/work/_temp/...sh: line 4: solana: command not found
Error: Process completed with exit code 127.
```

### Cause
- GitHub Actions runners sometimes have network issues connecting to `release.solana.com`
- This is a known intermittent issue with Solana's CDN

### ✅ Solution (FIXED)
**Updated the workflow to download from GitHub releases instead:**

```yaml
- name: Install Solana CLI
  run: |
    # Download from GitHub releases (more reliable)
    curl --retry 3 --retry-delay 2 \
      --proto '=https' --tlsv1.2 -sSfL \
      https://github.com/solana-labs/solana/releases/download/v${{ env.SOLANA_VERSION }}/solana-release-x86_64-unknown-linux-gnu.tar.bz2 \
      -o solana-release.tar.bz2
    
    tar jxf solana-release.tar.bz2
    SOLANA_BIN="$(pwd)/solana-release/bin"
    echo "$SOLANA_BIN" >> $GITHUB_PATH
```

**What changed:**
- ❌ Old: `https://release.solana.com/v1.18.20/install` (unreliable)
- ✅ New: `https://github.com/solana-labs/solana/releases/download/...` (reliable)
- ✅ Added retry logic (`--retry 3 --retry-delay 2`)
- ✅ Direct tarball download instead of install script

### Action Required
None! The fix has been pushed. Just re-run the workflow.

---

## ❌ Error: `cargo-build-sbf: command not found`

### Problem
```
sunspot deploy target/shuffle_proof.vk
Error: cargo-build-sbf not found in PATH
```

### Cause
- `cargo-build-sbf` is part of Solana CLI but may not be in PATH
- Some Solana releases don't include it in the expected location

### ✅ Solution
The workflow now verifies `cargo-build-sbf` exists:

```yaml
# Check for cargo-build-sbf (critical for building verifiers)
if command -v cargo-build-sbf &> /dev/null; then
  echo "✅ cargo-build-sbf found!"
  cargo-build-sbf --version
else
  echo "⚠️ cargo-build-sbf not in PATH"
  ls -la "$SOLANA_BIN/" | grep -i cargo
fi
```

If it's still missing, try:
1. **Update Solana version** in workflow:
   ```yaml
   env:
     SOLANA_VERSION: 1.18.22  # Try a newer version
   ```

2. **Or install platform-tools separately:**
   ```yaml
   - name: Install Solana Platform Tools
     run: |
       cargo install --git https://github.com/solana-labs/cargo-build-sbf-tests cargo-build-sbf
   ```

---

## ❌ Error: `unknown flag: --output`

### Problem
```
sunspot deploy target/shuffle_proof.vk --output shuffle_proof_verifier
Error: unknown flag: --output
```

### Cause
- The `sunspot deploy` command doesn't support the `--output` flag
- According to Sunspot docs, it outputs `verifier.so` and `verifier-keypair.json` by default

### ✅ Solution (FIXED)
**Updated workflow to use correct syntax:**

```yaml
# Build shuffle verifier
sunspot deploy target/shuffle_proof.vk
mv verifier.so shuffle_proof_verifier.so
mv verifier-keypair.json shuffle_proof_verifier-keypair.json
```

**What changed:**
- ❌ Old: `sunspot deploy file.vk --output name`
- ✅ New: `sunspot deploy file.vk` + rename files

**Sunspot generates:**
- `verifier.so` - The Solana program binary
- `verifier-keypair.json` - The program ID keypair

We rename them to distinguish between the three circuits.

### Action Required
None! The fix has been pushed. Re-run the workflow.

---

## ❌ Error: `lock file version 4 requires -Znext-lockfile-bump`

### Problem
```
cargo build-sbf failed: exit status 1
error: failed to parse lock file at: /home/runner/sunspot/gnark-solana/Cargo.lock
Caused by:
  lock file version 4 requires `-Znext-lockfile-bump`
```

### Cause
- Sunspot's `Cargo.lock` uses version 4 (very recent format)
- Solana's `cargo-build-sbf` (based on older Cargo) only supports up to version 3
- This is a compatibility issue between Cargo versions

### ✅ Solution (FIXED)
**Patch Cargo.lock version from 4 to 3:**

```yaml
- name: Clone and Build Sunspot
  run: |
    git clone https://github.com/reilabs/sunspot.git
    cd sunspot/gnark-solana
    
    # Patch Cargo.lock v4 → v3 using sed
    sed -i 's/version = 4/version = 3/' Cargo.lock
```

**What this does:**
- ❌ Old: `version = 4` in Cargo.lock (incompatible)
- ✅ New: `version = 3` in Cargo.lock (compatible with cargo-build-sbf)

**Why it works:**
- The lockfile format v3 and v4 are mostly compatible
- Only the version number needs to change
- Regenerating didn't work because modern Cargo always creates v4
- This simple patch tricks `cargo-build-sbf` into accepting it

**Alternative attempts that didn't work:**
- ❌ `cargo generate-lockfile` → Creates v4
- ❌ `cargo update --workspace` → Creates v4
- ✅ `sed` patch → Forces v3

### Action Required
None! The fix has been pushed. Re-run the workflow.

---

## ❌ Error: Package requires newer Rust than cargo-build-sbf provides (1.75.0-dev)

### Problem
```
error: package `<PACKAGE>` cannot be built because it requires rustc X.XX or newer,
while the currently active rustc version is 1.75.0-dev
```

**Common packages that fail:**
- `toml_edit v0.23.7` → requires Rust 1.76+
- `proc-macro-crate v3.4.0` → requires Rust 1.76+
- `winnow v0.6.21+` → requires Rust 1.76+
- `solana-address v1.0.0` → requires Rust 1.81+

### Cause
- `cargo-build-sbf` uses Rust 1.75.0-dev (older version bundled with Solana)
- Some of Sunspot's dependencies (`toml_edit`, `winnow`) require Rust 1.76+
- Dependency version conflict

### ✅ Solution (FIXED)
**Downgrade incompatible packages to Rust 1.75-compatible versions:**

```yaml
# Downgrade proc-macro-crate (pulls in toml_edit 0.23+)
cargo update proc-macro-crate@3.4.0 --precise 3.1.0

# Downgrade winnow
cargo update winnow --precise 0.6.20

# Downgrade solana-address
cargo update solana-address --precise 1.18.26
```

**The dependency chain:**
```
proc-macro-crate v3.4.0 (requires Rust 1.76)
  └─ toml_edit ^0.23.2 (requires Rust 1.76)
      └─ winnow ^0.6.0 (requires Rust 1.76)
```

**What this does:**
- ❌ Can't downgrade `toml_edit` directly (other packages require v0.23+)
- ✅ Downgrade `proc-macro-crate` from v3.4.0 → v3.1.0
- ✅ v3.1.0 uses `toml_edit v0.21` which works with Rust 1.75
- ✅ Also downgrade `winnow` to v0.6.20

**Why it works:**
- Targets the root cause (proc-macro-crate)
- Breaks the dependency chain requiring Rust 1.76
- All downstream dependencies now use Rust 1.75-compatible versions

### Action Required
None! The fix has been pushed. Re-run the workflow.

---

## ❌ Error: `sunspot: command not found`

### Problem
```
sunspot compile target/shuffle_proof.json
bash: sunspot: command not found
```

### Cause
- Sunspot build failed
- PATH not exported correctly

### ✅ Solution
Check the "Clone and Build Sunspot" step logs:

```yaml
- name: Clone and Build Sunspot
  run: |
    cd $HOME
    git clone https://github.com/reilabs/sunspot.git
    cd sunspot/go
    go build -o sunspot .
    echo "$HOME/sunspot/go" >> $GITHUB_PATH
```

**Verify:**
1. Go version is 1.24+ ✅
2. Build completes without errors ✅
3. PATH is exported ✅

If build fails:
- Check Go installation step
- Check sunspot repo is accessible
- Try pinning to a specific sunspot commit

---

## ❌ Error: `GNARK_VERIFIER_BIN is not set`

### Problem
```
sunspot deploy target/shuffle_proof.vk
Error: Environment variable GNARK_VERIFIER_BIN is not set
```

### Cause
- Required environment variable not exported

### ✅ Solution
The workflow sets this automatically:

```yaml
export GNARK_VERIFIER_BIN="$HOME/sunspot/gnark-solana/crates/verifier-bin"
echo "GNARK_VERIFIER_BIN=$GNARK_VERIFIER_BIN" >> $GITHUB_ENV
```

**Verify in logs:**
- Check "Clone and Build Sunspot" step
- Verify the path exists: `ls -la $HOME/sunspot/gnark-solana/crates/verifier-bin`

---

## ❌ Error: Nargo fails to compile circuits

### Problem
```
nargo compile --package shuffle_proof
Error: Could not find package shuffle_proof
```

### Cause
- Circuit not defined in workspace
- `Nargo.toml` issue

### ✅ Solution
**Verify workspace structure:**

```toml
# circuits/Nargo.toml
[workspace]
members = [
    "shuffle_proof",
    "deal_proof",
    "reveal_proof",
    "hash_14_helper",
    "hash_2_helper"
]
```

**Check each circuit has:**
- `circuits/shuffle_proof/Nargo.toml`
- `circuits/shuffle_proof/src/main.nr`

---

## ❌ Error: Deployment fails with "insufficient funds"

### Problem
```
Error: Insufficient funds for transaction
Account balance: 0.5 SOL
Required: 2.3 SOL
```

### Cause
- Deployer keypair doesn't have enough SOL

### ✅ Solution
**Fund your deployer:**

```bash
# Get deployer address from GitHub secret
# Then airdrop more SOL
solana airdrop 5 YOUR_DEPLOYER_ADDRESS --url devnet
```

**Or update the workflow to auto-fund:**

```yaml
- name: Fund Deployer (Devnet Only)
  run: |
    DEPLOYER_ADDRESS=$(solana address -k /tmp/deployer.json)
    solana airdrop 5 $DEPLOYER_ADDRESS --url devnet || true
    sleep 2
    solana airdrop 5 $DEPLOYER_ADDRESS --url devnet || true
```

---

## ❌ Error: Workflow timeout

### Problem
```
The job running on runner GitHub Actions X has exceeded the maximum time of 60 minutes.
```

### Cause
- Circuit compilation too slow
- Proof generation taking too long

### ✅ Solution
**1. Optimize circuits:**
- Reduce constraint count
- Simplify logic
- Check for unnecessary computations

**2. Increase timeout:**
```yaml
jobs:
  build-verifiers:
    runs-on: ubuntu-latest
    timeout-minutes: 90  # Increase from default 60
```

**3. Split into multiple jobs:**
```yaml
jobs:
  build-shuffle:
    # Build shuffle_proof only
  
  build-deal:
    # Build deal_proof only
  
  build-reveal:
    # Build reveal_proof only
```

---

## 🔍 Debugging Tips

### 1. Enable verbose logging
```yaml
- name: Your Step
  run: |
    set -x  # Print each command before executing
    your_command_here
```

### 2. Check PATH
```yaml
- name: Debug PATH
  run: |
    echo "PATH=$PATH"
    echo "Which solana: $(which solana || echo 'not found')"
    echo "Which cargo-build-sbf: $(which cargo-build-sbf || echo 'not found')"
    echo "Which sunspot: $(which sunspot || echo 'not found')"
```

### 3. List installed files
```yaml
- name: Debug Solana Installation
  run: |
    find ~/solana-release -name "cargo-build-sbf" || echo "Not found"
    find ~/sunspot -name "sunspot" || echo "Not found"
```

### 4. Test locally with Act
Run GitHub Actions locally on your Mac:

```bash
# Install act
brew install act

# Run the workflow locally
cd /Users/marcus/Projects/solanaprivacyhack
act workflow_dispatch
```

---

## ✅ Workflow Health Check

Your workflow is healthy if you see:

```
✅ Checkout repository (1s)
✅ Install Go (5s)
✅ Install Rust (13s)
✅ Install Solana CLI (30s)
  - solana --version → 1.18.20
  - cargo-build-sbf --version → Found!
✅ Install Noir (15s)
  - nargo --version → 1.0.0-beta.18
✅ Clone and Build Sunspot (60s)
  - sunspot compiled
  - GNARK_VERIFIER_BIN set
✅ Compile Noir Circuits (45s)
  - shuffle_proof.json ✅
  - deal_proof.json ✅
  - reveal_proof.json ✅
✅ Convert to Groth16 (120s)
  - .ccs files created ✅
  - .vk files created ✅
✅ Build Solana Verifiers (180s)
  - shuffle_proof_verifier.so ✅
  - deal_proof_verifier.so ✅
  - reveal_proof_verifier.so ✅
✅ Upload Artifacts (5s)
```

**Total time:** ~8-10 minutes for build-only
**Total time with deploy:** ~12-15 minutes

---

## 🚨 When to Ask for Help

If you see these, something is seriously wrong:

1. ❌ **Go installation fails** → Check GitHub Actions runner
2. ❌ **Sunspot repo 404** → Repo moved/deleted, need alternative
3. ❌ **All circuits fail to compile** → Noir version mismatch
4. ❌ **Groth16 conversion errors** → Circuit incompatibility with Sunspot

**Where to get help:**
- Sunspot Issues: https://github.com/reilabs/sunspot/issues
- Reilabs Discord: (check their repo for link)
- Noir Discord: https://discord.gg/noir

---

## 📋 Quick Checklist

Before running the workflow:

- [ ] Code pushed to GitHub
- [ ] Circuits compile locally (`nargo compile`)
- [ ] `circuits/Nargo.toml` workspace defined
- [ ] All 3 circuits present (shuffle, deal, reveal)
- [ ] (Optional) `SOLANA_DEPLOYER_KEY` secret added
- [ ] (Optional) Deployer funded with 5+ SOL on devnet

After workflow completes:

- [ ] All steps green ✅
- [ ] Artifacts uploaded
- [ ] `.so` files downloadable
- [ ] (If deployed) Program IDs visible
- [ ] (If deployed) Programs visible on Solana Explorer

---

*Last updated: Jan 23, 2026 - After fixing release.solana.com connectivity*

