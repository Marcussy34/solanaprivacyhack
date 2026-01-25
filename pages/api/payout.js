/**
 * Payout API - Backend endpoint for house wallet payouts
 *
 * This API handles automatic payouts from the house wallet to winners.
 * The house wallet secret key is stored on the server, enabling auto-signing.
 *
 * Demo mode: Direct Solana transfer (saves costs)
 * Production: Would use ShadowWire for private payouts
 *
 * @author Marcus (ZK Engineer)
 * @created Jan 25, 2026
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import * as bip39 from 'bip39';
import { derivePath } from 'ed25519-hd-key';

// Platform fee (2% for demo)
const PLATFORM_FEE_RATE = parseFloat(process.env.PLATFORM_FEE_PERCENT || '0.02');

/**
 * Load house wallet keypair from environment
 * Supports two formats:
 * 1. Mnemonic: comma-separated words (e.g., "word1,word2,...,word12")
 * 2. JSON array: 64 bytes (e.g., [1,2,3,...,64])
 */
function getHouseKeypair() {
  const secretKeyEnv = process.env.HOUSE_WALLET_SECRET_KEY;

  if (!secretKeyEnv || secretKeyEnv === '[PASTE_YOUR_64_BYTE_ARRAY_HERE]') {
    return null; // Not configured - will simulate payouts
  }

  try {
    // Try mnemonic format first (comma-separated words)
    if (secretKeyEnv.includes(',') && !secretKeyEnv.startsWith('[')) {
      const words = secretKeyEnv.split(',').map(w => w.trim());

      if (words.length === 12 || words.length === 24) {
        const mnemonic = words.join(' ');

        if (!bip39.validateMnemonic(mnemonic)) {
          console.error('[Payout API] Invalid mnemonic phrase');
          return null;
        }

        // Derive keypair using Solana's derivation path
        const seed = bip39.mnemonicToSeedSync(mnemonic);
        const derivedSeed = derivePath("m/44'/501'/0'/0'", seed.toString('hex')).key;
        return Keypair.fromSeed(derivedSeed);
      }
    }

    // Try JSON array format (64-byte secret key)
    const keyArray = JSON.parse(secretKeyEnv);
    if (!Array.isArray(keyArray) || keyArray.length !== 64) {
      console.error('[Payout API] Invalid secret key format: must be 64-byte array or 12/24-word mnemonic');
      return null;
    }
    return Keypair.fromSecretKey(Uint8Array.from(keyArray));

  } catch (err) {
    console.error('[Payout API] Failed to parse HOUSE_WALLET_SECRET_KEY:', err.message);
    return null;
  }
}

/**
 * Validate recipient address
 */
