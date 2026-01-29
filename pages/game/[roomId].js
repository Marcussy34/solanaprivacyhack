/**
 * Dynamic Game Room - /game/[roomId]
 *
 * The main game interface for ZK Card Arena.
 * Supports both dealer (house) and player roles.
 *
 * Flow:
 * 1. Dealer creates game → shares room code
 * 2. Player joins → sees bet modal → deposits
 * 3. Dealer sees bet → auto-deals cards
 * 4. Game plays (hit/stand/dealer turn)
 * 5. Winner determined → payout if player wins
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Transaction, SystemProgram } from '@solana/web3.js';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2,
  Copy,
  Check,
  ExternalLink,
  Clock,
  Shield,
  Users,
  Coins,
  Hand,
  Square,
  Play,
  ArrowLeft
} from 'lucide-react';

// Hooks
import { useGameRoom } from '../../hooks/useGameRoom';
import { useZKGame } from '../../hooks/useZKGame';
import { useGameProgram } from '../../hooks/useGameProgram';
import { useShadowWire } from '../../hooks/useShadowWire';
import { useSessionKey } from '../../hooks/useSessionKey';

// Components
import { BetModal } from '../../components/BetModal';
import { PlayingCard, HiddenCard, CardSlot, PendingCard } from '../../components/game/PlayingCard';
import { BlurFade } from '../../components/ui/blur-fade';
import { LogoStack } from '../../components/arena/Icons';
import { cn } from '../../lib/utils';

// Game states
const GAME_STATES = {
  LOADING: 'loading',
  WAITING_FOR_PLAYER: 'waiting_for_player',
  WAITING_FOR_BET: 'waiting_for_bet',
  DEALING: 'dealing',
  PLAYER_TURN: 'player_turn',
  DEALER_TURN: 'dealer_turn',
  GAME_OVER: 'game_over',
  ERROR: 'error'
};

/**
 * Convert room code to deterministic gameId
 * This ensures both dealer and player derive the same gameId from the room code,
 * enabling cross-browser multiplayer without localStorage dependency.
 */
function roomCodeToGameId(roomCode) {
  if (!roomCode) return 0;
  // Simple hash: convert 6-char code to numeric ID
  let hash = 0;
  const code = roomCode.toUpperCase();
  for (let i = 0; i < code.length; i++) {
    hash = ((hash << 5) - hash) + code.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Preset bet amounts
const BET_AMOUNTS = [0.1, 0.25, 0.5, 1.0];

// Default bet amount for cross-browser multiplayer
// This is used in share URL and as fallback when localStorage is unavailable
const DEFAULT_BET_AMOUNT = 0.1;

// Suits for card display
const SUITS = ["hearts", "diamonds", "clubs", "spades"];

// Calculate hand value (blackjack rules)
function calculateHandValue(cards) {
  if (!cards || cards.length === 0) return 0;
  let total = 0;
  let aces = 0;

  for (const card of cards) {
    const value = card % 13;
    if (value === 0) {
      aces += 1;
      total += 11;
    } else if (value >= 10) {
      total += 10;
    } else {
      total += value + 1;
    }
  }

  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }

  return total;
}

// Animated Value Counter Component with color coding
// Uses design system colors: #B8B8CC muted, #936DFF primary, #C049FF magenta
function AnimatedValue({ value, isPlayer = false }) {
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (value !== displayValue) {
      setIsAnimating(true);
      const steps = 5;
      const diff = value - displayValue;
      const increment = diff / steps;
      let current = displayValue;
      let step = 0;

      const interval = setInterval(() => {
        step++;
        current += increment;
        if (step >= steps) {
          setDisplayValue(value);
          setIsAnimating(false);
          clearInterval(interval);
        } else {
          setDisplayValue(Math.round(current));
        }
      }, 50);

      return () => clearInterval(interval);
    }
  }, [value, displayValue]);

  // Color based on value (using design system)
  let colorClass = "text-[#B8B8CC]";
  let glowClass = "";

  if (value === 21) {
    colorClass = "text-[#C049FF]"; // Magenta for Blackjack
    glowClass = "drop-shadow-[0_0_10px_rgba(192,73,255,0.5)]";
  } else if (value > 21) {
    colorClass = "text-red-500";
    glowClass = "drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]";
  } else if (value >= 17 && value <= 20) {
    colorClass = isPlayer ? "text-[#936DFF]" : "text-[#B8B8CC]"; // Purple for good hand
    glowClass = isPlayer ? "drop-shadow-[0_0_8px_rgba(147,109,255,0.3)]" : "";
  } else if (value >= 12 && value < 17 && isPlayer) {
    colorClass = "text-yellow-300";
  }

  return (
    <motion.span
      animate={isAnimating ? { scale: [1, 1.2, 1] } : {}}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className={cn("text-2xl font-display font-bold tracking-wider", colorClass, glowClass)}
    >
      TOTAL: {displayValue}
      {value === 21 && (
        <motion.span
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="ml-2 text-[#C049FF]"
        >
          {isPlayer ? "- BLACKJACK!" : "- 21!"}
        </motion.span>
      )}
      {value > 21 && (
        <motion.span
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          className="ml-2 text-red-500"
        >
          BUST!
        </motion.span>
      )}
    </motion.span>
  );
}

