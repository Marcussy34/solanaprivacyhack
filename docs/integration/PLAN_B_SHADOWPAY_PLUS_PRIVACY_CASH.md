# Plan B: ShadowPay + Privacy Cash Integration

## Overview

**Target Bounties**:
- Radr Labs (ShadowPay): $15,000
- Privacy Cash: $15,000
- **Combined Total**: $30,000+

**Estimated Effort**: 4-5 days
**Risk Level**: Medium (two integrations, more complex)

---

## Feature Comparison

| Feature | Plan A (ShadowPay Only) | Plan B (Both) |
|---------|-------------------------|---------------|
| Private bets | Yes | Yes |
| Private payouts | Yes | Yes |
| Shielded balance | No | **Yes** |
| Untraceable funds | No | **Yes** |
| Break deposit/withdraw link | No | **Yes** |
| Whale protection | Partial | **Full** |

---

## What Each SDK Provides

### ShadowPay (Radr Labs)

| Feature | Technology |
|---------|------------|
| Private transfers | Bulletproofs ZK |
| Hidden amounts | ElGamal encryption |
| On-chain verification | Groth16 proofs |
| SDK | `@shadowpay/client`, `@shadowpay/server` |

### Privacy Cash

| Feature | Technology |
|---------|------------|
| Privacy pools | Merkle tree commitments |
| Shielded deposits | ZK proof of deposit |
| Anonymous withdrawals | ZK proof without revealing source |
| SDK | `privacy-cash-sdk` + Light Protocol |

---

## Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│               ZK CARD ARENA - FULL PRIVACY ARCHITECTURE            │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  PLAYER'S MAIN WALLET                                               │
│       │                                                             │
│       │ (1) Shield funds                                           │
│       ▼                                                             │
│  ┌──────────────────────────────────────────┐                      │
│  │          PRIVACY CASH POOL               │                      │
│  │  ┌────────────────────────────────────┐  │                      │
│  │  │  Shielded Balance: X.XX SOL        │  │                      │
│  │  │  (Funds are now UNTRACEABLE)       │  │                      │
│  │  └────────────────────────────────────┘  │                      │
│  └────────────────┬─────────────────────────┘                      │
│                   │                                                 │
│                   │ (2) Bet from shielded balance                  │
│                   ▼                                                 │
│  ┌──────────────────────────────────────────┐                      │
│  │            SHADOWPAY LAYER               │                      │
│  │  Private transfer to game treasury       │                      │
│  │  (Bet amount hidden via Bulletproofs)    │                      │
│  └────────────────┬─────────────────────────┘                      │
│                   │                                                 │
│                   ▼                                                 │
│  ┌──────────────────────────────────────────┐                      │
│  │          GAME TREASURY (ESCROW)          │                      │
│  └────────────────┬─────────────────────────┘                      │
│                   │                                                 │
│                   ▼                                                 │
│  ┌──────────────────────────────────────────┐                      │
│  │         ZK CARD ARENA CONTRACT           │                      │
│  │  - Game state management                 │                      │
│  │  - ZK shuffle proof verification         │                      │
│  │  - Winner determination                  │                      │
│  └────────────────┬─────────────────────────┘                      │
│                   │                                                 │
│                   │ (3) Game outcome                               │
│                   ▼                                                 │
│  ┌──────────────────────────────────────────┐                      │
│  │            PAYOUT FLOW                   │                      │
│  │  IF WIN:                                 │                      │
│  │   └─▶ ShadowPay private payout           │                      │
│  │   └─▶ Auto-reshield to Privacy Cash      │                      │
│  └────────────────┬─────────────────────────┘                      │
│                   │                                                 │
│                   │ (4) Winnings in privacy pool                   │
│                   ▼                                                 │
│  ┌──────────────────────────────────────────┐                      │
│  │          PRIVACY CASH POOL               │                      │
│  │  Shielded Balance: Y.YY SOL (increased)  │                      │
│  └────────────────┬─────────────────────────┘                      │
│                   │                                                 │
│                   │ (5) Withdraw to ANY wallet                     │
│                   ▼                                                 │
│  ANY WALLET ADDRESS                                                 │
│  (No link to original deposit!)                                     │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## SDK Information

