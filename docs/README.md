# ZK Card Arena v2.0 Documentation

> **Provably fair Blackjack on Solana using Zero-Knowledge Proofs**

## 📋 Table of Contents

| Document | Description |
|----------|-------------|
| [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md) | High-level project summary, vision, and core thesis |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Technical architecture, data flows, and system design |
| [ZK_CIRCUITS.md](./ZK_CIRCUITS.md) | Noir circuit specifications and ZK proof details |
| [SMART_CONTRACTS.md](./SMART_CONTRACTS.md) | Anchor program specifications and on-chain logic |
| [FRONTEND.md](./FRONTEND.md) | Frontend implementation guide and UI components |
| [TIMELINE.md](./TIMELINE.md) | Development schedule, milestones, and deadlines |
| [RISKS_AND_MITIGATIONS.md](./RISKS_AND_MITIGATIONS.md) | Risk analysis and fallback strategies |
| [HACKATHON_TRACKS.md](./HACKATHON_TRACKS.md) | Hackathon track alignment and submission strategy |
| [GLOSSARY.md](./GLOSSARY.md) | Technical terms and definitions |
| [QUICK_START.md](./QUICK_START.md) | Getting started guide for developers |

## 🎯 Quick Summary

**What:** A Blackjack game on Solana where deck shuffles are proven fair via ZK proofs (Noir circuits), cards are dealt with cryptographic commitments, and all verification happens on-chain (Groth16 via Light Protocol).

**Why:** First ZK mental poker implementation on Solana = strong hackathon differentiation + bounty alignment.

**When:** Solana Privacy Hackathon - Submit by Feb 1, 2026 (~10 days remaining as of Jan 21)

**Target Hackathon Tracks:**
- Open Track (Solana Foundation)
- Aztec/Noir (ZK Innovation)
- Inco (Confidential Computing)
- Helius (Infrastructure)

## 🚨 Critical Decision Points

1. **Day 1-2 (Jan 21-22):** Benchmark Noir shuffle circuit - MUST generate proof in <15 seconds
2. **Day 5 (Jan 25):** Go/No-Go decision on full ZK vs. commit-reveal fallback
3. **Day 10 (Jan 30):** Feature freeze, focus on polish and video

## 📁 Project Structure

```
solanaprivacyhack/
├── docs/                  # Documentation (you are here)
├── circuits/              # Noir ZK circuits (to be created)
├── programs/              # Anchor smart contracts (to be created)
├── components/            # React/Next.js UI components
├── pages/                 # Next.js pages
├── lib/                   # Utility functions
└── public/                # Static assets
```

## 🔗 External Resources

- [Noir Documentation](https://noir-lang.org/docs)
- [Anchor Framework](https://www.anchor-lang.com/)
- [Light Protocol](https://lightprotocol.com/)
- [Solana Privacy Hackathon](https://www.colosseum.org/)
