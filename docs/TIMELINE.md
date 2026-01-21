# ZK Card Arena - Development Timeline

## Overview

| Metric | Value |
|--------|-------|
| **Start Date** | January 21, 2026 |
| **Deadline** | February 1, 2026 |
| **Days Remaining** | ~10 days |
| **Key Milestone** | Day 5 - ZK Go/No-Go Decision |

---

## Parallel Development Tracks

```
Track A: ZK Circuits (Noir)     ████████░░░░ Days 1-8  
Track B: Smart Contracts        ░░████████░░ Days 3-9
Track C: Frontend               ░░░░████████ Days 4-10
Track D: Integration            ░░░░░░████░░ Days 7-9
Track E: Polish & Video         ░░░░░░░░████ Days 9-10
```

---

## Day-by-Day Schedule

### Day 1 (Jan 21) - ZK Circuit Validation ⚡ CRITICAL

**Objective:** Validate that Noir shuffle proof is feasible

| Task | Priority | Owner |
|------|----------|-------|
| Write shuffle_proof.nr circuit | P0 | ZK |
| Compile and measure constraints | P0 | ZK |
| Generate test proof (native) | P0 | ZK |
| Benchmark proof generation time | P0 | ZK |

**Success Criteria:**
- [ ] Shuffle circuit compiles
- [ ] Constraints < 50,000
- [ ] Native proof time < 10 seconds

**Decision Point:** If proof time > 30 seconds, escalate immediately.

---

### Day 2 (Jan 22) - Browser Proving & Compute Units

**Objective:** Validate browser-based proving and Solana compute limits

| Task | Priority | Owner |
|------|----------|-------|
| Set up NoirJS in browser | P0 | ZK |
| Benchmark browser proof generation | P0 | ZK |
| Test Light Protocol Groth16 verifier | P0 | Backend |
| Measure verification compute units | P0 | Backend |

**Success Criteria:**
- [ ] Browser proof time < 20 seconds
- [ ] Groth16 verification < 200,000 CU

---

### Day 3 (Jan 23) - Anchor Program Core

**Objective:** Create basic game program structure

| Task | Priority | Owner |
|------|----------|-------|
| Initialize Anchor project | P0 | Backend |
| Define account structures | P0 | Backend |
| Implement create_game instruction | P0 | Backend |
| Implement join_game instruction | P1 | Backend |
| Continue ZK circuit refinement | P1 | ZK |

**Soft Checkpoint:** Can Noir compile shuffle circuit at all?

---

### Day 4 (Jan 24) - Deal & Reveal Circuits

**Objective:** Complete all ZK circuits

| Task | Priority | Owner |
|------|----------|-------|
| Implement deal_proof circuit | P0 | ZK |
| Implement reveal_proof circuit | P0 | ZK |
| Benchmark all circuits | P0 | ZK |
| Add verification to Anchor program | P1 | Backend |
| Start frontend structure | P2 | Frontend |

---

### Day 5 (Jan 25) - GO/NO-GO DECISION 🚨

**Objective:** Decide full ZK vs. fallback

| Criteria | Pass | Fail |
|----------|------|------|
| Shuffle proof < 15s browser | ✅ | ❌ |
| All circuits compile | ✅ | ❌ |
| Verification fits CU limits | ✅ | ❌ |

**If PASS:** Continue with full ZK implementation  
**If FAIL:** Pivot to commit-reveal fallback (16 days remaining)

---

### Day 6 (Jan 26) - Game Logic Integration

**Objective:** Connect circuits to Anchor program

| Task | Priority | Owner |
|------|----------|-------|
| Integrate shuffle proof verification | P0 | Backend |
| Implement deal_card with proofs | P0 | Backend |
| Implement reveal_card logic | P0 | Backend |
| Built game UI components | P0 | Frontend |

---

### Day 7 (Jan 27) - Frontend Core

**Objective:** Functional game interface

| Task | Priority | Owner |
|------|----------|-------|
| Game board UI | P0 | Frontend |
| Wallet connection | P0 | Frontend |
| Card components with animations | P0 | Frontend |
| NoirJS integration in browser | P0 | Frontend |

---

### Day 8 (Jan 28) - Full Integration

**Objective:** Playable end-to-end demo

| Task | Priority | Owner |
|------|----------|-------|
| Connect frontend to Anchor program | P0 | All |
| Proof generation flow | P0 | All |
| Game state synchronization | P0 | All |
| Deploy to Devnet | P0 | Backend |

---

### Day 9 (Jan 29) - Testing & Polish

**Objective:** Stable, polished demo

| Task | Priority | Owner |
|------|----------|-------|
| End-to-end testing | P0 | All |
| Bug fixes | P0 | All |
| UI polish | P1 | Frontend |
| Error handling | P1 | All |

---

### Day 10 (Jan 30) - Feature Freeze & Video

**Objective:** Demo video and documentation

| Task | Priority | Owner |
|------|----------|-------|
| Feature freeze | P0 | All |
| Record demo video | P0 | All |
| Write submission materials | P0 | All |
| Final documentation | P1 | All |

---

### Day 11 (Jan 31) - Buffer & Submission Prep

**Objective:** Handle any last-minute issues

| Task | Priority | Owner |
|------|----------|-------|
| Buffer for unexpected issues | P0 | All |
| Prepare submission | P0 | All |
| Test submission process | P0 | All |

---

### Day 12 (Feb 1) - SUBMISSION 🎯

**Objective:** Submit to hackathon

| Task | Priority | Owner |
|------|----------|-------|
| Final submission | P0 | All |
| Verify submission received | P0 | All |
| Celebrate 🎉 | P0 | All |

---

## Risk Milestones

| Day | Milestone | If Failed |
|-----|-----------|-----------|
| 1 | Circuit compiles | Investigate or escalate |
| 2 | Browser proving works | Consider native-only |
| 3 | Soft check on circuit | Early warning |
| 5 | **GO/NO-GO** | Pivot to fallback |
| 8 | E2E working | Cut features |
| 10 | Video complete | Emergency crunch |

---

## Time Allocation

```
Week 1 (Days 1-5):
  ZK Circuits:     60%
  Smart Contracts: 30%
  Frontend:        10%

Week 2 (Days 6-10):
  ZK Circuits:     20%
  Smart Contracts: 20%
  Frontend:        40%
  Integration:     20%

Days 10-12:
  Polish:          40%
  Video:           40%
  Documentation:   20%
```
