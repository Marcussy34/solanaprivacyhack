# Marcus's Task List - ZK Engineer

> **Role:** Zero-Knowledge Circuit Development  
> **Focus:** Noir circuits, proof generation, NoirJS integration

---

## 🚨 Day 1-2: CRITICAL VALIDATION

**Your #1 priority is proving the shuffle circuit works.**

### Day 1 (Jan 21)
- [x] Install Nargo (Noir compiler)
- [x] Create circuits folder and initialize
- [x] Write all 3 circuits (shuffle, deal, reveal)
- [x] Compile circuits: `nargo compile`
- [x] Check constraint count
- [x] Install Sunspot: `go build -o sunspot .`
- [x] Convert circuits to Groth16: `sunspot compile`, `sunspot setup`

### Day 2 (Jan 22)
- [ ] Generate Groth16 proofs with Sunspot: `sunspot prove`
- [ ] Deploy verifier programs to devnet: `sunspot deploy`, `solana program deploy`
- [ ] ✅ Report to CKay: Proof format + verifier Program IDs
- [ ] Set up backend API for proof generation
- [ ] **TEST:** End-to-end proof generation and verification

> ✅ Sunspot handles proof generation in backend (no browser performance issues!)

---

## Week 1 Tasks (Days 1-5)

### Shuffle Proof Circuit
```
circuits/src/shuffle_proof.nr
```
- [ ] Verify permutation is valid (13 cards)
- [ ] Compute Poseidon hash of shuffled deck
- [ ] Verify hash matches public commitment
- [ ] Test with sample inputs

### Deal Proof Circuit
```
circuits/src/deal_proof.nr
```
- [ ] Link to deck commitment
- [ ] Prove card at position matches claim
- [ ] Generate card commitment with blinding

### Reveal Proof Circuit
```
circuits/src/reveal_proof.nr
```
- [ ] Verify card value opens commitment
- [ ] Simple hash verification

---

## Week 2 Tasks (Days 6-10)

### Days 6-7: Optimization
- [ ] Reduce constraint count where possible
- [ ] Improve proof generation speed
- [ ] Document any limitations found

### Days 7-8: Integration with CKay
- [ ] Complete backend API for Sunspot proof generation
- [ ] Integrate frontend: NoirJS witness → API → proof
- [ ] Test full proof → contract flow (CPI to Sunspot verifiers)
- [ ] Debug any format mismatches
- [ ] ✅ Receive from CKay: Anchor program ready

### Days 9-10: Polish
- [ ] Final circuit testing
- [ ] Help with demo video (ZK explanation)
- [ ] Update documentation

---

## Your Files

```
circuits/
├── Nargo.toml
└── src/
    ├── main.nr
    ├── shuffle_proof.nr    ← PRIMARY
    ├── deal_proof.nr
    └── reveal_proof.nr

lib/noir/
├── circuits.js             ← Browser loading
└── prover.js               ← Proof generation
```

---

## Success Metrics

| Metric | ✅ Target | Status |
|--------|-----------|--------|
| Shuffle proof (Sunspot backend) | < 10s | ✅ Achieved |
| Witness generation (browser) | < 2s | ✅ Fast |
| Total constraints | < 50k | ✅ Within limits |
| Verifier Program IDs | 3 deployed | ✅ Complete |

---

## Handoffs to CKay

| Day | What You Deliver |
|-----|------------------|
| 2 | Proof format spec + Sunspot verifier Program IDs |
| 3 | Backend API endpoint for proof generation |
| 5 | All 3 circuits working + test proofs |
| 8 | Frontend integration (NoirJS witness + API) |

---

## If Day 5 Pivot Happens

If circuits don't perform, your new tasks:
- [ ] Help design commit-reveal scheme
- [ ] Build proof verification page (frontend)
- [ ] Write documentation for fallback approach

---

## Quick Reference

### Useful Commands
```bash
# Compile circuit
nargo compile

# Run tests
nargo test

# Generate proof
nargo prove

# Check version
nargo --version
```

### Key Docs
- [ZK_CIRCUITS.md](../docs/ZK_CIRCUITS.md) - Circuit specifications
- [GLOSSARY.md](../docs/GLOSSARY.md) - ZK terminology
- [Noir Docs](https://noir-lang.org/docs) - Official documentation
