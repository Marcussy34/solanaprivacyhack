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

### Day 4 (Jan 23)
- [x] Measure browser proof timing for all circuits
- [x] Create `hooks/useZK.js` for frontend integration
- [x] Create `pages/zk-hook-test.js` for hook verification
- [x] Verify deck size (13 cards, 0-12)

---

## 📊 Metrics

| Circuit | Metric | Target | Actual | Status |
|---------|--------|--------|--------|--------|
| shuffle_proof | Constraints | <50k | **812** | ✅ |
| shuffle_proof | Native proof | <5s | **0.44s** | ✅ |
| shuffle_proof | Browser proof | <15s | **0.54s** | ✅ |
| deal_proof | Constraints | <50k | **1,111** | ✅ |
| deal_proof | Native proof | <5s | **0.18s** | ✅ |
| deal_proof | Browser proof | <5s | **0.61s** | ✅ |
| reveal_proof | Constraints | <50k | **333** | ✅ |
| reveal_proof | Native proof | <5s | **0.011s** | ✅ |
| reveal_proof | Browser proof | <5s | **0.37s** | ✅ |

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `circuits/Nargo.toml` | Workspace config (members: shuffle_proof, deal_proof, reveal_proof) |
| `circuits/*/src/main.nr` | Circuit source code |
| `hooks/useZK.js` | **[NEW]** React hook for ZK proof generation |
| `pages/zk-test.js` | Raw browser proof test page |
| `pages/zk-hook-test.js` | **[NEW]** Hook integration test page |
| `marcus-docs/PROOF_FORMAT.md` | Proof format for CKay |

---

## 🎯 Next Up

Per [MARCUS.md](../worksplit/MARCUS.md):

- [x] Deal proof circuit (`circuits/deal_proof/src/main.nr`)
- [x] Reveal proof circuit (`circuits/reveal_proof/src/main.nr`)
- [x] Browser proof timing for deal_proof and reveal_proof
- [x] Integrate NoirJS into main frontend (`hooks/useZK.js`)
- [ ] Integration testing with CKay's on-chain verifier
- [ ] End-to-end proof chain test (shuffle→deal→reveal)
- [ ] Game loop integration (connect hook to Game UI)
