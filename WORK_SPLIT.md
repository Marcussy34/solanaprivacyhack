# ZK Card Arena - Work Split

## Team Roles

| Person | Role | Focus Area |
|--------|------|------------|
| **Marcus** | ZK Engineer | Noir circuits, proofs, cryptography |
| **CKay** | Full-Stack Developer | Anchor program, Frontend, Integration |

---

## Marcus's Responsibilities (ZK Track)

### Week 1 Priority
- [ ] Set up Noir development environment
- [ ] Write and benchmark `shuffle_proof.nr` (Day 1-2 ⚡ CRITICAL)
- [ ] Write `deal_proof.nr` circuit
- [ ] Write `reveal_proof.nr` circuit
- [ ] Test proof generation in browser (NoirJS)

### Week 2 Priority
- [ ] Optimize circuits for constraint count
- [ ] Integrate NoirJS into frontend (with friend)
- [ ] Debug proof generation issues
- [ ] Document circuit specs

### Key Files You Own
```
circuits/
├── Nargo.toml
└── src/
    ├── shuffle_proof.nr    ← You
    ├── deal_proof.nr       ← You
    └── reveal_proof.nr     ← You

lib/noir/                   ← You (with friend for integration)
├── circuits.js
└── prover.js
```

### Marcus's Success Metrics
| Metric | Target | Blocker if |
|--------|--------|-----------|
| Shuffle proof time (browser) | < 15s | > 30s |
| Shuffle proof time (native) | < 5s | > 10s |
| Total constraints | < 50k | > 100k |

---

## CKay's Responsibilities (Full-Stack Track)

### Week 1 Priority
- [ ] Initialize Anchor project structure
- [ ] Define account structures (Game, Player)
- [ ] Implement `create_game` instruction
- [ ] Implement `join_game` instruction
- [ ] Set up Light Protocol Groth16 verifier

### Week 2 Priority
- [ ] Implement `deal_card` with proof verification
- [ ] Implement `reveal_card` logic
- [ ] Build game UI components
- [ ] Wallet integration
- [ ] Connect frontend to Anchor program
- [ ] Deploy to Devnet

### Key Files CKay Owns
```
programs/zk-card-arena/     ← Friend
├── Cargo.toml
└── src/
    ├── lib.rs
    ├── state/
    └── instructions/

components/                 ← Friend
├── game/
├── wallet/
└── ui/

pages/                      ← Friend
├── index.js
├── play.js
└── verify.js
```

---

## Shared Responsibilities

| Task | Lead | Support |
|------|------|---------|
| Integration testing | CKay | Marcus |
| NoirJS → Frontend | Marcus | CKay |
| Proof format (circuit ↔ contract) | Both | - |
| Demo video | Both | - |
| Documentation | Both | - |

---

## Communication Points

### Daily Sync Topics
1. What did you complete?
2. What's blocking you?
3. Any interface changes needed?

### Critical Handoff Points
| Day | Handoff | From → To |
|-----|---------|-----------|
| 2 | Proof format spec | Marcus → CKay |
| 5 | Working circuit | Marcus → CKay |
| 7 | Anchor program ready | CKay → Marcus |
| 8 | Integration | Both |

---

## Decision Timeline

| Day | Decision | Owner |
|-----|----------|-------|
| **Day 2** | Is shuffle proof < 30s? | Marcus |
| **Day 3** | Does Groth16 fit CU limits? | CKay |
| **Day 5** | GO/NO-GO on full ZK | Both |

---

## If ZK Fails (Day 5 Pivot)

If circuits don't meet performance targets:

**Marcus pivots to:**
- Help with commit-reveal logic
- Frontend proof verification page
- Documentation

**CKay continues:**
- Commit-reveal on-chain logic
- Simplified game flow
- Polish and video
