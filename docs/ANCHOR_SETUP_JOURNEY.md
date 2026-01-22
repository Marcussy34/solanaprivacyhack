# Anchor Setup Journey - CK's Learning Doc

> **Date:** January 22, 2026
> **Task:** Set up Anchor smart contract for ZK Card Arena
> **Outcome:** SUCCESS (after troubleshooting)

---

## Overview

This document explains the entire process of setting up the Anchor program, including the problems encountered and how they were solved. This is meant to help you (CK) understand what happened so you can troubleshoot similar issues in the future.

---

## Phase 1: Prerequisites Check

### What We Did
```bash
rustc --version   # → 1.90.0 ✓
cargo --version   # → 1.90.0 ✓
solana --version  # → 2.2.12 ✓
anchor --version  # → 0.31.1 ✓
```

### Result
All tools were installed. We configured Solana for devnet:
```bash
solana config set --url devnet
```

Your wallet: `FBbtnQhu1c1kk4x9mGeL4QWbY5khrnbQ2CzoCsJq2M2d`
Balance: 6.44 SOL on devnet ✓

---

## Phase 2: Project Initialization

### What We Did
Instead of running `anchor init` (which would overwrite your existing Next.js project), we manually created the Anchor structure:

```
Created:
├── Anchor.toml                              # Anchor project config
├── Cargo.toml                               # Rust workspace config
└── programs/zk-card-arena/
    ├── Cargo.toml                           # Program dependencies
    └── src/
        └── lib.rs                           # Game logic (422 lines)
```

### Why Manual Setup?
- Your repo already had Next.js, circuits, docs
- `anchor init` would create a new project structure and potentially conflict
- Manual setup gives us full control

---

## Phase 3: The Build Problem (THE BIG ISSUE)

### First Attempt
```bash
anchor build
```

### Error
```
error: failed to parse manifest at constant_time_eq-0.4.2/Cargo.toml

Caused by:
  feature `edition2024` is required

  The package requires the Cargo feature called `edition2024`,
  but that feature is not stabilized in this version of Cargo (1.84.0)
```

### Understanding the Problem

Here's what was happening:

```
┌─────────────────────────────────────────────────────────────────┐
│                    YOUR SYSTEM                                   │
├─────────────────────────────────────────────────────────────────┤
│  System Rust/Cargo: 1.90.0 (later updated to 1.92.0)           │
│                                                                  │
│  BUT...                                                          │
│                                                                  │
│  Solana Platform Tools use THEIR OWN Cargo: 1.84.0              │
│  (bundled inside ~/.local/share/solana/install/)                │
└─────────────────────────────────────────────────────────────────┘
```

When you run `anchor build`, it uses `cargo-build-sbf` which is part of Solana's platform tools. These tools have their **own bundled Rust/Cargo** (version 1.84.0), not your system Rust.

The problem:
1. `anchor-lang` depends on `solana-program`
2. `solana-program` depends on `blake3`
3. `blake3` (latest v1.8.3) depends on `constant_time_eq` v0.4.2
4. `constant_time_eq` v0.4.2 uses **Rust Edition 2024**
5. Cargo 1.84.0 doesn't support Edition 2024 (needs 1.85+)

```
Dependency Chain:
anchor-lang 0.31.1
    └── solana-program 1.18.x
            └── blake3 1.8.3
                    └── constant_time_eq 0.4.2  ← USES EDITION 2024!
                                                   Cargo 1.84.0 can't parse it
```

---

## Phase 4: Failed Solutions

### Attempt 1: Update System Rust
```bash
rustup update stable  # Updated to 1.92.0
```
**Result:** Didn't help. Platform tools still use their own Cargo 1.84.0.

### Attempt 2: Update Solana CLI
```bash
agave-install update  # Updated to 2.2.20
```
**Result:** Didn't help. Platform tools v1.48 still has old Cargo.

### Attempt 3: Reinstall Solana Completely
```bash
rm -rf ~/.local/share/solana
sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"
```
**Result:** Got Solana 3.0.13, platform-tools v1.51. Still Cargo 1.84.0!

### Attempt 4: Downgrade Anchor
```bash
anchor-lang = "0.30.1"  # Then 0.29.0, then 0.28.0
```
**Result:** Same issue. Even older anchor versions pull in blake3 which pulls in constant_time_eq 0.4.2.

### Attempt 5: Patch constant_time_eq
```toml
[patch.crates-io]
constant_time_eq = "=0.3.1"
```
**Result:** Error - can't patch crates-io with crates-io.

### Attempt 6: Pin constant_time_eq directly
```bash
cargo update -p constant_time_eq@0.4.2 --precise 0.3.1
```
**Result:** Error - blake3 requires ^0.4.2, can't downgrade to 0.3.1.

---

## Phase 5: The Solution

### The Key Insight

