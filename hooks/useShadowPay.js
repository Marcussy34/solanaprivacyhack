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
  const { publicKey, sendTransaction, wallet, connected } = useWallet();

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
      // DIRECT TRANSFER MODE (RECOMMENDED FOR HACKATHON DEMO)
      // ShadowWire pool mechanics are complex - use direct for reliable demo
      // =========================================================================
      // Note: ShadowWire integration is shown in code but disabled by default
      // because the pool deposit/transfer/withdraw flow is complex.
      // For demo: Direct transfer shows instant, verifiable on-chain proof.
      //
      // To enable ShadowWire: set USE_SHADOWWIRE_POOL = true below
      const USE_SHADOWWIRE_POOL = true;   // ENABLED - Pool-based privacy payments (mainnet)

      if (SHADOWWIRE_ENABLED && USE_SHADOWWIRE_POOL) {
        const client = await getShadowWireClient();

        if (client) {
          setStatus(PaymentStatus.GENERATING_PROOF);
          console.log('[ShadowPay] Generating ZK proof for private payment...');

          try {
            // Determine the correct wallet object for ShadowWire
            const walletForShadowWire =
              wallet?.adapter ||
              (typeof window !== 'undefined' && window.phantom?.solana) ||
              (typeof window !== 'undefined' && window.solflare) ||
              (typeof window !== 'undefined' && window.backpack);

            if (!walletForShadowWire) {
              throw new Error('No compatible wallet found for ShadowWire');
            }

            // Step 1: Check ShadowWire pool balance
            console.log('[ShadowWire] Checking pool balance...');
            const poolBalance = await client.getBalance(publicKey.toString(), 'SOL');
            console.log('[ShadowWire] Pool balance response:', JSON.stringify(poolBalance));

            // Convert lamports to SOL for comparison (SDK returns lamports, amount is in SOL)
            const availableSOL = (poolBalance?.available || 0) / LAMPORTS_PER_SOL;
            console.log('[ShadowWire] Pool available:', availableSOL, 'SOL, Amount needed:', amount, 'SOL');

            // Step 2: If pool balance is insufficient, deposit first
            const needsDeposit = availableSOL < amount;
            console.log('[ShadowWire] Needs deposit?', needsDeposit);

            if (needsDeposit) {
              console.log('[ShadowWire] Insufficient pool balance, depositing first...');
              setStatus(PaymentStatus.DEPOSITING);

              const depositLamports = Math.round((amount + 0.001) * LAMPORTS_PER_SOL);
              const depositResponse = await client.deposit({
                wallet: publicKey.toString(),
                amount: depositLamports,
              });

              if (!depositResponse.success || !depositResponse.unsigned_tx_base64) {
                throw new Error('Failed to create deposit transaction');
              }

              const depositTxBytes = Buffer.from(depositResponse.unsigned_tx_base64, 'base64');
              const depositTx = Transaction.from(depositTxBytes);

              const signedDepositTx = await walletForShadowWire.signTransaction(depositTx);
              const depositSig = await connection.sendRawTransaction(signedDepositTx.serialize());
              await connection.confirmTransaction(depositSig, 'confirmed');

              console.log('[ShadowWire] Deposit confirmed:', depositSig);
            }

            // Step 3: Private transfer
            setStatus(PaymentStatus.GENERATING_PROOF);
            console.log('[ShadowWire] Generating ZK proof for private transfer...');

            const payment = await client.transfer({
              sender: publicKey.toString(),
              recipient: recipientAddress,
              amount: amount,
              token: 'SOL',
              type: 'external',
              wallet: walletForShadowWire,
            });

            setStatus(PaymentStatus.VERIFYING);
            console.log('[ShadowWire] Transfer submitted:', payment);
            console.log('[ShadowWire] Response keys:', Object.keys(payment));

            // SDK returns tx_signature (snake_case), not signature/txSignature (camelCase)
            txSignature = payment.tx_signature || payment.signature || payment.txSignature || payment.tx || payment.hash;
            paymentMethod = 'shadowwire';

            // Strip TX1:/TX2: prefix if present (ShadowWire compound signature format)
            if (txSignature && txSignature.includes(':')) {
              console.log('[ShadowWire] Stripping prefix from signature:', txSignature.substring(0, 10) + '...');
              txSignature = txSignature.split(':')[1] || txSignature;
            }

            if (txSignature) {
              setStatus(PaymentStatus.SETTLING);
              await connection.confirmTransaction(txSignature, 'confirmed');
              console.log('[ShadowWire] Private transfer confirmed:', txSignature);
            } else if (payment.success) {
              // Transfer succeeded but no on-chain tx (internal pool transfer)
              txSignature = 'shadowwire-pool-' + Date.now();
              console.log('[ShadowWire] Pool transfer completed (internal, no on-chain tx)');
            }

          } catch (shadowErr) {
            console.warn('[ShadowWire] Transfer failed, falling back to direct transfer');
            console.warn('[ShadowWire] Error:', shadowErr.message);
            txSignature = null;
          }
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
  }, [publicKey, connection, sendTransaction, wallet, getBalance]);

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
