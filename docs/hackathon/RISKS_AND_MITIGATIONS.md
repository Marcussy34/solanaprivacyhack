# ZK Card Arena - Risks and Mitigations

## Risk Matrix

```
                    Impact
                Low    Medium    High
           ┌─────────┬─────────┬─────────┐
      High │         │   R3    │ R1, R2  │
Likelihood ├─────────┼─────────┼─────────┤
    Medium │   R6    │ R4, R5  │         │
           ├─────────┼─────────┼─────────┤
       Low │         │         │         │
           └─────────┴─────────┴─────────┘
```

---

## Critical Risks

### R1: ZK Circuit Performance 🔴

| Aspect | Detail |
|--------|--------|
| **Risk** | Noir shuffle proof takes too long to generate |
| **Likelihood** | High |
| **Impact** | High - entire project differentiation at stake |
| **Evidence** | No existing benchmark; acknowledged as unknown |

**Mitigation Strategy:**
1. Benchmark on Day 1 before any other work
2. Set hard threshold: < 15s browser, < 5s native
3. Prepare fallback architecture

**Detection:**
- Day 1 EOD: Proof generation time measured
- Day 2: Browser benchmark complete
- Day 5: Final go/no-go decision

**Fallback:**
Pivot to commit-reveal scheme (simpler but less novel)

---

### R2: Solana Compute Limits 🔴

| Aspect | Detail |
|--------|--------|
| **Risk** | Groth16 verification exceeds 400,000 CU transaction limit |
| **Likelihood** | Medium |
| **Impact** | High - on-chain verification fails |
| **Evidence** | Light Protocol exists, but specific CU usage unverified |

**Mitigation Strategy:**
1. Test Light Protocol verifier on Day 2-3
2. Measure actual CU consumption
3. If too high, explore batching or off-chain verification

**Detection:**
- Day 3: CU measurement complete
- Day 5: Include in go/no-go decision

**Fallback:**
- Move to off-chain verification with on-chain commitments
- Reduces trustlessness but maintains functionality

---

### R3: Time Constraint 🟡

| Aspect | Detail |
|--------|--------|
| **Risk** | 10 days insufficient for full implementation |
| **Likelihood** | High |
| **Impact** | Medium - incomplete demo |
| **Evidence** | Learning ZK during build; complex integration |

**Mitigation Strategy:**
1. Aggressive scope management
2. Clear priority tiers (P0/P1/P2)
3. Parallel development tracks
4. Cut features early, not late

**Detection:**
- Daily progress check against timeline
- Day 5 critical assessment

**Fallback:**
- Ship commit-reveal version
- Focus on polish over features

---

### R4: Integration Complexity 🟡

| Aspect | Detail |
|--------|--------|
| **Risk** | Connecting frontend + circuits + contracts fails |
| **Likelihood** | Medium |
| **Impact** | Medium - demo doesn't work |
| **Evidence** | Multiple unfamiliar technologies |

**Mitigation Strategy:**
1. Integration testing starts Day 7 (not last day)
2. Modular architecture with clear interfaces
3. Mock data during parallel development

**Detection:**
- Day 7-8: Integration milestones

**Fallback:**
- Simplify integration (fewer proof types)
- Pre-generate some proofs if needed

---

### R5: Trust Model Weakness 🟡

| Aspect | Detail |
|--------|--------|
| **Risk** | "Trustless" claim undermined by dealer knowing shuffle |
| **Likelihood** | Medium |
| **Impact** | Medium - credibility issue |
| **Evidence** | Current architecture has dealer generate randomness |

**Mitigation Strategy:**
1. Option A: Integrate VRF (Switchboard) for seed generation
2. Option B: Honest marketing - "verifiable" not "trustless"
3. Option C: Multi-party randomness (complex)

**Decision:**
- Day 3: Choose which option to implement
- Prefer Option A (VRF) if time permits, else Option B

---

### R6: Browser Compatibility 🟢

| Aspect | Detail |
|--------|--------|
| **Risk** | NoirJS doesn't work in all browsers |
| **Likelihood** | Low |
| **Impact** | Low - some users can't play |
| **Evidence** | NoirJS actively maintained |

**Mitigation Strategy:**
1. Target Chrome/Firefox primarily
2. Clear browser requirements in UI
3. Graceful degradation message

---

## Assumption Validation Table

| Assumption | Validation Method | Day | Pass Criteria |
|------------|------------------|-----|---------------|
| 13-card shuffle proof is feasible | Compile and benchmark circuit | 1 | < 50k constraints |
| Browser proof generation viable | NoirJS benchmark | 2 | < 15s |
| Groth16 verification fits CU | Light Protocol test | 3 | < 200k CU |
| VRF integration possible | Switchboard SDK test | 3 | API works |
| Full integration works | E2E test | 8 | Complete game flow |

---

## Fallback Architecture

If ZK doesn't work by Day 5, pivot to:

### Commit-Reveal Scheme

```
Game Flow (No ZK):
1. Dealer commits: hash(deck, salt)
2. Cards dealt as: hash(card, blinding)
3. At reveal: show card + blinding
4. At end: reveal full deck + salt
5. Anyone can verify deck matches commitment
```

**What's Lost:**
- Zero-knowledge property (deck order revealed at end)
- Noir circuit showcase
- Main technical differentiation

**What's Preserved:**
- Provable fairness
- On-chain verification
- Working demo

---

## Pre-Mortem Analysis

*Writing from February 10, 2026 - the project failed because...*

### Scenario A: ZK Too Slow
"We spent Days 1-5 trying to optimize. Proof generation was 90 seconds. We pivoted but lost time. Final demo was rushed."

**Prevention:** Hard cutoff on Day 5. No sunk cost attachment.

### Scenario B: Integration Hell
"Individual components worked but couldn't connect them. Proof format didn't match what contract expected. Spent Day 9-10 debugging."

**Prevention:** Integration testing starts Day 7, not Day 9.

### Scenario C: Scope Creep
"Added multiplayer, fancy animations, extra features. Core game wasn't solid. Demo crashed during video."

**Prevention:** P0 only until Day 8. Polish, don't expand.

### Scenario D: Video Too Late
"Finished coding at 2am on deadline. Video was rushed, didn't explain ZK properly. Judges didn't understand the innovation."

**Prevention:** Feature freeze Day 10. Video is a deliverable, not afterthought.
