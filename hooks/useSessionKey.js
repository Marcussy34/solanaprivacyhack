/**
 * useSessionKey - Ephemeral session key for auto-signing game actions
 *
 * This hook manages session keys that allow players to auto-sign game transactions
 * without requiring manual wallet approval for each action (hit, stand, double).
 *
 * Flow:
 * 1. Generate Keypair in browser memory
 * 2. User signs ONE tx to create session on-chain (links keypair to their wallet)
 * 3. Subsequent game actions use the ephemeral keypair (no popups!)
 * 4. Session expires after 1 hour or when game ends
 *
 * Security:
 * - Session keypair lives in browser memory only (never persisted)
 * - Scoped to single game (PDA includes game address)
 * - Time-limited (1 hour expiry)
 * - Session key cannot transfer SOL from main wallet
 * - On-chain validation ensures session authority matches player
 *
 * @author Marcus (ZK Engineer)
 * @created Jan 28, 2026
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import {
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';

// ZK Card Arena Program ID
const PROGRAM_ID = new PublicKey("22BfrTbAzVmwENnyfzk6rFtPaNvCmaATbeWaJKKoqkK4");

// Session duration: 1 hour (in seconds)
const SESSION_DURATION_SECS = 60 * 60;

// Amount to fund session keypair for transaction fees (~5 game actions)
const SESSION_FUND_LAMPORTS = 5_000_000; // 0.005 SOL

/**
 * Hook for managing session keys for auto-signing game actions
 *
 * @param {Object} program - Anchor program instance from useGameProgram
 * @param {Connection} devnetConnection - Devnet connection for funding session keypair
 *                                        (Game runs on devnet, not mainnet!)
 * @returns {Object} Session key state and functions
 */