export default function GameRoom() {
  const router = useRouter();
  const { roomId, role: initialRole, dealer: dealerFromUrl, bet: betFromUrl } = router.query;

  const { publicKey, connected, signMessage, signTransaction } = useWallet();
  const { connection } = useConnection();

  // Room management
  const {
    roomData,
    isDealer,
    setIsDealer,
    playerBet,
    dealerSession,
    isLoading: roomLoading,
    saveRoomData,
    saveDealerSession,
    restoreDealerSession,
    hasDealerSession,
    savePlayerBet,
    clearPlayerBet,
    startBetPolling,
    stopBetPolling
  } = useGameRoom(roomId);

  // ZK proof management
  const {
    isReady: zkReady,
    isProving,
    status: zkStatus,
    shuffledDeck,
    deckCommitment,
    initializeGame: zkInitializeGame,
    dealCardAtPosition,
    computeCardCommitmentAtPosition,
    revealCard: generateRevealProof,
    resetGame: zkResetGame,
    getSerializableState,
    restoreState,
    shuffleProofData
  } = useZKGame();

  // On-chain program
  const {
    program,
    createGame,
    verifyShuffle,
    verifyShuffleWithSession, // Dealer auto-sign
    joinGame,
    joinGameInstruction, // For bundling with session creation
    dealInitialHand,
    dealInitialHandWithSession, // Dealer auto-sign
    playerAction,
    playerActionWithSession, // Session key auto-sign (no wallet popup!)
    dealerPlayTurn,
    dealerPlayTurnSequential,
    dealerPlayTurnWithSession, // Dealer auto-sign (batched - may hit tx size limit)
    dealerPlayTurnSequentialWithSession, // Dealer auto-sign (sequential - preferred)
    revealCardWithSession, // Single card reveal with auto-sign
    fetchGame,
    revealCard,
    getGamePda,
    getDealerSessionPda,
    connected: programConnected,
    devnetConnection, // For session key funding (game runs on devnet!)
  } = useGameProgram();

  // ShadowPay for betting
  const { pay, requestPayout, status: paymentStatus } = useShadowWire();

  // Session key for auto-signing (no wallet popups for hit/stand!)
  // Pass devnetConnection so session funding goes to devnet (not mainnet!)
  const {
    // Player session (for hit/stand)
    sessionKeypair,
    sessionPDA,
    isSessionValid,
    createSession,
    createSessionInstruction, // For bundling with joinGame
    setSessionState,          // For updating state after bundled tx
    endSession,
    isCreating: isCreatingSession,
    // Dealer session (for shuffle/deal/reveal)
    dealerSessionKeypair,
    dealerSessionPDA,
    isDealerSessionValid,
    createDealerSession,
    endDealerSession,
    isCreatingDealerSession,
    // Constants for bundling
    SESSION_FUND_LAMPORTS,
  } = useSessionKey(program, devnetConnection);

  // Local state
  const [gameState, setGameState] = useState(GAME_STATES.LOADING);
  const [gameId, setGameId] = useState(null);
  const [gameData, setGameData] = useState(null);
  const [currentBet, setCurrentBet] = useState(null);
  const [error, setError] = useState(null);
  const [proofPhase, setProofPhase] = useState(null);

  // UI state
  const [showBetModal, setShowBetModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAutoRevealing, setIsAutoRevealing] = useState(false);
  const [payoutSent, setPayoutSent] = useState(false);
  const [payoutStatus, setPayoutStatus] = useState(null);

  // Refs
  const hasInitialized = useRef(false);
  const pollInterval = useRef(null);
  const gameStatePollRef = useRef(null);
  const hasPlayedDealerTurn = useRef(false); // Prevents dealer turn from re-triggering on gameData polling

  // =========================================================================
  // INITIALIZATION
  // =========================================================================

  // Initialize based on role - check URL param DIRECTLY to avoid race condition
  useEffect(() => {
    if (!roomId || !connected || !publicKey || hasInitialized.current) return;
    // Wait for initialRole to be defined (Next.js router query parsing)
    if (initialRole === undefined) return;
    // Wait for ZK to be ready before dealer can create game
    if (initialRole === 'dealer' && !zkReady) {
      console.log('[GameRoom] Waiting for ZK to be ready...');
      return;
    }

    const initialize = async () => {
      hasInitialized.current = true;

      // Check URL param directly instead of relying on isDealer state
      // This avoids the race condition where state isn't updated yet
      const isDealerRole = initialRole === 'dealer';
      setIsDealer(isDealerRole);

      console.log('[GameRoom] Initializing as:', isDealerRole ? 'DEALER' : 'PLAYER');

      if (isDealerRole) {
        // Dealer: Check if we have a saved session to restore
        if (hasDealerSession()) {
          console.log('[GameRoom] Dealer has saved session, attempting restore...');
          try {
            const session = await restoreDealerSession();
            if (session) {
              // CRITICAL: Verify saved session matches on-chain game before restoring
              // If deck commitment doesn't match, session is stale (from a different shuffle)
              try {
                const onChainGame = await fetchGame(session.gameId, publicKey.toBase58());
                const savedDeckCommitment = session.zkState?.deckCommitment;

                // Compare deck commitments (convert both to comparable format)
                const onChainCommitmentStr = onChainGame?.deckCommitment
                  ? (typeof onChainGame.deckCommitment === 'string'
                    ? onChainGame.deckCommitment
                    : Buffer.from(onChainGame.deckCommitment).toString('hex'))
                  : null;
                const savedCommitmentStr = savedDeckCommitment
                  ? (typeof savedDeckCommitment === 'string'
                    ? savedDeckCommitment.replace('0x', '')
                    : Buffer.from(savedDeckCommitment).toString('hex'))
                  : null;

                console.log('[GameRoom] Verifying session deck commitment...');
                console.log('[GameRoom] On-chain commitment:', onChainCommitmentStr?.slice(0, 20) + '...');
                console.log('[GameRoom] Saved commitment:', savedCommitmentStr?.slice(0, 20) + '...');

                if (onChainCommitmentStr && savedCommitmentStr &&
                    onChainCommitmentStr !== savedCommitmentStr) {
                  console.warn('[GameRoom] Session deck commitment MISMATCH - session is stale!');
                  console.warn('[GameRoom] Discarding stale session and creating new game...');
                  // Session is from a different shuffle - don't restore, create new game
                  throw new Error('Stale session - deck commitment mismatch');
                }

                console.log('[GameRoom] Session verified - deck commitments match!');
              } catch (verifyErr) {
                if (verifyErr.message?.includes('Stale session')) {
                  throw verifyErr; // Re-throw to skip restoration
                }
                // If game doesn't exist on-chain yet, that's OK - continue with restore
                console.log('[GameRoom] Could not verify on-chain game (may not exist yet):', verifyErr.message);
              }

              restoreState(session.zkState);
              setGameId(session.gameId);
              setGameState(session.gameState || GAME_STATES.WAITING_FOR_PLAYER);

              // Note: On-chain polling for player join is handled by useEffect
              // The old localStorage-based polling doesn't work cross-browser
              console.log('[GameRoom] Session restored, on-chain polling will detect player...');

              return;
            }
          } catch (err) {
            console.error('[GameRoom] Failed to restore session:', err);
            // Fall through to create new game
          }
        }

        // No session or session invalid - this is a fresh game creation
        setGameState(GAME_STATES.LOADING);
        handleCreateGame();
      } else {
        // Player: Join existing game - show bet modal
        setGameState(GAME_STATES.WAITING_FOR_BET);
        setShowBetModal(true);
      }
    };

    initialize();
  }, [roomId, connected, publicKey, initialRole, zkReady]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      stopBetPolling();
      if (gameStatePollRef.current) {
        clearInterval(gameStatePollRef.current);
      }
    };
  }, [stopBetPolling]);

  // =========================================================================
  // GAME STATE POLLING (for both dealer and player)
  // =========================================================================

  // Poll on-chain game state every 3 seconds during active game
  useEffect(() => {
    // Use dealer pubkey from URL (cross-browser) or localStorage (same browser) or own key (if dealer)
    const dealerPubkeyToUse = dealerFromUrl || roomData?.dealerPubkey || (isDealer ? publicKey?.toBase58() : null);
    if (!gameId || !dealerPubkeyToUse) return;
    if (![GAME_STATES.PLAYER_TURN, GAME_STATES.DEALER_TURN, GAME_STATES.DEALING].includes(gameState)) return;

    // Clear existing poll
    if (gameStatePollRef.current) {
      clearInterval(gameStatePollRef.current);
    }

    const pollGameState = async () => {
      try {
        const data = await fetchGame(gameId, dealerPubkeyToUse);
        setGameData(data);

        // Update game state based on on-chain state
        if (data.state === 'dealerTurn' || data.state === 'dealer_turn') {
          setGameState(GAME_STATES.DEALER_TURN);
        } else if (data.winner || ['playerWon', 'dealerWon', 'push'].includes(data.state)) {
          // Game is over when there's a winner (player, dealer, or push)
          setGameState(GAME_STATES.GAME_OVER);
        }
      } catch (err) {
        console.error('[GameRoom] Failed to poll game state:', err);
      }
    };

    // Poll immediately and then every 3 seconds
    pollGameState();
    gameStatePollRef.current = setInterval(pollGameState, 3000);

    return () => {
      if (gameStatePollRef.current) {
        clearInterval(gameStatePollRef.current);
      }
    };
  }, [gameId, dealerFromUrl, roomData?.dealerPubkey, isDealer, publicKey, gameState, fetchGame]);

  // =========================================================================
  // ON-CHAIN POLLING: Dealer waits for player to join on-chain
  // =========================================================================

  // Ref to track if we already triggered dealing (prevents double-dealing)
  const hasTriggeredDeal = useRef(false);

  // Poll on-chain state when dealer is waiting for player
  useEffect(() => {
    // Only for dealer in waiting state
    if (!isDealer || gameState !== GAME_STATES.WAITING_FOR_PLAYER || !gameId) return;
    // Skip if we've already triggered dealing
    if (hasTriggeredDeal.current) return;

    const dealerPubkey = publicKey?.toBase58();
    if (!dealerPubkey) return;

    console.log('[GameRoom] Starting on-chain polling for player join...');

    const pollInterval = setInterval(async () => {
      try {
        const game = await fetchGame(gameId, dealerPubkey);

        if (game?.player) {
          console.log('[GameRoom] Player joined on-chain:', game.player);

          // Player has joined - stop polling and trigger deal
          clearInterval(pollInterval);

          if (!hasTriggeredDeal.current) {
            hasTriggeredDeal.current = true;
            // FIX 13: Use bet amount from on-chain game data (stored when player joined)
            // This works cross-browser because it's read from Solana, not localStorage
            const betAmount = game.betAmount || DEFAULT_BET_AMOUNT;
            console.log('[GameRoom] Dealer detected player bet amount from on-chain:', betAmount, 'SOL');
            setCurrentBet(betAmount);
            handleDealCards(betAmount);
          }
        }
      } catch (err) {
        // Game might not exist yet, or network error - continue polling
        console.log('[GameRoom] Polling for player... (game state:', err.message, ')');
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, [isDealer, gameState, gameId, publicKey, fetchGame, roomId]);

  // =========================================================================
  // ON-CHAIN POLLING: Player detects when dealer has dealt cards
  // =========================================================================
  useEffect(() => {
    // Only for player in dealing state
    if (isDealer || gameState !== GAME_STATES.DEALING || !gameId) return;

    const dealerPubkeyToUse = dealerFromUrl || roomData?.dealerPubkey;
    if (!dealerPubkeyToUse) return;

    console.log('[GameRoom] Player polling for dealt cards...');

    const pollInterval = setInterval(async () => {
      try {
        const game = await fetchGame(gameId, dealerPubkeyToUse);

        // Check if cards have been dealt
        if (game?.playerCards?.length >= 2 && game?.dealerCards?.length >= 2) {
          console.log('[GameRoom] Cards dealt! Player sees:', game.playerRevealed);

          clearInterval(pollInterval);
          setGameData(game);
          setGameState(GAME_STATES.PLAYER_TURN);
        }
      } catch (err) {
        console.log('[GameRoom] Waiting for deal... (', err.message, ')');
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [isDealer, gameState, gameId, dealerFromUrl, roomData?.dealerPubkey, fetchGame]);

  // =========================================================================
  // AUTO-REVEAL: Dealer auto-reveals player cards when they hit
  // =========================================================================

  useEffect(() => {
    // Only dealer can reveal cards
    if (!isDealer || !shuffledDeck || !gameData || isAutoRevealing) return;

    // Only during active game phases
    if (gameData.state !== 'playing' && gameData.state !== 'dealerTurn') return;

    // Check for unrevealed player cards
    const playerCardCount = gameData.playerCards?.length || 0;
    const playerRevealedCount = gameData.playerRevealed?.length || 0;

    // If there are more cards than revealed, we need to reveal them
    if (playerCardCount <= playerRevealedCount) return;

    const autoReveal = async () => {
      setIsAutoRevealing(true);
      setProofPhase('Revealing player card...');

      try {
        // Find the next unrevealed card index
        const nextRevealIndex = playerRevealedCount;

        // Get the card position in shuffled deck
        // Player cards are at positions: 0, 1, 4, 5, 6, ... (2,3 are dealer cards)
        let deckPosition;
        if (nextRevealIndex < 2) {
          deckPosition = nextRevealIndex; // First two cards at positions 0, 1
        } else {
          deckPosition = nextRevealIndex + 2; // After initial deal, cards are at 4, 5, 6...
        }

        const cardValue = shuffledDeck[deckPosition];
        console.log(`[GameRoom] Auto-revealing player card at index ${nextRevealIndex}, deck position ${deckPosition}, value ${cardValue}`);

        // Generate ZK reveal proof (uses stored blinding factor internally)
        const revealResult = await generateRevealProof(deckPosition);
        console.log('[GameRoom] Reveal proof generated');

        // Submit to chain - use dealer session if available (no wallet popup!)
        if (isDealerSessionValid && dealerSessionKeypair && dealerSessionPDA) {
          console.log('[GameRoom] Using dealer session for auto-reveal - no wallet popup!');
          await revealCardWithSession(
            gameId,
            nextRevealIndex,  // Card index in player's hand
            cardValue,
            true,   // isPlayerCard
            false,  // isFinalReveal (not final, just revealing player's hit card)
            revealResult.proof,
            revealResult.publicInputs,
            dealerSessionKeypair,
            dealerSessionPDA
          );
        } else {
          // Fallback to wallet signing
          console.log('[GameRoom] Using wallet for auto-reveal');
          await revealCard(
            gameId,
            nextRevealIndex,
            cardValue,
            true,
            revealResult.proof,
            revealResult.publicInputs,
            publicKey.toBase58()
          );
        }

        console.log('[GameRoom] Card revealed successfully');

        // Fetch updated game state
        const data = await fetchGame(gameId, publicKey.toBase58());
        setGameData(data);

      } catch (err) {
        console.error('[GameRoom] Auto-reveal failed:', err);
        setError(`Failed to reveal card: ${err.message}`);
      } finally {
        setIsAutoRevealing(false);
        setProofPhase(null);
      }
    };

    autoReveal();
  }, [
    isDealer,
    shuffledDeck,
    gameData?.playerCards?.length,
    gameData?.playerRevealed?.length,
    gameData?.state,
    isAutoRevealing,
    gameId,
    publicKey,
    generateRevealProof,
    revealCard,
    revealCardWithSession,        // FIX: Added for dealer session auto-sign
    isDealerSessionValid,         // FIX: Added for dealer session auto-sign
    dealerSessionKeypair,         // FIX: Added for dealer session auto-sign
    dealerSessionPDA,             // FIX: Added for dealer session auto-sign
    fetchGame
  ]);

  // =========================================================================
  // DEALER FUNCTIONS
  // =========================================================================

  // Create new game (dealer only)
  // Note: isDealer check removed - caller verifies role via URL param (avoids race condition)
  const handleCreateGame = async () => {
    if (!connected) return;

    setIsProcessing(true);
    setError(null);
    setProofPhase('shuffle');

    try {
      console.log('[GameRoom] Creating new game...');

      // Step 1: Generate ZK shuffle proof
      setProofPhase('Generating shuffle proof (~60s)...');
      const zkResult = await zkInitializeGame();
      console.log('[GameRoom] ZK initialization complete');

      // Step 2: Create game on-chain
      setProofPhase('Creating game on-chain...');
      // Use deterministic gameId from room code (enables cross-browser multiplayer)
      const newGameId = roomCodeToGameId(roomId);
      console.log('[GameRoom] Using deterministic gameId:', newGameId, 'for room:', roomId);
      const { tx: createTx } = await createGame(newGameId, zkResult.deckCommitment);
      console.log('[GameRoom] Game created:', createTx);

      // Step 3: Create dealer session for auto-signing (no wallet popups!)
      setProofPhase('Setting up dealer auto-sign...');
      const gamePda = getGamePda(newGameId, publicKey.toBase58());
      let dealerSession = null;
      try {
        dealerSession = await createDealerSession(gamePda);
        console.log('[GameRoom] ✅ Dealer session created - dealer actions will auto-sign!');
      } catch (sessionErr) {
        // Session creation failed - game still works, just needs manual signing
        console.warn('[GameRoom] Dealer session creation failed, will use manual signing:', sessionErr.message);
      }

      // Step 4: Verify shuffle proof on-chain (uses dealer session if valid)
      setProofPhase('Verifying shuffle proof...');
      let verifyTx;
      if (dealerSession?.keypair && dealerSession?.sessionPda) {
        console.log('[GameRoom] Using dealer session for shuffle verification - no wallet popup!');
        const result = await verifyShuffleWithSession(
          newGameId,
          zkResult.proof,
          zkResult.publicInputs,
          dealerSession.keypair,
          dealerSession.sessionPda
        );
        verifyTx = result.tx;
      } else {
        // Fallback to wallet signing
        const result = await verifyShuffle(
          newGameId,
          zkResult.proof,
          zkResult.publicInputs
        );
        verifyTx = result.tx;
      }
      console.log('[GameRoom] Shuffle verified:', verifyTx);

      // Step 5: Save session for refresh recovery
      setGameId(newGameId);
      const sessionData = {
        gameId: newGameId,
        zkState: getSerializableState(),
        gameState: GAME_STATES.WAITING_FOR_PLAYER,
        createdAt: Date.now()
      };
      await saveDealerSession(sessionData);

      // Update room data
      saveRoomData({
        gameId: newGameId,
        dealerPubkey: publicKey.toBase58(),
        status: 'waiting_for_player'
      });

      setGameState(GAME_STATES.WAITING_FOR_PLAYER);
      setProofPhase(null);

      // Note: On-chain polling is now handled by useEffect below
      // The old localStorage-based startBetPolling doesn't work cross-browser
      console.log('[GameRoom] Game ready, waiting for player to join on-chain...');

    } catch (err) {
      console.error('[GameRoom] Failed to create game:', err);
      setError(err.message || 'Failed to create game');
      setGameState(GAME_STATES.ERROR);
    } finally {
      setIsProcessing(false);
      setProofPhase(null);
    }
  };

  // Deal initial cards (dealer only, triggered when bet received)
  const handleDealCards = async (betAmount) => {
    if (!isDealer || !shuffledDeck) return;

    setIsProcessing(true);
    setGameState(GAME_STATES.DEALING);
    setProofPhase('Dealing cards...');

    try {
      console.log('[GameRoom] Dealing initial cards...');

      // Generate deal proof for position 0
      setProofPhase('Generating deal proof...');
      const dealProof = await dealCardAtPosition(0);

      // Compute commitments for remaining cards (fast, no full proof)
      const commitments = [dealProof.cardCommitment];
      for (let i = 1; i < 10; i++) {
        const commitment = await computeCardCommitmentAtPosition(i);
        commitments.push(commitment.cardCommitment);
      }

      // Get initial card values
      const initialValues = [
        shuffledDeck[0], // Player card 1
        shuffledDeck[1], // Player card 2
        shuffledDeck[2]  // Dealer upcard
      ];

      console.log('[GameRoom] Initial card values:', initialValues);

      // Submit to chain (uses dealer session if valid for auto-sign)
      setProofPhase('Submitting to chain...');
      if (isDealerSessionValid && dealerSessionKeypair && dealerSessionPDA) {
        console.log('[GameRoom] Using dealer session for dealing - no wallet popup!');
        // Note: dealInitialHandWithSession does NOT take dealerPubkey (uses session keypair)
        await dealInitialHandWithSession(
          gameId,
          commitments,          // cardCommitments
          initialValues,        // initialCardValues
          dealProof.proof,      // proof
          dealProof.publicInputs, // publicInputs
          dealerSessionKeypair,
          dealerSessionPDA
        );
      } else {
        // Fallback to wallet signing
        console.log('[GameRoom] Using wallet for dealing');
        await dealInitialHand(
          gameId,
          null,  // dealerPubkey - use default (wallet.publicKey)
          commitments,
          initialValues,
          dealProof.proof,
          dealProof.publicInputs
        );
      }

      // Update session
      const sessionData = {
        gameId,
        zkState: getSerializableState(),
        gameState: GAME_STATES.PLAYER_TURN,
        betAmount,
        createdAt: Date.now()
      };
      await saveDealerSession(sessionData);

      // Fetch updated game state
      const data = await fetchGame(gameId, publicKey.toBase58());
      setGameData(data);
      setGameState(GAME_STATES.PLAYER_TURN);

      clearPlayerBet(); // Clear bet from localStorage

    } catch (err) {
      console.error('[GameRoom] Failed to deal cards:', err);
      setError(err.message || 'Failed to deal cards');
    } finally {
      setIsProcessing(false);
      setProofPhase(null);
    }
  };

  // =========================================================================
  // PLAYER FUNCTIONS
  // =========================================================================

  // Place bet (player only)
  const handlePlaceBet = async (amount) => {
    if (isDealer || !connected) return;

    setIsProcessing(true);
    setError(null);

    try {
      console.log('[GameRoom] Placing bet:', amount, 'SOL');

      // Get dealer's pubkey from URL (cross-browser) or localStorage (same browser)
      const dealerPubkey = dealerFromUrl || roomData?.dealerPubkey;
      if (!dealerPubkey) {
        throw new Error('Dealer wallet not found. Make sure you joined via the share link.');
      }

      console.log('[GameRoom] Paying dealer:', dealerPubkey);

      // Pay via ShadowWire to dealer (house)
      const result = await pay(dealerPubkey, amount, 'player_bet');
      console.log('[GameRoom] Payment result:', result);

      // Derive gameId from room code (same as dealer uses)
      const derivedGameId = roomCodeToGameId(roomId);
      console.log('[GameRoom] Joining game on-chain with gameId:', derivedGameId);

      // Set local gameId for state tracking
      setGameId(derivedGameId);

      // Bundle joinGame + createSession + fund into single transaction!
      // This reduces 3 popups to 1 popup after ShadowWire payment
      setProofPhase('Setting up game...');
      const gamePda = getGamePda(derivedGameId, dealerPubkey);

      try {
        // Get all instructions (no popups yet)
        const { ix: joinIx } = await joinGameInstruction(derivedGameId, dealerPubkey);
        const { ix: createSessionIx, keypair, sessionPda, validUntil } = await createSessionInstruction(gamePda);
        const fundIx = SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: keypair.publicKey,
          lamports: SESSION_FUND_LAMPORTS,
        });

        // Bundle all 3 into single transaction
        console.log('[GameRoom] Bundling joinGame + createSession + fund into 1 transaction...');
        console.log('[GameRoom] Fund amount:', SESSION_FUND_LAMPORTS, 'lamports');
        console.log('[GameRoom] Session keypair pubkey:', keypair.publicKey.toBase58());
        console.log('[GameRoom] Session PDA:', sessionPda.toBase58());
        console.log('[GameRoom] Game PDA:', gamePda.toBase58());
        const bundledTx = new Transaction().add(fundIx, joinIx, createSessionIx);

        const { blockhash, lastValidBlockHeight } = await devnetConnection.getLatestBlockhash();
        bundledTx.recentBlockhash = blockhash;
        bundledTx.feePayer = publicKey;

        // Only 1 popup for all 3 operations!
        const signedTx = await signTransaction(bundledTx);
        const txSig = await devnetConnection.sendRawTransaction(signedTx.serialize());
        await devnetConnection.confirmTransaction({
          signature: txSig,
          blockhash,
          lastValidBlockHeight,
        }, 'confirmed');

        console.log('[GameRoom] ✅ Bundled tx confirmed:', txSig);
        console.log('[GameRoom] ✅ Joined game + session created in 1 popup!');

        // Update session state so hit/stand can use auto-sign
        setSessionState(keypair, sessionPda, validUntil);
        console.log('[GameRoom] ✅ Session state updated - game actions will auto-sign!');

      } catch (bundleErr) {
        // DEBUG: Log detailed error info to identify why bundled tx fails
        console.error('[GameRoom] ❌ Bundled transaction FAILED:', bundleErr);
        console.error('[GameRoom] Error name:', bundleErr.name);
        console.error('[GameRoom] Error message:', bundleErr.message);
        console.error('[GameRoom] Error logs:', bundleErr.logs); // Solana program logs
        console.error('[GameRoom] Full error:', JSON.stringify(bundleErr, Object.getOwnPropertyNames(bundleErr), 2));

        // Fallback to sequential if bundling fails
        console.log('[GameRoom] ⚠️ Falling back to sequential transactions...');
        await joinGame(derivedGameId, dealerPubkey, amount);
        try {
          await createSession(gamePda);
        } catch (sessionErr) {
          console.warn('[GameRoom] Session creation failed, will use manual signing:', sessionErr.message);
        }
      }
      setProofPhase(null);

      // Save bet info for dealer (also save to localStorage for same-browser fallback)
      savePlayerBet({
        amount,
        txSignature: result.txSignature,
        method: result.method || 'shadowwire',
        playerPubkey: publicKey.toBase58()
      });

      setCurrentBet(amount);
      setShowBetModal(false);
      setGameState(GAME_STATES.DEALING);

    } catch (err) {
      console.error('[GameRoom] Failed to place bet:', err);
      setError(err.message || 'Failed to place bet');
    } finally {
      setIsProcessing(false);
    }
  };

  // Player hit (uses session key if available for auto-signing!)
  const handleHit = async () => {
    if (isDealer || !gameId || !gameData) return;

    // Use dealer pubkey from URL (cross-browser) or localStorage (same browser)
    const dealerPubkeyToUse = dealerFromUrl || roomData?.dealerPubkey;
    if (!dealerPubkeyToUse) {
      setError('Dealer public key not found');
      return;
    }

    setIsProcessing(true);
    try {
      // Use session key if available (no wallet popup!)
      if (isSessionValid && sessionKeypair && sessionPDA) {
        console.log('[GameRoom] Using session key for HIT - no wallet popup!');
        await playerActionWithSession(gameId, 'hit', dealerPubkeyToUse, sessionKeypair, sessionPDA);
      } else {
        // Fallback to wallet signing
        console.log('[GameRoom] Using wallet for HIT');
        await playerAction(gameId, 'hit', dealerPubkeyToUse);
      }
      const data = await fetchGame(gameId, dealerPubkeyToUse);
      setGameData(data);
    } catch (err) {
      console.error('[GameRoom] Hit failed:', err);
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Player stand (uses session key if available for auto-signing!)
  const handleStand = async () => {
    if (isDealer || !gameId || !gameData) return;

    // Use dealer pubkey from URL (cross-browser) or localStorage (same browser)
    const dealerPubkeyToUse = dealerFromUrl || roomData?.dealerPubkey;
    if (!dealerPubkeyToUse) {
      setError('Dealer public key not found');
      return;
    }

    setIsProcessing(true);
    try {
      // Use session key if available (no wallet popup!)
      if (isSessionValid && sessionKeypair && sessionPDA) {
        console.log('[GameRoom] Using session key for STAND - no wallet popup!');
        await playerActionWithSession(gameId, 'stand', dealerPubkeyToUse, sessionKeypair, sessionPDA);
      } else {
        // Fallback to wallet signing
        console.log('[GameRoom] Using wallet for STAND');
        await playerAction(gameId, 'stand', dealerPubkeyToUse);
      }
      setGameState(GAME_STATES.DEALER_TURN);
      const data = await fetchGame(gameId, dealerPubkeyToUse);
      setGameData(data);
    } catch (err) {
      console.error('[GameRoom] Stand failed:', err);
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // =========================================================================
  // DEALER TURN: Auto-play dealer cards when it's dealer's turn
  // =========================================================================

  // Handle dealer turn - reveal hole card and hit until 17
  const handleDealerTurn = useCallback(async () => {
    if (!isDealer || !shuffledDeck || !gameId) return;

    setIsProcessing(true);
    setProofPhase('Playing dealer turn...');

    try {
      console.log('[GameRoom] Starting dealer turn...');
      console.log('[GameRoom] gameData:', gameData);

      // Calculate dealer's current hand value
      const dealerRevealed = gameData?.dealerRevealed || [];
      const dealerCardCount = gameData?.dealerCards?.length || 2; // At least 2 cards

      // Determine which cards need to be revealed and hit
      // Dealer cards are at deck positions 2, 3, and additional hits at 4+playerCards, ...
      // Initial deal: Player cards at 0,1 - Dealer cards at 2,3
      const playerCardCount = gameData?.playerCards?.length || 2;

      // Find unrevealed dealer cards (starting from hole card at position 3)
      const cardsToReveal = [];
      const proofsToGenerate = [];

      // Helper to calculate hand value
      const calculateHandValue = (cards) => {
        let value = 0;
        let aces = 0;
        for (const card of cards) {
          const cardValue = card % 13; // 0-12
          if (cardValue === 0) { // Ace
            aces++;
            value += 11;
          } else if (cardValue >= 10) { // J, Q, K
            value += 10;
          } else {
            value += cardValue + 1;
          }
        }
        // Convert aces from 11 to 1 if needed
        while (value > 21 && aces > 0) {
          value -= 10;
          aces--;
        }
        return value;
      };

      // Get current dealer cards from shuffledDeck
      let currentDealerCards = [shuffledDeck[2]]; // Upcard (already revealed)
      if (dealerRevealed.length > 0) {
        currentDealerCards = [...dealerRevealed];
      }

      // First, reveal the hole card (position 3)
      if (dealerRevealed.length < 2) {
        cardsToReveal.push({ position: 3, cardIndex: 1 });
        currentDealerCards.push(shuffledDeck[3]);
      }

      // Calculate initial hand value with hole card
      let handValue = calculateHandValue(currentDealerCards);
      console.log('[GameRoom] Dealer initial hand:', currentDealerCards, 'Value:', handValue);

      // Hit until 17 or bust
      let nextDealerCardDeckPosition = 2 + 2 + playerCardCount; // After initial 4 cards + player hits
      while (handValue < 17 && cardsToReveal.length < 5) { // Max 5 cards to prevent infinite loop
        const cardValue = shuffledDeck[nextDealerCardDeckPosition];
        cardsToReveal.push({
          position: nextDealerCardDeckPosition,
          cardIndex: currentDealerCards.length
        });
        currentDealerCards.push(cardValue);
        handValue = calculateHandValue(currentDealerCards);
        console.log(`[GameRoom] Dealer hits, card: ${cardValue}, new value: ${handValue}`);
        nextDealerCardDeckPosition++;
      }

      console.log(`[GameRoom] Dealer final hand: ${currentDealerCards}, value: ${handValue}`);
      console.log(`[GameRoom] Cards to reveal: ${cardsToReveal.length}`);

      // Generate ZK proofs for each card
      const cardValues = [];
      const proofs = [];
      const publicInputsList = [];

      for (const card of cardsToReveal) {
        setProofPhase(`Generating proof for card ${card.cardIndex + 1}...`);
        const revealResult = await generateRevealProof(card.position);
        cardValues.push(shuffledDeck[card.position]);
        proofs.push(revealResult.proof);
        publicInputsList.push(revealResult.publicInputs);
      }

      // Submit dealer turn to chain (uses dealer session if valid for auto-sign)
      // NOTE: Using SEQUENTIAL version to avoid transaction size limits with large proofs
      setProofPhase('Submitting dealer turn to chain...');
      if (isDealerSessionValid && dealerSessionKeypair && dealerSessionPDA) {
        console.log('[GameRoom] Using dealer session for dealer turn (sequential) - no wallet popup!');
        await dealerPlayTurnSequentialWithSession(
          gameId,
          cardValues,
          proofs,
          publicInputsList,
          dealerSessionKeypair,
          dealerSessionPDA,
          (progress) => setProofPhase(`Revealing card ${progress.current}/${progress.total}...`)
        );
      } else {
        // Fallback to sequential wallet signing
        console.log('[GameRoom] Using wallet for dealer turn (sequential)');
        await dealerPlayTurnSequential(
          gameId,
          publicKey.toBase58(),
          cardValues,
          proofs,
          publicInputsList,
          (progress) => setProofPhase(`Revealing card ${progress.current}/${progress.total}...`)
        );
      }

      // Fetch final game state
      const finalData = await fetchGame(gameId, publicKey.toBase58());
      setGameData(finalData);

      // Check if game is over (winner is 'player', 'dealer', or 'push')
      if (finalData.winner || ['playerWon', 'dealerWon', 'push'].includes(finalData.state)) {
        console.log('[GameRoom] Game over! Winner:', finalData.winner);
        setGameState(GAME_STATES.GAME_OVER);
      }

      console.log('[GameRoom] Dealer turn complete');

    } catch (err) {
      console.error('[GameRoom] Dealer turn failed:', err);
      setError(`Dealer turn failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
      setProofPhase(null);
    }
  }, [
    isDealer,
    shuffledDeck,
    gameId,
    gameData,
    publicKey,
    generateRevealProof,
    dealerPlayTurnSequential,
    dealerPlayTurnSequentialWithSession,  // FIX: Added for session auto-sign
    isDealerSessionValid,                  // FIX: Added for session auto-sign
    dealerSessionKeypair,                  // FIX: Added for session auto-sign
    dealerSessionPDA,                      // FIX: Added for session auto-sign
    fetchGame
  ]);

  // Auto-trigger dealer turn when state changes to DEALER_TURN
  // We use a ref to store handleDealerTurn to avoid the cleanup/re-trigger race condition
  const handleDealerTurnRef = useRef(handleDealerTurn);
  handleDealerTurnRef.current = handleDealerTurn; // Update ref on every render

  useEffect(() => {
    if (!isDealer || gameState !== GAME_STATES.DEALER_TURN || isProcessing || isAutoRevealing) {
      return;
    }

    // CRITICAL: Prevent re-triggering from gameData polling recreating handleDealerTurn
    if (hasPlayedDealerTurn.current) {
      console.log('[GameRoom] Dealer turn already played, skipping re-trigger');
      return;
    }

    hasPlayedDealerTurn.current = true;
    console.log('[GameRoom] Scheduling dealer turn...');

    // Small delay to ensure state is synced
    const timeoutId = setTimeout(() => {
      console.log('[GameRoom] Executing dealer turn from timeout');
      handleDealerTurnRef.current(); // Call via ref to get latest version
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [isDealer, gameState, isProcessing, isAutoRevealing]); // Removed handleDealerTurn - using ref instead

  // =========================================================================
  // PAYOUT: Dealer sends winnings to player when player wins
  // =========================================================================

  // Handle payout when player wins (dealer only)
  const handlePayout = useCallback(async (playerPubkey, amount) => {
    if (!isDealer || payoutSent) return;

    setIsProcessing(true);
    setPayoutStatus('sending');

    try {
      console.log(`[GameRoom] Sending payout: ${amount} SOL to ${playerPubkey}`);

      // Send 2x the bet to the player via ShadowWire
      const result = await pay(playerPubkey, amount, 'player_winnings');
      console.log('[GameRoom] Payout sent:', result);

      setPayoutSent(true);
      setPayoutStatus('success');

    } catch (err) {
      console.error('[GameRoom] Payout failed:', err);
      setPayoutStatus(`error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  }, [isDealer, payoutSent, pay]);

  // Auto-trigger payout when game ends (player wins OR push)
  useEffect(() => {
    if (!isDealer || gameState !== GAME_STATES.GAME_OVER || payoutSent) {
      return;
    }

    // Only pay out for player win or push (dealer win = house keeps bet)
    const winner = gameData?.winner;
    if (winner !== 'player' && winner !== 'push') {
      console.log('[GameRoom] Dealer won - no payout needed');
      return;
    }

    // FIX: Get player pubkey from on-chain game data (not localStorage)
    // In cross-browser multiplayer, dealer doesn't have access to player's localStorage.
    // The player's pubkey is stored on-chain when they call joinGame().
    const playerPubkey = gameData?.player;
    if (!playerPubkey) {
      console.error('[GameRoom] No player pubkey in game data for payout');
      return;
    }

    // FIX 13: Use bet amount from on-chain data (most reliable for cross-browser)
    // The betAmount is stored on-chain when player calls joinGame with their bet
    // Fallback chain: on-chain data → currentBet → URL param → DEFAULT
    const betAmount = gameData?.betAmount || currentBet || (betFromUrl ? parseFloat(betFromUrl) : null) || DEFAULT_BET_AMOUNT;
    console.log('[GameRoom] Payout bet amount sources:', {
      onChain: gameData?.betAmount,
      currentBet,
      urlParam: betFromUrl,
      final: betAmount
    });

    // Calculate payout: 2x for player win, 1x for push (return bet)
    const payoutAmount = winner === 'player' ? betAmount * 2 : betAmount;
    const payoutReason = winner === 'player' ? 'Player won (2x bet)' : 'Push - returning bet (1x)';

    console.log(`[GameRoom] ${payoutReason}: ${payoutAmount} SOL to ${playerPubkey}`);

    // Small delay to ensure UI shows game over state first
    const timeoutId = setTimeout(() => {
      handlePayout(playerPubkey, payoutAmount);
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [isDealer, gameState, gameData?.winner, gameData?.player, gameData?.betAmount, payoutSent, currentBet, betFromUrl, handlePayout]);

  // Clean up player session when game ends
  useEffect(() => {
    if (isDealer) return;
    if (gameState !== GAME_STATES.GAME_OVER) return;
    if (!isSessionValid) return;

    console.log('[GameRoom] Game over - cleaning up player session');
    endSession();
  }, [isDealer, gameState, isSessionValid, endSession]);

  // Clean up dealer session when game ends
  useEffect(() => {
    if (!isDealer) return;
    if (gameState !== GAME_STATES.GAME_OVER) return;
    if (!isDealerSessionValid) return;

    console.log('[GameRoom] Game over - cleaning up dealer session');
    endDealerSession();
  }, [isDealer, gameState, isDealerSessionValid, endDealerSession]);

  // =========================================================================
  // RENDER
  // =========================================================================

  // State for copy button
  const [copied, setCopied] = useState(false);

  // Copy link to clipboard
  const copyLinkToClipboard = () => {
    const url = `${window.location.origin}/game/${roomId}?role=player&dealer=${publicKey?.toBase58()}&bet=${DEFAULT_BET_AMOUNT}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Loading state
  if (roomLoading || !roomId) {
    return (
      <div className="min-h-screen bg-[#05010A] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-[#936DFF] animate-spin" />
          <span className="text-white font-display uppercase tracking-widest">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05010A] text-white font-body selection:bg-[#936DFF] selection:text-white overflow-x-hidden relative">
      <Head>
        <title>Game Room {roomId} | Umbra</title>
      </Head>

      {/* Fixed Navbar */}
      <div className="fixed top-0 left-0 w-full flex justify-between items-center px-4 sm:px-6 md:px-8 py-4 sm:py-6 z-50 bg-[#05010A]/80 backdrop-blur-md border-b border-[#936DFF]/20">
        <div className="flex items-center gap-4">

          <div className="hidden sm:flex items-center gap-3">
            <LogoStack className="scale-75 text-[#936DFF]" />
            <h1 className="font-display font-bold text-xl tracking-tighter uppercase text-white">
              UMBRA
            </h1>
          </div>
        </div>

        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-display text-sm sm:text-base tracking-[0.2em] text-[#936DFF] uppercase drop-shadow-[0_0_10px_rgba(147,109,255,0.5)]">
          ZK BLACKJACK
        </div>

        <div className="flex items-center gap-3">
          <span className={cn(
            "px-3 py-1 text-xs font-display uppercase tracking-widest border",
            isDealer
              ? "border-amber-500/50 text-amber-400 bg-amber-500/10"
              : "border-blue-500/50 text-blue-400 bg-blue-500/10"
          )}>
            {isDealer ? 'DEALER' : 'PLAYER'}
          </span>
          <WalletMultiButton className="!bg-[#936DFF]/10 !border !border-[#936DFF] !text-[#936DFF] hover:!bg-[#936DFF] hover:!text-white !font-display !uppercase !tracking-widest !text-xs !h-8 !px-4 !rounded-none transition-all duration-300" />
        </div>
      </div>

      {/* Game Info Bar */}
      <div className="fixed top-[72px] sm:top-[88px] left-0 w-full flex justify-center items-center gap-6 px-4 py-3 z-40 bg-[#05010A]/80 backdrop-blur-sm border-b border-[#936DFF]/10">
        <div className="flex items-center gap-2">
          <span className="text-[#B8B8CC] text-xs font-display uppercase tracking-widest">Room:</span>
          <span className="text-white font-mono text-sm">{roomId}</span>
        </div>
        {currentBet && (
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-[#936DFF]" />
            <span className="text-[#B8B8CC] text-xs font-display uppercase tracking-widest">Bet:</span>
            <span className="text-white font-mono text-sm">{currentBet} SOL</span>
          </div>
        )}
        {/* Session Key Status - shows if auto-sign is active (Player) */}
        {!isDealer && gameState !== GAME_STATES.LOADING && gameState !== GAME_STATES.WAITING_FOR_BET && (
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              isSessionValid ? "bg-green-500 animate-pulse" : "bg-yellow-500"
            )} />
            <span className="text-[#B8B8CC] text-xs font-display uppercase tracking-widest">
              {isSessionValid ? 'Auto-Sign' : 'Manual'}
            </span>
          </div>
        )}
        {/* Session Key Status - shows if auto-sign is active (Dealer) */}
        {isDealer && gameState !== GAME_STATES.LOADING && (
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              isDealerSessionValid ? "bg-green-500 animate-pulse" : "bg-yellow-500"
            )} />
            <span className="text-[#B8B8CC] text-xs font-display uppercase tracking-widest">
              {isDealerSessionValid ? 'Auto-Sign' : 'Manual'}
            </span>
          </div>
        )}
      </div>

      {/* Main Content */}
      <main className="pt-32 sm:pt-36 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto pb-12">
        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-300"
            >
              {error}
              <button
                onClick={() => setError(null)}
                className="ml-4 text-red-400 hover:text-red-200"
              >
                ×
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Proof Phase Indicator */}
        <AnimatePresence>
          {proofPhase && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mb-6 p-4 border border-[#936DFF] bg-[#936DFF]/10 text-center"
            >
              <div className="flex items-center justify-center gap-3">
                <Loader2 className="w-5 h-5 text-[#936DFF] animate-spin" />
                <span className="font-display uppercase tracking-widest text-[#936DFF]">{proofPhase}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Game State Display */}
        <div className="w-full max-w-6xl mx-auto">
          {/* WAITING FOR PLAYER */}
          {gameState === GAME_STATES.WAITING_FOR_PLAYER && isDealer && (
            <BlurFade delay={0.1}>
              <div className="p-1 border-2 border-[#936DFF] bg-[#05010A] relative">
                {/* Decorative corners */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white -mt-1 -ml-1"></div>
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white -mt-1 -mr-1"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white -mb-1 -ml-1"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white -mb-1 -mr-1"></div>

                <div className="p-8 bg-[#05010A] border border-[#936DFF]/30 relative overflow-hidden text-center">
                  <div className="absolute inset-0 bg-[#936DFF]/5 pointer-events-none"></div>

                  <div className="relative z-10">
                    <Users className="w-12 h-12 text-[#936DFF] mx-auto mb-4 animate-pulse" />
                    <h2 className="font-display font-bold text-2xl uppercase tracking-widest text-white mb-4">Game Created!</h2>
                    <p className="text-[#B8B8CC] mb-6">Share this link with a player:</p>

                    {/* Shareable URL with dealer pubkey and bet amount */}
                    <div className="mb-6 p-4 bg-[#05010A] border border-[#936DFF]/30">
                      <p className="text-xs text-[#B8B8CC] mb-2 font-display uppercase tracking-widest">Player Join Link (Bet: {DEFAULT_BET_AMOUNT} SOL)</p>
                      <p className="text-sm font-mono text-[#936DFF] break-all select-all">
                        {typeof window !== 'undefined'
                          ? `${window.location.origin}/game/${roomId}?role=player&dealer=${publicKey?.toBase58()}&bet=${DEFAULT_BET_AMOUNT}`
                          : `.../${roomId}?role=player&dealer=...&bet=${DEFAULT_BET_AMOUNT}`}
                      </p>
                    </div>

                    {/* Copy button */}
                    <button
                      onClick={copyLinkToClipboard}
                      className="group relative px-6 py-3 border-2 border-[#936DFF] bg-[#05010A] overflow-hidden transition-colors"
                    >
                      <span className="relative z-10 font-display font-bold uppercase tracking-widest text-white group-hover:text-[#05010A] transition-colors duration-300 flex items-center justify-center gap-2">
                        {copied ? (
                          <>
                            <Check className="w-4 h-4" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            Copy Link
                          </>
                        )}
                      </span>
                      <div className="absolute inset-0 bg-[#936DFF] transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-in-out"></div>
                    </button>

                    <div className="mt-6 flex items-center justify-center gap-2 text-[#B8B8CC]">
                      <Clock className="w-4 h-4 animate-pulse" />
                      <p className="text-sm">Waiting for player to join and place bet...</p>
                    </div>
                  </div>
                </div>
              </div>
            </BlurFade>
          )}

          {/* WAITING FOR BET (Player sees bet modal) */}
          {gameState === GAME_STATES.WAITING_FOR_BET && !isDealer && (
            <BlurFade delay={0.1}>
              <div className="p-1 border-2 border-[#936DFF] bg-[#05010A] relative">
                {/* Decorative corners */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white -mt-1 -ml-1"></div>
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white -mt-1 -mr-1"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white -mb-1 -ml-1"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white -mb-1 -mr-1"></div>

                <div className="p-8 bg-[#05010A] border border-[#936DFF]/30 relative overflow-hidden text-center">
                  <div className="absolute inset-0 bg-[#936DFF]/5 pointer-events-none"></div>

                  <div className="relative z-10">
                    <Coins className="w-12 h-12 text-[#936DFF] mx-auto mb-4" />
                    <h2 className="font-display font-bold text-2xl uppercase tracking-widest text-white mb-4">Ready to Play</h2>
                    <p className="text-[#B8B8CC] mb-6">Place your bet to start the game</p>
                    <button
                      onClick={() => setShowBetModal(true)}
                      className="group relative px-8 py-4 border-2 border-[#936DFF] bg-[#05010A] overflow-hidden transition-colors"
                    >
                      <span className="relative z-10 font-display font-bold text-xl uppercase tracking-widest text-white group-hover:text-[#05010A] transition-colors duration-300">
                        Place Bet
                      </span>
                      <div className="absolute inset-0 bg-[#936DFF] transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-in-out"></div>
                    </button>
                  </div>
                </div>
              </div>
            </BlurFade>
          )}

          {/* Bet Modal */}
          <BetModal
            isOpen={showBetModal}
            onClose={() => setShowBetModal(false)}
            onPlaceBet={handlePlaceBet}
            isProcessing={isProcessing}
            error={error}
          />

          {/* DEALING */}
          {gameState === GAME_STATES.DEALING && (
            <BlurFade delay={0.1}>
              <div className="text-center p-8">
                <Loader2 className="w-12 h-12 text-[#936DFF] mx-auto mb-4 animate-spin" />
                <h2 className="font-display font-bold text-2xl uppercase tracking-widest text-white mb-2">Dealing Cards...</h2>
                <p className="text-[#B8B8CC] text-sm">Please wait while the dealer deals the cards</p>
              </div>
            </BlurFade>
          )}

          {/* PLAYER TURN */}
          {gameState === GAME_STATES.PLAYER_TURN && (
            <BlurFade delay={0.1}>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full"
              >
                {/* Game Table */}
                <div className="relative w-full aspect-[3/4] md:aspect-[16/9] border-2 border-[#936DFF] rounded-[2rem] md:rounded-[3rem] bg-[#05010A] overflow-hidden flex flex-col justify-between p-4 md:p-10">
                  {/* Table Felt Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-b from-[#936DFF]/5 via-transparent to-[#936DFF]/5 pointer-events-none"></div>

                  {/* Center Logo Watermark */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-5 pointer-events-none">
                    <h1 className="font-display font-bold text-[10vw] text-[#936DFF] tracking-tighter">UMBRA</h1>
                  </div>

                  {/* Deck of Cards (Right Side) */}
                  <div className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 hidden md:block">
                    <div className="relative w-24 h-32">
                      {/* Bottom cards for stack effect */}
                      <div className="absolute top-1 left-1 w-full h-full rounded-xl bg-[#05010A] border border-[#936DFF]/30 rotate-3"></div>
                      <div className="absolute top-0.5 left-0.5 w-full h-full rounded-xl bg-[#05010A] border border-[#936DFF]/30 rotate-1"></div>
                      {/* Top card */}
                      <div className="absolute top-0 left-0 w-full h-full rounded-xl border-2 border-[#936DFF] bg-[#05010A] overflow-hidden shadow-lg shadow-[#936DFF]/20">
                        <img 
                          src="/umbra_back.jpg" 
                          alt="Deck" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  </div>

                  {/* DEALER SECTION (TOP) */}
                  <div className="flex flex-col items-center gap-3 relative z-10 w-full px-4">
                    <span className="font-display font-bold text-sm uppercase tracking-widest text-[#B8B8CC]">Dealer</span>
                  <div className="flex flex-wrap gap-2 md:gap-3 justify-center min-h-[100px] sm:min-h-[120px] md:min-h-[140px] items-center w-full">
                    {!gameData?.dealerCards?.length && !gameData?.dealerRevealed?.length ? (
                      <><CardSlot /><CardSlot /></>
                    ) : (
                      // Show all dealer cards: use max of committed cards vs revealed cards
                      // (dealer hits add to revealed but not to committed cards array)
                      Array(Math.max(gameData?.dealerCards?.length || 0, gameData?.dealerRevealed?.length || 0))
                        .fill(null)
                        .map((_, index) =>
                          gameData.dealerRevealed?.[index] !== undefined ? (
                            <PlayingCard
                              key={index}
                              value={gameData.dealerRevealed[index] % 13}
                              suit={SUITS[Math.floor(gameData.dealerRevealed[index] / 13)]}
                              delay={index * 0.2}
                            />
                          ) : (
                            <HiddenCard key={index} delay={index * 0.2} />
                          )
                        )
                    )}
                  </div>
                  {gameData?.dealerRevealed?.length > 0 && (
                    <AnimatedValue value={calculateHandValue(gameData.dealerRevealed)} isPlayer={false} />
                  )}
                </div>

                  {/* CENTER - Turn Indicator */}
                  <div className="flex-1 flex items-center justify-center relative z-10">
                    <div className="px-6 py-3 border border-[#936DFF] bg-[#05010A]/80 backdrop-blur-sm">
                      <span className="font-display font-bold text-lg uppercase tracking-widest text-[#936DFF]">
                        {isDealer ? "PLAYER'S TURN" : "YOUR TURN"}
                      </span>
                    </div>
                  </div>

                  {/* PLAYER SECTION (BOTTOM) */}
                  <div className="flex flex-col items-center gap-3 relative z-10">
                    {gameData?.playerRevealed?.length > 0 && (
                      <AnimatedValue value={calculateHandValue(gameData.playerRevealed)} isPlayer={true} />
                    )}
                    <div className="flex gap-2 md:gap-3 justify-center min-h-[100px] sm:min-h-[120px] md:min-h-[140px] items-center">
                      {!gameData?.playerCards?.length ? (
                        <><CardSlot /><CardSlot /></>
                      ) : (
                        gameData.playerCards.map((_, index) =>
                          gameData.playerRevealed?.[index] !== undefined ? (
                            <PlayingCard
                              key={index}
                              value={gameData.playerRevealed[index] % 13}
                              suit={SUITS[Math.floor(gameData.playerRevealed[index] / 13)]}
                              delay={index * 0.2}
                            />
                          ) : !isDealer ? (
                            <PendingCard key={index} delay={index * 0.2} />
                          ) : (
                            <HiddenCard key={index} delay={index * 0.2} />
                          )
                        )
                      )}
                    </div>
                    <span className="font-display font-bold text-sm uppercase tracking-widest text-white">
                      {isDealer ? 'Player' : 'You'}
                    </span>
                  </div>
                </div>

                {/* Player Actions */}
                {!isDealer && (
                  <div className="flex justify-center gap-4 mt-6">
                    <button
                      onClick={handleHit}
                      disabled={isProcessing}
                      className="group relative px-8 py-4 border-2 border-[#936DFF] bg-[#05010A] overflow-hidden hover:border-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="relative z-10 font-display font-bold text-lg uppercase tracking-widest text-white group-hover:text-[#05010A] transition-colors duration-300 flex items-center gap-2">
                        {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Hand className="w-5 h-5" />}
                        {isProcessing ? 'HITTING...' : 'HIT'}
                      </span>
                      <div className="absolute inset-0 bg-[#936DFF] transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-in-out"></div>
                    </button>
                    <button
                      onClick={handleStand}
                      disabled={isProcessing}
                      className="group relative px-8 py-4 border-2 border-white bg-[#05010A] overflow-hidden hover:border-[#936DFF] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="relative z-10 font-display font-bold text-lg uppercase tracking-widest text-white group-hover:text-[#05010A] transition-colors duration-300 flex items-center gap-2">
                        {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Square className="w-5 h-5" />}
                        {isProcessing ? 'STANDING...' : 'STAND'}
                      </span>
                      <div className="absolute inset-0 bg-white transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-in-out"></div>
                    </button>
                  </div>
                )}
              </motion.div>
            </BlurFade>
          )}

          {/* DEALER TURN */}
          {gameState === GAME_STATES.DEALER_TURN && (
            <BlurFade delay={0.1}>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full"
              >
                {/* Game Table */}
                <div className="relative w-full aspect-[3/4] md:aspect-[16/9] border-2 border-[#936DFF] rounded-[2rem] md:rounded-[3rem] bg-[#05010A] overflow-hidden flex flex-col justify-between p-4 md:p-10">
                  {/* Table Felt Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-b from-[#936DFF]/5 via-transparent to-[#936DFF]/5 pointer-events-none"></div>

                  {/* Center Logo Watermark */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-5 pointer-events-none">
                    <h1 className="font-display font-bold text-[10vw] text-[#936DFF] tracking-tighter">UMBRA</h1>
                  </div>

                  {/* Deck of Cards (Right Side) */}
                  <div className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 hidden md:block">
                    <div className="relative w-24 h-32">
                      {/* Bottom cards for stack effect */}
                      <div className="absolute top-1 left-1 w-full h-full rounded-xl bg-[#05010A] border border-[#936DFF]/30 rotate-3"></div>
                      <div className="absolute top-0.5 left-0.5 w-full h-full rounded-xl bg-[#05010A] border border-[#936DFF]/30 rotate-1"></div>
                      {/* Top card */}
                      <div className="absolute top-0 left-0 w-full h-full rounded-xl border-2 border-[#936DFF] bg-[#05010A] overflow-hidden shadow-lg shadow-[#936DFF]/20">
                        <img 
                          src="/umbra_back.jpg" 
                          alt="Deck" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  </div>

                  {/* DEALER SECTION (TOP) */}
                  <div className="flex flex-col items-center gap-3 relative z-10 w-full px-4">
                    <span className="font-display font-bold text-sm uppercase tracking-widest text-[#C049FF]">Dealer&apos;s Turn</span>
                  <div className="flex flex-wrap gap-2 md:gap-3 justify-center min-h-[100px] sm:min-h-[120px] md:min-h-[140px] items-center w-full">
                    {!gameData?.dealerCards?.length && !gameData?.dealerRevealed?.length ? (
                      <><CardSlot /><CardSlot /></>
                    ) : (
                      // Show all dealer cards: use max of committed cards vs revealed cards
                      // (dealer hits add to revealed but not to committed cards array)
                      Array(Math.max(gameData?.dealerCards?.length || 0, gameData?.dealerRevealed?.length || 0))
                        .fill(null)
                        .map((_, index) =>
                          gameData.dealerRevealed?.[index] !== undefined ? (
                            <PlayingCard
                              key={index}
                              value={gameData.dealerRevealed[index] % 13}
                              suit={SUITS[Math.floor(gameData.dealerRevealed[index] / 13)]}
                              delay={index * 0.2}
                            />
                          ) : (
                            <HiddenCard key={index} delay={index * 0.2} />
                          )
                        )
                    )}
                  </div>
                  {gameData?.dealerRevealed?.length > 0 && (
                    <AnimatedValue value={calculateHandValue(gameData.dealerRevealed)} isPlayer={false} />
                  )}
                </div>

                  {/* CENTER - Status */}
                  <div className="flex-1 flex items-center justify-center relative z-10">
                    <div className="px-6 py-3 border border-[#C049FF] bg-[#05010A]/80 backdrop-blur-sm animate-pulse">
                      <span className="font-display font-bold text-lg uppercase tracking-widest text-[#C049FF]">
                        {isDealer ? 'PLAYING...' : 'DEALER PLAYING...'}
                      </span>
                    </div>
                  </div>

                  {/* PLAYER SECTION (BOTTOM) */}
                  <div className="flex flex-col items-center gap-3 relative z-10 w-full px-4">
                    {gameData?.playerRevealed?.length > 0 && (
                      <AnimatedValue value={calculateHandValue(gameData.playerRevealed)} isPlayer={true} />
                    )}
                    <div className="flex flex-wrap gap-2 md:gap-3 justify-center min-h-[100px] sm:min-h-[120px] md:min-h-[140px] items-center w-full">
                      {!gameData?.playerCards?.length ? (
                        <><CardSlot /><CardSlot /></>
                      ) : (
                        gameData.playerCards.map((_, index) =>
                          gameData.playerRevealed?.[index] !== undefined ? (
                            <PlayingCard
                              key={index}
                              value={gameData.playerRevealed[index] % 13}
                              suit={SUITS[Math.floor(gameData.playerRevealed[index] / 13)]}
                              delay={index * 0.2}
                            />
                          ) : (
                            <PendingCard key={index} delay={index * 0.2} />
                          )
                        )
                      )}
                    </div>
                    <span className="font-display font-bold text-sm uppercase tracking-widest text-white">
                      {isDealer ? 'Player' : 'You'}
                    </span>
                  </div>
                </div>
              </motion.div>
            </BlurFade>
          )}

          {/* GAME OVER */}
          {gameState === GAME_STATES.GAME_OVER && (
            <BlurFade delay={0.1}>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full"
              >
                {/* Game Table with Final Hands */}
                <div className="relative w-full aspect-[3/4] md:aspect-[16/9] border-2 border-[#936DFF] rounded-[2rem] md:rounded-[3rem] bg-[#05010A] overflow-hidden flex flex-col justify-between p-4 md:p-10">
                  {/* Table Felt Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-b from-[#936DFF]/5 via-transparent to-[#936DFF]/5 pointer-events-none"></div>

                  {/* Center Logo Watermark */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-5 pointer-events-none">
                    <h1 className="font-display font-bold text-[10vw] text-[#936DFF] tracking-tighter">UMBRA</h1>
                  </div>

                  {/* Deck of Cards (Right Side) */}
                  <div className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 hidden md:block">
                    <div className="relative w-24 h-32">
                      {/* Bottom cards for stack effect */}
                      <div className="absolute top-1 left-1 w-full h-full rounded-xl bg-[#05010A] border border-[#936DFF]/30 rotate-3"></div>
                      <div className="absolute top-0.5 left-0.5 w-full h-full rounded-xl bg-[#05010A] border border-[#936DFF]/30 rotate-1"></div>
                      {/* Top card */}
                      <div className="absolute top-0 left-0 w-full h-full rounded-xl border-2 border-[#936DFF] bg-[#05010A] overflow-hidden shadow-lg shadow-[#936DFF]/20">
                        <img 
                          src="/umbra_back.jpg" 
                          alt="Deck" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  </div>

                  {/* DEALER SECTION (TOP) */}
                  <div className="flex flex-col items-center gap-3 relative z-10 w-full px-4">
                    <span className="font-display font-bold text-sm uppercase tracking-widest text-[#B8B8CC]">Dealer</span>
                    <div className="flex flex-wrap gap-2 md:gap-3 justify-center min-h-[100px] sm:min-h-[120px] md:min-h-[140px] items-center w-full">
                      {gameData?.dealerRevealed?.map((card, index) => (
                        <PlayingCard
                          key={index}
                          value={card % 13}
                          suit={SUITS[Math.floor(card / 13)]}
                          delay={index * 0.2}
                        />
                      ))}
                    </div>
                    {gameData?.dealerRevealed?.length > 0 && (
                      <AnimatedValue value={calculateHandValue(gameData.dealerRevealed)} isPlayer={false} />
                    )}
                  </div>

                  {/* CENTER - Winner Display */}
                  <div className="flex-1 flex flex-col items-center justify-center relative z-10 gap-4">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, delay: 0.3 }}
                      className={cn(
                        "px-8 py-4 border-2",
                        gameData?.winner === 'player' ? "border-green-500 bg-green-500/10" :
                        gameData?.winner === 'dealer' ? "border-red-500 bg-red-500/10" :
                        "border-yellow-500 bg-yellow-500/10"
                      )}
                    >
                      <span className={cn(
                        "font-display font-bold text-2xl md:text-3xl uppercase tracking-widest",
                        gameData?.winner === 'player' ? "text-green-400" :
                        gameData?.winner === 'dealer' ? "text-red-400" :
                        "text-yellow-400"
                      )}>
                        {gameData?.winner === 'player' && (isDealer ? 'PLAYER WINS!' : 'YOU WIN!')}
                        {gameData?.winner === 'dealer' && (isDealer ? 'HOUSE WINS!' : 'DEALER WINS')}
                        {gameData?.winner === 'push' && 'PUSH - TIE!'}
                        {!gameData?.winner && 'GAME OVER'}
                      </span>
                    </motion.div>
                  </div>

                  {/* PLAYER SECTION (BOTTOM) */}
                  <div className="flex flex-col items-center gap-3 relative z-10 w-full px-4">
                    {gameData?.playerRevealed?.length > 0 && (
                      <AnimatedValue value={calculateHandValue(gameData.playerRevealed)} isPlayer={true} />
                    )}
                    <div className="flex flex-wrap gap-2 md:gap-3 justify-center min-h-[100px] sm:min-h-[120px] md:min-h-[140px] items-center w-full">
                      {gameData?.playerRevealed?.map((card, index) => (
                        <PlayingCard
                          key={index}
                          value={card % 13}
                          suit={SUITS[Math.floor(card / 13)]}
                          delay={index * 0.2}
                        />
                      ))}
                    </div>
                    <span className="font-display font-bold text-sm uppercase tracking-widest text-white">
                      {isDealer ? 'Player' : 'You'}
                    </span>
                  </div>
                </div>

                {/* Payout and Actions - Below the table */}
                <div className="mt-6 p-1 border-2 border-[#936DFF] bg-[#05010A] relative">
                  {/* Decorative corners */}
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white -mt-1 -ml-1"></div>
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white -mt-1 -mr-1"></div>
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white -mb-1 -ml-1"></div>
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white -mb-1 -mr-1"></div>

                  <div className="p-6 bg-[#05010A] border border-[#936DFF]/30 text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-[#936DFF]/5 pointer-events-none"></div>

                    <div className="relative z-10">
                      {/* Payout Info */}
                      {currentBet && (
                        <div className="mb-6">
                          {gameData?.winner === 'player' && !isDealer && (
                            <div>
                              <p className="text-green-400 text-lg mb-2 font-display uppercase tracking-wide">
                                You won <span className="font-bold">{(currentBet * 2).toFixed(2)} SOL</span>!
                              </p>
                              {payoutStatus === 'success' && (
                                <p className="text-green-300 text-sm">Payout received!</p>
                              )}
                              {payoutStatus === 'sending' && (
                                <p className="text-[#936DFF] text-sm animate-pulse">Receiving payout...</p>
                              )}
                            </div>
                          )}
                          {gameData?.winner === 'dealer' && !isDealer && (
                            <p className="text-red-400 text-lg font-display uppercase tracking-wide">
                              You lost <span className="font-bold">{currentBet.toFixed(2)} SOL</span>
                            </p>
                          )}
                          {gameData?.winner === 'push' && !isDealer && (
                            <div>
                              <p className="text-yellow-400 text-lg mb-2 font-display uppercase tracking-wide">
                                Push! Your bet of <span className="font-bold">{currentBet?.toFixed(2) || '0.00'} SOL</span> is being returned
                              </p>
                              {payoutStatus === 'success' && (
                                <p className="text-green-300 text-sm">Bet returned!</p>
                              )}
                              {payoutStatus === 'sending' && (
                                <p className="text-[#936DFF] text-sm animate-pulse">Returning bet...</p>
                              )}
                            </div>
                          )}
                          {gameData?.winner === 'push' && isDealer && (
                            <div>
                              <p className="text-yellow-400 text-lg mb-2 font-display uppercase tracking-wide">
                                Push! Returning <span className="font-bold">{currentBet?.toFixed(2) || '0.00'} SOL</span> to player
                              </p>
                              {payoutStatus === 'sending' && (
                                <p className="text-[#936DFF] text-sm animate-pulse">Sending refund...</p>
                              )}
                              {payoutStatus === 'success' && (
                                <p className="text-green-300 text-sm">Refund sent!</p>
                              )}
                            </div>
                          )}
                          {isDealer && gameData?.winner === 'player' && (
                            <div>
                              <p className="text-amber-400 text-lg mb-2 font-display uppercase tracking-wide">
                                House pays <span className="font-bold">{(currentBet * 2).toFixed(2)} SOL</span> to player
                              </p>
                              {payoutStatus === 'sending' && (
                                <p className="text-[#936DFF] text-sm animate-pulse">Sending payout...</p>
                              )}
                              {payoutStatus === 'success' && (
                                <p className="text-green-300 text-sm">Payout sent successfully!</p>
                              )}
                              {payoutStatus?.startsWith('error') && (
                                <p className="text-red-300 text-sm">{payoutStatus}</p>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Play Again Button */}
                      <button
                        onClick={() => router.push('/game')}
                        className="group relative px-8 py-4 border-2 border-[#936DFF] bg-[#05010A] overflow-hidden hover:border-white transition-colors"
                      >
                        <span className="relative z-10 font-display font-bold text-lg uppercase tracking-widest text-white group-hover:text-[#05010A] transition-colors duration-300 flex items-center justify-center gap-2">
                          <Play className="w-5 h-5" />
                          Play Again
                        </span>
                        <div className="absolute inset-0 bg-[#936DFF] transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-in-out"></div>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </BlurFade>
          )}

          {/* Debug Info */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-8 p-4 bg-[#05010A] border border-[#936DFF]/20 text-xs font-mono text-[#B8B8CC]/50">
              <p>State: {gameState}</p>
              <p>IsDealer: {isDealer ? 'Yes' : 'No'}</p>
              <p>GameId: {gameId || 'None'}</p>
              <p>CurrentBet: {currentBet || 'None'}</p>
              <p>ShuffledDeck: {shuffledDeck ? 'Yes' : 'No'}</p>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 p-4 text-center text-[#B8B8CC]/50 text-xs font-body bg-[#05010A]/80 backdrop-blur-sm border-t border-[#936DFF]/10">
        Powered by Solana &bull; ZK Proofs by Noir &bull; Privacy by ShadowWire
      </footer>
    </div>
  );
}
