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

---

## 📊 Metrics

| Circuit | Metric | Target | Actual | Status |
|---------|--------|--------|--------|--------|
| shuffle_proof | Constraints | <50k | **812** | ✅ |
| shuffle_proof | Native proof | <5s | **0.44s** | ✅ |
| shuffle_proof | Browser proof | <15s | **0.64s** | ✅ |
| deal_proof | Constraints | <50k | **1,111** | ✅ |
| deal_proof | Native proof | <5s | **0.18s** | ✅ |

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `circuits/Nargo.toml` | Workspace config (members: shuffle_proof, deal_proof) |
| `circuits/shuffle_proof/src/main.nr` | Shuffle proof circuit |
| `circuits/deal_proof/src/main.nr` | Deal proof circuit |
| `pages/zk-test.js` | Browser proof test page |
| `lib/noir/test-proof.mjs` | Node.js proof test |
| `marcus-docs/PROOF_FORMAT.md` | Proof format for CKay |

---

## 🎯 Next Up

Per [MARCUS.md](../worksplit/MARCUS.md):

- [x] Deal proof circuit (`circuits/deal_proof/src/main.nr`)
- [ ] Reveal proof circuit (`circuits/reveal_proof/src/main.nr`)
- [ ] Integrate NoirJS into main frontend
- [ ] Test proof → contract flow with CKay
