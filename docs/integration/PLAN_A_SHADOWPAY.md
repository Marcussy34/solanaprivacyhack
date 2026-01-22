# Plan A: ShadowPay Integration

## Overview

**Target Bounty**: Radr Labs - $15,000
**Estimated Effort**: 2-3 days
**Risk Level**: Low (SDK is simple, well-documented)

---

## What ShadowPay Adds to ZK Card Arena

| Feature | Description |
|---------|-------------|
| Private Bets | Hide bet amounts on-chain using Bulletproofs |
| Private Payouts | Winners receive funds privately |
| No Trace | Nobody sees who bet how much or who won |
| Wallet Compatible | Works with Phantom, Solflare, Backpack |

---

## SDK Information

### Installation

```bash
npm i @shadowpay/core @shadowpay/client @shadowpay/server
```

### Packages

| Package | Purpose |
|---------|---------|
| `@shadowpay/core` | Shared cryptographic utilities, types |
| `@shadowpay/client` | Browser-side payment generation |
| `@shadowpay/server` | Node.js verification, middleware |

### Key Methods

```typescript
// Client-side
const sp = new ShadowPay();
await sp.pay({ to, amount, token, wallet });

// Server-side
const sp = new ShadowPay({ apiKey });
await sp.verifyPayment(header, { amount, token });
await sp.payout({ to, amount, token });
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ZK CARD ARENA + SHADOWPAY                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  PLAYER WALLET                                               │
│       │                                                      │
│       ▼                                                      │
│  ┌─────────────────┐                                        │
│  │  ShadowPay SDK  │ ◄── Private bet (Bulletproofs)         │
│  │   (Client)      │                                        │
│  └────────┬────────┘                                        │
│           │                                                  │
│           ▼                                                  │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │  Game Treasury  │───▶│  Game Contract  │                │
│  │    (Escrow)     │    │  (Anchor/ZK)    │                │
│  └─────────────────┘    └────────┬────────┘                │
│                                  │                          │
│                                  ▼                          │
│                         ┌─────────────────┐                │
│                         │  Game Outcome   │                │
│                         │  (ZK Verified)  │                │
│                         └────────┬────────┘                │
│                                  │                          │
│                                  ▼                          │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │  ShadowPay SDK  │◄───│  Payout API     │                │
│  │   (Server)      │    │  (/api/payout)  │                │
│  └────────┬────────┘    └─────────────────┘                │
│           │                                                  │
│           ▼                                                  │
│  WINNER WALLET ◄── Private payout (hidden amount)           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Steps

### Step 1: Install Dependencies

```bash
npm i @shadowpay/core @shadowpay/client @shadowpay/server
```

### Step 2: Create ShadowPay Service Hook

**File**: `hooks/useShadowPay.js`

```javascript
import { ShadowPay } from '@shadowpay/client';
import { useCallback } from 'react';

export function useShadowPay() {
  const shadowpay = new ShadowPay();

  const placeBet = useCallback(async (amount, wallet) => {
    // Place private bet - amount hidden on-chain via Bulletproofs
    const payment = await shadowpay.pay({
      to: process.env.NEXT_PUBLIC_GAME_TREASURY,
      amount: amount,
      token: 'SOL',
      wallet: wallet.adapter
    });

    console.log('Private bet placed:', payment.reference);
    return payment;
  }, []);

  const claimWinnings = useCallback(async (amount, recipientPubkey, gameId) => {
    // Server-side payout via API
    const response = await fetch('/api/payout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount,
        recipient: recipientPubkey,
        gameId
      })
    });

    if (!response.ok) {
      throw new Error('Payout failed');
    }

    return response.json();
  }, []);

  return { placeBet, claimWinnings };
}
```

### Step 3: Create Payout API Route

**File**: `pages/api/payout.js`

```javascript
import { ShadowPay } from '@shadowpay/server';
import { Connection, PublicKey } from '@solana/web3.js';

const shadowpay = new ShadowPay({
  apiKey: process.env.SHADOWPAY_API_KEY
});

