# Umbra Documentation

> **Provably fair Blackjack on Solana using Zero-Knowledge Proofs + Privacy-Preserving Payments**

---

## Quick Links

### Getting Started
- [Quick Start Guide](./guides/QUICK_START.md) - Setup and run the project
- [Project Overview](./core/PROJECT_OVERVIEW.md) - Vision, scope, and goals

### Core Technical Docs
- [Architecture](./core/ARCHITECTURE.md) - System design and data flows
- [Smart Contracts](./core/SMART_CONTRACTS.md) - Anchor program specifications
- [ZK Circuits](./core/ZK_CIRCUITS.md) - Noir circuit specifications
- [Frontend](./core/FRONTEND.md) - UI implementation guide

### Guides & Tutorials
- [Anchor Setup Journey](./guides/ANCHOR_SETUP_JOURNEY.md) - Anchor development setup
- [Smart Contract Guide](./guides/SMART_CONTRACT_GUIDE.md) - Contract development guide
- [Test Walkthrough](./guides/TEST_WALKTHROUGH.md) - Testing instructions

### Privacy Integrations (NEW)
- [Plan A: ShadowPay Integration](./integration/PLAN_A_SHADOWPAY.md) - Private bets & payouts ($15k bounty)
- [Plan B: ShadowPay + Privacy Cash](./integration/PLAN_B_SHADOWPAY_PLUS_PRIVACY_CASH.md) - Full privacy ($30k+ bounties)

### Hackathon
- [Hackathon Tracks](./hackathon/HACKATHON_TRACKS.md) - Bounty alignment strategy
- [Timeline](./hackathon/TIMELINE.md) - Development schedule
- [Risks & Mitigations](./hackathon/RISKS_AND_MITIGATIONS.md) - Risk management

### Reference
- [Glossary](./reference/GLOSSARY.md) - Technical terms
- [Future Features](./planning/FUTURE_FEATURES.md) - Roadmap ideas

---

## Project Summary

| Aspect | Details |
|--------|---------|
| **What** | Blackjack on Solana with ZK-proven fair shuffles and private betting |
| **Tech** | Noir (ZK), Anchor (contracts), ShadowPay + Privacy Cash (privacy) |
| **Hackathon** | Solana Privacy Hack - Deadline Feb 1, 2026 |
| **Target Bounties** | Open ($18k), Noir ($10k), ShadowPay ($15k), Privacy Cash ($15k) |

---

## Documentation Structure

```
docs/
├── README.md                 # This file
│
├── core/                     # Core technical documentation
│   ├── ARCHITECTURE.md
│   ├── PROJECT_OVERVIEW.md
│   ├── SMART_CONTRACTS.md
│   ├── ZK_CIRCUITS.md
│   └── FRONTEND.md
│
├── guides/                   # Tutorials and how-tos
│   ├── QUICK_START.md
│   ├── ANCHOR_SETUP_JOURNEY.md
│   ├── SMART_CONTRACT_GUIDE.md
│   └── TEST_WALKTHROUGH.md
│
├── hackathon/                # Hackathon-specific docs
│   ├── HACKATHON_TRACKS.md
│   ├── TIMELINE.md
│   └── RISKS_AND_MITIGATIONS.md
│
├── integration/              # Privacy SDK integrations
│   ├── PLAN_A_SHADOWPAY.md
│   └── PLAN_B_SHADOWPAY_PLUS_PRIVACY_CASH.md
│
├── planning/                 # Future planning
│   └── FUTURE_FEATURES.md
│
└── reference/                # Reference materials
    └── GLOSSARY.md
```

---

## Target Bounties

| Bounty | Prize | Status |
|--------|-------|--------|
| Open Track (Solana Foundation) | $18,000 | Targeting |
| Aztec/Noir (ZK circuits) | $10,000 | Targeting |
| Radr Labs (ShadowPay) | $15,000 | Plan A/B |
| Privacy Cash | $15,000 | Plan B only |
| Inco (Gaming) | $2,000 | Targeting |
| **Total Potential** | **$60,000** | |

---

## Key Milestones

| Day | Date | Milestone |
|-----|------|-----------|
| 3 | Jan 23 | Anchor program core |
| 5 | Jan 25 | **GO/NO-GO on ZK** |
| 8 | Jan 28 | Full E2E integration |
| 10 | Jan 30 | Feature freeze + video |
| 12 | Feb 1 | **SUBMISSION** |

---

## External Resources

- [Noir Documentation](https://noir-lang.org/docs)
- [Anchor Framework](https://www.anchor-lang.com/)
- [Light Protocol](https://lightprotocol.com/)
- [ShadowPay SDK](https://github.com/Radrdotfun/shadowpay-sdk)
- [Privacy Cash](https://github.com/Privacy-Cash/privacy-cash)
- [Solana Privacy Hack](https://solana.com/privacyhack)