The problem wasn't `constant_time_eq` directly - it was `blake3`.

```
blake3 1.8.3 → requires constant_time_eq ^0.4.2 (edition2024)
blake3 1.5.5 → requires constant_time_eq ^0.3.0 (edition2021) ✓
```

But there was another constraint: `solana-program` requires blake3 with the `digest` feature.

```
blake3 < 1.6.0  → has "digest" as implicit feature ✓
blake3 >= 1.6.0 → uses dep:digest syntax (not implicit)
```

### The Fix

We needed:
1. `anchor-lang` 0.28.0 (uses solana-program 1.16.x)
2. `blake3` 1.5.5 with `digest` feature explicitly enabled

```toml
# programs/zk-card-arena/Cargo.toml

[dependencies]
anchor-lang = "0.28.0"
# Force older blake3 that has implicit digest feature and uses constant_time_eq 0.3.x
blake3 = { version = "=1.5.5", features = ["digest"] }
```

Also had to remove the `idl-build` feature since anchor 0.28.0 doesn't have it:
```toml
[features]
idl-build = []  # Empty, not ["anchor-lang/idl-build"]
```

### Verification
```bash
cargo generate-lockfile
grep -A1 'name = "constant_time_eq"' Cargo.lock
# Output: version = "0.3.1"  ← SUCCESS!
```

---

## Phase 6: Final Build Issue

### The Error
```rust
error[E0609]: no field `game` on type `BTreeMap<String, u8>`
  --> programs/zk-card-arena/src/lib.rs:28:31
   |
28 |         game.bump = ctx.bumps.game;
   |                               ^^^^ unknown field
```

### The Cause
Anchor 0.28.0 has a different API than 0.31.1:

```rust
// Anchor 0.31.x (newer)
game.bump = ctx.bumps.game;

// Anchor 0.28.x (older)
game.bump = *ctx.bumps.get("game").unwrap();
```

### The Fix
Changed line 28 in lib.rs:
```rust
game.bump = *ctx.bumps.get("game").unwrap();
```

---

## Phase 7: Success!

```bash
anchor build
# Finished `test` profile [unoptimized + debuginfo] target(s) in 37.84s
```

Output:
```
target/deploy/zk_card_arena.so  (278KB)
```

---

## Summary: What We Learned

### The Root Cause
Solana's platform tools bundle an older Cargo (1.84.0) that can't handle Rust Edition 2024 crates.

### The Solution Pattern
When you hit edition2024 issues with Solana/Anchor:

1. **Identify the problematic crate** using `cargo tree -i <crate_name>`
2. **Find which crate pulls it in** (trace the dependency chain)
3. **Pin an older version** of the upstream crate that uses edition2021
4. **Check feature compatibility** (especially for features like `digest`)

### Version Matrix That Works

| Component | Version | Notes |
|-----------|---------|-------|
| Solana CLI | 3.0.13 | Any recent version |
| Platform Tools | v1.51 | Has Cargo 1.84.0 |
| Anchor CLI | 0.31.1 | Installed version |
| anchor-lang | **0.28.0** | Use older to avoid issue |
| blake3 | **=1.5.5** | Pin with digest feature |
| constant_time_eq | 0.3.1 | Automatically resolved |

### Files Modified

```
Anchor.toml                              # Config
Cargo.toml                               # Workspace
programs/zk-card-arena/Cargo.toml        # Dependencies (key file!)
programs/zk-card-arena/src/lib.rs        # Game logic + bump fix
```

---

## Why This Matters for the Project

### Impact on Day 5 (Light Protocol Integration)
When we integrate Light Protocol's Groth16 verifier, we may hit similar dependency issues. The pattern will be:
1. Check what solana-program version Light Protocol uses
2. Ensure it's compatible with anchor 0.28.0
3. Pin any problematic transitive dependencies

### Impact on Frontend (NoirJS)
This issue is Rust-specific. NoirJS in the browser uses JavaScript/WASM and won't have this problem.

---

## Quick Reference: Useful Commands

```bash
# Check what depends on a crate
cargo tree -i constant_time_eq

# Generate lockfile without building
cargo generate-lockfile

# Check specific version in lockfile
grep -A1 'name = "blake3"' Cargo.lock

# Clean and rebuild
cargo clean && anchor build

# Check platform tools version
cargo-build-sbf --version
```

---

## TL;DR

**Problem:** Solana platform tools use Cargo 1.84.0, which can't handle `constant_time_eq` 0.4.2 (Rust Edition 2024).

**Solution:** Pin `blake3 = "=1.5.5"` with digest feature, use `anchor-lang = "0.28.0"`, and adjust bump access syntax.

**Time spent:** ~45 minutes troubleshooting

**Lesson:** Always check transitive dependencies when hitting "edition" or "feature" errors in Solana/Anchor builds.
