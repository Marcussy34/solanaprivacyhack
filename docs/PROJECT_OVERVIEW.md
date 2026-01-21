# ZK Card Arena - Project Overview

## Vision Statement

**"A provably fair Blackjack game where even the house can't cheat."**

ZK Card Arena is the first Zero-Knowledge mental poker implementation on Solana, using Noir circuits to cryptographically prove fair deck shuffles without revealing card order.

---

## Core Thesis

A provably fair card game using ZK proofs will differentiate in the hackathon's Open Track and Noir/Aztec bounty while demonstrating first-mover advantage for ZK mental poker on Solana.

---

## What We're Building

### MVP Scope (10 Days)

| Feature | Description | Priority |
|---------|-------------|----------|
| **ZK Shuffle Proof** | Prove deck is valid permutation without revealing order | P0 |
| **Card Commitments** | Hide cards until strategic reveal | P0 |
| **On-chain Verification** | Groth16 verification via Light Protocol | P0 |
| **Blackjack Game** | Player vs. automated dealer | P0 |
| **Basic UI** | Functional game interface | P1 |
| **Wallet Integration** | Solana wallet connect | P1 |

### Out of Scope (MVP)

- Multiplayer poker
- Real money wagering
- Mobile optimization
- Tournament system
- Chat/social features

---

## Key Differentiators

### 1. First on Solana
No existing ZK mental poker implementations on Solana mainnet.

### 2. Novel ZK Application
Applying Noir circuits to card games is unexplored territory.

### 3. Trustless Verification
On-chain Groth16 verification means anyone can audit fairness.

### 4. Hackathon-Optimized
Architecture designed to hit multiple bounty categories simultaneously.

---

## User Stories

### Primary User: Blackjack Player

> "As a player, I want to verify that the deck shuffle is fair so that I know the house isn't cheating me."

**Acceptance Criteria:**
- Can view ZK proof of shuffle on-chain
- Can verify proof independently
- Game outcome matches revealed cards

### Secondary User: Skeptical Observer

> "As a blockchain enthusiast, I want to audit the game's fairness mechanisms so that I can trust the system."

**Acceptance Criteria:**
- All proofs publicly verifiable on Solana explorer
- Circuit source code is open
- Documentation explains verification process

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Working Demo** | Yes | Can play complete game |
| **ZK Proofs Working** | Yes | Shuffle proof verifies on-chain |
| **Proof Generation Time** | <15s | Browser benchmark |
| **Bounty Submissions** | 4+ | Number of categories entered |
| **Video Quality** | High | Clear demo + explanation |

---

## Constraints

| Constraint | Impact | Mitigation |
|------------|--------|------------|
| **10 days remaining** | Limited scope | Aggressive prioritization |
| **Learning ZK during build** | Slower progress | Fallback plan ready |
| **Solana compute limits** | Proof size limits | Light Protocol optimization |
| **Solo/small team** | Limited parallelization | Focus on critical path |

---

## Assumptions (Must Validate)

> ⚠️ **These assumptions are critical. If wrong, project may need to pivot.**

1. **Noir can handle 13-card permutation proofs efficiently**
   - Must benchmark Day 1

2. **Groth16 verification fits Solana compute limits**
   - Must test Day 2-3

3. **Browser-based proof generation is viable**
   - NoirJS must work with acceptable speed

4. **10 days is enough for ZK + Anchor + Frontend**
   - Requires disciplined execution

---

## Fallback Strategy

If ZK circuits don't work by Day 5, pivot to:

**Commit-Reveal Scheme:**
- Creator commits to shuffle hash
- Cards dealt with hash commitments
- Reveal at end of hand
- Still "provably fair" but not "zero-knowledge"

**Impact of Fallback:**
- Noir/Aztec bounty chance drops significantly
- Open Track still viable
- Project becomes less differentiated
