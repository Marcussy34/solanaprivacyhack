# Current Progress - Marcus (ZK Engineer)

**Last Updated:** Jan 22, 2026 @ 01:49 AM

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

---

## 📊 Metrics

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Constraints | <50k | **812** | ✅ |
| Native proof | <5s | **0.44s** | ✅ |
| Browser proof | <15s | **0.64s** | ✅ |

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `circuits/src/main.nr` | Shuffle proof circuit |
| `pages/zk-test.js` | Browser proof test page |
| `lib/noir/test-proof.mjs` | Node.js proof test |
| `marcus-docs/PROOF_FORMAT.md` | Proof format for CKay |

---

## 🎯 Next Up

Per [MARCUS.md](../worksplit/MARCUS.md):

- [ ] Deal proof circuit (`circuits/src/deal_proof.nr`)
- [ ] Reveal proof circuit (`circuits/src/reveal_proof.nr`)
- [ ] Integrate NoirJS into main frontend
- [ ] Test proof → contract flow with CKay
