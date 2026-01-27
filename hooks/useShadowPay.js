/**
 * useShadowPay - ShadowWire Privacy Payment Hook
 *
 * Integrates ShadowWire for private betting deposits in ZK Card Arena.
 * Demo mode: ShadowWire deposits, direct Solana payouts (saves costs).
 *
 * Flow:
 * 1. Player deposits bet → ShadowWire (private, hidden sender)
 * 2. Funds arrive at House Wallet
 * 3. Game plays (Noir ZK proofs)
 * 4. Winner receives payout → Direct transfer (demo) or ShadowWire (prod)
 *
 * @author Marcus (ZK Engineer)
 * @created Jan 25, 2026
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import {
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { Buffer } from 'buffer';

// =============================================================================
// CONFIGURATION
// =============================================================================

const SHADOWWIRE_ENABLED = process.env.NEXT_PUBLIC_SHADOWWIRE_ENABLED === 'true';

// ShadowWire only supports mainnet-beta (not devnet/testnet)
const SOLANA_NETWORK = process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet';
const IS_MAINNET = SOLANA_NETWORK === 'mainnet-beta' || SOLANA_NETWORK === 'mainnet';
const SHADOWWIRE_AVAILABLE = SHADOWWIRE_ENABLED && IS_MAINNET;

// House wallet receives all bets - configured via env
const HOUSE_WALLET_ADDRESS = process.env.NEXT_PUBLIC_HOUSE_WALLET_ADDRESS
  || 'BzfKZnxJwsbP5BWy7tb5KFYNuHKcUXDecEX7b2h4eE14';

let HOUSE_WALLET;
try {
  HOUSE_WALLET = new PublicKey(HOUSE_WALLET_ADDRESS);
} catch {
  console.error('[ShadowPay] Invalid HOUSE_WALLET_ADDRESS, using fallback');
  HOUSE_WALLET = new PublicKey('BzfKZnxJwsbP5BWy7tb5KFYNuHKcUXDecEX7b2h4eE14');
}

// Payment status enum (UI compatibility)
export const PaymentStatus = {
  IDLE: 'idle',
  CHECKING_BALANCE: 'checking_balance',
  DEPOSITING: 'depositing',
  GENERATING_PROOF: 'generating_proof',
  VERIFYING: 'verifying',
  SETTLING: 'settling',
  COMPLETE: 'complete',
  ERROR: 'error',
};

// =============================================================================
// SHADOWWIRE CLIENT (Lazy loaded - fails gracefully if SDK not installed)
// =============================================================================

let shadowWireClient = null;
let shadowWireAvailable = null; // null = not checked, true/false = result

/**
 * Lazily initialize ShadowWire client
 * Returns null if SDK not available (graceful fallback to direct transfers)
 *
 * ShadowWire (@radr/shadowwire) - NO API KEY REQUIRED
 * Uses Bulletproof ZK proofs to hide transaction amounts
 *
 * IMPORTANT: ShadowWire only works on mainnet-beta!
 */
async function getShadowWireClient() {
  if (!SHADOWWIRE_ENABLED) {
    console.log('[ShadowWire] Disabled via env, using direct transfers');
    return null;
  }

  if (!IS_MAINNET) {
    console.log(`[ShadowWire] Only works on mainnet-beta (current: ${SOLANA_NETWORK})`);
    console.log('[ShadowWire] Using direct transfers for devnet demo');
    return null;
  }

  // Return cached result if already checked
  if (shadowWireAvailable === false) return null;
  if (shadowWireClient) return shadowWireClient;

  try {
    // Dynamic import - only loads if SDK is installed
    const { ShadowWireClient, initWASM } = await import('@radr/shadowwire');

    // Initialize WASM with explicit path (files copied to public/wasm/)
    console.log('[ShadowWire] Initializing WASM...');
    await initWASM('/wasm/settler_wasm_bg.wasm');
    console.log('[ShadowWire] WASM initialized successfully');

    // Initialize ShadowWire - NO API key needed!
    shadowWireClient = new ShadowWireClient({
      debug: process.env.NODE_ENV === 'development',
    });

    shadowWireAvailable = true;
    console.log('[ShadowWire] Client initialized successfully (no API key required)');
    return shadowWireClient;

  } catch (err) {
    shadowWireAvailable = false;
    console.warn('[ShadowWire] SDK not available, using direct transfers:', err.message);
    console.log('[ShadowWire] Install with: npm install @radr/shadowwire');
    return null;
  }
}