const connection = new Connection(
  process.env.NEXT_PUBLIC_RPC_ENDPOINT || 'https://api.devnet.solana.com'
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { amount, recipient, gameId } = req.body;

    // 1. Verify game outcome on-chain
    const gameOutcome = await verifyGameOutcome(gameId, recipient);

    if (!gameOutcome.isWinner) {
      return res.status(403).json({ error: 'Not a winner' });
    }

    if (gameOutcome.payoutClaimed) {
      return res.status(400).json({ error: 'Payout already claimed' });
    }

    // 2. Process private payout via ShadowPay
    const payout = await shadowpay.payout({
      to: recipient,
      amount: amount,
      token: 'SOL'
    });

    // 3. Mark payout as claimed on-chain (optional)
    // await markPayoutClaimed(gameId);

    return res.json({
      success: true,
      txId: payout.signature,
      amount: amount
    });

  } catch (error) {
    console.error('Payout error:', error);
    return res.status(500).json({ error: 'Payout failed' });
  }
}

async function verifyGameOutcome(gameId, playerPubkey) {
  // TODO: Implement on-chain game verification
  // Check game state, winner, and payout status
  return {
    isWinner: true, // Verify from game account
    payoutClaimed: false
  };
}
```

### Step 4: Integrate into Game Component

**Modify**: `pages/game.js`

```javascript
// Add imports
import { useShadowPay } from '../hooks/useShadowPay';
import { useState } from 'react';

// Inside component
const { placeBet, claimWinnings } = useShadowPay();
const [betAmount, setBetAmount] = useState(0.1); // Default 0.1 SOL
const [betPlaced, setBetPlaced] = useState(false);
const [paymentRef, setPaymentRef] = useState(null);

// Modified game start flow
const handleStartGameWithBet = async () => {
  try {
    setIsLoading(true);

    // 1. Place private bet via ShadowPay
    const payment = await placeBet(betAmount, wallet);
    setPaymentRef(payment.reference);
    setBetPlaced(true);

    // 2. Create game with bet reference
    await createGame(gameIdRef.current);

    // 3. Deal initial hand
    await dealInitialHand(gameIdRef.current, publicKey.toString());

    // 4. Fetch game state
    const data = await fetchGame(gameIdRef.current, publicKey.toString());
    if (data) {
      setGameData(data);
      setGameState(data.state);
    }

  } catch (error) {
    console.error('Error starting game with bet:', error);
    setError('Failed to place bet. Please try again.');
  } finally {
    setIsLoading(false);
  }
};

// Claim winnings when game ends
const handleClaimWinnings = async () => {
  if (gameState !== 'PlayerWon') return;

  try {
    setIsLoading(true);

    const winnings = betAmount * 2; // 2x payout for win
    const result = await claimWinnings(
      winnings,
      publicKey.toString(),
      gameIdRef.current
    );

    alert(`Winnings claimed! TX: ${result.txId}`);

  } catch (error) {
    console.error('Error claiming winnings:', error);
    setError('Failed to claim winnings.');
  } finally {
    setIsLoading(false);
  }
};

// Add to UI - Bet Selection
<div className="mb-4">
  <label className="text-gray-300">Bet Amount (SOL)</label>
  <select
    value={betAmount}
    onChange={(e) => setBetAmount(parseFloat(e.target.value))}
    className="bg-gray-800 text-white rounded px-4 py-2"
  >
    <option value={0.01}>0.01 SOL</option>
    <option value={0.05}>0.05 SOL</option>
    <option value={0.1}>0.1 SOL</option>
    <option value={0.5}>0.5 SOL</option>
    <option value={1}>1 SOL</option>
  </select>
  <p className="text-xs text-gray-500">
    Bet amount is private - hidden on-chain
  </p>
</div>

// Add Claim button when player wins
{gameState === 'PlayerWon' && (
  <button
    onClick={handleClaimWinnings}
    className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-xl"
  >
    Claim {betAmount * 2} SOL Privately
  </button>
)}
```

### Step 5: Update Smart Contract

**Modify**: `programs/zk-card-arena/src/lib.rs`

```rust
#[account]
pub struct Game {
    // ... existing fields ...

    /// Bet amount in lamports (for calculation only)
    pub bet_amount: u64,

    /// ShadowPay payment reference (for verification)
    pub bet_reference: [u8; 32],

    /// Whether payout has been claimed
    pub payout_claimed: bool,
}

impl Game {
    pub const MAX_SIZE: usize =
        // ... existing size calculations ...
        + 8   // bet_amount
        + 32  // bet_reference
        + 1;  // payout_claimed
}

