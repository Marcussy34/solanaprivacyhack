# ZK Card Arena - Codebase Analysis Report for ShadowWire Integration

> **Purpose:** This document provides complete context for AI assistants to understand and work on the ZK Card Arena codebase for ShadowWire (privacy payment layer) integration.

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [Current Game Flow](#2-current-game-flow)
3. [Wallet Integration](#3-wallet-integration)
4. [Backend Setup](#4-backend-setup)
5. [Existing Types](#5-existing-types)
6. [Environment & Config](#6-environment--config)
7. [Key Files](#7-key-files)
8. [Integration Points](#integration-points-for-shadowwire)

---

## 1. PROJECT STRUCTURE

### Folder Structure

```
/solanaprivacyhack/
├── pages/                    # Next.js Pages Router
│   ├── _app.js              # App wrapper with WalletProvider
│   ├── game.js              # Main game UI (1599 lines)
│   ├── index.js             # Landing page
│   └── api/
│       └── prove.js         # Backend Groth16 proof generation API
├── hooks/
│   ├── useGameProgram.js    # Anchor program interactions (645 lines)
│   ├── useZKGame.js         # ZK proof chain management (545 lines)
│   ├── useZK.js             # NoirJS witness generation
│   └── useShadowPay.js      # Devnet betting (placeholder for mainnet)
├── components/
│   ├── WalletProvider.jsx   # Solana wallet context setup
│   ├── BetSelector.jsx      # Betting UI component
│   └── game/
│       ├── PlayingCard.jsx  # Card UI components
│       └── ProofProgress.jsx
├── circuits/                # Noir ZK circuits (5 circuits)
│   ├── shuffle_proof/
│   ├── deal_proof/
│   ├── reveal_proof/
│   ├── hash_14_helper/
│   └── hash_2_helper/
├── programs/
│   └── zk-card-arena/src/lib.rs  # Anchor smart contract
└── solana-verifiers/target/      # Sunspot proving keys (.pk, .vk)
```

### Frameworks

| Category | Technology |
|----------|------------|
| Frontend | Next.js 16.1.4 (Pages Router), React 19, TailwindCSS 4 |
| State | React hooks (no Redux/Zustand) |
| Animation | Framer Motion |
| Blockchain | @solana/wallet-adapter, @coral-xyz/anchor 0.28 |
| ZK | @noir-lang/noir_js 1.0.0-beta.18, @aztec/bb.js |

### Entry Points

| Entry Point | File | Description |
|-------------|------|-------------|
| Frontend | `pages/_app.js` | Wraps app in `WalletProvider` |
| Main game logic | `pages/game.js` | All game UI and state management |
| Backend API | `pages/api/prove.js` | Groth16 proof generation |

---

## 2. CURRENT GAME FLOW

### How is a game created?

```javascript
// pages/game.js:441 - handleCreateGame()

1. zkInitializeGame()
   → Generates seed, shuffles deck, computes Poseidon commitment

2. POST /api/prove
   → Backend generates Groth16 shuffle proof (~10s)

3. createGame(gameId, commitmentBytes)
   → Anchor TX creates game PDA

4. verifyShuffle(gameId, proof, publicInputs)
   → CPI to Sunspot verifier (~600k CU)

5. Game state: Created → AwaitingPlayer
```

### How do players join?

```javascript
// pages/game.js:514 - handleJoinGame()

1. Player enters game code: "gameId:dealerPubkey"
2. joinGame(parsedGameId, parsedDealer) → Anchor TX
3. Game state: AwaitingPlayer → Playing
```

### How is betting currently handled?

**Devnet (current implementation):** Direct SOL transfer to house wallet

```javascript
// hooks/useShadowPay.js - devnet implementation

pay(recipientAddress, amount) → SystemProgram.transfer
- No actual escrow - wallet balance IS the escrow
- requestPayout() → Simulated (no-op on devnet)
```

**Mainnet (placeholder):** Ready for ShadowWire/ShadowPay integration
- Interface is designed for ZK private payments
- BetSelector component has multi-step progress UI

### Where is the Noir proof triggered?

```javascript
// hooks/useZKGame.js:189 - initializeGame()

1. computeDeckCommitment()
   → NoirJS executes hash_14_helper circuit (~2s)

2. generateGroth16Proof('shuffle_proof', {...})
   → POST /api/prove

// pages/api/prove.js:47

1. nargo execute --package {circuit} {witness_name}
   → Generate witness

2. sunspot prove {acir} {witness} {ccs} {pk}
   → Groth16 proof (~10s)

3. Returns base64-encoded proof + publicInputs
```

### How is the winner determined?

```javascript
// programs/zk-card-arena/src/lib.rs - dealerPlayTurn()

1. Dealer reveals hole card and hits until >= 17
2. determine_winner() called automatically:
   - Calculate both hand values (Ace=11/1, Face=10, etc.)
   - Compare totals, check busts
3. Game state → PlayerWon | DealerWon | Push
```

### Main Game State Type

```javascript
// From IDL in hooks/useGameProgram.js:111-134

// Game Account Structure (on-chain)
{
  dealer: PublicKey,                    // Game creator
  player: Option<PublicKey>,            // Joined player
  deckCommitment: [u8; 32],             // Poseidon(seed, shuffledDeck)
  shuffleVerified: bool,                // ZK proof verified on-chain
  state: GameState,                     // Enum (see below)
  playerCards: Vec<[u8; 32]>,           // Card commitments
  dealerCards: Vec<[u8; 32]>,
  playerRevealed: Vec<u8>,              // Revealed card values (0-12)
  dealerRevealed: Vec<u8>,
  deckPosition: u8,                     // Next card index
  gameId: u64,
  createdAt: i64,
  bump: u8,
  pendingHit: bool,
  committedCards: Vec<[u8; 32]>,        // Pre-committed deck for hits
}

// GameState enum
Created | AwaitingPlayer | Playing | DealerTurn | Revealing | PlayerWon | DealerWon | Push | Abandoned
```

---

## 3. WALLET INTEGRATION

### Is wallet connection implemented?

**Yes.** Full implementation with Phantom and Solflare support.

### Wallet adapter library

```json
// package.json
{
  "@solana/wallet-adapter-base": "^0.9.27",
  "@solana/wallet-adapter-react": "^0.15.39",
  "@solana/wallet-adapter-react-ui": "^0.9.39",
  "@solana/wallet-adapter-wallets": "^0.19.37"
}
```

### Wallet Provider Setup

```javascript
// components/WalletProvider.jsx

import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";

export default function WalletProvider({ children }) {
  const network = "devnet";
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  const wallets = useMemo(() => [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
  ], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect={false}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}
```

### Where wallet signing happens

```javascript
// hooks/useGameProgram.js:232-240 - createGame()
const tx = await program.methods
  .createGame(new BN(gameId), commitment)
  .accounts({
    game: gamePda,
    dealer: wallet.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .rpc();  // ← Anchor handles wallet signing via AnchorProvider

// hooks/useShadowPay.js:140 - pay()
const signature = await sendTransaction(transaction, connection);  // ← wallet-adapter signing
```

---

## 4. BACKEND SETUP

### Backend framework

**Next.js API Routes** (serverless functions)

### Database

**None.** All game state is on-chain in Solana PDAs.

### Frontend-backend communication

**REST API** via Next.js API routes:

```
POST /api/prove  → Groth16 proof generation (only endpoint)
```

### Existing API routes

```javascript
// pages/api/prove.js - ONLY game-related API route

POST /api/prove
Body: {
  circuit: 'shuffle_proof' | 'deal_proof' | 'reveal_proof',
  inputs: {...}
}
Response: {
  proof: base64,
  publicInputs: base64,
  proofBytes: number,
  publicInputsBytes: number
}

// pages/api/hello.js - boilerplate, unused
```

---

## 5. EXISTING TYPES

> **Note:** This is a JavaScript codebase (not TypeScript). Types are defined via JSDoc and Anchor IDL.

### Game State (from IDL)

```javascript
// hooks/useGameProgram.js:136-160

GameState = {
  Created,
  AwaitingPlayer,
  Playing,
  DealerTurn,
  Revealing,
  PlayerWon,
  DealerWon,
  Push,
  Abandoned,
}

PlayerActionType = { Hit, Stand, Double }
```

### Frontend Game States

```javascript
// pages/game.js:36-47

const GAME_STATES = {
  IDLE: "idle",
  BETTING: "betting",         // Player placing bet
  CREATED: "created",
  AWAITING_PLAYER: "awaitingPlayer",
  PLAYING: "playing",
  DEALER_TURN: "dealerTurn",
  REVEALING: "revealing",
  PLAYER_WON: "playerWon",
  DEALER_WON: "dealerWon",
  PUSH: "push",
};
```

### Payment Status (for betting)

```javascript
// hooks/useShadowPay.js:29-38

PaymentStatus = {
  IDLE: 'idle',
  CHECKING_BALANCE: 'checking_balance',
  DEPOSITING: 'depositing',
  GENERATING_PROOF: 'generating_proof',
  VERIFYING: 'verifying',
  SETTLING: 'settling',
  COMPLETE: 'complete',
  ERROR: 'error',
}
```

### Bet Info (passed from BetSelector)

```javascript
// components/BetSelector.jsx:141-145

{
  amount: number,        // SOL amount
  txSignature: string,   // Transaction signature
  paymentId: string,     // Payment ID (same as txSignature on devnet)
}
```

---

## 6. ENVIRONMENT & CONFIG

### Environment Variables

```bash
# .env.local (expected, not committed)

NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_RPC_ENDPOINT=https://api.devnet.solana.com
NEXT_PUBLIC_HOUSE_WALLET=<pubkey>  # For betting (optional, defaults to system program)
```

### Hardcoded Config

```javascript
// hooks/useGameProgram.js:7-12
PROGRAM_ID = "8Da8a3Q9GLYuxYLXPtxKiAedZZbx5DUQCuG8TPY1dLnx"
SHUFFLE_VERIFIER = "6sju9HLJTFfESLn49wAR2hqiC6mnu3MrP2K9WDbkjCL2"
DEAL_VERIFIER = "Epoxbrv1Pc2XeYR2xsKsqm3Gy1j2MbkBx4yHfkg8yuSC"
REVEAL_VERIFIER = "HrETBH5nTa3DTVjBFWMdytLtuX9GsFwiAGkkyQAXnMt9"

// hooks/useShadowPay.js:25
HOUSE_WALLET = process.env.NEXT_PUBLIC_HOUSE_WALLET || '111...112'

// components/WalletProvider.jsx:18
network = "devnet"
```

### Network

**Devnet** (hardcoded in WalletProvider.jsx)

---

## 7. KEY FILES

### 1. Main Game Logic: `pages/game.js`

**Purpose:** All game UI, state management, and user interactions.

```javascript
// Key state variables (lines 253-278)
const [gameState, setGameState] = useState(GAME_STATES.IDLE);
const [currentBet, setCurrentBet] = useState(null);
const [betTxSignature, setBetTxSignature] = useState(null);
const [payoutProcessed, setPayoutProcessed] = useState(false);

// Betting flow (lines 831-848)
const handleBetPlaced = async (betInfo) => {
  setCurrentBet(betInfo.amount);
  setBetTxSignature(betInfo.txSignature);

  if (bettingIntent === 'single_player') {
    await handleCreateGame();
  } else if (bettingIntent === 'join') {
    await handleJoinGame(pendingJoinCode);
  }
};

// Payout handling (lines 851-881)
const handlePayout = async () => {
  const payoutAmount = isWinner ? currentBet * 2 : currentBet;
  await requestPayout(payoutAmount);
  setPayoutProcessed(true);
};
```

---

### 2. API Routes: `pages/api/prove.js`

**Purpose:** Backend Groth16 proof generation via nargo + sunspot.

```javascript
// Full flow (154 lines)
export default async function handler(req, res) {
  const { circuit, inputs } = req.body;

  // 1. Write Prover.toml
  await writeFile(tempProverToml, formatProverToml(circuit, inputs));

  // 2. nargo execute → witness
  await runCommand('nargo', ['execute', '--package', circuit, witnessName], ...);

  // 3. sunspot prove → Groth16 proof
  await runCommand('sunspot', ['prove', acirFile, witnessFile, ccsFile, pkFile], ...);

  // 4. Return base64-encoded proof
  return res.json({ proof: base64, publicInputs: base64 });
}
```

---

### 3. Wallet Connection: `components/WalletProvider.jsx`

**Purpose:** Solana wallet context setup for the entire app.

```javascript
// Full file (47 lines)
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";

export default function WalletProvider({ children }) {
  const network = "devnet";
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  const wallets = useMemo(() => [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
  ], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect={false}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}
```

---

### 4. ZK Proof Integration: `hooks/useZKGame.js`

**Purpose:** Manages the entire ZK proof chain (shuffle → deal → reveal).

```javascript
// Key functions:

// initializeGame() - lines 189-249
// Generate seed, shuffle deck, get Groth16 proof
const initializeGame = useCallback(async () => {
  const newSeed = generateRandomField();
  const newShuffledDeck = shuffleArray(originalDeck);
  const newDeckCommitment = await computeDeckCommitment(newSeed, newShuffledDeck);

  const proofResult = await generateGroth16Proof('shuffle_proof', {
    seed: newSeed,
    shuffled_deck: newShuffledDeck,
    deck_commitment: newDeckCommitment,
    original_deck: originalDeck,
  });

  return { seed, shuffledDeck, deckCommitment, proof, publicInputs };
}, [...]);

// computeCardCommitmentAtPosition() - lines 338-359
// Fast commitment (~1s), no Groth16 proof

// revealCard() - lines 372-411
// Generate reveal proof for card verification
```

**Groth16 proof request helper (lines 115-136):**

```javascript
async function generateGroth16Proof(circuit, inputs) {
  const response = await fetch('/api/prove', {
    method: 'POST',
    body: JSON.stringify({ circuit, inputs }),
  });
  const data = await response.json();
  return {
    proof: Uint8Array.from(atob(data.proof), c => c.charCodeAt(0)),
    publicInputs: Uint8Array.from(atob(data.publicInputs), c => c.charCodeAt(0)),
  };
}
```

---

### 5. Betting Hook: `hooks/useShadowPay.js`

**Purpose:** Payment handling for betting. Currently devnet stub, ready for ShadowWire.

```javascript
// Current devnet implementation (lines 106-170)
const pay = async (recipientAddress, amount, _resourceUrl) => {
  // Direct SOL transfer on devnet
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: publicKey,
      toPubkey: new PublicKey(recipientAddress),
      lamports: Math.round(amount * LAMPORTS_PER_SOL),
    })
  );
  const signature = await sendTransaction(transaction, connection);
  return { txSignature: signature, paymentId: signature, amount };
};

// Payout (simulated on devnet)
const requestPayout = async (amount) => {
  console.log('[ShadowPay:devnet] Payout simulated:', amount);
  return { txSignature: 'devnet-simulated-payout', amount };
};
```

**Exported interface:**

```javascript
return {
  connected,
  isClientReady: true,
  escrowBalance,
  status,           // PaymentStatus enum
  error,
  lastPayment,
  isLoading,
  isComplete,
  isError,
  getBalance,       // () => Promise<number>
  deposit,          // (amount) => Promise<string>
  pay,              // (recipient, amount, resourceUrl) => Promise<{txSignature, paymentId}>
  requestPayout,    // (amount) => Promise<{txSignature, amount}>
  clearError,
  getHouseWallet,
  HOUSE_WALLET,
};
```

---

### 6. Anchor Program Interactions: `hooks/useGameProgram.js`

**Purpose:** All on-chain interactions via Anchor.

```javascript
// Program IDs (lines 7-12)
const PROGRAM_ID = new PublicKey("8Da8a3Q9GLYuxYLXPtxKiAedZZbx5DUQCuG8TPY1dLnx");
const SHUFFLE_VERIFIER_PROGRAM_ID = new PublicKey("6sju9HLJTFfESLn49wAR2hqiC6mnu3MrP2K9WDbkjCL2");

// Exported functions:
return {
  program,
  programId: PROGRAM_ID,
  connected: !!program,

  // Actions
  createGame,           // (gameId, deckCommitment) → creates game PDA
  verifyShuffle,        // (gameId, proof, publicInputs) → CPI to verifier
  joinGame,             // (gameId, dealerPubkey) → player joins
  dealInitialHand,      // (gameId, dealerPubkey, commitments, cardValues)
  playerAction,         // (gameId, action, dealerPubkey, cardValue)
  revealCard,           // (gameId, cardIndex, cardValue, isPlayerCard, proof, publicInputs)
  revealAllCards,       // batch reveal
  dealerPlayTurn,       // (gameId, dealerPubkey, cardValues)

  // Queries
  fetchGame,            // (gameId, dealerPubkey) → game account data
  subscribeToGame,      // (gameId, dealerPubkey, callback) → real-time updates
  getGamePda,           // (gameId, dealerPubkey) → PDA address
};
```

---

## INTEGRATION POINTS FOR SHADOWWIRE

Based on the current architecture, ShadowWire should integrate at:

### Primary Integration File

**`hooks/useShadowPay.js`** - Replace devnet direct transfers with ShadowWire ZK payments

The current interface is designed for drop-in replacement:

| Function | Current (Devnet) | ShadowWire (Mainnet) |
|----------|------------------|----------------------|
| `pay(recipient, amount, resourceUrl)` | `SystemProgram.transfer` | ShadowWire ZK payment |
| `requestPayout(amount)` | No-op (simulated) | ShadowWire settlement |
| `deposit(amount)` | No-op (wallet is escrow) | ShadowWire escrow deposit |
| `getBalance()` | Wallet SOL balance | ShadowWire escrow balance |

### UI Components (Already Ready)

**`components/BetSelector.jsx`** - Has multi-step progress UI for:
- Checking balance
- Depositing to escrow
- Generating ZK proof
- Verifying
- Settling

### Game Logic Hooks

**`pages/game.js`** - Already calls useShadowPay:
- `handleBetPlaced()` (line 831) - Called after successful bet
- `handlePayout()` (line 851) - Called when game ends

### Expected ShadowWire Interface

```javascript
// Replace hooks/useShadowPay.js with ShadowWire implementation

export function useShadowPay() {
  return {
    // State
    connected: boolean,
    isClientReady: boolean,
    escrowBalance: number | null,
    status: PaymentStatus,
    error: string | null,
    lastPayment: PaymentInfo | null,
    isLoading: boolean,

    // Actions
    getBalance: () => Promise<number>,
    deposit: (amount: number) => Promise<string>,
    pay: (recipient: string, amount: number, resourceUrl: string) => Promise<{
      txSignature: string,
      paymentId: string,
    }>,
    requestPayout: (amount: number) => Promise<{
      txSignature: string,
      amount: number,
    }>,
    clearError: () => void,
  };
}
```

---

## DEPLOYED PROGRAMS (DEVNET)

| Program | Address |
|---------|---------|
| ZK Card Arena | `8Da8a3Q9GLYuxYLXPtxKiAedZZbx5DUQCuG8TPY1dLnx` |
| Shuffle Verifier | `6sju9HLJTFfESLn49wAR2hqiC6mnu3MrP2K9WDbkjCL2` |
| Deal Verifier | `Epoxbrv1Pc2XeYR2xsKsqm3Gy1j2MbkBx4yHfkg8yuSC` |
| Reveal Verifier | `HrETBH5nTa3DTVjBFWMdytLtuX9GsFwiAGkkyQAXnMt9` |

---

*Report generated for ZK Card Arena - Solana Privacy Hackathon 2026*
