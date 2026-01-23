# Current Progress - Marcus (ZK Engineer)

**Last Updated:** Jan 23, 2026

---

## ✅ Completed

### Day 1 (Jan 21)
- [x] Install Nargo
- [x] Create shuffle proof circuit
- [x] Compile circuit (812 constraints)
- [x] Run tests

### Day 2 (Jan 22)
- [x] Set up Nargo + BB on macOS
- [x] Generate native proof (0.44s)
- [x] Set up NoirJS
- [x] Create browser test page
- [x] Measure browser proof (0.64s)
- [x] Document proof format for CKay

### Day 3 (Jan 23)
- [x] Restructure circuits into Noir workspace (`circuits/` with sub-packages)
- [x] Implement deal_proof circuit (1,111 constraints, 0.18s native prove)
- [x] Write 3 passing tests for deal_proof (valid deal, wrong position, wrong blinding)
- [x] Implement reveal_proof circuit (333 constraints, 0.011s native prove)
- [x] Write 5 passing tests for reveal_proof (3 valid reveals, wrong card, wrong blinding)
- [x] All 3 ZK circuits complete and verified

---

## 📊 Metrics

| Circuit | Metric | Target | Actual | Status |
|---------|--------|--------|--------|--------|
| shuffle_proof | Constraints | <50k | **812** | ✅ |
| shuffle_proof | Native proof | <5s | **0.44s** | ✅ |
| shuffle_proof | Browser proof | <15s | **0.64s** | ✅ |
| deal_proof | Constraints | <50k | **1,111** | ✅ |
| deal_proof | Native proof | <5s | **0.18s** | ✅ |
| reveal_proof | Constraints | <50k | **333** | ✅ |
| reveal_proof | Native proof | <5s | **0.011s** | ✅ |

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `circuits/Nargo.toml` | Workspace config (members: shuffle_proof, deal_proof, reveal_proof) |
| `circuits/shuffle_proof/src/main.nr` | Shuffle proof circuit |
| `circuits/deal_proof/src/main.nr` | Deal proof circuit |
| `circuits/reveal_proof/src/main.nr` | Reveal proof circuit |
| `pages/zk-test.js` | Browser proof test page |
| `lib/noir/test-proof.mjs` | Node.js proof test |
| `marcus-docs/PROOF_FORMAT.md` | Proof format for CKay |

---

## 🎯 Next Up

Per [MARCUS.md](../worksplit/MARCUS.md):

- [x] Deal proof circuit (`circuits/deal_proof/src/main.nr`)
- [x] Reveal proof circuit (`circuits/reveal_proof/src/main.nr`)
- [ ] Browser proof timing for deal_proof and reveal_proof
- [ ] Integrate NoirJS into main frontend (all 3 circuits)
- [ ] Integration testing with CKay's on-chain verifier
- [ ] End-to-end proof chain test (shuffle→deal→reveal)