export function useSessionKey(program, devnetConnection) {
  const wallet = useWallet();
  // Note: We use devnetConnection for funding because game runs on devnet
  // The wallet adapter's connection may be mainnet (for ShadowWire)

  // Player session state
  const [sessionKeypair, setSessionKeypair] = useState(null);
  const [sessionPDA, setSessionPDA] = useState(null);
  const [sessionExpiry, setSessionExpiry] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState(null);

  // Dealer session state (separate from player)
  const [dealerSessionKeypair, setDealerSessionKeypair] = useState(null);
  const [dealerSessionPDA, setDealerSessionPDA] = useState(null);
  const [dealerSessionExpiry, setDealerSessionExpiry] = useState(null);
  const [isCreatingDealerSession, setIsCreatingDealerSession] = useState(false);
  const [dealerSessionError, setDealerSessionError] = useState(null);

  // Check if session is valid (exists and not expired)
  const isSessionValid = useMemo(() => {
    if (!sessionKeypair || !sessionExpiry) return false;
    return Date.now() < sessionExpiry * 1000;
  }, [sessionKeypair, sessionExpiry]);

  // Get session public key
  const sessionPublicKey = useMemo(() => {
    return sessionKeypair?.publicKey || null;
  }, [sessionKeypair]);

  // Check if DEALER session is valid
  const isDealerSessionValid = useMemo(() => {
    if (!dealerSessionKeypair || !dealerSessionExpiry) return false;
    return Date.now() < dealerSessionExpiry * 1000;
  }, [dealerSessionKeypair, dealerSessionExpiry]);

  // Get dealer session public key
  const dealerSessionPublicKey = useMemo(() => {
    return dealerSessionKeypair?.publicKey || null;
  }, [dealerSessionKeypair]);

  /**
   * Create a new session for the given game
   * This is the ONLY transaction that requires wallet signature
   *
   * @param {PublicKey} gamePda - The game PDA to create session for
   * @returns {Object} Session info { keypair, sessionPda, validUntil, tx }
   */
  const createSession = useCallback(async (gamePda) => {
    if (!wallet.publicKey || !program) {
      throw new Error('Wallet or program not ready');
    }

    if (!wallet.sendTransaction) {
      throw new Error('Wallet does not support sendTransaction');
    }

    setIsCreating(true);
    setError(null);

    try {
      console.log('[Session] Creating session for game:', gamePda.toBase58());

      // 1. Generate ephemeral keypair (lives in browser memory only)
      const keypair = Keypair.generate();
      console.log('[Session] Generated session key:', keypair.publicKey.toBase58());

      // 2. Calculate session PDA
      const [sessionPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('session'),
          gamePda.toBuffer(),
          wallet.publicKey.toBuffer(),
        ],
        PROGRAM_ID
      );
      console.log('[Session] Session PDA:', sessionPda.toBase58());

      // 3. Calculate expiry (1 hour from now)
      const validUntil = Math.floor(Date.now() / 1000) + SESSION_DURATION_SECS;
      console.log('[Session] Valid until:', new Date(validUntil * 1000).toISOString());

      // 4. Create session on-chain (THIS is the one signature needed)
      const tx = await program.methods
        .createSession(keypair.publicKey, new BN(validUntil))
        .accounts({
          session: sessionPda,
          game: gamePda,
          player: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log('[Session] Session created on-chain:', tx);

      // 5. Fund session keypair for transaction fees ON DEVNET
      // IMPORTANT: Must use devnetConnection because game runs on devnet!
      // wallet.sendTransaction would use mainnet (wrong network)
      console.log('[Session] Funding session keypair with', SESSION_FUND_LAMPORTS / LAMPORTS_PER_SOL, 'SOL on DEVNET...');

      const fundTx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: wallet.publicKey,
          toPubkey: keypair.publicKey,
          lamports: SESSION_FUND_LAMPORTS,
        })
      );

      // Get blockhash from DEVNET (not mainnet!)
      const { blockhash, lastValidBlockHeight } = await devnetConnection.getLatestBlockhash();
      fundTx.recentBlockhash = blockhash;
      fundTx.feePayer = wallet.publicKey;

      // Sign with wallet adapter, then send to DEVNET manually
      // (wallet.sendTransaction would use the wrong network)
      const signedFundTx = await wallet.signTransaction(fundTx);
      const fundSig = await devnetConnection.sendRawTransaction(signedFundTx.serialize());
      await devnetConnection.confirmTransaction({
        signature: fundSig,
        blockhash,
        lastValidBlockHeight,
      }, 'confirmed');

      console.log('[Session] Session keypair funded on DEVNET:', fundSig);

      // 6. Store session state
      setSessionKeypair(keypair);
      setSessionPDA(sessionPda);
      setSessionExpiry(validUntil);

      console.log('[Session] ✅ Session ready - game actions will auto-sign!');

      return {
        keypair,
        sessionPda,
        validUntil,
        createTx: tx,
        fundTx: fundSig,
      };

    } catch (err) {
      console.error('[Session] Failed to create session:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsCreating(false);
    }
  }, [wallet, program, devnetConnection]);

  /**
   * Create a new DEALER session for the given game
   * This is the ONLY transaction that requires dealer wallet signature
   *
   * @param {PublicKey} gamePda - The game PDA to create session for
   * @returns {Object} Session info { keypair, sessionPda, validUntil, tx }
   */
  const createDealerSession = useCallback(async (gamePda) => {
    if (!wallet.publicKey || !program) {
      throw new Error('Wallet or program not ready');
    }

    if (!wallet.signTransaction) {
      throw new Error('Wallet does not support signTransaction');
    }

    setIsCreatingDealerSession(true);
    setDealerSessionError(null);

    try {
      console.log('[DealerSession] Creating dealer session for game:', gamePda.toBase58());

      // 1. Generate ephemeral keypair (lives in browser memory only)
      const keypair = Keypair.generate();
      console.log('[DealerSession] Generated session key:', keypair.publicKey.toBase58());

      // 2. Calculate dealer session PDA
      const [sessionPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('dealer_session'),
          gamePda.toBuffer(),
          wallet.publicKey.toBuffer(),
        ],
        PROGRAM_ID
      );
      console.log('[DealerSession] Session PDA:', sessionPda.toBase58());

      // 3. Calculate expiry (1 hour from now)
      const validUntil = Math.floor(Date.now() / 1000) + SESSION_DURATION_SECS;
      console.log('[DealerSession] Valid until:', new Date(validUntil * 1000).toISOString());

      // 4. Create dealer session on-chain
      const tx = await program.methods
        .createDealerSession(keypair.publicKey, new BN(validUntil))
        .accounts({
          session: sessionPda,
          game: gamePda,
          dealer: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log('[DealerSession] Session created on-chain:', tx);

      // 5. Fund session keypair for transaction fees ON DEVNET
      console.log('[DealerSession] Funding session keypair with', SESSION_FUND_LAMPORTS / LAMPORTS_PER_SOL, 'SOL on DEVNET...');

      const fundTx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: wallet.publicKey,
          toPubkey: keypair.publicKey,
          lamports: SESSION_FUND_LAMPORTS,
        })
      );

      const { blockhash, lastValidBlockHeight } = await devnetConnection.getLatestBlockhash();
      fundTx.recentBlockhash = blockhash;
      fundTx.feePayer = wallet.publicKey;

      const signedFundTx = await wallet.signTransaction(fundTx);
      const fundSig = await devnetConnection.sendRawTransaction(signedFundTx.serialize());
      await devnetConnection.confirmTransaction({
        signature: fundSig,
        blockhash,
        lastValidBlockHeight,
      }, 'confirmed');

      console.log('[DealerSession] Session keypair funded on DEVNET:', fundSig);

      // 6. Store dealer session state
      setDealerSessionKeypair(keypair);
      setDealerSessionPDA(sessionPda);
      setDealerSessionExpiry(validUntil);

      console.log('[DealerSession] ✅ Dealer session ready - dealer actions will auto-sign!');

      return {
        keypair,
        sessionPda,
        validUntil,
        createTx: tx,
        fundTx: fundSig,
      };

    } catch (err) {
      console.error('[DealerSession] Failed to create dealer session:', err);
      setDealerSessionError(err.message);
      throw err;
    } finally {
      setIsCreatingDealerSession(false);
    }
  }, [wallet, program, devnetConnection]);

  /**
   * End the current session (clear state)
   * Call this when game ends or user leaves
   */
  const endSession = useCallback(() => {
    console.log('[Session] Ending session');
    setSessionKeypair(null);
    setSessionPDA(null);
    setSessionExpiry(null);
    setError(null);
  }, []);

  /**
   * End the current DEALER session (clear state)
   * Call this when game ends or dealer leaves
   */
  const endDealerSession = useCallback(() => {
    console.log('[DealerSession] Ending dealer session');
    setDealerSessionKeypair(null);
    setDealerSessionPDA(null);
    setDealerSessionExpiry(null);
    setDealerSessionError(null);
  }, []);

  /**
   * Sign a transaction with the session keypair
   * Use this for game actions (hit, stand, double)
   *
   * @param {Transaction} transaction - Transaction to sign
   * @returns {Transaction} Signed transaction
   */
  const signWithSession = useCallback((transaction) => {
    if (!sessionKeypair || !isSessionValid) {
      throw new Error('No valid session - create one first');
    }

    // Session keypair signs the transaction
    transaction.partialSign(sessionKeypair);
    return transaction;
  }, [sessionKeypair, isSessionValid]);

  /**
   * Get session balance (for checking if it has enough for fees)
   * Uses devnetConnection since session keypair is funded on devnet
   */
  const getSessionBalance = useCallback(async () => {
    if (!sessionKeypair || !devnetConnection) return 0;

    try {
      const balance = await devnetConnection.getBalance(sessionKeypair.publicKey);
      return balance / LAMPORTS_PER_SOL;
    } catch (err) {
      console.error('[Session] Failed to get balance:', err);
      return 0;
    }
  }, [sessionKeypair, devnetConnection]);

  // Auto-cleanup expired player sessions
  useEffect(() => {
    if (!sessionExpiry) return;

    const checkExpiry = () => {
      if (Date.now() >= sessionExpiry * 1000) {
        console.log('[Session] Session expired, cleaning up');
        endSession();
      }
    };

    // Check every minute
    const interval = setInterval(checkExpiry, 60000);

    // Also set timeout for exact expiry
    const timeout = setTimeout(checkExpiry, (sessionExpiry * 1000) - Date.now());

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [sessionExpiry, endSession]);

  // Auto-cleanup expired dealer sessions
  useEffect(() => {
    if (!dealerSessionExpiry) return;

    const checkExpiry = () => {
      if (Date.now() >= dealerSessionExpiry * 1000) {
        console.log('[DealerSession] Dealer session expired, cleaning up');
        endDealerSession();
      }
    };

    // Check every minute
    const interval = setInterval(checkExpiry, 60000);

    // Also set timeout for exact expiry
    const timeout = setTimeout(checkExpiry, (dealerSessionExpiry * 1000) - Date.now());

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [dealerSessionExpiry, endDealerSession]);

  // Return hook interface
  return {
    // Player session state
    sessionKeypair,
    sessionPublicKey,
    sessionPDA,
    sessionExpiry,
    isSessionValid,
    isCreating,
    error,

    // Player session actions
    createSession,
    endSession,
    signWithSession,
    getSessionBalance,

    // Dealer session state
    dealerSessionKeypair,
    dealerSessionPublicKey,
    dealerSessionPDA,
    dealerSessionExpiry,
    isDealerSessionValid,
    isCreatingDealerSession,
    dealerSessionError,

    // Dealer session actions
    createDealerSession,
    endDealerSession,

    // Constants
    SESSION_DURATION_SECS,
    PROGRAM_ID,
  };
}

export default useSessionKey;
