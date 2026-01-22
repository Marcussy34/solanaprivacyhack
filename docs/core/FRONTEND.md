# ZK Card Arena - Frontend Implementation Guide

## Overview

The frontend is a Next.js application providing the game interface, wallet integration, and browser-based ZK proof generation.

---

## Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 14.x | React framework |
| React | 18.x | UI library |
| TailwindCSS | 3.x | Styling |
| @solana/wallet-adapter | latest | Wallet connection |
| @solana/web3.js | latest | Blockchain interaction |
| NoirJS | latest | Browser ZK proving |
| Framer Motion | latest | Animations |

---

## Project Structure

```
├── components/
│   ├── game/
│   │   ├── GameBoard.jsx       # Main game interface
│   │   ├── Card.jsx            # Card component (face up/down)
│   │   ├── Hand.jsx            # Collection of cards
│   │   ├── DealerHand.jsx      # Dealer's cards
│   │   ├── PlayerHand.jsx      # Player's cards
│   │   ├── ActionButtons.jsx   # Hit/Stand/Double buttons
│   │   └── GameStatus.jsx      # Win/lose/push display
│   ├── wallet/
│   │   └── WalletButton.jsx    # Wallet connect button
│   ├── proof/
│   │   ├── ProofStatus.jsx     # Proof generation status
│   │   └── ProofViewer.jsx     # View/verify proofs
│   └── ui/
│       └── ...                 # shadcn/ui components
├── hooks/
│   ├── useGame.js              # Game state management
│   ├── useProof.js             # ZK proof generation
│   └── useProgram.js           # Anchor program interaction
├── lib/
│   ├── noir/
│   │   ├── circuits.js         # Circuit loading
│   │   └── prover.js           # Proof generation
│   ├── program/
│   │   └── instructions.js     # Program instructions
│   └── utils/
│       ├── cards.js            # Card encoding/decoding
│       └── shuffle.js          # Shuffle algorithm
├── pages/
│   ├── index.js                # Landing page
│   ├── play.js                 # Game page
│   └── verify.js               # Proof verification page
└── styles/
    └── globals.css
```

---

## Core Components

### GameBoard Component

```jsx
// components/game/GameBoard.jsx
import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useGame } from '@/hooks/useGame';
import { DealerHand, PlayerHand, ActionButtons, GameStatus } from './';

export function GameBoard({ gameId }) {
  const { publicKey } = useWallet();
  const { game, actions, loading } = useGame(gameId);
  
  if (!publicKey) {
    return <ConnectWalletPrompt />;
  }
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  return (
    <div className="game-board">
      <DealerHand 
        cards={game.dealerCards}
        revealed={game.dealerRevealed}
        hideFirst={game.state === 'playing'}
      />
      
      <GameStatus state={game.state} />
      
      <PlayerHand 
        cards={game.playerCards}
        revealed={game.playerRevealed}
      />
      
      {game.state === 'playing' && (
        <ActionButtons
          onHit={actions.hit}
          onStand={actions.stand}
          onDouble={actions.double}
          disabled={loading}
        />
      )}
    </div>
  );
}
```

### Card Component

```jsx
// components/game/Card.jsx
import { motion } from 'framer-motion';

const CARD_VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export function Card({ value, revealed = false, suit = 'spades' }) {
  return (
    <motion.div
      className={`card ${revealed ? 'revealed' : 'hidden'}`}
      initial={{ rotateY: 180 }}
      animate={{ rotateY: revealed ? 0 : 180 }}
      transition={{ duration: 0.5 }}
    >
      {revealed ? (
        <div className="card-face">
          <span className="card-value">{CARD_VALUES[value]}</span>
          <span className="card-suit">{getSuitSymbol(suit)}</span>
        </div>
      ) : (
        <div className="card-back">
          <div className="card-pattern" />
        </div>
      )}
    </motion.div>
  );
}
```

---

## Hooks

### useGame Hook

```javascript
// hooks/useGame.js
import { useState, useEffect, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useProgram } from './useProgram';

export function useGame(gameId) {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const { program } = useProgram();
  
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Fetch game state
  useEffect(() => {
    if (!gameId || !program) return;
    
    const fetchGame = async () => {
      const gameAccount = await program.account.game.fetch(gameId);
      setGame(gameAccount);
      setLoading(false);
    };
    
    fetchGame();
    
    // Subscribe to updates
    const subscription = connection.onAccountChange(
      gameId,
      (account) => {
        const decoded = program.coder.accounts.decode('Game', account.data);
        setGame(decoded);
      }
    );
    
    return () => connection.removeAccountChangeListener(subscription);
  }, [gameId, program, connection]);
  
  // Game actions
  const actions = {
    hit: useCallback(async () => {
      setLoading(true);
      await program.methods.playerAction({ hit: {} })
        .accounts({ game: gameId, player: publicKey })
        .rpc();
      setLoading(false);
    }, [gameId, program, publicKey]),
    
    stand: useCallback(async () => {
      setLoading(true);
      await program.methods.playerAction({ stand: {} })
        .accounts({ game: gameId, player: publicKey })
        .rpc();
      setLoading(false);
    }, [gameId, program, publicKey]),
    
    double: useCallback(async () => {
      setLoading(true);
      await program.methods.playerAction({ double: {} })
        .accounts({ game: gameId, player: publicKey })
        .rpc();
      setLoading(false);
    }, [gameId, program, publicKey]),
  };
  
  return { game, actions, loading };
}
```