### Privacy Cash SDK

**Requirements**: Node.js 24+

**Installation**:
```bash
npm i privacy-cash-sdk @lightprotocol/hasher.rs
```

**Next.js Configuration** (required for WASM):
```json
{
  "scripts": {
    "postinstall": "cp node_modules/@lightprotocol/hasher.rs/dist/hasher_wasm_simd_bg.wasm node_modules/@lightprotocol/hasher.rs/dist/browser-fat/es/ && cp node_modules/@lightprotocol/hasher.rs/dist/light_wasm_hasher_bg.wasm node_modules/@lightprotocol/hasher.rs/dist/browser-fat/es/"
  }
}
```

**Key Methods**:
```typescript
// SOL Operations
await privacyCash.deposit(amount);           // Shield SOL
await privacyCash.withdraw(amount, address); // Withdraw to any address
await privacyCash.getPrivateBalance();       // Check shielded balance

// SPL Token Operations (future)
await privacyCash.depositSPL(mint, amount);
await privacyCash.withdrawSPL(mint, amount, address);
```

### ShadowPay SDK

**Installation**:
```bash
npm i @shadowpay/core @shadowpay/client @shadowpay/server
```

**Key Methods**:
```typescript
// Client
const sp = new ShadowPay();
await sp.pay({ to, amount, token, wallet });

// Server
const sp = new ShadowPay({ apiKey });
await sp.verifyPayment(header, { amount, token });
await sp.payout({ to, amount, token });
```

---

## Implementation Steps

### Step 1: Install All Dependencies

```bash
# ShadowPay SDK
npm i @shadowpay/core @shadowpay/client @shadowpay/server

# Privacy Cash SDK
npm i privacy-cash-sdk

# Light Protocol (for ZK compression)
npm i @lightprotocol/hasher.rs
```

### Step 2: Configure package.json

**Modify**: `package.json`

```json
{
  "scripts": {
    "dev": "next dev -p 3001",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "postinstall": "cp node_modules/@lightprotocol/hasher.rs/dist/hasher_wasm_simd_bg.wasm node_modules/@lightprotocol/hasher.rs/dist/browser-fat/es/ && cp node_modules/@lightprotocol/hasher.rs/dist/light_wasm_hasher_bg.wasm node_modules/@lightprotocol/hasher.rs/dist/browser-fat/es/"
  }
}
```

### Step 3: Create Privacy Cash Hook

**New file**: `hooks/usePrivacyCash.js`

