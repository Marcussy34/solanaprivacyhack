# ZK Card Arena - Setup Guide

Complete guide to running ZK Card Arena locally and deploying to Solana devnet.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Project Structure](#project-structure)
4. [Key Files](#key-files)
5. [Environment Setup](#environment-setup)
6. [Running Locally](#running-locally)
7. [Deploying to Devnet](#deploying-to-devnet)
8. [Testing the Game](#testing-the-game)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

| Tool | Version | Installation |
|------|---------|--------------|
| Node.js | 18+ | https://nodejs.org |
| Rust | 1.70+ | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| Solana CLI | 1.18+ | `sh -c "$(curl -sSfL https://release.solana.com/stable/install)"` |
| Anchor | 0.31.1 | `cargo install --git https://github.com/coral-xyz/anchor anchor-cli` |
| Nargo (Noir) | 1.0.0-beta.18 | `curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install \| bash && noirup -v 1.0.0-beta.18` |
| Sunspot | Latest | See [Sunspot Installation](#sunspot-installation) |

### Sunspot Installation

```bash
# Build from source (requires Rust)
git clone https://github.com/Sunspot-Labs/sunspot.git
cd sunspot
cargo build --release
cp target/release/sunspot ~/bin/sunspot

# Verify installation
sunspot --version
```

### Solana Wallet Setup

```bash
# Create a new keypair (or use existing)
solana-keygen new -o ~/.config/solana/id.json

# Configure for devnet
solana config set --url devnet

# Get devnet SOL (need ~5 SOL for deployments)
solana airdrop 2
solana airdrop 2
solana airdrop 2
```

---

## Quick Start

```bash
# 1. Clone the repository
git clone <repository-url>
cd solanaprivacyhack

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env.local
# Edit .env.local with your values

# 4. Build Anchor program
anchor build

# 5. Deploy to devnet (if needed)
anchor deploy --provider.cluster devnet

# 6. Start development server
npm run dev

# 7. Open http://localhost:3000
```

---

## Project Structure

```
solanaprivacyhack/
├── circuits/                    # Noir ZK circuits
│   ├── shuffle_proof/          # Deck shuffle verification
│   ├── deal_proof/             # Card dealing verification
│   ├── reveal_proof/           # Card reveal verification
│   └── target/                 # Compiled circuits, PK/VK files
│
├── programs/                    # Anchor/Solana programs
│   └── zk-card-arena/
│       └── src/lib.rs          # Main smart contract
│
├── solana-verifiers/           # Sunspot verifier programs
│   ├── target/                 # PK files for proof generation
│   └── DEPLOYED_PROGRAM_IDS.md # Deployed verifier addresses
│
├── pages/                      # Next.js pages
│   ├── index.js               # Landing page
│   ├── game.js                # Main game UI
│   └── api/
│       └── prove.js           # Backend proof generation API
│
├── hooks/                      # React hooks
│   ├── useGameProgram.js      # Anchor program interactions
│   ├── useZK.js               # NoirJS circuit execution
│   ├── useZKGame.js           # ZK + game state management
│   └── useShadowPay.js        # Payment handling
│
├── components/                 # UI components
│   ├── game/                  # Game-specific components
│   └── ui/                    # Shared UI components
│
├── Anchor.toml                # Anchor configuration
├── CLAUDE.md                  # AI assistant instructions
├── BUGFIX_JOURNEY.md          # Debugging documentation
└── SETUP.md                   # This file
```

---

## Key Files

### Smart Contract

| File | Purpose |
|------|---------|
| `programs/zk-card-arena/src/lib.rs` | Main Anchor program with all game instructions |

**Key Sections:**
- Lines 5-23: Program and verifier IDs
- Lines 30-54: `create_game` instruction
- Lines 74-117: `verify_shuffle` with CPI to shuffle verifier
- Lines 175-260: `deal_initial_hand` with ZK deal proof
- Lines 295-359: `reveal_card` with ZK reveal proof
- Lines 363-430: `dealer_play_turn` with ZK verification (security fix)

### Frontend Hooks

| File | Purpose |
|------|---------|
| `hooks/useGameProgram.js` | Anchor program interactions, IDL definition |
| `hooks/useZK.js` | NoirJS initialization and circuit execution |
| `hooks/useZKGame.js` | Combined ZK + game state management |
| `hooks/useShadowPay.js` | SOL payment handling |

### ZK Circuits

| Circuit | File | Purpose |
|---------|------|---------|
| shuffle_proof | `circuits/shuffle_proof/src/main.nr` | Prove deck is valid permutation |
| deal_proof | `circuits/deal_proof/src/main.nr` | Prove card comes from committed deck |
| reveal_proof | `circuits/reveal_proof/src/main.nr` | Prove revealed card matches commitment |

### Configuration

| File | Purpose |
|------|---------|
| `Anchor.toml` | Anchor configuration, program IDs |
| `.env.local` | Environment variables (create from .env.example) |
| `next.config.mjs` | Next.js configuration |

---

## Environment Setup

Create `.env.local` in the project root:

```bash
# Solana Network
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_RPC_ENDPOINT=https://api.devnet.solana.com
NEXT_PUBLIC_DEVNET_RPC_ENDPOINT=https://api.devnet.solana.com

# House Wallet (for payouts - optional for demo)
# HOUSE_WALLET_SECRET_KEY=[...64 bytes from keypair...]
# NEXT_PUBLIC_HOUSE_WALLET_ADDRESS=<house-pubkey>
```

---

## Running Locally

### 1. Start Development Server

```bash
npm run dev
```

Opens at http://localhost:3000

### 2. Connect Wallet

- Install Phantom or Solflare browser extension
- Switch to **Devnet** network in wallet settings
- Connect wallet on the game page

### 3. Get Devnet SOL

```bash
# Via CLI
solana airdrop 2 <your-wallet-address> --url devnet

# Or use faucet
# https://faucet.solana.com
```

---

## Deploying to Devnet

### Deploy Main Program

```bash
# Build
anchor build

# Deploy (costs ~2.5 SOL)
anchor deploy --provider.cluster devnet

# Note the program ID from output
# Update if different from current ID
```

### Update Program IDs (if changed)

If deployment creates a new program ID, update these files:

1. **`programs/zk-card-arena/src/lib.rs`** line 5:
   ```rust
   declare_id!("<NEW_PROGRAM_ID>");
   ```

2. **`hooks/useGameProgram.js`** line 12:
   ```javascript
   const PROGRAM_ID = new PublicKey("<NEW_PROGRAM_ID>");
   ```

3. **`Anchor.toml`** line 9:
   ```toml
   zk_card_arena = "<NEW_PROGRAM_ID>"
   ```

4. Rebuild and redeploy:
   ```bash
   anchor build && anchor deploy --provider.cluster devnet
   ```

### Verifier Programs

The ZK verifier programs are already deployed. **Do not redeploy unless circuits change.**

| Verifier | Program ID |
|----------|------------|
| Shuffle | `6sju9HLJTFfESLn49wAR2hqiC6mnu3MrP2K9WDbkjCL2` |
| Deal | `Epoxbrv1Pc2XeYR2xsKsqm3Gy1j2MbkBx4yHfkg8yuSC` |
| Reveal | `HrETBH5nTa3DTVjBFWMdytLtuX9GsFwiAGkkyQAXnMt9` |

---

## Testing the Game

### Single Player Demo

1. Click "Single Player" → Place bet
2. Creates game, generates shuffle proof (~30s)
3. Cards dealt with ZK deal proof
4. Play: Hit, Stand, or Double
5. Dealer turn runs with ZK verification
6. Winner determined, claim payout

### Multiplayer (Two Browsers)

**Browser A (Dealer):**
1. Click "Host Game"
2. Wait for shuffle proof (~30s)
3. Copy game code, share with player
4. When player joins, enter their bet amount
5. Match bet → Deal cards
6. Wait for player actions
7. Play dealer turn when prompted

**Browser B (Player):**
1. Paste game code → Click "Join"
2. Place bet (after join succeeds)
3. Tell dealer your bet amount
4. Wait for cards
5. Play: Hit, Stand, Double
6. Wait for dealer turn
7. Claim winnings if you won

### ZK Test Page

Visit http://localhost:3000/zk-game-test for isolated ZK testing.

---

## Troubleshooting

### "DeclaredProgramIdMismatch"

Program ID in source doesn't match deployed program.

```bash
# 1. Get deployed program ID
solana-keygen pubkey target/deploy/zk_card_arena-keypair.json

# 2. Update source files (see "Update Program IDs" above)

# 3. Rebuild and redeploy
anchor build && anchor deploy --provider.cluster devnet
```

### "Proof verification failed"

Verifier ID doesn't match proving keys.

```bash
# Check current verifier IDs match DEPLOYED_PROGRAM_IDS.md
cat solana-verifiers/DEPLOYED_PROGRAM_IDS.md

# Verify IDs in lib.rs match
grep -A1 "mod shuffle_verifier" programs/zk-card-arena/src/lib.rs
grep -A1 "mod deal_verifier" programs/zk-card-arena/src/lib.rs
grep -A1 "mod reveal_verifier" programs/zk-card-arena/src/lib.rs
```

### "Wallet not connected"

- Ensure wallet extension is installed
- Switch wallet to Devnet
- Refresh page after connecting

### "Insufficient SOL"

```bash
solana airdrop 2 --url devnet
```

### Proof Generation Timeout

Backend proof generation can take 30-60 seconds. Check:
- Terminal for `npm run dev` errors
- Browser console for API errors
- Ensure nargo and sunspot are in PATH

---

## Development Commands

```bash
# Frontend
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # ESLint

# Anchor
anchor build         # Build program
anchor deploy        # Deploy to configured cluster
anchor test          # Run tests

# Noir Circuits
cd circuits/<circuit>
nargo compile        # Compile circuit
nargo test           # Run circuit tests

# Sunspot (Groth16)
sunspot compile target/<circuit>.json
sunspot setup target/<circuit>.ccs
sunspot prove <acir> <witness> <ccs> <pk>
```

---

## Current Deployed Addresses (Devnet)

| Program | Address |
|---------|---------|
| ZK Card Arena | `8Da8a3Q9GLYuxYLXPtxKiAedZZbx5DUQCuG8TPY1dLnx` |
| Shuffle Verifier | `6sju9HLJTFfESLn49wAR2hqiC6mnu3MrP2K9WDbkjCL2` |
| Deal Verifier | `Epoxbrv1Pc2XeYR2xsKsqm3Gy1j2MbkBx4yHfkg8yuSC` |
| Reveal Verifier | `HrETBH5nTa3DTVjBFWMdytLtuX9GsFwiAGkkyQAXnMt9` |

---

*Last updated: January 26, 2026*
*ZK Card Arena - Solana Privacy Hackathon*
