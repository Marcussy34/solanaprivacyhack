# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ZK Card Arena is a provably fair Blackjack game on Solana using zero-knowledge proofs. The system uses Noir circuits for ZK proof generation, Anchor for smart contracts, and Light Protocol for on-chain Groth16 verification.

**Current Status:** In development for Solana Privacy Hackathon (Feb 1, 2026)

## Commands

```bash
# Frontend development
npm run dev          # Start dev server on port 3001
npm run build        # Production build
npm run lint         # ESLint

# Noir circuits (in circuits/ directory)
nargo compile        # Compile circuits
nargo test           # Run circuit tests
nargo prove          # Generate proof

# Anchor program (in programs/zk-card-arena/ directory)
anchor build         # Build program
anchor test          # Run tests
anchor deploy        # Deploy to network

# Solana
solana config set --url devnet
solana airdrop 2     # Get devnet SOL
```

## Architecture

### Three-Layer System

1. **Frontend (Next.js + React)** - Wallet connection, game UI, browser-based proof generation via NoirJS
2. **ZK Circuits (Noir)** - Three circuits: shuffle_proof (deck permutation), deal_proof (card from committed deck), reveal_proof (card matches commitment)
3. **Smart Contracts (Anchor)** - Game state, proof verification via Light Protocol Groth16 verifier

### Data Flow

- **Game creation:** Dealer generates shuffle, creates ZK proof, submits deck commitment + proof on-chain
- **Card dealing:** Cards are committed (hidden), deal proofs link to deck commitment
- **Reveal:** At game end, cards are revealed with reveal proofs; anyone can verify

### Key Constraints

- Shuffle circuit constraint target: <50,000 (blocker if >200k)
- Browser proof generation target: <15s (blocker if >30s)
- Groth16 verification must fit within 400,000 compute units

## Project Structure

```
pages/               # Next.js pages (Pages Router)
components/ui/       # Reusable UI components (Radix, Framer Motion)
lib/utils.js         # Utility functions (cn for Tailwind class merging)
docs/                # Detailed documentation (ARCHITECTURE.md, ZK_CIRCUITS.md, etc.)
circuits/            # Noir ZK circuits (to be created)
programs/            # Anchor smart contracts (to be created)
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 19, TailwindCSS 4 |
| UI Components | Radix UI, Framer Motion, Lucide icons |
| ZK Circuits | Noir 0.30+ |
| Smart Contracts | Anchor 0.29+ |
| ZK Verification | Light Protocol (Groth16) |
| Blockchain | Solana (devnet -> mainnet) |

## Environment Variables

Create `.env.local`:
```
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_RPC_ENDPOINT=https://api.devnet.solana.com
```
