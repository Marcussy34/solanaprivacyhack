/**
 * useShadowPay - Devnet-compatible betting hook
 *
 * On devnet, ShadowPay (mainnet-only) is replaced with direct SOL transfers.
 * The interface remains identical so BetSelector works unchanged.
 *
 * Flow (devnet):
 * 1. Check wallet SOL balance (simulates escrow)
 * 2. Direct SystemProgram.transfer to house wallet
 * 3. Return tx signature as payment proof
 *
 * Future (mainnet): Replace with ShadowPay ZK payment flow.
 */

import { useState, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import {
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';

// House wallet receives bet payments on devnet
const HOUSE_WALLET = process.env.NEXT_PUBLIC_HOUSE_WALLET
  || '11111111111111111111111111111112'; // System program fallback (set a real wallet in .env.local)

// Payment status enum (kept identical for UI compatibility)
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

/**
 * useShadowPay - Devnet betting hook using direct SOL transfers
 */
export function useShadowPay() {
  const { publicKey, sendTransaction, connected } = useWallet();
  const { connection } = useConnection();

  // State
  const [escrowBalance, setEscrowBalance] = useState(null);
  const [status, setStatus] = useState(PaymentStatus.IDLE);
  const [error, setError] = useState(null);
  const [lastPayment, setLastPayment] = useState(null);

  /**
   * Get the player's wallet SOL balance (simulates escrow on devnet)
   * @returns {number} Balance in SOL
   */
  const getBalance = useCallback(async () => {
    if (!publicKey) {
      throw new Error('Wallet not connected');
    }

    setStatus(PaymentStatus.CHECKING_BALANCE);
    setError(null);

    try {
      const lamports = await connection.getBalance(publicKey);
      const balanceSOL = lamports / LAMPORTS_PER_SOL;

      setEscrowBalance(balanceSOL);
      setStatus(PaymentStatus.IDLE);
      console.log('[ShadowPay:devnet] Wallet balance:', balanceSOL, 'SOL');
      return balanceSOL;
    } catch (err) {
      console.error('[ShadowPay:devnet] Balance check error:', err);
      setError(err.message);
      setStatus(PaymentStatus.ERROR);
      throw err;
    }
  }, [publicKey, connection]);

  /**
   * Deposit to escrow - no-op on devnet (wallet IS the escrow)
   * @param {number} amount - Amount in SOL (unused on devnet)
   * @returns {string} Fake signature
   */
  const deposit = useCallback(async (amount) => {
    if (!publicKey) {
      throw new Error('Wallet not connected');
    }

    console.log('[ShadowPay:devnet] Deposit skipped (wallet is escrow on devnet). Amount:', amount, 'SOL');

    // Refresh balance to keep UI in sync
    await getBalance();
    return 'devnet-no-op';
  }, [publicKey, getBalance]);

  /**
   * Make a bet payment via direct SOL transfer
   *
   * @param {string} recipientAddress - Recipient wallet (house wallet)
   * @param {number} amount - Amount in SOL
   * @param {string} _resourceUrl - Unused on devnet
   * @returns {{ txSignature: string, paymentId: string }}
   */
  const pay = useCallback(async (recipientAddress, amount, _resourceUrl) => {
    if (!publicKey) {
      throw new Error('Wallet not connected');
    }

    setError(null);

    try {
      // Step 1: Check balance
      setStatus(PaymentStatus.CHECKING_BALANCE);
      const balance = await getBalance();

      if (balance < amount + 0.005) { // 0.005 SOL buffer for tx fee
        throw new Error(
          `Insufficient balance: ${balance.toFixed(4)} SOL (need ${(amount + 0.005).toFixed(4)} SOL including fees)`
        );
      }

      // Step 2: Build and send transfer transaction
      setStatus(PaymentStatus.GENERATING_PROOF); // Reusing status for UI progress
      console.log('[ShadowPay:devnet] Sending', amount, 'SOL to', recipientAddress);

      const recipient = new PublicKey(recipientAddress);
      const lamports = Math.round(amount * LAMPORTS_PER_SOL);

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: recipient,
          lamports,
        })
      );

      // sendTransaction handles signing via wallet adapter
      const signature = await sendTransaction(transaction, connection);

      // Step 3: Confirm
      setStatus(PaymentStatus.SETTLING);
      console.log('[ShadowPay:devnet] Confirming tx:', signature);

      await connection.confirmTransaction(signature, 'confirmed');

      console.log('[ShadowPay:devnet] Payment confirmed:', signature);

      const payment = {
        txSignature: signature,
        paymentId: signature, // On devnet, tx sig IS the payment ID
        amount,
        recipient: recipientAddress,
        timestamp: Date.now(),
      };
      setLastPayment(payment);

      // Refresh balance
      await getBalance();
      setStatus(PaymentStatus.COMPLETE);

      return payment;
    } catch (err) {
      console.error('[ShadowPay:devnet] Payment error:', err);
      setError(err.message);
      setStatus(PaymentStatus.ERROR);
      throw err;
    }
  }, [publicKey, sendTransaction, connection, getBalance]);

  /**
   * Request payout - simulated on devnet (no house keypair available in browser)
   * On mainnet, this would trigger a ShadowPay relayer settlement.
   */
  const requestPayout = useCallback(async (amount) => {
    console.log('[ShadowPay:devnet] Payout simulated:', amount, 'SOL (would use escrow on mainnet)');
    return { txSignature: 'devnet-simulated-payout', amount };
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    setStatus(PaymentStatus.IDLE);
  }, []);

  const getHouseWallet = useCallback(() => HOUSE_WALLET, []);

  return {
    connected,
    isClientReady: true,
    escrowBalance,
    status,
    error,
    lastPayment,
    isLoading: ![PaymentStatus.IDLE, PaymentStatus.COMPLETE, PaymentStatus.ERROR].includes(status),
    isComplete: status === PaymentStatus.COMPLETE,
    isError: status === PaymentStatus.ERROR,
    getBalance,
    deposit,
    pay,
    requestPayout,
    clearError,
    getHouseWallet,
    HOUSE_WALLET,
  };
}
