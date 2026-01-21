# Agent Handover - ZK Circuit Development

**Handover Date:** January 22, 2026
**Previous Agent Session:** Completed Day 1 tasks
**Branch:** `marcus`

---

## Quick Summary

The ZK shuffle proof circuit is **written, compiled, and tested**. The main blocker is generating a native proof using Barretenberg (`bb`) due to library dependencies in WSL. The circuit metrics are excellent (812 constraints vs 50K target).

---

## Current State

### What's Done

| Task | Status | Notes |
|------|--------|-------|
| Nargo installed | DONE | v1.0.0-beta.18 via WSL Ubuntu |
| Nargo on macOS | DONE | v1.0.0-beta.18 via noirup |
| BB on macOS | DONE | v3.0.0-nightly.20260102 via bbup |
| Circuit written | DONE | `circuits/src/main.nr` |
| Circuit compiles | DONE | 812 constraints, 8 ACIR opcodes |
| Tests pass | DONE | 1/1 test passed |
| Witness execution | DONE | 0.166s |
| Proof generation | DONE | **0.44s on macOS** |
| Proof verification | DONE | Verified successfully |

### What's Blocked

**Barretenberg (bb) proving backend** cannot run:
```
libc++.so.1: cannot open shared object file: No such file or directory
```

**To fix** (requires sudo in WSL Ubuntu terminal):
```bash
sudo apt-get update && sudo apt-get install -y libc++-dev libc++abi-dev
```

Then proof generation:
```bash
~/.bb/bb prove -b ./target/shuffle_proof.json -w ./target/shuffle_proof.gz -o ./proof
```

---

## Key Files

```
circuits/
├── Nargo.toml          # Package config (depends on poseidon v0.2.2)
├── Prover.toml         # Test inputs with valid commitment
├── src/
│   └── main.nr         # Shuffle proof circuit
└── target/
    ├── shuffle_proof.json   # Compiled ACIR
    └── shuffle_proof.gz     # Witness file
```

---

## How to Run Nargo (Windows)

Nargo only works through WSL. Use this pattern:

```bash
wsl -d Ubuntu -e bash -c "export PATH=~/.nargo/bin:\$PATH && cd /mnt/c/Users/marcu/Documents/GitHub/solanaprivacyhack/circuits && nargo <command>"
```

**Common commands:**
- `nargo compile` - Compile circuit
- `nargo test` - Run tests
- `nargo execute` - Generate witness from Prover.toml
- `nargo info` - Show constraint count

---

## Circuit Overview

**Purpose:** Prove a card shuffle is a valid permutation without revealing the shuffle order.

**Inputs:**
| Name | Type | Visibility | Purpose |
|------|------|------------|---------|
| seed | Field | Private | Randomness for commitment |
| shuffled_deck | [u8; 13] | Private | The actual shuffle order |
| deck_commitment | Field | Public | Hash commitment to verify |
| original_deck | [u8; 13] | Public | Expected cards (0-12) |

**What it proves:**
1. `shuffled_deck` contains each card (0-12) exactly once
2. Poseidon hash of (seed, shuffled_deck) equals `deck_commitment`

---

## Metrics (Day 1 Success Criteria)

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Constraints | < 50,000 | 812 | EXCELLENT |
| Native proof time | < 5s | **0.44s** | EXCELLENT |
| Compilation | Pass | Pass | DONE |

---

## Day 2 Tasks (Next Steps)

Per the original plan in `.claude/plans/merry-weaving-moon.md`:

1. **Fix bb installation** OR set up NoirJS for browser proving
2. **Measure native proof time** (target: < 5s)
3. **Set up NoirJS test page** for browser proof generation
4. **Measure browser proof time** (target: < 15s, blocker: > 30s)
5. **Document proof format** for CKay (Anchor contract integration)

---

## Recommended Next Action

**Option A (Faster):** Have user run sudo command manually, then generate proof with `bb`.

**Option B (Day 2 path):** Skip native proof, set up NoirJS directly:
```bash
npm install @noir-lang/noir_js @aztec/bb.js
```

Then create a test script that:
1. Loads compiled circuit from `circuits/target/shuffle_proof.json`
2. Generates proof in Node.js/browser
3. Measures proof generation time

---

## Reference Links

- Noir docs: https://noir-lang.org/docs
- NoirJS: https://noir-lang.org/docs/tutorials/noirjs_app
- BB version compatibility: v3.0.0-nightly.20251104 (for Noir 1.0.0-beta.18)

---

## Git Status

Last commit: `497bfb1 Add ZK shuffle proof circuit and documentation`
Branch: `marcus`
Remote: Up to date with `origin/marcus`

Uncommitted changes:
- `.claude/settings.local.json` (modified by Claude Code)
