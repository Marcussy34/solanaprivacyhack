/**
 * useGameRoom - Room state management for ZK Card Arena
 *
 * Handles:
 * - Room data persistence (localStorage)
 * - Dealer session encryption/restoration
 * - Player bet polling
 * - Cross-browser state synchronization
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

// Simple XOR-based encryption (for hackathon - production would use AES)
function simpleEncrypt(data, key) {
  const encoded = new TextEncoder().encode(JSON.stringify(data));
  const keyBytes = new Uint8Array(key);
  const encrypted = new Uint8Array(encoded.length);
  for (let i = 0; i < encoded.length; i++) {
    encrypted[i] = encoded[i] ^ keyBytes[i % keyBytes.length];
  }
  return btoa(String.fromCharCode(...encrypted));
}

function simpleDecrypt(encryptedStr, key) {
  const encrypted = new Uint8Array(
    atob(encryptedStr).split('').map(c => c.charCodeAt(0))
  );
  const keyBytes = new Uint8Array(key);
  const decrypted = new Uint8Array(encrypted.length);
  for (let i = 0; i < encrypted.length; i++) {
    decrypted[i] = encrypted[i] ^ keyBytes[i % keyBytes.length];
  }
  return JSON.parse(new TextDecoder().decode(decrypted));
}

export function useGameRoom(roomCode) {
  const { publicKey, signMessage } = useWallet();

  // Room state
  const [roomData, setRoomData] = useState(null);
  const [isDealer, setIsDealer] = useState(false);
  const [playerBet, setPlayerBet] = useState(null);
  const [dealerSession, setDealerSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Polling refs
  const pollIntervalRef = useRef(null);

  // Load room data from localStorage on mount
  useEffect(() => {
    if (!roomCode) {
      setIsLoading(false);
      return;
    }

    try {
      const stored = localStorage.getItem(`room_${roomCode}`);
      if (stored) {
        const data = JSON.parse(stored);
        setRoomData(data);

        // Check if current user is dealer
        if (publicKey && data.dealerPubkey === publicKey.toBase58()) {
          setIsDealer(true);
        }
      }
    } catch (err) {
      console.error('[useGameRoom] Failed to load room data:', err);
      setError('Failed to load room data');
    }

    setIsLoading(false);
  }, [roomCode, publicKey]);

  // Save room data to localStorage
  const saveRoomData = useCallback((data) => {
    if (!roomCode) return;

    const updated = { ...roomData, ...data };
    localStorage.setItem(`room_${roomCode}`, JSON.stringify(updated));
    setRoomData(updated);
  }, [roomCode, roomData]);

  // Save dealer session (encrypted with wallet signature)
  const saveDealerSession = useCallback(async (sessionData) => {
    if (!roomCode || !signMessage || !publicKey) {
      throw new Error('Cannot save dealer session: wallet not connected');
    }

    try {
      // Sign a message to derive encryption key
      const message = new TextEncoder().encode(`ZK Card Arena Session: ${roomCode}`);
      const signature = await signMessage(message);

      // Encrypt session data with first 32 bytes of signature
      const encryptionKey = signature.slice(0, 32);
      const encrypted = simpleEncrypt(sessionData, encryptionKey);

      // Store encrypted session
      localStorage.setItem(`dealer_session_${roomCode}`, encrypted);
      setDealerSession(sessionData);

      console.log('[useGameRoom] Dealer session saved (encrypted)');
      return true;
    } catch (err) {
      console.error('[useGameRoom] Failed to save dealer session:', err);
      throw err;
    }
  }, [roomCode, signMessage, publicKey]);

  // Restore dealer session (requires wallet signature)
  const restoreDealerSession = useCallback(async () => {
    if (!roomCode || !signMessage || !publicKey) {
      return null;
    }

    const encrypted = localStorage.getItem(`dealer_session_${roomCode}`);
    if (!encrypted) {
      console.log('[useGameRoom] No dealer session to restore');
      return null;
    }

    try {
      // Sign same message to get same encryption key
      const message = new TextEncoder().encode(`ZK Card Arena Session: ${roomCode}`);
      const signature = await signMessage(message);

      // Decrypt session data
      const encryptionKey = signature.slice(0, 32);
      const sessionData = simpleDecrypt(encrypted, encryptionKey);

      setDealerSession(sessionData);
      console.log('[useGameRoom] Dealer session restored successfully');
      return sessionData;
    } catch (err) {
      console.error('[useGameRoom] Failed to restore dealer session:', err);
      // Clear corrupted session
      localStorage.removeItem(`dealer_session_${roomCode}`);
      return null;
    }
  }, [roomCode, signMessage, publicKey]);

  // Check if dealer session exists (without decrypting)
  const hasDealerSession = useCallback(() => {
    if (!roomCode) return false;
    return !!localStorage.getItem(`dealer_session_${roomCode}`);
  }, [roomCode]);

  // Save player bet to localStorage (for dealer to poll)
  const savePlayerBet = useCallback((betData) => {
    if (!roomCode) return;

    const data = {
      ...betData,
      playerPubkey: publicKey?.toBase58(),
      timestamp: Date.now()
    };

    localStorage.setItem(`bet_${roomCode}`, JSON.stringify(data));
    setPlayerBet(data);
    console.log('[useGameRoom] Player bet saved:', data);
  }, [roomCode, publicKey]);

  // Clear player bet (after game starts)
  const clearPlayerBet = useCallback(() => {
    if (!roomCode) return;
    localStorage.removeItem(`bet_${roomCode}`);
    setPlayerBet(null);
  }, [roomCode]);

  // Poll for player bet (dealer side)
  const startBetPolling = useCallback((onBetDetected) => {
    if (!roomCode || !isDealer) return;

    // Clear existing interval
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    console.log('[useGameRoom] Starting bet polling...');

    pollIntervalRef.current = setInterval(() => {
      const betData = localStorage.getItem(`bet_${roomCode}`);
      if (betData) {
        const parsed = JSON.parse(betData);

        // Only trigger if bet is new (not already processed)
        if (!playerBet || parsed.timestamp > playerBet.timestamp) {
          setPlayerBet(parsed);
          console.log('[useGameRoom] Player bet detected:', parsed);

          if (onBetDetected) {
            onBetDetected(parsed);
          }
        }
      }
    }, 2000); // Poll every 2 seconds

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [roomCode, isDealer, playerBet]);

  // Stop polling
  const stopBetPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Clear all room data (for cleanup)
  const clearRoomData = useCallback(() => {
    if (!roomCode) return;

    localStorage.removeItem(`room_${roomCode}`);
    localStorage.removeItem(`dealer_session_${roomCode}`);
    localStorage.removeItem(`bet_${roomCode}`);

    setRoomData(null);
    setDealerSession(null);
    setPlayerBet(null);
  }, [roomCode]);

  return {
    // State
    roomCode,
    roomData,
    isDealer,
    setIsDealer,
    playerBet,
    dealerSession,
    isLoading,
    error,

    // Room management
    saveRoomData,
    clearRoomData,

    // Dealer session
    saveDealerSession,
    restoreDealerSession,
    hasDealerSession,

    // Player bet
    savePlayerBet,
    clearPlayerBet,
    startBetPolling,
    stopBetPolling
  };
}

export default useGameRoom;