function isValidPublicKey(address) {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { recipient, amount } = req.body;

  // ==========================================================================
  // VALIDATION
  // ==========================================================================

  if (!recipient) {
    return res.status(400).json({ error: 'Missing recipient address' });
  }

  if (!isValidPublicKey(recipient)) {
    return res.status(400).json({ error: 'Invalid recipient address' });
  }

  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount: must be positive number' });
  }

  if (amount > 100) {
    return res.status(400).json({ error: 'Amount too large: max 100 SOL per payout (demo limit)' });
  }

  console.log(`[Payout API] Processing payout request: ${amount} SOL to ${recipient}`);

  // ==========================================================================
  // HOUSE WALLET CHECK
  // ==========================================================================

  const houseKeypair = getHouseKeypair();

  if (!houseKeypair) {
    // Not configured - return simulated payout for demo
    console.log('[Payout API] House wallet not configured, returning simulated payout');
    return res.status(200).json({
      success: true,
      txSignature: 'simulated-payout-' + Date.now(),
      amount: amount * (1 - PLATFORM_FEE_RATE),
      fee: amount * PLATFORM_FEE_RATE,
      method: 'simulated',
      simulated: true,
      message: 'Payout simulated. Configure HOUSE_WALLET_SECRET_KEY in .env.local for real payouts.',
    });
  }

  // ==========================================================================
  // CONNECT TO SOLANA
  // ==========================================================================

  const rpcUrl = process.env.NEXT_PUBLIC_RPC_ENDPOINT || 'https://api.devnet.solana.com';
  const connection = new Connection(rpcUrl, 'confirmed');

  try {
    // ==========================================================================
    // CHECK HOUSE WALLET BALANCE
    // ==========================================================================

    const houseBalance = await connection.getBalance(houseKeypair.publicKey);
    const houseSolBalance = houseBalance / LAMPORTS_PER_SOL;

    console.log(`[Payout API] House wallet balance: ${houseSolBalance.toFixed(4)} SOL`);
    console.log(`[Payout API] House wallet address: ${houseKeypair.publicKey.toString()}`);

    // Verify configured address matches actual keypair
    const configuredAddress = process.env.NEXT_PUBLIC_HOUSE_WALLET_ADDRESS;
    if (configuredAddress && configuredAddress !== houseKeypair.publicKey.toString()) {
      console.error('[Payout API] WARNING: HOUSE_WALLET_SECRET_KEY does not match NEXT_PUBLIC_HOUSE_WALLET_ADDRESS!');
      console.error(`  Configured: ${configuredAddress}`);
      console.error(`  From key:   ${houseKeypair.publicKey.toString()}`);
    }

    // Calculate required amount (payout + tx fee buffer)
    const requiredLamports = Math.round(amount * LAMPORTS_PER_SOL) + 10000; // 10k lamports buffer

    if (houseBalance < requiredLamports) {
      console.error('[Payout API] Insufficient house balance');
      return res.status(400).json({
        error: 'Insufficient house balance',
        houseBalance: houseSolBalance,
        required: amount + 0.00001,
        houseWallet: houseKeypair.publicKey.toString(),
        hint: `Run: solana airdrop 5 ${houseKeypair.publicKey.toString()} --url devnet`,
      });
    }

    // ==========================================================================
    // CALCULATE PAYOUT (minus platform fee)
    // ==========================================================================

    const platformFee = amount * PLATFORM_FEE_RATE;
    const payoutAmount = amount - platformFee;
    const payoutLamports = Math.round(payoutAmount * LAMPORTS_PER_SOL);

    console.log(`[Payout API] Amount: ${amount} SOL, Fee: ${platformFee.toFixed(4)} SOL (${PLATFORM_FEE_RATE * 100}%), Payout: ${payoutAmount.toFixed(4)} SOL`);

    // ==========================================================================
    // CREATE AND SEND TRANSACTION
    // ==========================================================================

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: houseKeypair.publicKey,
        toPubkey: new PublicKey(recipient),
        lamports: payoutLamports,
      })
    );

    console.log('[Payout API] Sending transaction...');

    const txSignature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [houseKeypair],
      { commitment: 'confirmed' }
    );

    console.log(`[Payout API] Payout successful: ${txSignature}`);

    // ==========================================================================
    // RETURN SUCCESS
    // ==========================================================================

    return res.status(200).json({
      success: true,
      txSignature,
      amount: payoutAmount,
      originalAmount: amount,
      fee: platformFee,
      feeRate: PLATFORM_FEE_RATE,
      recipient,
      houseWallet: houseKeypair.publicKey.toString(),
      method: 'direct',
      note: 'Demo mode uses direct transfer. Production would use ShadowWire for private payout.',
    });

  } catch (err) {
    console.error('[Payout API] Transaction error:', err);

    // Check for specific errors
    if (err.message.includes('insufficient')) {
      return res.status(400).json({
        error: 'Insufficient house wallet balance',
        details: err.message,
      });
    }

    if (err.message.includes('blockhash')) {
      return res.status(500).json({
        error: 'Transaction expired, please retry',
        details: err.message,
      });
    }

    return res.status(500).json({
      error: 'Payout failed',
      details: err.message,
    });
  }
}
