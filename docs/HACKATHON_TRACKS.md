# ZK Card Arena - Hackathon Track Alignment

## Overview

This document maps project features to hackathon tracks for submission strategy.

---

## Target Tracks

### 1. Open Track (Solana Foundation)

**Focus:** General innovation on Solana

| Alignment | How We Fit |
|-----------|------------|
| Innovation | First ZK mental poker on Solana |
| Technical Depth | ZK circuits + on-chain verification |
| Completeness | Full game flow from shuffle to reveal |

**Key Demo Points:**
- Working Blackjack game
- ZK proof verification on-chain
- Transaction explorer links showing proofs

---

### 2. Aztec/Noir Track

**Focus:** Best use of Noir language for ZK applications

| Alignment | How We Fit |
|-----------|------------|
| Noir Usage | Shuffle, deal, reveal circuits in Noir |
| NoirJS | Browser-based proof generation |
| Creativity | Novel application (card games) |

**Key Demo Points:**
- Circuit source code walkthrough
- Constraint counts and optimization
- Browser proving demonstration

**Risk:** If fallback to commit-reveal, this track becomes weak.

---

### 3. Inco Track

**Focus:** Confidential computing and privacy

| Alignment | How We Fit |
|-----------|------------|
| Privacy | Hidden cards until reveal |
| Confidential Gaming | Cards are encrypted/committed |
| User Privacy | No card information leaked |

**Key Demo Points:**
- Show card hiding mechanism
- Demonstrate commitment scheme
- Explain privacy guarantees

---

### 4. Helius Track

**Focus:** Solana infrastructure usage

| Alignment | How We Fit |
|-----------|------------|
| RPC Usage | Use Helius for reliable RPCs |
| Transaction Speed | Fast game experience |
| Reliability | Production-grade infrastructure |

**Key Demo Points:**
- Integrate Helius RPC
- Show transaction speed metrics
- Reliable proof verification

---

## Feature-to-Track Matrix

| Feature | Open | Noir | Inco | Helius |
|---------|:----:|:----:|:----:|:------:|
| ZK Shuffle Proof | ✅ | ✅ | ✅ | |
| On-chain Verification | ✅ | ✅ | | |
| Card Commitments | ✅ | | ✅ | |
| Browser Proving | | ✅ | | |
| Helius RPC | ✅ | | | ✅ |
| Working Game Demo | ✅ | ✅ | ✅ | ✅ |

---

## Submission Checklist

### Required for All Tracks

- [ ] Working demo (video or live)
- [ ] Source code repository
- [ ] README with setup instructions
- [ ] Clear explanation of technology

### Open Track Specific

- [ ] Highlight innovation angle
- [ ] Show on-chain transactions
- [ ] Demonstrate user experience

### Noir Track Specific

- [ ] Circuit source code
- [ ] Constraint count analysis
- [ ] Proving time benchmarks
- [ ] NoirJS integration demo

### Inco Track Specific

- [ ] Privacy mechanism explanation
- [ ] Before/after (hidden vs revealed)
- [ ] Security analysis

### Helius Track Specific

- [ ] Helius integration code
- [ ] Performance metrics
- [ ] RPC reliability demonstration

---

## Demo Video Outline

1. **Intro** (30s)
   - Problem: Online card games can cheat
   - Solution: ZK proofs for fair shuffle

2. **Technical Deep Dive** (2 min)
   - Show Noir circuit code
   - Explain permutation proof
   - Demonstrate on-chain verification

3. **Live Demo** (2 min)
   - Connect wallet
   - Start new game
   - Play through a hand
   - Show proof on explorer

4. **Impact** (30s)
   - First ZK card game on Solana
   - Opens door to multiplayer poker
   - Trustless gaming infrastructure

---

## Fallback Track Strategy

If ZK circuits don't work:

| Track | With ZK | Without ZK |
|-------|:-------:|:----------:|
| Open | Strong | Medium |
| Noir | Strong | Weak |
| Inco | Good | Good |
| Helius | Good | Good |

**Fallback Focus:** Emphasize confidential gaming (Inco) and infrastructure (Helius) if ZK fails.
