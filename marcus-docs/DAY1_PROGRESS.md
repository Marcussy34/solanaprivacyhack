# Marcus Day 1 Progress - ZK Circuit Development

**Date:** January 21, 2026
**Status:** Circuit Development Complete, Proof Generation Pending

---

## Completed Tasks

### 1. Nargo Installation
- Installed via WSL Ubuntu (Windows native not supported)
- **Version:** nargo 1.0.0-beta.18
- **Location:** `~/.nargo/bin/nargo` (WSL)
- **Command to run:** `wsl -d Ubuntu -- bash -c "~/.nargo/bin/nargo <command>"`

### 2. Circuit Project Initialized
- **Location:** `circuits/`
- **Package name:** `shuffle_proof`
- Structure:
  ```
  circuits/
  ├── Nargo.toml
  ├── Prover.toml
  └── src/
      └── main.nr
  ```

### 3. Shuffle Proof Circuit Written
- **File:** `circuits/src/main.nr`
- **Features:**
  - Verifies shuffled_deck is valid permutation (cards 0-12)
  - Computes Poseidon hash commitment of (seed + shuffled_deck)
  - Asserts computed commitment matches provided commitment
  - Returns commitment as public output

**Circuit Inputs:**
| Input | Type | Visibility |
|-------|------|------------|
| seed | Field | Private |
| shuffled_deck | [u8; 13] | Private |
| deck_commitment | Field | Public |
| original_deck | [u8; 13] | Public |

**Dependencies:**
```toml
[dependencies]
poseidon = { tag = "v0.2.2", git = "https://github.com/noir-lang/poseidon" }
```

### 4. Circuit Compiled Successfully
- **Compilation:** PASSED
- **Tests:** 1/1 PASSED
- **Constraint Count:** 812 (Expression Width)
- **ACIR Opcodes:** 8

### 5. Test Inputs Created (Prover.toml)
```toml
# Private inputs
seed = "12345"
shuffled_deck = [5, 2, 11, 0, 8, 3, 12, 6, 1, 9, 4, 10, 7]

# Public inputs
deck_commitment = "0x04b91d7cc07a8e73f8ea50ec08d0457c785953dae3c2624a3a0a4ead6c02ed7e"
original_deck = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
```

---

## Metrics Summary

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Constraint Count | < 50,000 | 812 | EXCELLENT |
| ACIR Opcodes | - | 8 | EXCELLENT |
| Compilation | No errors | PASSED | PASSED |
| Tests | All pass | 1/1 | PASSED |

---

## Pending: Native Proof Generation

### Issue
The `bb` (Barretenberg) proving backend has library dependency issues on WSL:
```
libc++.so.1: cannot open shared object file
```

### Resolution Path
1. **Option A:** Set up NoirJS in Node.js for proof generation (needed for Day 2 anyway)
2. **Option B:** Use Docker container with pre-installed bb
3. **Option C:** Fix WSL library dependencies

**Recommendation:** Proceed with Option A (NoirJS) as it directly supports the browser proof generation required for Day 2.

---

## Commands Reference

```bash
# Compile circuit
wsl -d Ubuntu -- bash -c "cd /mnt/c/Users/marcu/Documents/GitHub/solanaprivacyhack/circuits && ~/.nargo/bin/nargo compile"

# Run tests
wsl -d Ubuntu -- bash -c "cd /mnt/c/Users/marcu/Documents/GitHub/solanaprivacyhack/circuits && ~/.nargo/bin/nargo test"

# Get circuit info
wsl -d Ubuntu -- bash -c "cd /mnt/c/Users/marcu/Documents/GitHub/solanaprivacyhack/circuits && ~/.nargo/bin/nargo info"

# Execute with witness
wsl -d Ubuntu -- bash -c "cd /mnt/c/Users/marcu/Documents/GitHub/solanaprivacyhack/circuits && ~/.nargo/bin/nargo execute"
```

---

## Day 2 Plan

1. Set up NoirJS in test page
2. Use `@noir-lang/noir_js` and `@aztec/bb.js` for browser proving
3. Measure browser proof generation time
4. Target: < 15 seconds in browser
5. Blocker: > 30 seconds triggers pivot discussion

---

## Files Created/Modified

- `circuits/Nargo.toml` - Package configuration
- `circuits/Prover.toml` - Test inputs with computed commitment
- `circuits/src/main.nr` - Shuffle proof circuit
- `marcus-docs/DAY1_PROGRESS.md` - This progress document
