/**
 * useZKGame - Integration hook connecting ZK proofs with game state
 * 
 * This hook manages the entire ZK proof chain for the card game:
 * 1. Shuffle: Generate seed, shuffle deck, compute commitment, prove valid permutation
 * 2. Deal: Compute card commitments with blinding factors, prove cards come from deck
 * 3. Reveal: Prove revealed card values match earlier commitments
 * 
 * KEY INSIGHT: We use NoirJS circuit execution to compute Poseidon hashes.
 * The circuit's return value IS the commitment!
 * 
 * @author Marcus (ZK Engineer)
 * @created Jan 23, 2026
 */

import { useState, useCallback, useRef } from 'react';
import { useZK } from './useZK';

// ============================================================================
// CONSTANTS
// ============================================================================

const DECK_SIZE = 13;  // Cards 0-12 (simplified deck)

// Backend Groth16 proof generation URL
// Uses external proof server in production (Vercel has read-only filesystem)
// Falls back to local /api/prove for development
const PROVE_API_URL = process.env.NEXT_PUBLIC_PROVE_API_URL || '/api/prove';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Fisher-Yates shuffle algorithm with cryptographically secure randomness.
 * Uses rejection sampling to avoid modulo bias for provably fair shuffling.
 *
 * @param {number[]} array - Original deck [0,1,2,...,12]
 * @returns {number[]} Shuffled deck (new array, doesn't mutate original)
 */
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    // Rejection sampling: avoid modulo bias by discarding values >= maxVal
    // maxVal is the largest multiple of (i+1) that fits in a byte (256)
    const maxVal = 256 - (256 % (i + 1));
    let randomByte;
    do {
      randomByte = crypto.getRandomValues(new Uint8Array(1))[0];
    } while (randomByte >= maxVal);
    const j = randomByte % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Generate a cryptographically secure random field element as a decimal string.
 * Field elements are 254-bit integers in BN254 curve.
 * Uses 8 bytes (64 bits) of secure randomness - safe for seeds and blinding factors.
 *
 * @returns {string} Random 64-bit integer as decimal string
 */
function generateRandomField() {
  // Generate 8 cryptographically secure random bytes
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  // Convert to BigInt (little-endian byte order)
  let value = 0n;
  for (let i = 0; i < 8; i++) {
    value |= BigInt(bytes[i]) << BigInt(i * 8);
  }
  return value.toString();
}

/**
 * Convert a Uint8Array proof to hex string for display/storage.
 */
function proofToHex(proof) {
  return '0x' + Array.from(proof).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Convert hex string back to Uint8Array for on-chain submission.
 */
function hexToBytes(hex) {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.substr(i * 2, 2), 16);
  }
  return bytes;
}

/**
 * Convert a Field (hex string from publicInputs) to 32-byte array for Solana.
 * NoirJS returns public inputs as hex strings like "0x04b91d7c..."
 */
function fieldTo32Bytes(fieldHex) {
  // Remove 0x prefix if present
  const clean = fieldHex.startsWith('0x') ? fieldHex.slice(2) : fieldHex;
  // Pad to 64 hex chars (32 bytes)
  const padded = clean.padStart(64, '0');
  // Convert to byte array
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(padded.substr(i * 2, 2), 16);
  }
  return Array.from(bytes);
}

/**
 * Call backend API to generate a Groth16 proof via Sunspot.
 * The backend runs nargo execute + sunspot prove.
 *
 * @param {string} circuit - 'shuffle_proof' | 'deal_proof' | 'reveal_proof'
 * @param {object} inputs - Circuit inputs matching Prover.toml format
 * @returns {{ proof: Uint8Array, publicInputs: Uint8Array }}
 */