```javascript
import { useCallback, useState, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';

// Privacy Cash SDK import (adjust based on actual SDK)
// import { PrivacyCash } from 'privacy-cash-sdk';

export function usePrivacyCash() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [shieldedBalance, setShieldedBalance] = useState(0);
  const [commitment, setCommitment] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize Privacy Cash client
  // const privacyCash = useMemo(() => {
  //   if (!wallet.publicKey) return null;
  //   return new PrivacyCash({ connection, wallet });
  // }, [connection, wallet.publicKey]);

  // Load saved commitment from localStorage
  useEffect(() => {
    const savedCommitment = localStorage.getItem('privacyCash_commitment');
    if (savedCommitment) {
      setCommitment(savedCommitment);
    }
  }, []);

  // Shield SOL - deposit into privacy pool
  const shieldSOL = useCallback(async (amount) => {
    if (!wallet.publicKey) throw new Error('Wallet not connected');

    setIsLoading(true);
    try {
      // TODO: Replace with actual Privacy Cash SDK call
      // const result = await privacyCash.deposit(amount);

      // Mock implementation for development
      const result = {
        commitment: `commitment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        txSignature: 'mock_tx_signature'
      };

      // Save commitment for later withdrawals
      localStorage.setItem('privacyCash_commitment', result.commitment);
      setCommitment(result.commitment);

      // Update shielded balance
      setShieldedBalance(prev => prev + amount);

      console.log('SOL shielded:', amount, 'Commitment:', result.commitment);
      return result;

    } catch (error) {
      console.error('Error shielding SOL:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [wallet.publicKey]);

  // Withdraw SOL to any address (breaks chain analysis)
  const withdrawSOL = useCallback(async (amount, recipientAddress) => {
    if (!commitment) throw new Error('No commitment found. Shield SOL first.');

    setIsLoading(true);
    try {
      // TODO: Replace with actual Privacy Cash SDK call
      // const result = await privacyCash.withdraw({
      //   amount,
      //   recipient: recipientAddress,
      //   commitment
      // });

      // Mock implementation
      const result = {
        txSignature: 'mock_withdraw_tx_signature',
        nullifier: `nullifier_${Date.now()}`
      };

      // Update shielded balance
      setShieldedBalance(prev => Math.max(0, prev - amount));

      console.log('SOL withdrawn to:', recipientAddress, 'Amount:', amount);
      return result;

    } catch (error) {
      console.error('Error withdrawing SOL:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [commitment]);

  // Get current shielded balance
  const refreshBalance = useCallback(async () => {
    if (!commitment) return 0;

    setIsLoading(true);
    try {
      // TODO: Replace with actual SDK call
      // const balance = await privacyCash.getPrivateBalance();

      // Mock - return current state
      return shieldedBalance;

    } catch (error) {
      console.error('Error getting balance:', error);
      return 0;
    } finally {
      setIsLoading(false);
    }
  }, [commitment, shieldedBalance]);

  return {
    shieldSOL,
    withdrawSOL,
    shieldedBalance,
    refreshBalance,
    commitment,
    isLoading,
    hasCommitment: !!commitment
  };
}
```

### Step 4: Create ShadowPay Hook

**New file**: `hooks/useShadowPay.js`

```javascript
import { ShadowPay } from '@shadowpay/client';
import { useCallback } from 'react';

export function useShadowPay() {
  const shadowpay = new ShadowPay();

  const placeBet = useCallback(async (amount, wallet) => {
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
    const response = await fetch('/api/payout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, recipient: recipientPubkey, gameId })
    });

    if (!response.ok) throw new Error('Payout failed');
    return response.json();
  }, []);

  return { placeBet, claimWinnings };
}
```

### Step 5: Create Combined Privacy Gaming Hook

**New file**: `hooks/usePrivateGaming.js`

```javascript
import { useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useShadowPay } from './useShadowPay';
import { usePrivacyCash } from './usePrivacyCash';

export function usePrivateGaming() {
  const wallet = useWallet();
  const shadowpay = useShadowPay();
  const privacyCash = usePrivacyCash();

  // Step 1: Deposit funds into privacy pool
  const depositToPrivacyPool = useCallback(async (amount) => {
    console.log('Shielding', amount, 'SOL into privacy pool...');
    const result = await privacyCash.shieldSOL(amount);
    return result;
  }, [privacyCash]);

  // Step 2: Place bet from shielded balance (via ShadowPay)
  const placeBetFromPool = useCallback(async (amount) => {
    // Check shielded balance first
    if (privacyCash.shieldedBalance < amount) {
      throw new Error(`Insufficient shielded balance. Have ${privacyCash.shieldedBalance}, need ${amount}`);
    }

    console.log('Placing private bet of', amount, 'SOL...');

    // Place bet via ShadowPay (amount hidden)
    const payment = await shadowpay.placeBet(amount, wallet);

    // Deduct from shielded balance tracking
    // Note: Actual deduction happens in smart contract

    return payment;
  }, [shadowpay, privacyCash.shieldedBalance, wallet]);

  // Step 3: Receive winnings back to privacy pool
  const receiveWinningsToPool = useCallback(async (amount, gameId) => {
    console.log('Receiving', amount, 'SOL winnings to privacy pool...');

    // Get payout via ShadowPay
    const payout = await shadowpay.claimWinnings(
      amount,
      wallet.publicKey.toString(),
      gameId
    );

    // Auto-reshield winnings
    await privacyCash.shieldSOL(amount);

    return payout;
  }, [shadowpay, privacyCash, wallet.publicKey]);

  // Step 4: Withdraw to any address (breaks chain analysis)
  const withdrawFromPool = useCallback(async (amount, anyAddress) => {
    console.log('Withdrawing', amount, 'SOL to', anyAddress);
    const result = await privacyCash.withdrawSOL(amount, anyAddress);
    return result;
  }, [privacyCash]);

  return {
    // Privacy Cash operations
    depositToPrivacyPool,
    withdrawFromPool,
    shieldedBalance: privacyCash.shieldedBalance,
    refreshBalance: privacyCash.refreshBalance,
    hasCommitment: privacyCash.hasCommitment,

    // ShadowPay operations
    placeBetFromPool,
    receiveWinningsToPool,

    // Loading state
    isLoading: privacyCash.isLoading
  };
}
```

### Step 6: Create Privacy Dashboard Component

**New file**: `components/PrivacyDashboard.jsx`

```jsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import { usePrivateGaming } from '../hooks/usePrivateGaming';
import { Shield, ArrowDownToLine, ArrowUpFromLine, Eye, EyeOff } from 'lucide-react';

export function PrivacyDashboard() {
  const {
    depositToPrivacyPool,
    withdrawFromPool,
    shieldedBalance,
    hasCommitment,
    isLoading
  } = usePrivateGaming();

  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [showBalance, setShowBalance] = useState(false);
  const [activeTab, setActiveTab] = useState('deposit');

  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) return;

    try {
      await depositToPrivacyPool(parseFloat(depositAmount));
      setDepositAmount('');
      alert('SOL shielded successfully!');
    } catch (error) {
      alert('Failed to shield SOL: ' + error.message);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || !withdrawAddress) return;

    try {
      await withdrawFromPool(parseFloat(withdrawAmount), withdrawAddress);
      setWithdrawAmount('');
      setWithdrawAddress('');
      alert('SOL withdrawn privately!');
    } catch (error) {
      alert('Failed to withdraw: ' + error.message);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-purple-900/40 to-indigo-900/40 rounded-2xl p-6 border border-purple-500/20"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-purple-400" />
          <h3 className="text-xl font-bold text-white">Privacy Vault</h3>
        </div>
        <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
          Powered by Privacy Cash
        </span>
      </div>

      {/* Shielded Balance */}
      <div className="bg-black/30 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between">
          <span className="text-gray-400 text-sm">Shielded Balance</span>
          <button
            onClick={() => setShowBalance(!showBalance)}
            className="text-gray-400 hover:text-white"
          >
            {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
        </div>
        <div className="text-3xl font-bold text-white mt-2">
          {showBalance ? `${shieldedBalance.toFixed(4)} SOL` : '••••••'}
        </div>
        <p className="text-xs text-gray-500 mt-1">
          These funds are private and untraceable
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('deposit')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'deposit'
              ? 'bg-purple-600 text-white'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
        >
          <ArrowDownToLine className="w-4 h-4 inline mr-2" />
          Shield
        </button>
        <button
          onClick={() => setActiveTab('withdraw')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'withdraw'
              ? 'bg-purple-600 text-white'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
        >
          <ArrowUpFromLine className="w-4 h-4 inline mr-2" />
          Withdraw
        </button>
      </div>

      {/* Deposit Tab */}
      {activeTab === 'deposit' && (
        <div className="space-y-4">
          <div>
            <label className="text-gray-400 text-sm mb-1 block">Amount to Shield</label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="0.0"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="flex-1 bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:outline-none"
              />
              <span className="bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-gray-400">
                SOL
              </span>
            </div>
          </div>

          <button
            onClick={handleDeposit}
            disabled={isLoading || !depositAmount}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white py-3 rounded-xl font-medium transition-all"
          >
            {isLoading ? 'Shielding...' : 'Shield SOL'}
          </button>

          <p className="text-xs text-gray-500 text-center">
            Shielded funds cannot be traced back to your wallet
          </p>
        </div>
      )}

      {/* Withdraw Tab */}
      {activeTab === 'withdraw' && (
        <div className="space-y-4">
          <div>
            <label className="text-gray-400 text-sm mb-1 block">Amount to Withdraw</label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="0.0"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="flex-1 bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:outline-none"
              />
              <span className="bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-gray-400">
                SOL
              </span>
            </div>
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-1 block">Destination Address</label>
            <input
              type="text"
              placeholder="Any Solana address..."
              value={withdrawAddress}
              onChange={(e) => setWithdrawAddress(e.target.value)}
              className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:outline-none text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Can be ANY wallet - no link to your original deposit
            </p>
          </div>

          <button
            onClick={handleWithdraw}
            disabled={isLoading || !withdrawAmount || !withdrawAddress || !hasCommitment}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 text-white py-3 rounded-xl font-medium transition-all"
          >
            {isLoading ? 'Withdrawing...' : 'Withdraw Privately'}
          </button>
        </div>
      )}
    </motion.div>
  );
}

export default PrivacyDashboard;
```

### Step 7: Integrate into Game Page

**Modify**: `pages/game.js`

Add imports and integrate the privacy flow:

```javascript
// Add imports
import { PrivacyDashboard } from '../components/PrivacyDashboard';
import { usePrivateGaming } from '../hooks/usePrivateGaming';

// Inside GamePage component
const {
  depositToPrivacyPool,
  placeBetFromPool,
  receiveWinningsToPool,
  withdrawFromPool,
  shieldedBalance,
  hasCommitment,
  isLoading: privacyLoading
} = usePrivateGaming();

const [betAmount, setBetAmount] = useState(0.1);

// Modified game start - bet from shielded balance
const handleStartGamePrivate = async () => {
  try {
    setIsLoading(true);

    // Check shielded balance
    if (shieldedBalance < betAmount) {
      setError(`Insufficient shielded balance. Shield more SOL first.`);
      return;
    }

    // Place private bet from pool
    const payment = await placeBetFromPool(betAmount);

    // Create game
    await createGame(gameIdRef.current);

    // Deal initial hand
    await dealInitialHand(gameIdRef.current, publicKey.toString());

    // Fetch game state
    const data = await fetchGame(gameIdRef.current, publicKey.toString());
    if (data) {
      setGameData(data);
      setGameState(data.state);
    }

  } catch (error) {
    console.error('Error:', error);
    setError(error.message);
  } finally {
    setIsLoading(false);
  }
};

// Claim winnings to privacy pool
const handleClaimWinningsPrivate = async () => {
  if (gameState !== 'PlayerWon') return;

  try {
    setIsLoading(true);

    const winnings = betAmount * 2;

    // Receive winnings and auto-reshield
    await receiveWinningsToPool(winnings, gameIdRef.current);

    alert('Winnings claimed and shielded!');

  } catch (error) {
    console.error('Error:', error);
    setError(error.message);
  } finally {
    setIsLoading(false);
  }
};

// Add Privacy Dashboard to UI
return (
  <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black">
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Privacy Dashboard - Left Sidebar */}
        <div className="lg:col-span-1">
          <PrivacyDashboard />

          {/* Bet Selection */}
          <div className="mt-4 bg-black/30 rounded-xl p-4">
            <label className="text-gray-400 text-sm">Bet Amount</label>
            <select
              value={betAmount}
              onChange={(e) => setBetAmount(parseFloat(e.target.value))}
              className="w-full mt-2 bg-gray-800 text-white rounded-lg px-4 py-2"
            >
              <option value={0.01}>0.01 SOL</option>
              <option value={0.05}>0.05 SOL</option>
              <option value={0.1}>0.1 SOL</option>
              <option value={0.5}>0.5 SOL</option>
            </select>
            <p className="text-xs text-gray-500 mt-2">
              Bet from your shielded balance - completely private!
            </p>
          </div>
        </div>

        {/* Game Area - Main Content */}
        <div className="lg:col-span-2">
          {/* ... existing game UI ... */}

          {/* Start Game Button */}
          {!gameData && hasCommitment && (
            <button
              onClick={handleStartGamePrivate}
              disabled={isLoading || shieldedBalance < betAmount}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-6 py-3 rounded-xl"
            >
              {shieldedBalance < betAmount
                ? 'Shield more SOL first'
                : `Start Game (Bet ${betAmount} SOL from Vault)`}
            </button>
          )}

          {/* Claim Winnings Button */}
          {gameState === 'PlayerWon' && (
            <button
              onClick={handleClaimWinningsPrivate}
              className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-xl"
            >
              Claim {betAmount * 2} SOL to Vault
            </button>
          )}
        </div>
      </div>
    </div>
  </div>
);
```

### Step 8: Create Payout API

**New file**: `pages/api/payout.js`

```javascript
import { ShadowPay } from '@shadowpay/server';

const shadowpay = new ShadowPay({
  apiKey: process.env.SHADOWPAY_API_KEY
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { amount, recipient, gameId } = req.body;

    // Verify game outcome on-chain
    const isWinner = await verifyWinner(gameId, recipient);
    if (!isWinner) {
      return res.status(403).json({ error: 'Not a winner' });
    }

    // Process private payout
    const payout = await shadowpay.payout({
      to: recipient,
      amount,
      token: 'SOL'
    });

    return res.json({
      success: true,
      txId: payout.signature
    });

  } catch (error) {
    console.error('Payout error:', error);
    return res.status(500).json({ error: 'Payout failed' });
  }
}

async function verifyWinner(gameId, playerPubkey) {
  // TODO: Verify on-chain game state
  return true;
}
```

### Step 9: Environment Variables

**File**: `.env.local`

```env
# ShadowPay
SHADOWPAY_API_KEY=your_shadowpay_api_key
NEXT_PUBLIC_GAME_TREASURY=your_treasury_pubkey

# Privacy Cash (if needed)
PRIVACY_CASH_RELAYER=https://api.privacy.cash

# Existing
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_RPC_ENDPOINT=https://api.devnet.solana.com
```

---

## Complete User Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                    FULL PRIVACY PLAYER JOURNEY                    │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  PHASE 1: SHIELD FUNDS                                            │
│  ─────────────────────                                            │
│  1. Connect wallet (Phantom/Solflare)                            │
│  2. Open "Privacy Vault" panel                                   │
│  3. Enter amount to shield (e.g., 1 SOL)                         │
│  4. Click "Shield SOL"                                           │
│  5. Confirm transaction                                          │
│  6. SOL is now in privacy pool (UNTRACEABLE)                     │
│                                                                   │
│  PHASE 2: PLAY GAME                                               │
│  ─────────────────────                                            │
│  7. Select bet amount from shielded balance                      │
│  8. Click "Start Game"                                           │
│  9. ShadowPay processes private bet                              │
│     └── Bet amount: HIDDEN (Bulletproofs)                        │
│     └── Source: HIDDEN (from privacy pool)                       │
│  10. Play Blackjack normally                                     │
│      └── Cards: HIDDEN until reveal (ZK proofs)                  │
│  11. Dealer plays automatically                                  │
│                                                                   │
│  PHASE 3: CLAIM WINNINGS                                          │
│  ─────────────────────                                            │
│  12. If WIN: Click "Claim to Vault"                              │
│      └── Winnings sent via ShadowPay (HIDDEN amount)             │
│      └── Auto-reshielded into privacy pool                       │
│  13. If LOSE: Bet is forfeited (already in treasury)             │
│                                                                   │
│  PHASE 4: WITHDRAW (ANYTIME)                                      │
│  ─────────────────────                                            │
│  14. Open "Privacy Vault" → "Withdraw" tab                       │
│  15. Enter any destination address                               │
│  16. Click "Withdraw Privately"                                  │
│  17. Funds arrive at new address                                 │
│      └── NO LINK to original deposit                             │
│      └── Chain analysis cannot trace                             │
│                                                                   │
│  ═══════════════════════════════════════════════════════════════ │
│                       PRIVACY GUARANTEES                          │
│  ═══════════════════════════════════════════════════════════════ │
│                                                                   │
│  ✓ Original wallet balance: Never exposed                        │
│  ✓ Bet amounts: Hidden via Bulletproofs                          │
│  ✓ Payout amounts: Hidden via Bulletproofs                       │
│  ✓ Fund flow: Broken via Privacy Cash pools                      │
│  ✓ Card values: Hidden until ZK reveal                           │
│  ✓ Game fairness: Provable via ZK shuffle proofs                 │
│                                                                   │
│  The ONLY visible information:                                    │
│  - That a game was played                                        │
│  - Who won (game state)                                          │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Files Summary

| File | Action | Description |
|------|--------|-------------|
| `package.json` | Modify | Add all packages + postinstall script |
| `hooks/usePrivacyCash.js` | Create | Privacy Cash SDK hook |
| `hooks/useShadowPay.js` | Create | ShadowPay SDK hook |
| `hooks/usePrivateGaming.js` | Create | Combined privacy service |
| `components/PrivacyDashboard.jsx` | Create | Privacy vault UI component |
| `pages/api/payout.js` | Create | Private payout API endpoint |
| `pages/game.js` | Modify | Full privacy integration |
| `programs/.../lib.rs` | Modify | Add bet/payout tracking |
| `.env.local` | Modify | Add all API keys |

---

## Bounty Submission Checklist

### Radr Labs (ShadowPay) - $15,000

- [ ] Uses `@shadowpay/client` for private bets
- [ ] Uses `@shadowpay/server` for private payouts
- [ ] Bet amounts hidden via Bulletproofs
- [ ] Payout amounts hidden via Bulletproofs
- [ ] Working demo with full flow
- [ ] Documentation of integration

### Privacy Cash - $15,000

- [ ] Uses Privacy Cash SDK for shielding
- [ ] Privacy pool deposit functionality
- [ ] Anonymous withdrawal to any address
- [ ] Breaks link between deposit/withdraw
- [ ] Gaming use case (whale protection)
- [ ] Working demo with shield/withdraw flow

### Additional Bounties

- [ ] Noir/Aztec ($10k) - ZK shuffle proofs
- [ ] Open Track ($18k) - Full privacy casino
- [ ] Inco Gaming ($2k) - Confidential gaming category

**Potential Total**: $45,000+

---

## Resources

### ShadowPay
- [SDK GitHub](https://github.com/Radrdotfun/shadowpay-sdk)
- [API Docs](https://registry.scalar.com/@radr/apis/shadowpay-api)
- [Radr Labs](https://www.radrlabs.io/)

### Privacy Cash
- [GitHub](https://github.com/Privacy-Cash/privacy-cash)
- [SDK](https://github.com/Privacy-Cash/privacy-cash-sdk)
- [Docs](https://theprivacycash.org/)

### Hackathon
- [Solana Privacy Hack](https://solana.com/privacyhack)
- [Bounty Details](https://solana.com/privacyhack#bounties)