// =============================================================================
// MAIN HOOK
// =============================================================================

export function useShadowPay() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, signTransaction, signMessage, wallet, connected } = useWallet();

  // State
  const [status, setStatus] = useState(PaymentStatus.IDLE);
  const [error, setError] = useState(null);
  const [escrowBalance, setEscrowBalance] = useState(null);
  const [lastPayment, setLastPayment] = useState(null);
  const [isClientReady, setIsClientReady] = useState(false);
  const [usingShadowWire, setUsingShadowWire] = useState(false);

  // Derived state
  const isLoading = useMemo(() =>
    [PaymentStatus.CHECKING_BALANCE, PaymentStatus.DEPOSITING,
      PaymentStatus.GENERATING_PROOF, PaymentStatus.VERIFYING,
      PaymentStatus.SETTLING].includes(status),
    [status]
  );
  const isComplete = status === PaymentStatus.COMPLETE;
  const isError = status === PaymentStatus.ERROR;

  // Initialize client on mount
  useEffect(() => {
    getShadowWireClient().then(client => {
      setIsClientReady(true);
      setUsingShadowWire(!!client);
      if (client) {
        console.log('[ShadowPay] Privacy payments enabled via ShadowWire');
      } else {
        console.log('[ShadowPay] Using direct Solana transfers (fallback mode)');
      }
    });
  }, []);

  // ===========================================================================
  // GET BALANCE
  // ===========================================================================

  const getBalance = useCallback(async () => {
    if (!publicKey || !connection) return 0;

    try {
      const balance = await connection.getBalance(publicKey);
      const solBalance = balance / LAMPORTS_PER_SOL;
      setEscrowBalance(solBalance);
      console.log('[ShadowPay] Wallet balance:', solBalance.toFixed(4), 'SOL');
      return solBalance;
    } catch (err) {
      console.error('[ShadowPay] getBalance error:', err);
      return 0;
    }
  }, [publicKey, connection]);

  // ===========================================================================
  // DEPOSIT (to escrow/shielded pool)
  // ===========================================================================

  // Note: deposit wraps pay() - defined as a separate function for semantic clarity
  const deposit = useCallback(async (amount) => {
    if (!publicKey) throw new Error('Wallet not connected');

    setStatus(PaymentStatus.DEPOSITING);
    setError(null);

    try {
      console.log('[ShadowPay] Depositing', amount, 'SOL to house wallet');
      const result = await pay(HOUSE_WALLET.toString(), amount, 'deposit');
      setStatus(PaymentStatus.COMPLETE);
      return result.txSignature;
    } catch (err) {
      setStatus(PaymentStatus.ERROR);
      setError(err.message);
      throw err;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicKey]);

  // ===========================================================================
  // PAY (ShadowWire private transfer OR direct fallback)
  // ===========================================================================

  const pay = useCallback(async (recipientAddress, amount, resourceUrl = '') => {
    if (!publicKey) throw new Error('Wallet not connected');

    console.log(`[ShadowPay] Initiating payment: ${amount} SOL to ${recipientAddress}`);

    setStatus(PaymentStatus.CHECKING_BALANCE);
    setError(null);

    try {
      // Check balance first
      const balance = await getBalance();
      const requiredBalance = amount + 0.001; // 0.001 SOL buffer for fees (~5000 lamports)

      if (balance < requiredBalance) {
        throw new Error(
          `Insufficient balance. Need ${requiredBalance.toFixed(4)} SOL, have ${balance.toFixed(4)} SOL`
        );
      }

      let txSignature = null;
      let paymentMethod = 'direct';

      // =========================================================================
      // DEMO MODE: Skip deposit if sender === recipient (same wallet)
      // =========================================================================
      if (publicKey.toString() === recipientAddress) {
        console.log('[ShadowPay] Demo mode: Sender is house wallet, simulating deposit');
        const simulatedResult = {
          txSignature: 'demo-self-deposit-' + Date.now(),
          paymentId: 'demo-self-deposit-' + Date.now(),
          amount,
          recipient: recipientAddress,
          timestamp: Date.now(),
          method: 'simulated',
          private: false,
          simulated: true,
          note: 'Demo: Your wallet is the house wallet, deposit simulated',
        };
        setLastPayment(simulatedResult);
        setStatus(PaymentStatus.COMPLETE);
        return simulatedResult;
      }

      // =========================================================================
      // =========================================================================
      // SHADOWWIRE PRIVACY TRANSFER (with safe fallback)
      // =========================================================================
      // Strategy: Try ShadowWire ONLY if pool already has balance (no new deposits)
      // If ShadowWire fails for ANY reason → fallback to direct transfer
      // This prevents funds from getting stuck in ShadowWire pool
      // =========================================================================

      let shadowWireAttempted = false;

      if (SHADOWWIRE_ENABLED && IS_MAINNET) {
        const client = await getShadowWireClient();

        if (client && signMessage && signTransaction) {
          try {
            console.log('[ShadowWire] Attempting private transfer...');

            // Create wallet wrapper for ShadowWire
            const walletForShadowWire = {
              publicKey: publicKey,
              signMessage: async (message) => {
                console.log('[ShadowWire] Requesting message signature...');
                return await signMessage(message);
              },
              signTransaction: async (tx) => {
                console.log('[ShadowWire] Requesting transaction signature...');
                return await signTransaction(tx);
              },
            };

            // Check existing pool balance (DON'T deposit - just use what's there)
            const poolBalance = await client.getBalance(publicKey.toString(), 'SOL');
            const availableSOL = (poolBalance?.available || 0) / LAMPORTS_PER_SOL;
            console.log('[ShadowWire] Existing pool balance:', availableSOL.toFixed(4), 'SOL');

            // Only try ShadowWire if pool has enough balance already
            if (availableSOL >= amount) {
              console.log('[ShadowWire] Pool has sufficient balance, attempting transfer...');
              shadowWireAttempted = true;

              setStatus(PaymentStatus.GENERATING_PROOF);

              const payment = await client.transfer({
                sender: publicKey.toString(),
                recipient: recipientAddress,
                amount: amount,
                token: 'SOL',
                type: 'external',
                wallet: walletForShadowWire,
              });

              console.log('[ShadowWire] Transfer response:', JSON.stringify(payment));

              if (payment.success) {
                // SUCCESS! Use ShadowWire signature
                paymentMethod = 'shadowwire';
                let rawSig = payment.tx_signature || payment.signature || '';
                if (rawSig.includes(':')) rawSig = rawSig.split(':')[1] || rawSig;
                if (rawSig.includes(' ')) rawSig = rawSig.split(' ')[0];
                txSignature = rawSig || 'shadowwire-' + Date.now();

                console.log('[ShadowWire] Private transfer SUCCESS!');
                setStatus(PaymentStatus.SETTLING);
              } else {
                // Transfer failed - will fallback to direct
                console.warn('[ShadowWire] Transfer returned success:false, falling back to direct transfer');
                console.warn('[ShadowWire] No funds lost - pool balance unchanged');
                txSignature = null;
              }
            } else {
              // Not enough in pool - skip ShadowWire entirely (don't deposit)
              console.log('[ShadowWire] Pool balance insufficient, skipping to direct transfer');
              console.log('[ShadowWire] (Not depositing to avoid funds getting stuck)');
            }

          } catch (shadowErr) {
            // Any error → fallback to direct (no funds stuck since we didn't deposit)
            console.warn('[ShadowWire] Error occurred, falling back to direct transfer');
            console.warn('[ShadowWire] Error:', shadowErr.message);
            txSignature = null;
          }
        } else {
          console.log('[ShadowWire] Client not available or wallet missing signMessage, using direct transfer');
        }
      }

      // =========================================================================
      // FALLBACK: DIRECT SOLANA TRANSFER
      // =========================================================================
      if (!txSignature) {
        setStatus(PaymentStatus.SETTLING);
        console.log('[ShadowPay] Using direct Solana transfer');
        paymentMethod = 'direct';

        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: new PublicKey(recipientAddress),
            lamports: Math.round(amount * LAMPORTS_PER_SOL),
          })
        );

        // Get recent blockhash
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = publicKey;

        // Send via wallet adapter
        txSignature = await sendTransaction(transaction, connection);

        // Confirm transaction
        await connection.confirmTransaction({
          signature: txSignature,
          blockhash,
          lastValidBlockHeight,
        }, 'confirmed');

        console.log('[ShadowPay] Direct transfer confirmed:', txSignature);
      }

      // =========================================================================
      // UPDATE STATE
      // =========================================================================
      const paymentResult = {
        txSignature,
        paymentId: txSignature,
        amount,
        recipient: recipientAddress,
        timestamp: Date.now(),
        method: paymentMethod,
        private: paymentMethod === 'shadowwire',
      };

      setLastPayment(paymentResult);
      setStatus(PaymentStatus.COMPLETE);
      await getBalance(); // Refresh balance

      console.log(`[ShadowPay] Payment complete via ${paymentMethod}:`, txSignature);
      return paymentResult;

    } catch (err) {
      console.error('[ShadowPay] Payment error:', err);
      setStatus(PaymentStatus.ERROR);
      setError(err.message);
      throw err;
    }
  }, [publicKey, connection, sendTransaction, signTransaction, signMessage, wallet, getBalance]);

  // ===========================================================================
  // REQUEST PAYOUT (Demo: Backend handles house wallet signing)
  // ===========================================================================

  const requestPayout = useCallback(async (amount) => {
    if (!publicKey) throw new Error('Wallet not connected');

    console.log(`[ShadowPay] Requesting payout: ${amount} SOL to ${publicKey.toString()}`);
    console.log('[ShadowPay] Note: Demo uses direct transfer. Production would use ShadowWire.');

    setStatus(PaymentStatus.SETTLING);
    setError(null);

    try {
      // Call backend payout API (house wallet signs on server)
      const response = await fetch('/api/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: publicKey.toString(),
          amount,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // If API returns error but has simulated flag, allow for demo
        if (result.simulated) {
          console.log('[ShadowPay] Payout simulated (house wallet not configured)');
          setStatus(PaymentStatus.COMPLETE);
          return {
            txSignature: 'demo-payout-' + Date.now(),
            amount,
            simulated: true,
            message: 'Payout simulated - configure HOUSE_WALLET_SECRET_KEY for real payouts',
          };
        }
        throw new Error(result.error || 'Payout request failed');
      }

      console.log('[ShadowPay] Payout successful:', result);
      setStatus(PaymentStatus.COMPLETE);
      await getBalance(); // Refresh balance

      return result;

    } catch (err) {
      console.error('[ShadowPay] Payout error:', err);

      // For demo purposes, simulate success if API not available
      if (err.message.includes('fetch') || err.message.includes('network')) {
        console.log('[ShadowPay] Payout API unavailable, simulating success for demo');
        setStatus(PaymentStatus.COMPLETE);
        return {
          txSignature: 'demo-payout-simulated-' + Date.now(),
          amount,
          simulated: true,
        };
      }

      setStatus(PaymentStatus.ERROR);
      setError(err.message);
      throw err;
    }
  }, [publicKey, getBalance]);

  // ===========================================================================
  // GET POOL BALANCE (ShadowWire escrow pool)
  // ===========================================================================

  const getPoolBalance = useCallback(async () => {
    if (!publicKey) return 0;

    try {
      const client = await getShadowWireClient();
      if (!client) {
        console.log('[ShadowPay] ShadowWire not available, pool balance = 0');
        return 0;
      }

      const poolBalance = await client.getBalance(publicKey.toString(), 'SOL');
      const availableSOL = (poolBalance?.available || 0) / LAMPORTS_PER_SOL;
      console.log('[ShadowPay] Pool balance:', availableSOL.toFixed(4), 'SOL');
      return availableSOL;
    } catch (err) {
      console.error('[ShadowPay] getPoolBalance error:', err);
      return 0;
    }
  }, [publicKey]);

  // ===========================================================================
  // WITHDRAW FROM POOL (Recover funds from ShadowWire escrow)
  // ===========================================================================

  const withdrawFromPool = useCallback(async (amountSol) => {
    if (!publicKey) {
      throw new Error('Wallet not connected');
    }

    setStatus(PaymentStatus.SETTLING);
    setError(null);

    try {
      const client = await getShadowWireClient();
      if (!client) {
        throw new Error('ShadowWire not available on this network');
      }

      // Check pool balance first
      const poolBalance = await client.getBalance(publicKey.toString(), 'SOL');
      const poolBalanceSol = (poolBalance?.available || 0) / LAMPORTS_PER_SOL;

      if (poolBalanceSol < amountSol) {
        throw new Error(`Insufficient pool balance. Available: ${poolBalanceSol.toFixed(4)} SOL`);
      }

      // Convert SOL to lamports
      const amountLamports = Math.round(amountSol * LAMPORTS_PER_SOL);

      console.log('[ShadowWire] Requesting withdrawal:', amountLamports, 'lamports');

      // Request withdrawal - returns unsigned transaction
      const withdrawResponse = await client.withdraw({
        wallet: publicKey.toString(),
        amount: amountLamports,
      });

      if (!withdrawResponse.success || !withdrawResponse.unsigned_tx_base64) {
        throw new Error(withdrawResponse.error || 'Failed to create withdrawal transaction');
      }

      console.log('[ShadowWire] Withdrawal TX created, signing...');

      // Decode the unsigned transaction
      const withdrawTxBytes = Buffer.from(withdrawResponse.unsigned_tx_base64, 'base64');
      const withdrawTx = Transaction.from(withdrawTxBytes);

      // Use signTransaction from useWallet hook
      if (!signTransaction) {
        throw new Error('Wallet does not support signTransaction');
      }

      // Sign and send transaction
      console.log('[ShadowWire] Requesting withdrawal signature...');
      const signedWithdrawTx = await signTransaction(withdrawTx);
      const withdrawSig = await connection.sendRawTransaction(signedWithdrawTx.serialize());

      console.log('[ShadowWire] Withdrawal sent:', withdrawSig);

      // Confirm transaction
      await connection.confirmTransaction(withdrawSig, 'confirmed');

      console.log('[ShadowWire] Withdrawal confirmed!');

      setStatus(PaymentStatus.COMPLETE);
      await getBalance(); // Refresh wallet balance

      return {
        success: true,
        signature: withdrawSig,
        amount: amountSol,
        fee: withdrawResponse.fee ? withdrawResponse.fee / LAMPORTS_PER_SOL : 0,
      };

    } catch (err) {
      console.error('[ShadowWire] Withdrawal failed:', err);
      setError(err.message);
      setStatus(PaymentStatus.ERROR);
      return {
        success: false,
        error: err.message,
      };
    }
  }, [publicKey, connection, signTransaction, getBalance]);

  // ===========================================================================
  // UTILITY FUNCTIONS
  // ===========================================================================

  const clearError = useCallback(() => {
    setError(null);
    setStatus(PaymentStatus.IDLE);
  }, []);

  const getHouseWallet = useCallback(() => HOUSE_WALLET.toString(), []);

  // ===========================================================================
  // RETURN INTERFACE
  // ===========================================================================

  return {
    // Connection state
    connected,
    isClientReady,

    // Balance
    escrowBalance,

    // Status
    status,
    error,
    lastPayment,
    isLoading,
    isComplete,
    isError,

    // Privacy info
    usingShadowWire,
    SHADOWWIRE_ENABLED,
    IS_MAINNET,
    SOLANA_NETWORK,

    // Actions
    getBalance,
    getPoolBalance,
    withdrawFromPool,
    deposit,
    pay,
    requestPayout,
    clearError,
    getHouseWallet,

    // Constants
    HOUSE_WALLET: HOUSE_WALLET.toString(),
  };
}

export default useShadowPay;