async function generateGroth16Proof(circuit, inputs) {
  const response = await fetch(PROVE_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ circuit, inputs }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(`Proof generation failed: ${err.error}`);
  }

  const data = await response.json();

  // Decode base64 proof and public inputs to Uint8Array
  return {
    proof: Uint8Array.from(atob(data.proof), c => c.charCodeAt(0)),
    publicInputs: Uint8Array.from(atob(data.publicInputs), c => c.charCodeAt(0)),
    proofBytes: data.proofBytes,
    publicInputsBytes: data.publicInputsBytes,
  };
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useZKGame() {
  // Get ZK helper functions from useZK hook (commitment computation only)
  const {
    isInitializing,
    isProving,
    error: zkError,
    logs: zkLogs,
    computeDeckCommitment,
    computeCardCommitment,
  } = useZK();

  // =========================================================================
  // GAME STATE (Private, stored client-side only)
  // =========================================================================
  
  // Deck state
  const [seed, setSeed] = useState(null);                    // Private: Random seed
  const [shuffledDeck, setShuffledDeck] = useState(null);    // Private: Shuffled card order
  const [deckCommitment, setDeckCommitment] = useState(null); // Public: Poseidon(seed, deck)
  
  // Card blinding factors (one per card position, stored for reveals)
  // Map: position -> { blinding, cardCommitment, cardValue }
  const blindingFactors = useRef(new Map());
  
  // Proofs generated (for on-chain submission)
  const [shuffleProofData, setShuffleProofData] = useState(null);
  const [dealProofs, setDealProofs] = useState([]);  // Array of deal proofs
  const [revealProofs, setRevealProofs] = useState([]); // Array of reveal proofs

  // UI state
  const [status, setStatus] = useState('idle'); // idle, shuffling, dealing, revealing, error

  // =========================================================================
  // SHUFFLE PHASE
  // =========================================================================
  
  /**
   * Initialize a new game: generate seed, shuffle deck, compute commitment, generate proof.
   * 
   * Steps:
   * 1. Generate random seed
   * 2. Shuffle deck using Fisher-Yates
   * 3. Compute deck commitment using hash helper circuit
   * 4. Generate ZK shuffle proof
   * 
   * @returns {{ seed, shuffledDeck, deckCommitment, proof, publicInputs }} - Data for on-chain submission
   */
  const initializeGame = useCallback(async () => {
    if (isInitializing) throw new Error('ZK not ready yet');
    
    setStatus('shuffling');
    
    try {
      // 1. Generate random seed
      const newSeed = generateRandomField();
      console.log('[ZKGame] Generated seed:', newSeed);
      
      // 2. Shuffle deck
      const originalDeck = Array.from({ length: DECK_SIZE }, (_, i) => i);
      const newShuffledDeck = shuffleArray(originalDeck);
      console.log('[ZKGame] Shuffled deck:', newShuffledDeck);
      
      // 3. Compute deck commitment using hash_14_helper circuit
      console.log('[ZKGame] Computing deck commitment...');
      const newDeckCommitment = await computeDeckCommitment(newSeed, newShuffledDeck);
      console.log('[ZKGame] Deck commitment:', newDeckCommitment);
      
      // Store state
      setSeed(newSeed);
      setShuffledDeck(newShuffledDeck);
      setDeckCommitment(newDeckCommitment);
      blindingFactors.current.clear();
      
      // 4. Generate Groth16 shuffle proof via backend API
      console.log('[ZKGame] Requesting Groth16 shuffle proof from backend...');
      const proofResult = await generateGroth16Proof('shuffle_proof', {
        seed: newSeed,
        shuffled_deck: newShuffledDeck,
        deck_commitment: newDeckCommitment,
        original_deck: originalDeck,
      });

      // Store proof data
      setShuffleProofData({
        proof: proofResult.proof,
        publicInputs: proofResult.publicInputs,
        commitment: newDeckCommitment,
      });

      console.log('[ZKGame] Groth16 shuffle proof generated!');
      console.log('[ZKGame] Proof size:', proofResult.proofBytes, 'bytes');

      setStatus('idle');

      return {
        seed: newSeed,
        shuffledDeck: newShuffledDeck,
        deckCommitment: newDeckCommitment,
        proof: Array.from(proofResult.proof),
        publicInputs: Array.from(proofResult.publicInputs),
      };
      
    } catch (err) {
      console.error('[ZKGame] Initialize error:', err);
      setStatus('error');
      throw err;
    }
  }, [isInitializing, computeDeckCommitment]);

  // =========================================================================
  // DEAL PHASE  
  // =========================================================================

  /**
   * Deal a card at the given position and generate a deal proof.
   * Creates a blinding factor and card commitment.
   * 
   * @param {number} position - Card position in shuffled deck (0-12)
   * @returns {{ position, cardValue, cardCommitment, blinding, proof, publicInputs }}
   */
  const dealCardAtPosition = useCallback(async (position) => {
    if (!seed || !shuffledDeck || !deckCommitment) {
      throw new Error('Must initialize game first');
    }
    if (position < 0 || position >= DECK_SIZE) {
      throw new Error(`Invalid position ${position}, must be 0-${DECK_SIZE - 1}`);
    }
    
    setStatus('dealing');
    
    try {
      // Get card value at this position
      const cardValue = shuffledDeck[position];
      
      // Generate blinding factor for this card
      const blinding = generateRandomField();
      
      console.log(`[ZKGame] Dealing card at position ${position}: value=${cardValue}`);
      
      // Compute card commitment using hash_2_helper circuit
      console.log('[ZKGame] Computing card commitment...');
      const cardCommitment = await computeCardCommitment(cardValue, blinding);
      console.log('[ZKGame] Card commitment:', cardCommitment);
      
      // Store blinding factor for later reveal
      const cardData = {
        position,
        cardValue,
        blinding,
        cardCommitment,
      };
      blindingFactors.current.set(position, cardData);
      
      // Generate Groth16 deal proof via backend API
      console.log('[ZKGame] Requesting Groth16 deal proof from backend...');
      const proofResult = await generateGroth16Proof('deal_proof', {
        seed,
        shuffled_deck: shuffledDeck,
        blinding_factor: blinding,
        deck_commitment: deckCommitment,
        card_commitment: cardCommitment,
        card_position: String(position),
      });

      // Store proof
      const proofData = {
        position,
        cardValue,
        cardCommitment,
        proof: Array.from(proofResult.proof),
        publicInputs: Array.from(proofResult.publicInputs),
      };
      setDealProofs(prev => [...prev, proofData]);

      console.log('[ZKGame] Groth16 deal proof generated!');
      console.log('[ZKGame] Proof size:', proofResult.proofBytes, 'bytes');
      
      setStatus('idle');
      
      return proofData;
      
    } catch (err) {
      console.error('[ZKGame] Deal error:', err);
      setStatus('error');
      throw err;
    }
  }, [seed, shuffledDeck, deckCommitment, computeCardCommitment]);

  /**
   * Compute card commitment at position WITHOUT generating a Groth16 proof.
   * Much faster (~1s vs 30-60s for full deal proof).
   * Used for on-chain card commitments where the contract doesn't verify deal proofs.
   *
   * @param {number} position - Card position in shuffled deck (0-12)
   * @returns {{ position, cardValue, cardCommitment, blinding }}
   */
  const computeCardCommitmentAtPosition = useCallback(async (position) => {
    if (!seed || !shuffledDeck || !deckCommitment) {
      throw new Error('Must initialize game first');
    }
    if (position < 0 || position >= DECK_SIZE) {
      throw new Error(`Invalid position ${position}, must be 0-${DECK_SIZE - 1}`);
    }

    const cardValue = shuffledDeck[position];
    const blinding = generateRandomField();

    console.log(`[ZKGame] Computing commitment for position ${position}: value=${cardValue}`);

    const cardCommitment = await computeCardCommitment(cardValue, blinding);
    console.log(`[ZKGame] Card commitment (pos ${position}):`, cardCommitment);

    // Store blinding factor for later reveal
    const cardData = { position, cardValue, blinding, cardCommitment };
    blindingFactors.current.set(position, cardData);

    return cardData;
  }, [seed, shuffledDeck, deckCommitment, computeCardCommitment]);

  // =========================================================================
  // REVEAL PHASE
  // =========================================================================

  /**
   * Reveal a card and generate reveal proof.
   * Uses the blinding factor stored during dealing.
   * 
   * @param {number} position - Card position that was dealt
   * @returns {{ cardValue, proof, publicInputs }}
   */
  const revealCard = useCallback(async (position) => {
    const cardData = blindingFactors.current.get(position);
    if (!cardData || !cardData.cardCommitment) {
      throw new Error(`Card at position ${position} not dealt or commitment not set`);
    }
    
    setStatus('revealing');
    
    try {
      console.log(`[ZKGame] Requesting Groth16 reveal proof for position ${position}...`);
      console.log(`[ZKGame] Revealing card value: ${cardData.cardValue}`);

      const result = await generateGroth16Proof('reveal_proof', {
        blinding_factor: cardData.blinding,
        card_value: String(cardData.cardValue),
        card_commitment: cardData.cardCommitment,
      });

      // Store proof
      const proofData = {
        position,
        cardValue: cardData.cardValue,
        cardCommitment: cardData.cardCommitment,
        proof: Array.from(result.proof),
        publicInputs: Array.from(result.publicInputs),
      };
      setRevealProofs(prev => [...prev, proofData]);

      console.log('[ZKGame] Groth16 reveal proof generated!');
      
      setStatus('idle');
      
      return proofData;
      
    } catch (err) {
      console.error('[ZKGame] Reveal proof error:', err);
      setStatus('error');
      throw err;
    }
  }, []);

  // =========================================================================
  // DATA FORMATTERS (for on-chain submission)
  // =========================================================================

  /**
   * Format shuffle proof for Solana program submission.
   * Converts proof and public inputs to the format expected by Anchor.
   */
  const formatShuffleForChain = useCallback(() => {
    if (!shuffleProofData) {
      throw new Error('No shuffle proof generated');
    }
    
    return {
      proof: shuffleProofData.proof,
      deckCommitment: fieldTo32Bytes(shuffleProofData.commitment),
      originalDeck: Array.from({ length: DECK_SIZE }, (_, i) => 
        fieldTo32Bytes('0x' + i.toString(16).padStart(2, '0'))
      ),
    };
  }, [shuffleProofData]);

  /**
   * Format deal proof for Solana program submission.
   */
  const formatDealForChain = useCallback((position) => {
    const dealProof = dealProofs.find(p => p.position === position);
    if (!dealProof) {
      throw new Error(`No deal proof for position ${position}`);
    }
    
    return {
      proof: dealProof.proof,
      deckCommitment: fieldTo32Bytes(deckCommitment),
      cardCommitment: fieldTo32Bytes(dealProof.cardCommitment),
      cardPosition: fieldTo32Bytes('0x' + position.toString(16)),
    };
  }, [dealProofs, deckCommitment]);

  /**
   * Format reveal proof for Solana program submission.
   */
  const formatRevealForChain = useCallback((position) => {
    const revealProof = revealProofs.find(p => p.position === position);
    if (!revealProof) {
      throw new Error(`No reveal proof for position ${position}`);
    }
    
    return {
      proof: revealProof.proof,
      cardValue: fieldTo32Bytes('0x' + revealProof.cardValue.toString(16)),
      cardCommitment: fieldTo32Bytes(revealProof.cardCommitment),
    };
  }, [revealProofs]);

  // =========================================================================
  // STATE GETTERS
  // =========================================================================

  /**
   * Get the current game state (for debugging/display).
   */
  const getGameState = useCallback(() => {
    return {
      isReady: !isInitializing,
      isProving,
      status,
      hasDeck: !!shuffledDeck,
      hasShuffleProof: !!shuffleProofData,
      deckCommitment,
      cardsDealt: Array.from(blindingFactors.current.keys()),
      dealProofsCount: dealProofs.length,
      revealProofsCount: revealProofs.length,
    };
  }, [isInitializing, isProving, status, shuffledDeck, shuffleProofData, deckCommitment, dealProofs, revealProofs]);

  /**
   * Reset game state for a new game.
   */
  const resetGame = useCallback(() => {
    setSeed(null);
    setShuffledDeck(null);
    setDeckCommitment(null);
    setShuffleProofData(null);
    setDealProofs([]);
    setRevealProofs([]);
    blindingFactors.current.clear();
    setStatus('idle');
    console.log('[ZKGame] Game reset');
  }, []);

  /**
   * Get serializable state for persistence (dealer session save).
   * This data can be encrypted and stored in localStorage.
   */
  const getSerializableState = useCallback(() => {
    return {
      seed,
      shuffledDeck,
      deckCommitment,
      blindingFactors: Object.fromEntries(blindingFactors.current),
      shuffleProofData,
      dealProofs,
      revealProofs
    };
  }, [seed, shuffledDeck, deckCommitment, shuffleProofData, dealProofs, revealProofs]);

  /**
   * Restore state from saved session (dealer session restore after refresh).
   * @param {object} savedState - State object from getSerializableState()
   */
  const restoreState = useCallback((savedState) => {
    if (!savedState) {
      console.warn('[ZKGame] No state to restore');
      return false;
    }

    try {
      console.log('[ZKGame] Restoring state from saved session...');

      // Restore core state
      if (savedState.seed) setSeed(savedState.seed);
      if (savedState.shuffledDeck) setShuffledDeck(savedState.shuffledDeck);
      if (savedState.deckCommitment) setDeckCommitment(savedState.deckCommitment);
      if (savedState.shuffleProofData) setShuffleProofData(savedState.shuffleProofData);
      if (savedState.dealProofs) setDealProofs(savedState.dealProofs);
      if (savedState.revealProofs) setRevealProofs(savedState.revealProofs);

      // Restore blinding factors (Map from Object)
      if (savedState.blindingFactors) {
        blindingFactors.current.clear();
        for (const [pos, data] of Object.entries(savedState.blindingFactors)) {
          blindingFactors.current.set(parseInt(pos), data);
        }
      }

      setStatus('ready');
      console.log('[ZKGame] State restored successfully');
      console.log('[ZKGame] Restored shuffledDeck:', savedState.shuffledDeck);
      console.log('[ZKGame] Restored blindingFactors count:', blindingFactors.current.size);

      return true;
    } catch (err) {
      console.error('[ZKGame] Failed to restore state:', err);
      return false;
    }
  }, []);

  // =========================================================================
  // PUBLIC API
  // =========================================================================

  return {
    // State
    isReady: !isInitializing,
    isProving,
    status,
    error: zkError,
    logs: zkLogs,
    
    // Deck state (read-only)
    seed,
    shuffledDeck,
    deckCommitment,
    
    // Actions (main workflow)
    initializeGame,               // Step 1: Shuffle deck and generate proof
    dealCardAtPosition,           // Step 2: Deal card with commitment and full Groth16 proof
    computeCardCommitmentAtPosition, // Step 2 (fast): Commitment only, no Groth16 proof (~1s)
    revealCard,                   // Step 3: Reveal card with proof
    resetGame,                    // Reset for new game

    // Utilities
    fieldTo32Bytes,               // Convert field hex to 32-byte array for Solana
    
    // Data formatters (for on-chain submission)
    formatShuffleForChain,
    formatDealForChain,
    formatRevealForChain,
    
    // Debug / inspection
    getGameState,
    getBlindingFactor: (position) => blindingFactors.current.get(position),
    shuffleProofData,
    dealProofs,
    revealProofs,

    // Session persistence (for dealer refresh recovery)
    getSerializableState,
    restoreState,
  };
}

