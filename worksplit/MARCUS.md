# Marcus's Task List - ZK Engineer

> **Role:** Zero-Knowledge Circuit Development  
> **Focus:** Noir circuits, proof generation, NoirJS integration

---

## 🚨 Day 1-2: CRITICAL VALIDATION

**Your #1 priority is proving the shuffle circuit works.**

### Day 1 (Jan 21)
- [ ] Install Nargo (Noir compiler): `curl -L https://raw.githubusercontent.com/noir-lang/noir/master/install.sh | sh`
- [ ] Create circuits folder and initialize: `nargo init`
- [ ] Write `shuffle_proof.nr` circuit (see [ZK_CIRCUITS.md](../docs/ZK_CIRCUITS.md))
- [ ] Compile circuit: `nargo compile`
- [ ] Check constraint count (target: < 50,000)
- [ ] Generate test proof: `nargo prove`
- [ ] **MEASURE:** Native proof generation time

### Day 2 (Jan 22)
- [ ] Set up NoirJS in browser test page
- [ ] **MEASURE:** Browser proof generation time  
- [ ] ✅ Report to CKay: proof format specification
- [ ] **DECISION:** Is proof time < 30 seconds?

> ⚠️ If Day 2 proof time > 30s, escalate immediately for Day 5 pivot discussion.

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
- [ ] Integrate NoirJS into frontend
- [ ] Test proof → contract flow
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

| Metric | ✅ Target | ❌ Blocker |
|--------|-----------|-----------|
| Shuffle proof (browser) | < 15s | > 30s |
| Shuffle proof (native) | < 5s | > 10s |
| Total constraints | < 50k | > 100k |

---

## Handoffs to CKay

| Day | What You Deliver |
|-----|------------------|
| 2 | Proof format spec (input/output structure) |
| 5 | Working shuffle circuit + test proofs |
| 8 | NoirJS integration code |

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