### useProof Hook

```javascript
// hooks/useProof.js
import { useState, useCallback } from 'react';
import { Noir } from '@noir-lang/noir_js';
import { BarretenbergBackend } from '@noir-lang/backend_barretenberg';

export function useProof(circuitName) {
  const [proving, setProving] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const generateProof = useCallback(async (inputs) => {
    setProving(true);
    setProgress(0);
    
    try {
      // Load circuit
      const circuit = await fetch(`/circuits/${circuitName}.json`)
        .then(r => r.json());
      setProgress(20);
      
      // Initialize backend
      const backend = new BarretenbergBackend(circuit);
      const noir = new Noir(circuit, backend);
      setProgress(40);
      
      // Generate proof
      const { proof, publicInputs } = await noir.generateProof(inputs);
      setProgress(100);
      
      return { proof, publicInputs };
    } finally {
      setProving(false);
    }
  }, [circuitName]);
  
  return { generateProof, proving, progress };
}
```

---

## NoirJS Integration

### Circuit Loading

```javascript
// lib/noir/circuits.js
const CIRCUITS = {
  shuffle: '/circuits/shuffle_proof.json',
  deal: '/circuits/deal_proof.json',
  reveal: '/circuits/reveal_proof.json',
};

export async function loadCircuit(name) {
  const response = await fetch(CIRCUITS[name]);
  if (!response.ok) {
    throw new Error(`Failed to load circuit: ${name}`);
  }
  return response.json();
}
```

### Proof Generation

```javascript
// lib/noir/prover.js
import { Noir } from '@noir-lang/noir_js';
import { BarretenbergBackend } from '@noir-lang/backend_barretenberg';
import { loadCircuit } from './circuits';

export class Prover {
  constructor() {
    this.circuits = {};
    this.backends = {};
  }
  
  async init(circuitName) {
    if (this.circuits[circuitName]) return;
    
    const circuit = await loadCircuit(circuitName);
    const backend = new BarretenbergBackend(circuit);
    
    this.circuits[circuitName] = new Noir(circuit, backend);
    this.backends[circuitName] = backend;
  }
  
  async prove(circuitName, inputs) {
    await this.init(circuitName);
    return this.circuits[circuitName].generateProof(inputs);
  }
  
  async verify(circuitName, proof, publicInputs) {
    await this.init(circuitName);
    return this.backends[circuitName].verifyProof({ proof, publicInputs });
  }
}

export const prover = new Prover();
```

---

## Wallet Integration

### Provider Setup

```jsx
// pages/_app.js
import { useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';

import '@solana/wallet-adapter-react-ui/styles.css';

export default function App({ Component, pageProps }) {
  const endpoint = useMemo(() => clusterApiUrl('devnet'), []);
  
  const wallets = useMemo(() => [
    new PhantomWalletAdapter(),
  ], []);
  
  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <Component {...pageProps} />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
```

---

## UI/UX Guidelines

### Design Principles

1. **Dark Theme** - Gaming aesthetic, reduces eye strain
2. **Neon Accents** - Cyberpunk/crypto vibe
3. **Smooth Animations** - Card flips, dealing animations
4. **Clear Status** - Always show what's happening
5. **Proof Transparency** - Easy access to verify proofs

### Color Palette

```css
:root {
  --bg-primary: #0a0a0f;
  --bg-secondary: #1a1a2e;
  --accent-primary: #00ff88;
  --accent-secondary: #7c3aed;
  --text-primary: #ffffff;
  --text-secondary: #a0a0a0;
  --error: #ff4444;
  --success: #00ff88;
}
```

### Card Styling

```css
.card {
  width: 100px;
  height: 140px;
  border-radius: 8px;
  perspective: 1000px;
  transform-style: preserve-3d;
  transition: transform 0.5s;
}

.card-face {
  background: linear-gradient(135deg, #ffffff, #f0f0f0);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.card-back {
  background: linear-gradient(135deg, #7c3aed, #4c1d95);
  background-image: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 10px,
    rgba(255,255,255,0.1) 10px,
    rgba(255,255,255,0.1) 20px
  );
}
```

---

## Pages

### Landing Page (`/`)

- Hero section explaining ZK Card Arena
- "Play Now" CTA
- Brief explanation of ZK fairness
- Connect wallet prompt

### Game Page (`/play`)

- Game selection/creation
- Game board
- Action buttons
- Hand totals
- Win/lose display

### Verification Page (`/verify`)

- Enter game ID
- View all proofs
- Independent verification
- Transaction links
