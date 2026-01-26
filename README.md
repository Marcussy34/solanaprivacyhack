# Umbra

**Provably Fair Blackjack on Solana with Zero-Knowledge Proofs**

**Decentralized, trustless casino gaming powered by Noir ZK circuits and ShadowWire privacy**

Check out the live demo of **Umbra**: 👉 [Click here to try it out](http://localhost:3000)

> **🔒 Privacy-First:** This application uses Zero-Knowledge Proofs to ensure fairness without revealing the deck, and ShadowWire for private transactions.

## The ZK Casino Experience 🎲

ZK Card Arena is built as a decentralized application (dApp) on Solana, optimized for trustless gameplay. The interface provides a seamless, casino-like experience where every shuffle, deal, and reveal is cryptographically proven.

<p align="center">
  <img src="/public/game-screenshot.png" alt="Umbra Gameplay" width="700">
</p>

## Grand Vision vs. Hackathon Scope 🔭

**The Grand Vision:** A full-suite, decentralized ZK Casino where every game (Poker, Roulette, Slots) is provably fair and privacy-preserving.

**Hackathon Scope:** For the **Solana Privacy Hack**, we have implemented the core infrastructure and a fully functional **Blackjack** game to demonstrate the power of ZK shuffles and private betting.

## Inspiration: How We Came Up With This Idea 💡

We noticed that online gambling is still plagued by a fundamental problem: **Trust**.
- How do you know the server isn't cheating?
- "Provably Fair" systems often rely on server seeds that the casino knows.
- Players have to trust the house with their funds and game integrity.
- Transactions are public, exposing financial history.

> *"What if you could play Blackjack where the deck is encrypted, and even the dealer doesn't know the order of cards until they are dealt?"*

That question sparked Umbra. By combining **Zero-Knowledge Proofs (Noir)** with **Solana's speed** and **ShadowWire's privacy**, we created a platform where:
- The deck is shuffled locally by the dealer.
- A ZK proof guarantees the shuffle is fair *without revealing the cards*.
- Cards are dealt as encrypted commitments.
- Values are only revealed when needed (e.g., after a player hits), preventing both parties from cheating.

This exploration led us to build Umbra as a **Solana dApp** that:

- **Proves fairness mathematically** using Noir circuits (Groth16)
- **Encrypts the deck** with Poseidon hashing
- **Enables private betting** using ShadowWire SDK
- **Executes game logic on-chain** with Anchor smart contracts
- **Verifies proofs instantly** using on-chain verifiers
- **Works seamlessly** with Phantom/Backpack wallets

## Features ✨

### 1. **Zero-Knowledge Shuffle**
- The dealer shuffles a 52-card deck locally.
- A ZK proof (`shuffle_proof`) is generated to prove the deck contains exactly one of each card (0-51).
- The proof is verified on-chain before the game starts.

### 2. **Trustless Dealing**
- Cards are dealt as **encrypted commitments** (hashes).
- Neither the player nor the dealer knows the value of the next card.
- Prevents the dealer from "stacking the deck" or the player from peeking.

### 3. **Commit-Reveal Gameplay**
- **Player Action**: When a player hits, they commit to taking the next card *before* knowing its value.
- **Dealer Reveal**: The dealer must then reveal the card value with a ZK proof (`reveal_proof`) that matches the commitment.
- Ensures fairness for both sides.

### 4. **Private Betting (ShadowWire)**
- Integrated with ShadowWire SDK.
- Players can place bets without exposing their wallet balance or transaction history on-chain.
- Winnings are settled privately.

### 5. **Multiplayer-Ready**
- Join a game using a unique Game ID.
- Play remotely against a dealer.
- Real-time game state updates via Solana account subscriptions.

## Getting Started 🚀

### Frontend Setup

Clone the repository and start the development server:

```bash
git clone <repo-url>
cd umbra
npm install
npm run dev
```

### Environment Variables

Create a `.env.local` file in the root directory:

```env
# Solana RPC
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com

# Optional: For ShadowWire Integration
NEXT_PUBLIC_SHADOWWIRE_API=...
```

### Smart Contract Deployment

Deploy the Anchor programs (if running your own instance):

```bash
anchor build
anchor deploy
```

## System Architecture 🏗️

```
┌─────────────────┐
│   User Action   │
│  "Hit" / "Stand"│
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│   Frontend Processing       │
│  • Generate ZK Proof (WASM) │
│  • Construct Transaction    │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│   Noir ZK Circuits          │
│  • Shuffle Proof            │
│  • Deal Proof               │
│  • Reveal Proof             │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│   Solana Smart Contracts    │
│  • Verify Proof (Groth16)   │
│  • Update Game State        │
│  • Settle Bets              │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│   Blockchain Confirmation   │
│  • Wallet Signature         │
│  • On-Chain Verification    │
│  • Event Emission           │
└─────────────────────────────┘
```

## Technology Stack 🛠️

### Frontend
- **Next.js 14** - React framework with App Router
- **Solana Web3.js** - Blockchain interaction
- **Wallet Adapter** - Phantom/Backpack support
- **TailwindCSS** - Utility-first styling
- **Framer Motion** - Animations
- **Lucide React** - Icons
- **Vercel** - Deployment platform

### Zero-Knowledge (ZK)
- **Noir** - Domain-specific language for ZK circuits
- **Barretenberg** - Proving backend (WASM)
- **Groth16** - Proof system (efficient on-chain verification)
- **Sunspot** - On-chain Groth16 verifier programs (Solana BPF)

### Smart Contracts
- **Anchor Framework** - Solana program development (Rust)
- **Solana Devnet** - Deployment network
- **Rust** - Smart contract language

### Privacy & Security
- **ShadowWire SDK** - Confidential token transfers (Bulletproofs)
- **Poseidon Hash** - ZK-friendly hashing algorithm

## Smart Contracts 📜

### Game Logic
**Program ID:** `8Da8a3Q9GLYuxYLXPtxKiAedZZbx5DUQCuG8TPY1dLnx`

Handles the entire game lifecycle:
- `create_game()` - Initialize with deck commitment
- `join_game()` - Player joins
- `player_action()` - Hit/Stand/Double
- `reveal_card()` - Dealer reveals card value

### ZK Verifiers
Deployed verifier programs for proof validation:
- **Shuffle Verifier:** `6sju9HLJTFfESLn49wAR2hqiC6mnu3MrP2K9WDbkjCL2`
- **Deal Verifier:** `Epoxbrv1Pc2XeYR2xsKsqm3Gy1j2MbkBx4yHfkg8yuSC`
- **Reveal Verifier:** `HrETBH5nTa3DTVjBFWMdytLtuX9GsFwiAGkkyQAXnMt9`

## ZK Circuits (The "Magic") 🧙‍♂️

ZK Card Arena uses three core circuits to ensure fairness:

### 1. **Shuffle Proof** (`shuffle_proof`)
```rust
Input: [52 card values, salt]
Output: deck_commitment (Poseidon Hash)
Proof: "I know a set of 52 cards that contains exactly one of each rank/suit, and this hash represents them."
```

### 2. **Deal Proof** (`deal_proof`)
```rust
Input: [deck, index, salt]
Output: card_commitment
Proof: "The card at this index in the committed deck has this specific commitment hash."
```

### 3. **Reveal Proof** (`reveal_proof`)
```rust
Input: [card_value, salt, commitment]
Output: public_value
Proof: "I am revealing a card value that matches the commitment hash you hold."
```

## Key Features Implementation 💻

### The "2-Step" Hit Flow
1.  **Player Request**: Player signs a transaction to "Hit". The program assigns the next *commitment* to them.
2.  **Dealer Reveal**: The dealer's client observes the request and submits a **Reveal Transaction** with a ZK proof.
    *   *Why?* This prevents the player from seeing the card before committing to the action, and prevents the dealer from changing the card after the action.

### ShadowWire Integration
- **Private Bets**: Players can deposit tokens into a privacy pool.
- **Confidential Settlements**: Winnings are transferred without revealing the amount or recipient on the public ledger.

## Hackathon Tracks & Bounties 🏆

We are targeting the following tracks in the **Solana Privacy Hack**:

| Track | Prize | Goal | Implementation |
| :--- | :--- | :--- | :--- |
| **Open Track** (Solana Foundation) | **$18,000** | Build a privacy-preserving application on Solana. | We built a full-stack dApp that uses ZK proofs to hide card values and **ShadowWire** to hide transaction amounts. It solves a real-world problem (trust in casinos) using privacy tech. |
| **Aztec / Noir** (ZK Circuits) | **$10,000** | Use Noir to build a ZK application. | We wrote **3 custom Noir circuits** (`shuffle`, `deal`, `reveal`) and deployed **3 Groth16 verifiers** on-chain using Sunspot. The entire game logic relies on these circuits for fairness. |
| **Radr Labs** (ShadowWire) | **$15,000** | Private Transfers with ShadowWire (Hide transaction amounts using Bulletproofs). | We integrated the **ShadowWire SDK** to enable private betting. Players deposit funds, and transaction amounts are hidden using **Bulletproofs** (ZK proofs) while remaining verifiable on-chain. We utilize **Client-Side Proof Generation (WASM)** for maximum privacy. |


## Important Files 📍

### Frontend Logic
- **Game Page**
  `/pages/game.js`

- **ZK Hook**
  `/hooks/useZKGame.js`

- **Program Hook**
  `/hooks/useGameProgram.js`

### Smart Contracts
- **Game Program**
  `/programs/zk-card-arena/src/lib.rs`

### ZK Circuits
- **Shuffle Circuit**
  `/circuits/shuffle/src/main.nr`

- **Reveal Circuit**
  `/circuits/reveal/src/main.nr`

## Project Structure 📁

```
umbra/
├── programs/               # Anchor smart contracts
│   └── zk-card-arena/      # Main game logic
├── circuits/               # Noir ZK circuits
│   ├── shuffle/            # Shuffle logic
│   ├── deal/               # Card commitment logic
│   └── reveal/             # Card reveal logic
├── pages/                  # Next.js pages
│   └── game.js             # Main game UI & logic
├── components/             # React components
├── hooks/                  # Custom hooks (Solana + ZK)
│   ├── useGameProgram.js   # Anchor interactions
│   └── useZKGame.js        # ZK proof generation
└── docs/                   # Documentation
```

## Testing Guide 🧪

### Test Flow

1.  **Create Game**
    - Click "Create Game" as Dealer.
    - Wait for ZK Shuffle Proof generation (~30s).
    - Confirm transaction.

2.  **Join Game**
    - Open a new browser window (Incognito).
    - Enter the Game ID from the dealer's screen.
    - Click "Join Game".

3.  **Play Hand**
    - Dealer clicks "Deal".
    - Player clicks "Hit" or "Stand".
    - Watch the ZK proofs verify on-chain!

## Deployment 🚢

### Frontend (Vercel)
```bash
npm run build
# Deploy to Vercel
```

### Smart Contracts (Solana Devnet)
```bash
anchor build
anchor deploy --provider.cluster devnet
```