// Update create_game to accept bet info
pub fn create_game(
    ctx: Context<CreateGame>,
    game_id: u64,
    deck_commitment: [u8; 32],
    bet_amount: u64,
    bet_reference: [u8; 32],
) -> Result<()> {
    let game = &mut ctx.accounts.game;
    // ... existing initialization ...
    game.bet_amount = bet_amount;
    game.bet_reference = bet_reference;
    game.payout_claimed = false;
    Ok(())
}

// Add instruction to mark payout claimed
pub fn mark_payout_claimed(ctx: Context<MarkPayout>) -> Result<()> {
    let game = &mut ctx.accounts.game;

    require!(
        game.state == GameState::PlayerWon,
        GameError::InvalidState
    );
    require!(
        !game.payout_claimed,
        GameError::AlreadyClaimed
    );

    game.payout_claimed = true;
    msg!("Payout claimed for game");
    Ok(())
}
```

### Step 6: Environment Variables

**File**: `.env.local`

```env
# ShadowPay
SHADOWPAY_API_KEY=your_shadowpay_api_key
NEXT_PUBLIC_GAME_TREASURY=your_treasury_pubkey

# Existing
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_RPC_ENDPOINT=https://api.devnet.solana.com
```

---

## User Flow

```
┌──────────────────────────────────────────────────────────┐
│                     PLAYER JOURNEY                        │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  1. CONNECT WALLET                                        │
│     └── Phantom/Solflare/Backpack                        │
│                                                           │
│  2. SELECT BET AMOUNT                                     │
│     └── 0.01 - 1 SOL                                     │
│     └── Amount will be PRIVATE                           │
│                                                           │
│  3. CLICK "START GAME"                                    │
│     └── ShadowPay popup appears                          │
│     └── Confirm private bet                              │
│     └── Bet amount hidden on-chain (Bulletproofs)        │
│                                                           │
│  4. PLAY BLACKJACK                                        │
│     └── Hit, Stand, Double                               │
│     └── Cards dealt with ZK proofs                       │
│     └── Dealer auto-plays on stand                       │
│                                                           │
│  5. GAME ENDS                                             │
│     └── Winner determined by ZK-verified cards           │
│     └── If WIN: "Claim Winnings" button appears          │
│     └── If LOSE: Game over, bet forfeited               │
│                                                           │
│  6. CLAIM WINNINGS (if won)                               │
│     └── Click "Claim X SOL Privately"                    │
│     └── ShadowPay processes private payout               │
│     └── Funds arrive in wallet (amount hidden)           │
│                                                           │
│  PRIVACY GUARANTEE:                                       │
│  - Bet amount: Hidden (Bulletproofs)                     │
│  - Payout amount: Hidden (Bulletproofs)                  │
│  - Who won/lost: Visible (game state)                    │
│  - Card values: Hidden until reveal (ZK proofs)          │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

---

## Files Summary

| File | Action | Description |
|------|--------|-------------|
| `package.json` | Modify | Add @shadowpay/* packages |
| `hooks/useShadowPay.js` | Create | ShadowPay client hook |
| `pages/api/payout.js` | Create | Private payout API |
| `pages/game.js` | Modify | Add betting UI and flow |
| `programs/.../lib.rs` | Modify | Add bet tracking fields |
| `.env.local` | Modify | Add SHADOWPAY_API_KEY |

---

## Bounty Checklist

- [ ] Uses ShadowPay SDK (`@shadowpay/client`, `@shadowpay/server`)
- [ ] Private bet transfers (amount hidden via Bulletproofs)
- [ ] Private payout transfers (amount hidden)
- [ ] Real use case: Privacy-preserving gambling/gaming
- [ ] Working demo with full game flow
- [ ] Documentation of integration

---

## Testing

### Local Testing

```bash
# 1. Set up environment
cp .env.example .env.local
# Add SHADOWPAY_API_KEY (get from Radr Labs)

# 2. Run development server
npm run dev

# 3. Test flow
# - Connect wallet
# - Start game with bet
# - Play through
# - Claim winnings
```

### Devnet Testing

```bash
# Ensure contract is deployed to devnet
anchor deploy --provider.cluster devnet

# Get devnet SOL for testing
solana airdrop 2
```

---

## Resources

- [ShadowPay SDK GitHub](https://github.com/Radrdotfun/shadowpay-sdk)
- [ShadowPay API Docs](https://registry.scalar.com/@radr/apis/shadowpay-api)
- [Radr Labs](https://www.radrlabs.io/)
- [Hackathon Bounty Page](https://solana.com/privacyhack)
