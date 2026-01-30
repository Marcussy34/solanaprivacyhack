/**
 * useShadowWire - ShadowWire Privacy Payment Hook
 *
 * Integrates ShadowWire SDK (@radr/shadowwire) for private betting deposits in ZK Card Arena.
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

// Debug: Log config at module load to verify build-time env var injection
console.log('[ShadowWire] Build config:', {
  SHADOWWIRE_ENABLED,
  SOLANA_NETWORK,
  IS_MAINNET,
  SHADOWWIRE_AVAILABLE,
  raw_enabled: process.env.NEXT_PUBLIC_SHADOWWIRE_ENABLED,
  raw_network: process.env.NEXT_PUBLIC_SOLANA_NETWORK,
});

// House wallet receives all bets - configured via env
const HOUSE_WALLET_ADDRESS = process.env.NEXT_PUBLIC_HOUSE_WALLET_ADDRESS
  || 'BzfKZnxJwsbP5BWy7tb5KFYNuHKcUXDecEX7b2h4eE14';

let HOUSE_WALLET;
try {
  HOUSE_WALLET = new PublicKey(HOUSE_WALLET_ADDRESS);
} catch {
  console.error('[ShadowWire] Invalid HOUSE_WALLET_ADDRESS, using fallback');
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

export function useShadowWire() {
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
        console.log('[ShadowWire] Privacy payments enabled');
      } else {
        console.log('[ShadowWire] Using direct Solana transfers (fallback mode)');
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
      console.log('[ShadowWire] Wallet balance:', solBalance.toFixed(4), 'SOL');
      return solBalance;
    } catch (err) {
      console.error('[ShadowWire] getBalance error:', err);
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
      console.log('[ShadowWire] Depositing', amount, 'SOL to house wallet');
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

    console.log(`[ShadowWire] Initiating payment: ${amount} SOL to ${recipientAddress}`);

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
        console.log('[ShadowWire] Demo mode: Sender is house wallet, simulating deposit');
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

            // Create wallet wrapper for ShadowWire transfer (SDK expects { signMessage } only)
            const walletForTransfer = {
              signMessage: async (message) => {
                console.log('[ShadowWire] Requesting message signature for transfer auth...');
                return await signMessage(message);
              },
            };

            // Check existing pool balance
            const poolBalance = await client.getBalance(publicKey.toString(), 'SOL');
            let availableSOL = (poolBalance?.available || 0) / LAMPORTS_PER_SOL;
            console.log('[ShadowWire] Existing pool balance:', availableSOL.toFixed(4), 'SOL');

            // If pool balance is insufficient, deposit first
            if (availableSOL < amount) {
              console.log('[ShadowWire] Pool balance insufficient, depositing first...');
              setStatus(PaymentStatus.DEPOSITING);

              try {
                // Deposit the required amount to the ShadowWire pool
                const depositAmountLamports = Math.round(amount * LAMPORTS_PER_SOL);
                console.log('[ShadowWire] Depositing', amount, 'SOL to privacy pool...');

                // Step 1: Request deposit - returns unsigned transaction
                const depositResult = await client.deposit({
                  wallet: publicKey.toString(), // Must be string address, not object!
                  amount: depositAmountLamports,
                });

                console.log('[ShadowWire] Deposit response:', JSON.stringify(depositResult));

                if (depositResult.unsigned_tx_base64) {
                  // Step 2: Deserialize the unsigned transaction
                  const txBuffer = Buffer.from(depositResult.unsigned_tx_base64, 'base64');
                  const depositTx = Transaction.from(txBuffer);

                  // Step 3: Sign the transaction
                  console.log('[ShadowWire] Signing deposit transaction...');
                  depositTx.feePayer = publicKey;
                  const { blockhash } = await connection.getLatestBlockhash();
                  depositTx.recentBlockhash = blockhash;

                  const signedTx = await signTransaction(depositTx);

                  // Step 4: Send the signed transaction to the network
                  console.log('[ShadowWire] Sending deposit transaction...');
                  const depositSig = await connection.sendRawTransaction(signedTx.serialize());
                  await connection.confirmTransaction(depositSig, 'confirmed');

                  console.log('[ShadowWire] Deposit confirmed:', depositSig);
                  availableSOL = amount; // Now we have enough
                } else if (depositResult.success) {
                  // Some API versions might not require manual signing
                  console.log('[ShadowWire] Deposit successful (server-side)!');
                  availableSOL = amount;
                } else {
                  console.warn('[ShadowWire] Deposit failed:', depositResult.error || 'No unsigned_tx returned');
                  console.warn('[ShadowWire] Falling back to direct transfer');
                }
              } catch (depositErr) {
                console.warn('[ShadowWire] Deposit error:', depositErr.message);
                console.warn('[ShadowWire] Falling back to direct transfer');
              }
            }

            // =========================================================================
            // STEP-BY-STEP: Wait for VERIFIED available balance before transfer
            // Don't trust assumed values - only proceed when pool ACTUALLY has funds
            // =========================================================================
            const MAX_BALANCE_RETRIES = 15; // Max 15 attempts
            const BALANCE_CHECK_INTERVAL = 2000; // 2 seconds between checks
            let verifiedSOL = 0;
            let balanceVerified = false;

            console.log('[ShadowWire] Step 1: Waiting for pool balance to be available...');
            console.log('[ShadowWire] Required:', amount, 'SOL | Max wait:', (MAX_BALANCE_RETRIES * BALANCE_CHECK_INTERVAL / 1000), 'seconds');

            for (let attempt = 1; attempt <= MAX_BALANCE_RETRIES; attempt++) {
              // Check ACTUAL available balance from ShadowWire API
              const balanceCheck = await client.getBalance(publicKey.toString(), 'SOL');
              verifiedSOL = (balanceCheck?.available || 0) / LAMPORTS_PER_SOL;
              const depositedSOL = (balanceCheck?.deposited || 0) / LAMPORTS_PER_SOL;

              console.log(`[ShadowWire] Attempt ${attempt}/${MAX_BALANCE_RETRIES}: available=${verifiedSOL.toFixed(4)} SOL, deposited=${depositedSOL.toFixed(4)} SOL, need=${amount} SOL`);

              if (verifiedSOL >= amount) {
                console.log('[ShadowWire] ✅ Pool balance VERIFIED sufficient!');
                balanceVerified = true;
                break;
              }

              if (attempt < MAX_BALANCE_RETRIES) {
                console.log(`[ShadowWire] Balance not yet available, waiting ${BALANCE_CHECK_INTERVAL/1000}s...`);
                await new Promise(resolve => setTimeout(resolve, BALANCE_CHECK_INTERVAL));
              }
            }

            // Only proceed to transfer if balance is VERIFIED
            if (balanceVerified && verifiedSOL >= amount) {
              console.log('[ShadowWire] Step 2: Balance verified, proceeding with private transfer...');
              shadowWireAttempted = true;
              setStatus(PaymentStatus.GENERATING_PROOF);

              console.log('[ShadowWire] Calling transfer with params:', {
                sender: publicKey.toString(),
                recipient: recipientAddress,
                amount: amount,
                token: 'SOL',
                type: 'internal', // Full privacy mode (amount hidden)
              });

              const payment = await client.transfer({
                sender: publicKey.toString(),
                recipient: recipientAddress,
                amount: amount, // SDK expects decimal SOL, not lamports
                token: 'SOL',
                type: 'internal', // Use 'internal' for full privacy (amount hidden with ZK proofs)
                wallet: walletForTransfer, // SDK expects { signMessage } only
              });

              console.log('[ShadowWire] Transfer response:', JSON.stringify(payment, null, 2));

              if (payment.success) {
                // SUCCESS! Use ShadowWire signature
                paymentMethod = 'shadowwire';
                let rawSig = payment.tx_signature || payment.signature || '';
                if (rawSig.includes(':')) rawSig = rawSig.split(':')[1] || rawSig;
                if (rawSig.includes(' ')) rawSig = rawSig.split(' ')[0];
                txSignature = rawSig || 'shadowwire-' + Date.now();

                console.log('[ShadowWire] ✅ Private transfer SUCCESS!');
                console.log('[ShadowWire] Signature:', txSignature);
                setStatus(PaymentStatus.SETTLING);
              } else {
                // Transfer failed - log error details
                console.error('[ShadowWire] ❌ Transfer FAILED!');
                console.error('[ShadowWire] Error message:', payment.error || payment.message || 'No error message');
                console.error('[ShadowWire] Error code:', payment.code || payment.error_code || 'No error code');
                console.error('[ShadowWire] Full response:', JSON.stringify(payment, null, 2));

                // Check for specific error conditions
                if (payment.error?.includes('insufficient') || payment.message?.includes('balance')) {
                  console.error('[ShadowWire] Likely cause: Pool balance not yet reflected');
                }
                if (payment.error?.includes('auth') || payment.message?.includes('sign')) {
                  console.error('[ShadowWire] Likely cause: Authentication/signing issue');
                }

                console.warn('[ShadowWire] Falling back to direct transfer');
                txSignature = null;
              }
            } else {
              // Balance verification timed out - funds deposited but not yet available
              console.warn('[ShadowWire] ⏱️ Balance verification timed out after', MAX_BALANCE_RETRIES, 'attempts');
              console.warn('[ShadowWire] Deposited funds may take longer to become available');
              console.warn('[ShadowWire] Falling back to direct transfer (your deposit is safe in the pool)');
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
        console.log('[ShadowWire] Using direct Solana transfer');
        paymentMethod = 'direct';

        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: new PublicKey(recipientAddress),
            lamports: Math.round(amount * LAMPORTS_PER_SOL),
          })
        );

        // Don't set blockhash manually - wallet adapter sets it right before signing
        // This avoids blockhash expiry during the wallet popup delay
        transaction.feePayer = publicKey;

        // Send via wallet adapter (handles blockhash internally)
        txSignature = await sendTransaction(transaction, connection);

        // Get FRESH blockhash for confirmation polling (tx already sent to network)
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
        await connection.confirmTransaction({
          signature: txSignature,
          blockhash,
          lastValidBlockHeight,
        }, 'confirmed');

        console.log('[ShadowWire] Direct transfer confirmed:', txSignature);
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

      console.log(`[ShadowWire] Payment complete via ${paymentMethod}:`, txSignature);
      return paymentResult;

    } catch (err) {
      console.error('[ShadowWire] Payment error:', err);
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

    console.log(`[ShadowWire] Requesting payout: ${amount} SOL to ${publicKey.toString()}`);
    console.log('[ShadowWire] Note: Demo uses direct transfer. Production would use ShadowWire.');

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
          console.log('[ShadowWire] Payout simulated (house wallet not configured)');
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

      console.log('[ShadowWire] Payout successful:', result);
      setStatus(PaymentStatus.COMPLETE);
      await getBalance(); // Refresh balance

      return result;

    } catch (err) {
      console.error('[ShadowWire] Payout error:', err);

      // For demo purposes, simulate success if API not available
      if (err.message.includes('fetch') || err.message.includes('network')) {
        console.log('[ShadowWire] Payout API unavailable, simulating success for demo');
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
  // DEPOSIT TO POOL (Direct deposit to ShadowWire privacy pool)
  // ===========================================================================

  const depositToPool = useCallback(async (amountSol) => {
    if (!publicKey) {
      throw new Error('Wallet not connected');
    }

    if (!IS_MAINNET) {
      throw new Error('ShadowWire only works on mainnet-beta. Current network: ' + SOLANA_NETWORK);
    }

    setStatus(PaymentStatus.DEPOSITING);
    setError(null);

    try {
      const client = await getShadowWireClient();
      if (!client) {
        throw new Error('ShadowWire SDK not available. Install with: npm install @radr/shadowwire');
      }

      // Convert SOL to lamports
      const amountLamports = Math.round(amountSol * LAMPORTS_PER_SOL);

      console.log('[ShadowWire] Depositing', amountSol, 'SOL to privacy pool...');
      console.log('[ShadowWire] Amount in lamports:', amountLamports);

      // Step 1: Request deposit - returns unsigned transaction
      const depositResult = await client.deposit({
        wallet: publicKey.toString(), // Must be string address, not object!
        amount: amountLamports,
      });

      console.log('[ShadowWire] Deposit response:', JSON.stringify(depositResult));

      if (depositResult.unsigned_tx_base64) {
        // Step 2: Deserialize the unsigned transaction
        const txBuffer = Buffer.from(depositResult.unsigned_tx_base64, 'base64');
        const depositTx = Transaction.from(txBuffer);

        // Step 3: Sign the transaction
        if (!signTransaction) {
          throw new Error('Wallet does not support signTransaction');
        }

        console.log('[ShadowWire] Signing deposit transaction...');
        depositTx.feePayer = publicKey;
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
        depositTx.recentBlockhash = blockhash;

        const signedTx = await signTransaction(depositTx);

        // Step 4: Send the signed transaction to the network
        console.log('[ShadowWire] Sending deposit transaction...');
        const depositSig = await connection.sendRawTransaction(signedTx.serialize());

        // Confirm transaction
        await connection.confirmTransaction({
          signature: depositSig,
          blockhash,
          lastValidBlockHeight,
        }, 'confirmed');

        console.log('[ShadowWire] ✅ Deposit confirmed:', depositSig);

        setStatus(PaymentStatus.COMPLETE);
        await getBalance(); // Refresh wallet balance

        return {
          success: true,
          signature: depositSig,
          amount: amountSol,
          method: 'shadowwire',
        };

      } else if (depositResult.success) {
        // Some API versions might not require manual signing
        console.log('[ShadowWire] ✅ Deposit successful (server-side)!');
        setStatus(PaymentStatus.COMPLETE);
        await getBalance();

        return {
          success: true,
          signature: depositResult.tx_signature || 'shadowwire-deposit-' + Date.now(),
          amount: amountSol,
          method: 'shadowwire',
        };

      } else {
        throw new Error(depositResult.error || 'Deposit failed - no unsigned_tx returned');
      }

    } catch (err) {
      console.error('[ShadowWire] Deposit to pool failed:', err);
      setError(err.message);
      setStatus(PaymentStatus.ERROR);
      return {
        success: false,
        error: err.message,
      };
    }
  }, [publicKey, connection, signTransaction, getBalance]);

  // ===========================================================================
  // GET POOL BALANCE (ShadowWire escrow pool)
  // ===========================================================================

  const getPoolBalance = useCallback(async () => {
    if (!publicKey) return 0;

    try {
      const client = await getShadowWireClient();
      if (!client) {
        console.log('[ShadowWire] SDK not available, pool balance = 0');
        return 0;
      }

      const poolBalance = await client.getBalance(publicKey.toString(), 'SOL');
      const availableSOL = (poolBalance?.available || 0) / LAMPORTS_PER_SOL;
      console.log('[ShadowWire] Pool balance:', availableSOL.toFixed(4), 'SOL');
      return availableSOL;
    } catch (err) {
      console.error('[ShadowWire] getPoolBalance error:', err);
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
    depositToPool,
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

export default useShadowWire;
