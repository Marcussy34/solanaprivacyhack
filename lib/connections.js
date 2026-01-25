/**
 * Dual-Network Connection Manager
 *
 * Provides separate connections for:
 * - MAINNET: ShadowWire deposits/payouts (privacy layer)
 * - DEVNET: Anchor game program (ZK Card Arena)
 *
 * @author Marcus (ZK Engineer)
 * @created Jan 25, 2026
 */

import { Connection, clusterApiUrl } from '@solana/web3.js';

// =============================================================================
// NETWORK CONFIGURATION
// =============================================================================

// Mainnet RPC (Helius) - for deposits/payouts
const MAINNET_RPC = process.env.NEXT_PUBLIC_RPC_ENDPOINT
  || 'https://api.mainnet-beta.solana.com';

// Devnet RPC - for game program
const DEVNET_RPC = process.env.NEXT_PUBLIC_DEVNET_RPC_ENDPOINT
  || clusterApiUrl('devnet');

// =============================================================================
// CONNECTION INSTANCES (Lazy initialized)
// =============================================================================

let mainnetConnection = null;
let devnetConnection = null;

/**
 * Get mainnet connection for ShadowWire/deposits
 * Uses Helius RPC for reliability
 */
export function getMainnetConnection() {
  if (!mainnetConnection) {
    mainnetConnection = new Connection(MAINNET_RPC, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 60000,
    });
    console.log('[Connections] Mainnet connection initialized:', MAINNET_RPC.substring(0, 50) + '...');
  }
  return mainnetConnection;
}

/**
 * Get devnet connection for game program
 * Uses public devnet RPC
 */
export function getDevnetConnection() {
  if (!devnetConnection) {
    devnetConnection = new Connection(DEVNET_RPC, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 60000,
    });
    console.log('[Connections] Devnet connection initialized:', DEVNET_RPC);
  }
  return devnetConnection;
}

// =============================================================================
// NETWORK INFO
// =============================================================================

export const NetworkInfo = {
  MAINNET: {
    name: 'mainnet-beta',
    rpc: MAINNET_RPC,
    purpose: 'ShadowWire deposits & payouts',
  },
  DEVNET: {
    name: 'devnet',
    rpc: DEVNET_RPC,
    purpose: 'ZK Card Arena game program',
  },
};

/**
 * Check if both networks are accessible
 */
export async function checkNetworkHealth() {
  const results = {
    mainnet: { healthy: false, slot: null, error: null },
    devnet: { healthy: false, slot: null, error: null },
  };

  try {
    const mainnet = getMainnetConnection();
    const slot = await mainnet.getSlot();
    results.mainnet = { healthy: true, slot, error: null };
  } catch (err) {
    results.mainnet.error = err.message;
  }

  try {
    const devnet = getDevnetConnection();
    const slot = await devnet.getSlot();
    results.devnet = { healthy: true, slot, error: null };
  } catch (err) {
    results.devnet.error = err.message;
  }

  return results;
}

export default {
  getMainnetConnection,
  getDevnetConnection,
  NetworkInfo,
  checkNetworkHealth,
};
