# ZK Card Arena

**Provably fair Blackjack on Solana using Zero-Knowledge Proofs**

## The Problem

Online card games require trust: players must believe the house shuffled fairly and isn't cheating. Traditional solutions rely on third-party audits or reputation—neither is trustless.

## Our Solution

ZK Card Arena uses **zero-knowledge proofs** to cryptographically guarantee fairness:

- **Shuffle Proof** — Proves the deck is a valid shuffle without revealing the order
- **Card Commitments** — Cards are hidden until revealed, but locked in from the start
- **On-chain Verification** — Anyone can verify proofs on Solana—no trust required

The result: a Blackjack game where **even the house can't cheat**, and players can independently verify every game.

## Tech Stack

| Layer | Technology |
|-------|------------|
| ZK Circuits | [Noir](https://noir-lang.org/) |
| Blockchain | [Solana](https://solana.com/) |
| Smart Contracts | [Anchor](https://www.anchor-lang.com/) |
| ZK Verification | [Light Protocol](https://lightprotocol.com/) (Groth16) |
| Frontend | Next.js + React |

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

See [docs/QUICK_START.md](./docs/QUICK_START.md) for full setup instructions.

## Documentation

Detailed documentation is available in the [`/docs`](./docs) folder:

- [Project Overview](./docs/PROJECT_OVERVIEW.md) — Vision and scope
- [Architecture](./docs/ARCHITECTURE.md) — System design and data flows
- [ZK Circuits](./docs/ZK_CIRCUITS.md) — Noir circuit specifications
- [Smart Contracts](./docs/SMART_CONTRACTS.md) — Anchor program details
- [Timeline](./docs/TIMELINE.md) — Development schedule

## Project Status

🚧 **In Development** — Building for Solana Privacy Hackathon (Feb 1, 2026)

## License

MIT
