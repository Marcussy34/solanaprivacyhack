# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> [!IMPORTANT]
> **DO NOT ASSUME YOU KNOW EVERYTHING. BE HUMBLE. REFERENCE OFFICIAL AND UP TO DATE DOCS. USE THE RELEVANT MCP TOOLS AVAILABLE AT YOUR DISPOSAL.**

## Project Overview

ZK Card Arena is a provably fair Blackjack game on Solana using zero-knowledge proofs. The system uses Noir circuits for ZK proof generation, Anchor for smart contracts, and Sunspot for on-chain Groth16 verification.

**Current Status:** In development for Solana Privacy Hackathon (Feb 1, 2026)

## Commands

```bash
# Frontend
npm run dev          # Start Next.js dev server (Turbopack)
npm run build        # Production build
npm run lint         # ESLint

# Noir circuits (run from circuits/<circuit_name>/)
nargo compile        # Compile circuit
nargo test           # Run circuit tests
nargo execute        # Generate witness

# Sunspot (Noir → Groth16)
sunspot compile target/<circuit>.json
sunspot setup target/<circuit>.ccs
sunspot prove target/<circuit>.json target/<circuit>.gz target/<circuit>.ccs target/proving_key.pk
sunspot deploy target/verifying_key.vk

# Anchor program
anchor build         # Build program
anchor test          # Run tests (1M ms timeout configured)
anchor deploy        # Deploy to devnet

# Solana
solana config set --url devnet
solana airdrop 2
solana logs          # Stream program logs
```

## Architecture

### Proof Generation Pipeline

```
Frontend (Browser)           Backend/CLI               Solana (On-chain)
       │                          │                          │
       ├─ NoirJS witness ────────►│                          │
       │  generation (~2s)        │                          │
       │                          ├─ Sunspot Groth16 ───────►│
       │                          │  proof gen (~10s)        │
       │                          │                          │
       │◄─────────────────────────┤                          │
       │  proof + public_inputs   │                          │
       │                          │                          │
       ├──────────────────────────┼─────────────────────────►│
       │  Submit to Anchor        │     CPI to Sunspot       │
       │                          │     verifier (<200k CU)  │
```

### Three Circuits

| Circuit | Purpose | Constraints | Private Inputs | Public Inputs |
|---------|---------|-------------|----------------|---------------|
| shuffle_proof | Prove deck is valid permutation | ~812 | seed, shuffled_deck | deck_commitment, original_deck |
| deal_proof | Prove card comes from committed deck | ~1,111 | seed, shuffled_deck, blinding_factor | deck_commitment, card_commitment, position |
| reveal_proof | Prove revealed card matches commitment | ~333 | blinding_factor | card_commitment, card_value |

### Key Hooks

- `hooks/useZK.js` - NoirJS witness generation
- `hooks/useZKGame.js` - Combined ZK + game state management
- `hooks/useGameProgram.js` - Anchor program interactions (embeds full IDL)

## Deployed Programs (Devnet)

| Program | Address |
|---------|---------|
| ZK Card Arena | `8Da8a3Q9GLYuxYLXPtxKiAedZZbx5DUQCuG8TPY1dLnx` |
| Shuffle Verifier (Sunspot) | `F5W3HDqnZaqCUaGkFFypSxzWA3XBCnBK6yyGymk81ViJ` |
| Deal Verifier (Sunspot) | `5zPYh2Fvt34mLHQuCjUmBEwRSzAkzwzLcYSrrRmzdtPz` |
| Reveal Verifier (Sunspot) | `9sag96gkAhSZCFQweJVw9AocMvMXzS9B2yi1oruF81oH` |
| ZK Card Arena | `22BfrTbAzVmwENnyfzk6rFtPaNvCmaATbeWaJKKoqkK4` |
| Shuffle Verifier (Sunspot) | `6sju9HLJTFfESLn49wAR2hqiC6mnu3MrP2K9WDbkjCL2` |
| Deal Verifier (Sunspot) | `Epoxbrv1Pc2XeYR2xsKsqm3Gy1j2MbkBx4yHfkg8yuSC` |
| Reveal Verifier (Sunspot) | `HrETBH5nTa3DTVjBFWMdytLtuX9GsFwiAGkkyQAXnMt9` |

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 19, TailwindCSS 4 |
| UI Components | Radix UI, Framer Motion, Lucide |
| ZK Circuits | Noir 1.0.0-beta.18 |
| ZK Prover | @aztec/bb.js (Barretenberg), Sunspot (Groth16) |
| Smart Contracts | Anchor 0.31.1 |
| Blockchain | Solana devnet |

## ZK Pipeline Documentation

> **See [ZK_PIPELINE.md](./ZK_PIPELINE.md) for comprehensive documentation** on the ZK proof pipeline, including artifact dependencies, common errors (like witness size mismatches), and rebuild procedures.

## Critical Constraints

### Pinned Dependencies
- **Poseidon v0.2.2** - Do not upgrade without full testing
- **Sunspot** - Must use for Groth16 proofs (not Barretenberg UltraHonk)

### Performance Targets
- Shuffle circuit: <50,000 constraints (currently ~812 ✓)
- Browser witness generation: <2s
- Backend proof generation: <10s
- On-chain verification: <400,000 CU (actual: ~527,000 CU - over target)

### Game Limitations
- **13-card deck only** (cards 0-12) - Full 52-card deck increases constraints significantly
- **Dealer must stay online** - shuffledDeck is in React state; dealer's session must remain open for reveals

## Proof Format

For CPI to Sunspot verifiers: `proof_bytes || public_witness_bytes`

## Testing

```bash
# ZK integration test page
npm run dev
# Visit http://localhost:3000/zk-game-test

# Verify random fallbacks removed
grep -n "Math.random" hooks/useGameProgram.js  # Should return nothing

# Check on-chain state
solana account <GAME_PDA> --output json
```

## Environment Variables

Create `.env.local`:
```
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_RPC_ENDPOINT=https://api.devnet.solana.com
```
