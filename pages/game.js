import { useState, useEffect, useRef } from "react";
import Head from 'next/head';
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { motion, AnimatePresence } from "framer-motion";
import { PlayingCard, HiddenCard, CardSlot, PendingCard } from "../components/game/PlayingCard";
import { ProofProgress } from "../components/game/ProofProgress";
import { BetSelector } from "../components/BetSelector";
import { BlurFade } from "../components/ui/blur-fade";
import { useGameProgram } from "../hooks/useGameProgram";
import { useZKGame } from "../hooks/useZKGame";
import { useShadowPay } from "../hooks/useShadowPay";
import { cn } from "../lib/utils";
import { ArrowLeft, LogoStack } from "../components/arena/Icons";
import { useTransition } from "../components/ui/PageTransition";
import {
  Loader2,
  Play,
  UserPlus,
  Hand,
  Square,
  CopyPlus,
  Trophy,
  XCircle,
  RefreshCw,
  Wallet,
  Copy,
  Check,
  ExternalLink,
  Clock,
  Zap,
  Users,
  Shield,
  Coins,
  Gift,
  MessageCircle,
} from "lucide-react";

// Game states matching smart contract + betting phase
const GAME_STATES = {
  IDLE: "idle",
  BETTING: "betting",                    // Player placing private bet via ShadowPay
  WAITING_DEALER_BET: "waitingDealerBet", // Player waiting for dealer to match bet
  CREATED: "created",
  AWAITING_PLAYER: "awaitingPlayer",
  PLAYING: "playing",
  DEALER_TURN: "dealerTurn",
  REVEALING: "revealing",
  PLAYER_WON: "playerWon",
  DEALER_WON: "dealerWon",
  PUSH: "push",
};

// Suits for display
const SUITS = ["hearts", "diamonds", "clubs", "spades"];

// Animated Value Counter Component with color coding
function AnimatedValue({ value, isPlayer = false }) {
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (value !== displayValue) {
      setIsAnimating(true);
      // Animate counting up
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

  // Color based on value
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

// Turn Indicator Component
function TurnIndicator({ gameState, isDealer, cardsDealt, playerJoined }) {
  let message = "";
  let subMessage = "";
  let icon = null;
  let color = "text-[#936DFF]";

  if (gameState === GAME_STATES.CREATED) {
    if (isDealer) {
      message = "VERIFY SHUFFLE";
      subMessage = "Submit ZK proof to prove fair shuffle";
      icon = <Shield className="w-6 h-6" />;
      color = "text-[#C049FF]";
    } else {
      message = "WAITING FOR DEALER";
      subMessage = "Dealer is preparing the game...";
      icon = <Clock className="w-6 h-6 animate-pulse" />;
    }
  } else if (gameState === GAME_STATES.AWAITING_PLAYER) {
    if (isDealer) {
      message = "WAITING FOR PLAYER";
      subMessage = "Share code with a friend";
      icon = <Users className="w-6 h-6 animate-pulse" />;
    } else {
      message = "READY TO JOIN";
      subMessage = "Click Join to enter";
      icon = <Zap className="w-6 h-6" />;
      color = "text-[#936DFF]";
    }
  } else if (gameState === GAME_STATES.PLAYING) {
    if (!cardsDealt) {
      if (isDealer) {
        message = "DEAL CARDS";
        subMessage = "Deal 2 cards to each player";
        icon = <Play className="w-6 h-6" />;
        color = "text-[#936DFF]";
      } else {
        message = "WAITING FOR CARDS";
        subMessage = "Dealer is dealing...";
        icon = <Clock className="w-6 h-6 animate-pulse" />;
      }
    } else {
      if (isDealer) {
        message = "PLAYER'S TURN";
        subMessage = "Waiting for player action...";
        icon = <Hand className="w-6 h-6" />;
        color = "text-[#B8B8CC]";
      } else {
        message = "YOUR TURN";
        subMessage = "Hit, Stand, or Double";
        icon = <Zap className="w-6 h-6" />;
        color = "text-[#936DFF]";
      }
    }
  } else if (gameState === GAME_STATES.DEALER_TURN) {
    if (isDealer) {
      message = "PLAY YOUR TURN";
      subMessage = "Reveal hole card, hit to 17+";
      icon = <Zap className="w-6 h-6" />;
      color = "text-[#936DFF]";
    } else {
      message = "DEALER'S TURN";
      subMessage = "Dealer is playing...";
      icon = <Clock className="w-6 h-6 animate-pulse" />;
    }
  } else if (gameState === GAME_STATES.WAITING_DEALER_BET) {
    if (isDealer) {
      message = "MATCH BET";
      subMessage = "Player waiting for match";
      icon = <Coins className="w-6 h-6" />;
      color = "text-[#C049FF]";
    } else {
      message = "WAITING FOR DEALER";
      subMessage = "Dealer matching bet...";
      icon = <Clock className="w-6 h-6 animate-pulse" />;
      color = "text-[#B8B8CC]";
    }
  }

  if (!message) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex items-center gap-4 px-8 py-4 border-2",
        "bg-[#05010A] border-[#936DFF]",
        color
      )}
    >
      {icon}
      <div>
        <p className="font-display font-bold text-xl tracking-widest uppercase">{message}</p>
        <p className="font-body text-sm text-[#B8B8CC] opacity-80">{subMessage}</p>
      </div>
    </motion.div>
  );
}

export default function GamePage() {
  const { navigate } = useTransition();
  const { publicKey, connected, connecting, wallet } = useWallet();
  const {
    createGame,
    verifyShuffle,
    joinGame,
    dealInitialHand,
    playerAction,
    revealCard,
    revealAllCards,
    dealerPlayTurn,
    dealerPlayTurnSequential, // Use for 2+ cards to avoid tx size limit
    fetchGame,
    subscribeToGame,
    connected: programConnected,
  } = useGameProgram();

  const {
    isReady: zkReady,
    initializeGame: zkInitializeGame,
    shuffledDeck,
    deckCommitment: zkDeckCommitment,
    computeCardCommitmentAtPosition,
    dealCardAtPosition,               // Full Groth16 deal proof generation
    fieldTo32Bytes,
    resetGame: zkResetGame,
    shuffleProofData,
    revealCard: generateRevealProof,  // ZK proof generator (not blockchain submit)
    getBlindingFactor,                 // Get stored blinding factor for a position
  } = useZKGame();

  // ShadowPay for private betting
  const { requestPayout, escrowBalance, getBalance: refreshEscrowBalance } = useShadowPay();

  // Proof generation progress
  const [proofPhase, setProofPhase] = useState(null);
  const [proofError, setProofError] = useState(null);

  // Ref to skip on-chain state sync during betting flows (prevents race condition)
  // When true, useEffect won't overwrite gameState from on-chain data
  const skipOnchainStateSync = useRef(false);

  // Betting state
  const [currentBet, setCurrentBet] = useState(null);
  const [betTxSignature, setBetTxSignature] = useState(null);
  const [payoutProcessed, setPayoutProcessed] = useState(false);

  // Game state
  const [gameState, setGameState] = useState(GAME_STATES.IDLE);
  const [isDealer, setIsDealer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [txSignature, setTxSignature] = useState(null);
  const [walletError, setWalletError] = useState(null);

  // Game data
  const [gameId, setGameId] = useState(null);
  const [dealerPubkey, setDealerPubkey] = useState(null);
  const [gamePda, setGamePda] = useState(null);
  const [gameData, setGameData] = useState(null);

  // Auto-reveal state (dealer fulfills remote player's hit/double)
  const [isAutoRevealing, setIsAutoRevealing] = useState(false);

  // Join game input
  const [joinGameCode, setJoinGameCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [pendingJoinCode, setPendingJoinCode] = useState(null);

  // Manual bet input for dealer (cross-browser - can't use localStorage)
  const [manualBetInput, setManualBetInput] = useState("");

  // Dealer turn animation state
  const [isAnimatingDealerTurn, setIsAnimatingDealerTurn] = useState(false);
  const [localDealerState, setLocalDealerState] = useState({ cards: [], revealed: [] });

  // Derived state
  const playerCards = gameData?.playerCards || [];
  const rawDealerCards = gameData?.dealerCards || [];
  const rawDealerRevealed = gameData?.dealerRevealed || [];
  const playerRevealed = gameData?.playerRevealed || [];
  
  const dealerCards = isAnimatingDealerTurn ? localDealerState.cards : rawDealerCards;
  const dealerRevealed = isAnimatingDealerTurn ? localDealerState.revealed : rawDealerRevealed;
  const cardsDealt = playerCards.length >= 2 && dealerCards.length >= 2;
  const playerJoined = gameData?.player !== null;

  // Subscribe to game updates
  useEffect(() => {
    if (!gameId || !dealerPubkey || !programConnected) return;

    const unsubscribe = subscribeToGame(gameId, dealerPubkey, (data) => {
      console.log("Game update:", data);
      setGameData(data);
      // Don't overwrite betting-related UI states (prevents race condition)
      if (!skipOnchainStateSync.current) {
        setGameState(data.state);
      }

      if (publicKey) {
        setIsDealer(data.dealer === publicKey.toBase58());
      }
    });

    // Initial fetch
    fetchGame(gameId, dealerPubkey).then((data) => {
      if (data) {
        console.log("Initial game data:", data);
        setGameData(data);
        // Don't overwrite betting-related UI states (prevents race condition)
        if (!skipOnchainStateSync.current) {
          setGameState(data.state);
        }
        setGamePda(data.pda);
        if (publicKey) {
          setIsDealer(data.dealer === publicKey.toBase58());
        }
      }
    });

    return unsubscribe;
  }, [gameId, dealerPubkey, programConnected, subscribeToGame, fetchGame, publicKey]);

  // Listen for wallet errors
  useEffect(() => {
    if (wallet?.adapter) {
      const handleError = (error) => {
        console.error("Wallet adapter error:", error);
        setWalletError(error.message || "Wallet connection failed. Please try again.");
      };

      wallet.adapter.on("error", handleError);

      return () => {
        wallet.adapter.off("error", handleError);
      };
    }
  }, [wallet]);

  // Clear wallet error when connected
  useEffect(() => {
    if (connected) {
      setWalletError(null);
    }
  }, [connected]);

  // Dealer auto-reveal: when remote player hits/doubles, dealer fulfills by revealing the card
  // Generates ZK reveal proof for each card to prove it matches the earlier commitment
  useEffect(() => {
    if (!isDealer || !shuffledDeck || !gameData || isAutoRevealing) return;
    if (gameData.state !== "playing" && gameData.state !== "dealerTurn") return;

    const playerCardCount = gameData.playerCards?.length || 0;
    const playerRevealedCount = gameData.playerRevealed?.length || 0;
    if (playerCardCount <= playerRevealedCount) return;

    const autoReveal = async () => {
      setIsAutoRevealing(true);
      try {
        for (let i = playerRevealedCount; i < playerCardCount; i++) {
          // Deck position mapping:
          // player_cards[0,1] = deck positions 0,1 (initial deal)
          // player_cards[2+] = deck positions 4+ (hits)
          const deckPos = i < 2 ? i : 4 + (i - 2);
          const cardValue = shuffledDeck[deckPos];

          // Generate ZK reveal proof for this card position
          // This proves the revealed card value matches the earlier commitment
          console.log("[Game] Generating reveal proof for player card", i, "deckPos:", deckPos);
          const proofData = await generateRevealProof(deckPos);

          console.log("[Game] Auto-reveal player card", i, "value:", cardValue, "with ZK proof");
          await revealCard(
            gameId,
            i,
            cardValue,
            true, // isPlayerCard
            proofData.proof,
            proofData.publicInputs,
            dealerPubkey
          );
        }
      } catch (err) {
        console.error("[Game] Auto-reveal error:", err);
        setError("Failed to auto-reveal: " + err.message);
      }
      setIsAutoRevealing(false);
    };

    autoReveal();
  }, [gameData?.playerCards?.length, gameData?.playerRevealed?.length, isDealer, shuffledDeck, gameData?.state]);

  // Calculate hand value
  const calculateHandValue = (cards) => {
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
  };

  // Game code helpers
  const getGameCode = () => {
    if (gameId && dealerPubkey) {
      return `${gameId}:${dealerPubkey}`;
    }
    return "";
  };

  const copyGameCode = async () => {
    const code = getGameCode();
    if (code) {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const parseGameCode = (code) => {
    const parts = code.trim().split(":");
    if (parts.length !== 2) {
      throw new Error("Invalid game code format. Expected: gameId:dealerPubkey");
    }
    return {
      gameId: parseInt(parts[0]),
      dealerPubkey: parts[1],
    };
  };

  // Game actions
  const handleCreateGame = async () => {
    setLoading(true);
    setError(null);
    setTxSignature(null);
    setProofError(null);

    try {
      // Phase 1: Generate ZK shuffle proof (30-60s)
      setProofPhase("shuffle");
      const zkResult = await zkInitializeGame();
      console.log("[Game] ZK shuffle proof generated, commitment:", zkResult.deckCommitment);

      // Convert deck commitment from field hex to 32-byte array
      const commitmentBytes = fieldTo32Bytes(zkResult.deckCommitment);

      // Phase 2: Create game on-chain with real commitment
      setProofPhase("create");
      const newGameId = Date.now();
      const result = await createGame(newGameId, commitmentBytes);

      setGameId(newGameId);
      setDealerPubkey(result.dealer);
      setGamePda(result.gamePda.toBase58());
      setIsDealer(true);
      setTxSignature(result.tx);

      // Phase 3: Verify shuffle proof on-chain
      setProofPhase("verify");
      console.log("[Game] Verifying shuffle on-chain...");
      console.log("[Game] Proof size:", zkResult.proof.length);
      console.log("[Game] Public inputs size:", zkResult.publicInputs.length);
      
      const verifyResult = await verifyShuffle(
        newGameId,
        zkResult.proof,
        zkResult.publicInputs
      );
      console.log("[Game] Shuffle verified on-chain:", verifyResult.tx);

      setGameState(GAME_STATES.AWAITING_PLAYER);
      setTxSignature(verifyResult.tx);
      setProofPhase(null);
    } catch (err) {
      console.error("Create game error:", err);
      setProofError(err.message || "Failed to create game");
      setError(err.message || "Failed to create game");
      setProofPhase(null);
    }

    setLoading(false);
  };

  const handleVerifyShuffle = async () => {
    if (!gameId || !dealerPubkey || !shuffleProofData) return;

    setLoading(true);
    setError(null);

    try {
      const result = await verifyShuffle(
        gameId,
        shuffleProofData.proof,
        shuffleProofData.publicInputs
      );
      setTxSignature(result.tx);
    } catch (err) {
      console.error("Verify shuffle error:", err);
      setError(err.message || "Failed to verify shuffle");
    }

    setLoading(false);
  };

  const handleJoinGame = async (codeOverride) => {
    const code = (codeOverride || joinGameCode).trim();
    if (!code) {
      setError("Please enter a Game Code");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { gameId: parsedGameId, dealerPubkey: parsedDealer } = parseGameCode(code);
      const result = await joinGame(parsedGameId, parsedDealer);

      setGameId(parsedGameId);
      setDealerPubkey(parsedDealer);
      setGamePda(result.gamePda.toBase58());
      setIsDealer(false);
      setTxSignature(result.tx);
    } catch (err) {
      console.error("Join game error:", err);
      setError(err.message || "Failed to join game");
    }

    setLoading(false);
  };

  const handleDealCards = async () => {
    if (!gameId || !dealerPubkey || !shuffledDeck) return;

    setLoading(true);
    setError(null);

    try {
      // SECURITY FIX: Generate full Groth16 deal proof for position 0
      // This proves the first card comes from the committed shuffled deck
      console.log("[Game] Generating deal proof for position 0 (takes ~30-60s)...");
      const dealProofData = await dealCardAtPosition(0);
      console.log("[Game] Deal proof generated for position 0");

      // Compute remaining card commitments (positions 1-9) without full proofs
      // Position 0's commitment was already computed by dealCardAtPosition
      console.log("[Game] Computing remaining card commitments (positions 1-9)...");
      const commitments = [fieldTo32Bytes(dealProofData.cardCommitment)];
      for (let i = 1; i < 10; i++) {
        const result = await computeCardCommitmentAtPosition(i);
        commitments.push(fieldTo32Bytes(result.cardCommitment));
      }
      console.log("[Game] All 10 commitments computed");

      // Initial card values from the real shuffled deck:
      // Position 0 = player card 1, Position 1 = player card 2, Position 2 = dealer upcard
      // Position 3 = dealer hole card (hidden)
      const initialCardValues = [
        shuffledDeck[0],  // Player card 1
        shuffledDeck[1],  // Player card 2
        shuffledDeck[2],  // Dealer upcard
      ];
      console.log("[Game] Initial card values:", initialCardValues);

      // Submit with ZK deal proof for on-chain verification
      await dealInitialHand(
        gameId,
        dealerPubkey,
        commitments,
        initialCardValues,
        dealProofData.proof,        // Groth16 proof bytes
        dealProofData.publicInputs  // Public inputs for verifier
      );
    } catch (err) {
      console.error("Deal cards error:", err);

      // Extract detailed error info for debugging
      if (err.logs) {
        console.error("[Game] Transaction logs:", err.logs);
      }
      if (err.error) {
        console.error("[Game] Error details:", err.error);
      }
      if (err.message) {
        console.error("[Game] Error message:", err.message);
      }

      let errorMessage = err.message || "Failed to deal cards";

      // Handle common wallet errors
      if (err.name === "WalletSignTransactionError" || errorMessage.includes("Unexpected error")) {
        errorMessage = "Wallet transaction failed. Please try again and keep your wallet open.";
      } else if (errorMessage.includes("User rejected")) {
        errorMessage = "Transaction rejected by user.";
      } else if (err.logs) {
        // Try to extract the actual error from transaction logs
        const errorLog = err.logs.find(log => log.includes("Error") || log.includes("failed"));
        if (errorLog) {
          errorMessage = `Deal failed: ${errorLog}`;
        }
      }

      setError(errorMessage);
    }

    setLoading(false);
  };

  const handleHit = async () => {
    if (!gameId || !dealerPubkey) return;

    setLoading(true);
    setError(null);

    try {
      // SECURITY FIX: Card is dealt as commitment only
      // Dealer's auto-reveal mechanism will reveal the card with ZK proof verification
      console.log("[Game] Hit - requesting card at position:", gameData?.deckPosition);
      await playerAction(gameId, "hit", dealerPubkey);
    } catch (err) {
      console.error("Hit error:", err);
      setError(err.message || "Failed to hit");
    }

    setLoading(false);
  };

  const handleStand = async () => {
    if (!gameId || !dealerPubkey) return;

    setLoading(true);
    setError(null);

    try {
      await playerAction(gameId, "stand", dealerPubkey);
    } catch (err) {
      console.error("Stand error:", err);
      setError(err.message || "Failed to stand");
    }

    setLoading(false);
  };

  const handleDouble = async () => {
    if (!gameId || !dealerPubkey) return;

    setLoading(true);
    setError(null);

    try {
      // SECURITY FIX: Card is dealt as commitment only
      // Dealer's auto-reveal mechanism will reveal the card with ZK proof verification
      console.log("[Game] Double - requesting card at position:", gameData?.deckPosition);
      await playerAction(gameId, "double", dealerPubkey);
    } catch (err) {
      console.error("Double error:", err);
      setError(err.message || "Failed to double");
    }

    setLoading(false);
  };

  const handleRevealCards = async () => {
    if (!gameId || !dealerPubkey || !gameData) return;

    // Prevent double-click: check if already revealing or all cards revealed
    const playerAlreadyRevealed = gameData.playerRevealed?.length || 0;
    const dealerAlreadyRevealed = gameData.dealerRevealed?.length || 0;
    const allPlayerRevealed = playerAlreadyRevealed >= gameData.playerCards.length;
    const allDealerRevealed = dealerAlreadyRevealed >= gameData.dealerCards.length;

    if (allPlayerRevealed && allDealerRevealed) {
      console.log("All cards already revealed");
      // Refetch to get final state
      const data = await fetchGame(gameId, dealerPubkey);
      if (data) {
        setGameData(data);
        setGameState(data.state);
      }
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Only reveal cards that haven't been revealed yet
      // Player cards after initial 2, dealer's hole card (index 1)
      const playerUnrevealedCount = gameData.playerCards.length - playerAlreadyRevealed;
      const dealerUnrevealedCount = gameData.dealerCards.length - dealerAlreadyRevealed;

      // Use actual shuffled deck values for unrevealed cards
      if (!shuffledDeck) {
        throw new Error("Shuffled deck not available - dealer must be in same session for demo");
      }

      // Deck layout:
      // Position 0,1 = player initial cards
      // Position 2,3 = dealer initial cards (upcard, hole)
      // Position 4+ = hit cards (player hits first, then dealer hits)
      const playerHitCount = gameData.playerCards.length - 2;

      // Generate reveal proofs and collect card values for player cards
      const playerCardValues = [];
      const playerProofs = [];
      for (let i = 0; i < playerUnrevealedCount; i++) {
        const cardIndex = playerAlreadyRevealed + i;
        // First 2 player cards are deck[0] and deck[1], hits start at deck[4]
        const deckPos = cardIndex < 2 ? cardIndex : 4 + (cardIndex - 2);
        playerCardValues.push(shuffledDeck[deckPos]);

        // Generate ZK reveal proof for this card position
        console.log(`[Game] Generating reveal proof for player card ${cardIndex} (deckPos: ${deckPos})`);
        const proofData = await generateRevealProof(deckPos);
        playerProofs.push(proofData);
      }

      // Generate reveal proofs and collect card values for dealer cards
      const dealerCardValues = [];
      const dealerProofs = [];
      for (let i = 0; i < dealerUnrevealedCount; i++) {
        const cardIndex = dealerAlreadyRevealed + i;
        // First 2 dealer cards are deck[2] and deck[3], hits start after player hits
        const deckPos = cardIndex < 2 ? 2 + cardIndex : 4 + playerHitCount + (cardIndex - 2);
        dealerCardValues.push(shuffledDeck[deckPos]);

        // Generate ZK reveal proof for this card position
        console.log(`[Game] Generating reveal proof for dealer card ${cardIndex} (deckPos: ${deckPos})`);
        const proofData = await generateRevealProof(deckPos);
        dealerProofs.push(proofData);
      }

      // Reveal unrevealed cards in one batched transaction with proofs
      if (playerCardValues.length > 0 || dealerCardValues.length > 0) {
        await revealAllCards(
          gameId,
          playerCardValues,
          dealerCardValues,
          playerProofs,             // ZK proofs for player cards
          dealerProofs,             // ZK proofs for dealer cards
          dealerPubkey,
          playerAlreadyRevealed,    // Start index for player
          dealerAlreadyRevealed     // Start index for dealer
        );
      }

      // Refetch game state to get updated winner
      const data = await fetchGame(gameId, dealerPubkey);
      if (data) {
        setGameData(data);
        setGameState(data.state);
      }
    } catch (err) {
      console.error("Reveal cards error:", err);
      setError(err.message || "Failed to reveal cards");
    }

    setLoading(false);
  };

  const handleDealerPlayTurn = async () => {
    if (!gameId || !dealerPubkey) return;

    setLoading(true);
    setError(null);

    try {
      // SECURITY FIX: Generate ZK reveal proofs for each dealer card
      // This prevents dealer from claiming arbitrary card values
      if (!shuffledDeck) {
        throw new Error("Shuffled deck not available - dealer must be in same session for demo");
      }

      // --- ANIMATION START ---
      // Freeze UI at current state while processing
      setIsAnimatingDealerTurn(true);
      
      // Initialize local state with current game state
      const currentDealerCards = [...(gameData?.dealerCards || [])];
      const currentDealerRevealed = [...(gameData?.dealerRevealed || [])];
      
      setLocalDealerState({
        cards: [...currentDealerCards],
        revealed: [...currentDealerRevealed]
      });

      // Step 1: Generate reveal proof for hole card (deck position 3)
      console.log("[Game] Generating ZK reveal proof for hole card (position 3)...");
      const holeCardProof = await generateRevealProof(3);
      const holeCardValue = shuffledDeck[3];

      // VALIDATION: Ensure card values are in valid range (0-12)
      if (typeof holeCardValue !== 'number' || holeCardValue < 0 || holeCardValue >= 13) {
        throw new Error(`Invalid hole card value: ${holeCardValue} (type: ${typeof holeCardValue}). Expected 0-12.`);
      }

      // Step 2: Simulate dealer hit logic locally to determine needed cards
      // Start with dealer's revealed upcard (from gameData) + hole card
      const dealerUpcard = dealerRevealed[0];  // Already revealed upcard
      let simulatedHand = [dealerUpcard, holeCardValue];
      let dealerTotal = calculateHandValue(simulatedHand);

      // Collect card values and proofs
      const cardValues = [holeCardValue];
      const proofs = [holeCardProof.proof];
      const publicInputsList = [holeCardProof.publicInputs];

      // Step 3: Generate proofs for each hit card needed (until 17+)
      let hitPosition = gameData?.deckPosition || 4;
      while (dealerTotal < 17 && hitPosition < shuffledDeck.length) {
        const hitCardValue = shuffledDeck[hitPosition];

        // VALIDATION: Ensure hit card values are in valid range (0-12)
        if (typeof hitCardValue !== 'number' || hitCardValue < 0 || hitCardValue >= 13) {
          throw new Error(`Invalid hit card value at position ${hitPosition}: ${hitCardValue} (type: ${typeof hitCardValue}). Expected 0-12.`);
        }

        console.log(`[Game] Generating ZK reveal proof for hit card (position ${hitPosition}, value ${hitCardValue})...`);
        const hitProof = await generateRevealProof(hitPosition);

        cardValues.push(hitCardValue);
        proofs.push(hitProof.proof);
        publicInputsList.push(hitProof.publicInputs);

        // Update simulated hand for next iteration
        simulatedHand.push(hitCardValue);
        dealerTotal = calculateHandValue(simulatedHand);
        hitPosition++;

        console.log(`[Game] Dealer hit: ${hitCardValue}, new total: ${dealerTotal}`);
      }

      console.log(`[Game] Dealer turn - final hand: [${simulatedHand.join(', ')}], total: ${dealerTotal}`);
      console.log(`[Game] Submitting ${cardValues.length} card(s) with ZK proofs to chain...`);

      // FINAL VALIDATION: Check all card values before submission
      for (let i = 0; i < cardValues.length; i++) {
        const cv = cardValues[i];
        if (typeof cv !== 'number' || cv < 0 || cv >= 13 || !Number.isInteger(cv)) {
          throw new Error(`INVALID CARD VALUE at index ${i}: ${cv} (type: ${typeof cv}). All values must be integers 0-12.`);
        }
      }
      console.log(`[Game] Card values validated: [${cardValues.join(', ')}] - all in range 0-12 ✓`);

      // Step 4: Submit to chain with proofs
      // Use sequential submission if 2+ cards to avoid Solana's 1232 byte tx size limit
      if (cardValues.length >= 2) {
        console.log(`[Game] Using sequential submission for ${cardValues.length} cards (avoiding tx size limit)...`);
        
        await dealerPlayTurnSequential(
          gameId,
          dealerPubkey,
          cardValues,
          proofs,
          publicInputsList,
          async (cardNum, total, txSig) => {
            console.log(`[Game] Card ${cardNum}/${total} submitted: ${txSig}`);
            
            // Reveal Hole Card (Card 1)
            if (cardNum === 1) {
                currentDealerRevealed[1] = holeCardValue;
                setLocalDealerState({
                    cards: [...currentDealerCards],
                    revealed: [...currentDealerRevealed]
                });
                await new Promise(r => setTimeout(r, 500));
            }
            
            // If this is a hit card (index >= 1 in cardValues, so cardNum >= 2), reveal it
            if (cardNum >= 2) {
                const hitVal = cardValues[cardNum - 1]; // cardNum is 1-based
                currentDealerCards.push("simulated_commitment"); 
                currentDealerRevealed.push(hitVal);
                setLocalDealerState({
                  cards: [...currentDealerCards],
                  revealed: [...currentDealerRevealed]
                });
                // Small delay to let user see the card
                await new Promise(r => setTimeout(r, 500));
            }
          }
        );
      } else {
        // Single card can fit in one transaction
        await dealerPlayTurn(gameId, dealerPubkey, cardValues, proofs, publicInputsList);
        
        // Reveal Hole Card
        currentDealerRevealed[1] = holeCardValue;
        setLocalDealerState({
            cards: [...currentDealerCards],
            revealed: [...currentDealerRevealed]
        });
        
        // Reveal Hits (if any)
        for (let i = 1; i < cardValues.length; i++) {
            const hitVal = cardValues[i];
            currentDealerCards.push("simulated_commitment"); 
            currentDealerRevealed.push(hitVal);
            setLocalDealerState({
              cards: [...currentDealerCards],
              revealed: [...currentDealerRevealed]
            });
            await new Promise(r => setTimeout(r, 1000));
        }
      }

      // Refetch game state to show final result
      const data = await fetchGame(gameId, dealerPubkey);
      if (data) {
        setGameData(data);
        setGameState(data.state);
      }
      
      // Animation done - allow state to sync from chain
      setIsAnimatingDealerTurn(false);
      
    } catch (err) {
      console.error("Dealer turn error:", err);
      setError(err.message || "Failed to play dealer turn");
      setIsAnimatingDealerTurn(false);
    }

    setLoading(false);
  };

  const handleNewGame = () => {
    setGameState(GAME_STATES.IDLE);
    setGameId(null);
    setDealerPubkey(null);
    setGamePda(null);
    setGameData(null);
    setError(null);
    setTxSignature(null);
    setJoinGameCode("");
    setProofPhase(null);
    setProofError(null);
    setCurrentBet(null);
    setBetTxSignature(null);
    setPayoutProcessed(false);
    setPendingJoinCode(null);
    zkResetGame();
  };

  // Handle transitioning to betting phase (dealer wants to create game)
  // UPDATED: Dealer (Host) creates game WITHOUT betting.
  // Player (Client) bets BEFORE joining.
  // Single Player Demo does both.
  const [bettingIntent, setBettingIntent] = useState(null); // 'join', 'single_player'

  const handleStartHostGame = async () => {
    // Host just creates the game, no bet
    await handleCreateGame();
  };

  // FIXED: Join FIRST, then payment (prevents losing SOL if join fails)
  const handleStartJoinBetting = async () => {
    const code = joinGameCode.trim();
    if (!code) {
      setError("Please enter a Game Code");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { gameId: parsedGameId, dealerPubkey: parsedDealer } = parseGameCode(code);

      // PRE-VALIDATION: Check game exists and is joinable BEFORE attempting join
      console.log("[Game] Pre-validating game state before join...");
      const gameData = await fetchGame(parsedGameId, parsedDealer);

      if (!gameData) {
        throw new Error("Game not found. Please check the game code.");
      }

      if (gameData.state !== GAME_STATES.AWAITING_PLAYER) {
        if (gameData.state === GAME_STATES.CREATED) {
          throw new Error("Game not ready yet. The dealer is still setting up the game.");
        } else if (gameData.state === GAME_STATES.PLAYING) {
          throw new Error("Game already in progress.");
        } else {
          throw new Error(`Cannot join game in ${gameData.state} state.`);
        }
      }

      if (gameData.player) {
        throw new Error("Game is full. Another player already joined.");
      }

      // JOIN GAME FIRST (before any payment)
      console.log("[Game] Pre-validation passed, joining game...");
      const result = await joinGame(parsedGameId, parsedDealer);
      console.log("[Game] Successfully joined game:", result.tx);

      // Join succeeded - now set up state for payment
      setGameId(parsedGameId);
      setDealerPubkey(parsedDealer);
      setGamePda(result.gamePda.toBase58());
      setIsDealer(false);
      setTxSignature(result.tx);

      // NOW show betting UI (user is already in game, safe to bet)
      // Set flag to prevent useEffect from overwriting gameState during betting
      skipOnchainStateSync.current = true;
      setBettingIntent('join_payment');
      setGameState(GAME_STATES.BETTING);

    } catch (err) {
      console.error("Join game error:", err);
      setError(err.message || "Failed to join game - no payment was made");
    }

    setLoading(false);
  };

  const handleStartSinglePlayerBetting = () => {
    setBettingIntent('single_player');
    setGameState(GAME_STATES.BETTING);
  };

  // State for tracking player's bet amount (for dealer to match)
  const [playerBetAmount, setPlayerBetAmount] = useState(null);

  // Handle bet placement - called from BetSelector
  const handleBetPlaced = async (betInfo) => {
    console.log("[Game] Bet placed:", betInfo);
    setCurrentBet(betInfo.amount);
    setBetTxSignature(betInfo.txSignature);

    // After bet is placed, proceed based on intent
    if (bettingIntent === 'single_player') {
      await handleCreateGame();
    } else if (bettingIntent === 'join_payment') {
      // NEW FLOW: User already joined (in handleStartJoinBetting)
      // Now they've placed their bet - wait for dealer to match
      console.log("[Game] Player bet placed, waiting for dealer to match...");
      setPlayerBetAmount(betInfo.amount);

      // Store bet amount in localStorage so dealer can read it
      // (Simple sync mechanism for hackathon - dealer polls this)
      if (gameId) {
        localStorage.setItem(`game_${gameId}_player_bet`, JSON.stringify({
          amount: betInfo.amount,
          timestamp: Date.now(),
          txSignature: betInfo.txSignature
        }));
      }

      // Clear the sync skip flag - betting flow complete
      skipOnchainStateSync.current = false;
      setGameState(GAME_STATES.WAITING_DEALER_BET);
    } else if (bettingIntent === 'join') {
      // LEGACY: Old flow (keeping for backwards compatibility during transition)
      if (pendingJoinCode) {
        await handleJoinGame(pendingJoinCode);
        setPendingJoinCode(null);
      } else {
        setError("No join code provided for joining game.");
      }
    }
  };

  // Handle dealer matching the player's bet
  const handleDealerBetPlaced = async (betInfo) => {
    console.log("[Game] Dealer matched bet:", betInfo);
    setCurrentBet(betInfo.amount);
    setBetTxSignature(betInfo.txSignature);

    // Clear the stored player bet
    if (gameId) {
      localStorage.removeItem(`game_${gameId}_player_bet`);
    }

    // Both bets confirmed - now deal cards
    console.log("[Game] Both bets confirmed, starting game...");
    setGameState(GAME_STATES.PLAYING);
    await handleDealCards();
  };

  // Poll for player bet (dealer side) - check localStorage
  useEffect(() => {
    if (!isDealer || !gameId || gameState !== GAME_STATES.PLAYING) return;

    // Check if there's a pending player bet we need to match
    const checkPlayerBet = () => {
      const stored = localStorage.getItem(`game_${gameId}_player_bet`);
      if (stored) {
        try {
          const betData = JSON.parse(stored);
          if (betData.amount && !playerBetAmount) {
            console.log("[Game] Dealer detected player bet:", betData.amount);
            setPlayerBetAmount(betData.amount);
            setGameState(GAME_STATES.WAITING_DEALER_BET);
          }
        } catch (e) {
          console.error("Failed to parse player bet data:", e);
        }
      }
    };

    checkPlayerBet();
    const interval = setInterval(checkPlayerBet, 2000); // Poll every 2 seconds
    return () => clearInterval(interval);
  }, [isDealer, gameId, gameState, playerBetAmount]);

  // Handle payout when game ends
  const handlePayout = async () => {
    if (!currentBet || payoutProcessed) return;

    const isWinner = gameState === GAME_STATES.PLAYER_WON;
    const isPush = gameState === GAME_STATES.PUSH;

    if (!isWinner && !isPush) {
      // Player lost - no payout
      setPayoutProcessed(true);
      return;
    }

    try {
      setLoading(true);

      // Calculate payout based on game mode:
      // - Multiplayer (dual betting): Winner gets total pot (2x bet = player bet + dealer bet)
      // - Single player: Winner gets 2x their bet from house
      // For multiplayer with matched bets: totalPot = 2 * currentBet (since dealer matched)
      // Winner takes all: 2x bet for win, 1x bet for push (refund)
      const totalPot = currentBet * 2; // Total pot = player bet + dealer matched bet
      const payoutAmount = isWinner ? totalPot : isPush ? currentBet : 0;
      console.log("[Game] Requesting payout:", payoutAmount, "SOL (pot:", totalPot, ")");

      await requestPayout(payoutAmount);
      setPayoutProcessed(true);

      // Refresh escrow balance
      await refreshEscrowBalance();
    } catch (err) {
      console.error("[Game] Payout error:", err);
      setError("Payout failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Render game result with celebrations
  const renderGameResult = () => {
    if (gameState === GAME_STATES.PLAYER_WON) {
      return (
        <motion.div
          initial={{ scale: 0, rotate: -10 }}
          animate={{
            scale: [0, 1.2, 1],
            rotate: [-10, 5, 0],
          }}
          transition={{
            duration: 0.6,
            times: [0, 0.6, 1],
            ease: "easeOut",
          }}
          className="flex flex-col items-center gap-3"
        >
          {/* Confetti-like particles */}
          <div className="relative">
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
                animate={{
                  opacity: [1, 1, 0],
                  scale: [0, 1, 0.5],
                  x: Math.cos(i * 30 * Math.PI / 180) * 80,
                  y: Math.sin(i * 30 * Math.PI / 180) * 80 - 20,
                }}
                transition={{
                  duration: 1,
                  delay: 0.2 + i * 0.05,
                  ease: "easeOut",
                }}
                className="absolute top-1/2 left-1/2 w-3 h-3 rounded-full"
                style={{
                  backgroundColor: ['#936DFF', '#C049FF', '#FFFFFF', '#B8B8CC'][i % 4],
                  marginLeft: -6,
                  marginTop: -6,
                }}
              />
            ))}
            <motion.div
              animate={{
                rotate: [0, -10, 10, -10, 0],
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 0.5,
                delay: 0.3,
                ease: "easeInOut",
              }}
            >
              <Trophy className="w-16 h-16 text-[#936DFF] drop-shadow-[0_0_15px_rgba(147,109,255,0.5)]" />
            </motion.div>
          </div>
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-4xl font-display font-bold text-[#936DFF] drop-shadow-[0_0_10px_rgba(147,109,255,0.3)] tracking-widest uppercase"
          >
            PLAYER WINS!
          </motion.span>
        </motion.div>
      );
    }
    if (gameState === GAME_STATES.DEALER_WON) {
      return (
        <motion.div
          initial={{ scale: 0 }}
          animate={{
            scale: 1,
            x: [0, -10, 10, -10, 10, -5, 5, 0],
          }}
          transition={{
            scale: { duration: 0.3 },
            x: { duration: 0.5, delay: 0.2, ease: "easeInOut" },
          }}
          className="flex flex-col items-center gap-3"
        >
          <motion.div
            animate={{
              rotate: [0, -5, 5, -5, 5, 0],
            }}
            transition={{
              duration: 0.4,
              delay: 0.3,
              ease: "easeInOut",
            }}
          >
            <XCircle className="w-16 h-16 text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]" />
          </motion.div>
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-4xl font-display font-bold text-red-500 tracking-widest uppercase"
          >
            DEALER WINS
          </motion.span>
        </motion.div>
      );
    }
    if (gameState === GAME_STATES.PUSH) {
      return (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
          className="flex flex-col items-center gap-3"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, ease: "easeInOut" }}
          >
            <RefreshCw className="w-16 h-16 text-[#C049FF] drop-shadow-[0_0_15px_rgba(192,73,255,0.5)]" />
          </motion.div>
          <span className="text-4xl font-display font-bold text-[#C049FF] tracking-widest uppercase">PUSH - TIE!</span>
        </motion.div>
      );
    }
    return null;
  };

  // Check if game is over
  const isGameOver = [
    GAME_STATES.PLAYER_WON,
    GAME_STATES.DEALER_WON,
    GAME_STATES.PUSH,
  ].includes(gameState);

  return (
    <div className="min-h-screen bg-[#05010A] text-[#FFFFFF] font-body selection:bg-[#936DFF] selection:text-white overflow-x-hidden relative">
      <Head>
        <title>Umbra</title>
      </Head>
      
      {/* --- TOP BAR --- */}
      <div className="fixed top-0 left-0 w-full flex justify-between items-center px-4 sm:px-6 md:px-8 py-4 sm:py-6 z-50 bg-[#05010A]/80 backdrop-blur-md border-b border-[#936DFF]/20">
          <button 
            onClick={() => navigate('/dashboard')}
            className="group flex items-center gap-4 hover:opacity-80 transition-opacity"
          >
            <LogoStack className="scale-75 text-[#936DFF]" />
            <h1 className="font-display font-bold text-3xl tracking-tighter uppercase text-white group-hover:text-[#936DFF] transition-colors">
              UMBRA
            </h1>
          </button>
          
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-display text-sm sm:text-base tracking-[0.2em] text-[#936DFF] uppercase drop-shadow-[0_0_10px_rgba(147,109,255,0.5)]">
              ZK BLACKJACK
          </div>
          
          <div className="flex items-center gap-4">
            <WalletMultiButton className="!bg-[#936DFF]/10 !border !border-[#936DFF] !text-[#936DFF] hover:!bg-[#936DFF] hover:!text-white !font-display !uppercase !tracking-widest !text-xs !h-8 !px-4 !rounded-none transition-all duration-300" />
          </div>
      </div>

      <div className="pt-24 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto pb-12">
        {/* Wallet Connection Header - MOVED TO NAVBAR */}
        
        {!connected ? (
          /* Not Connected State */
          <BlurFade delay={0.1}>
            <div className="flex flex-col items-center justify-center min-h-[60vh] relative z-10">
              <div className="w-full max-w-lg p-1 border-2 border-[#936DFF] bg-[#05010A] relative">
                {/* Decorative corners */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white -mt-1 -ml-1"></div>
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white -mt-1 -mr-1"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white -mb-1 -ml-1"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white -mb-1 -mr-1"></div>

                <div className="p-8 flex flex-col items-center gap-6 bg-[#05010A] border border-[#936DFF]/30 relative overflow-hidden">
                  <div className="absolute inset-0 bg-[#936DFF]/5 pointer-events-none"></div>
                  
                  {connecting ? (
                    /* Connecting State */
                    <>
                      <Loader2 className="w-16 h-16 text-[#936DFF] animate-spin" />
                      <div className="text-center">
                        <h1 className="font-display font-bold text-3xl uppercase tracking-widest text-white mb-2">
                          Connecting...
                        </h1>
                        <p className="font-body text-[#B8B8CC] text-sm">
                          Please approve the connection in your wallet.
                        </p>
                      </div>
                    </>
                  ) : (
                    /* Not Connected State */
                    <>
                      <Wallet className="w-16 h-16 text-[#936DFF]" />
                      <div className="text-center">
                        <h1 className="font-display font-bold text-3xl uppercase tracking-widest text-white mb-2">
                          Connect Wallet
                        </h1>
                        <p className="font-body text-[#B8B8CC] text-sm max-w-xs mx-auto">
                          Connect your Phantom or Solflare wallet to enter the arena.
                        </p>
                      </div>
                      <WalletMultiButton className="!bg-[#936DFF] hover:!bg-[#C049FF] !rounded-none !py-4 !px-8 !font-display !uppercase !tracking-widest !text-sm transition-all duration-300" />

                      {/* Wallet Error Display */}
                      {walletError && (
                        <div className="p-4 w-full bg-red-500/10 border border-red-500/20">
                          <p className="text-red-400 text-xs font-mono mb-2">{walletError}</p>
                          <button
                            onClick={() => setWalletError(null)}
                            className="text-[10px] uppercase tracking-widest text-[#B8B8CC] hover:text-white underline"
                          >
                            Dismiss
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </BlurFade>
        ) : gameState === GAME_STATES.IDLE ? (
          /* Lobby State */
          <BlurFade delay={0.1}>
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-12 relative z-10">
              <div className="text-center">
                <h1 className="font-display font-bold text-6xl md:text-8xl uppercase tracking-tighter text-white mb-4 drop-shadow-[0_0_30px_rgba(147,109,255,0.3)]">
                  READY TO PLAY?
                </h1>
                <p className="font-display text-[#B8B8CC] tracking-[0.3em] uppercase text-xs">
                  CONNECTED: <span className="text-[#936DFF]">{publicKey?.toBase58().slice(0, 4)}...{publicKey?.toBase58().slice(-4)}</span>
                </p>
              </div>

              <div className="flex flex-col md:flex-row gap-8 items-stretch w-full max-w-4xl">
                {/* Create Game (Dealer) */}
                <button
                  onClick={handleStartHostGame}
                  disabled={loading}
                  className="group relative flex-1 px-8 py-12 border-2 border-[#936DFF] bg-[#05010A] overflow-hidden hover:border-white transition-colors duration-300"
                >
                  <div className="relative z-10 flex flex-col items-center gap-4">
                    <div className="p-4 border border-[#936DFF] rounded-full group-hover:bg-white group-hover:text-black transition-colors duration-300">
                      <Play className="w-8 h-8" />
                    </div>
                    <div className="text-center">
                      <span className="block font-display font-bold text-2xl uppercase tracking-widest text-white mb-2">Host Game</span>
                      <span className="block font-body text-xs uppercase tracking-widest text-[#936DFF]">Be the Dealer</span>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-[#936DFF]/10 transform scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-bottom"></div>
                </button>

                {/* Single Player Demo */}
                <button
                  onClick={handleStartSinglePlayerBetting}
                  disabled={loading}
                  className="group relative flex-1 px-8 py-12 border-2 border-[#936DFF] bg-[#05010A] overflow-hidden hover:border-white transition-colors duration-300"
                >
                  <div className="relative z-10 flex flex-col items-center gap-4">
                    <div className="p-4 border border-[#936DFF] rounded-full group-hover:bg-white group-hover:text-black transition-colors duration-300">
                      <UserPlus className="w-8 h-8" />
                    </div>
                    <div className="text-center">
                      <span className="block font-display font-bold text-2xl uppercase tracking-widest text-white mb-2">Single Player</span>
                      <span className="block font-body text-xs uppercase tracking-widest text-[#936DFF]">Demo Mode</span>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-[#936DFF]/10 transform scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-bottom"></div>
                </button>

                {/* Join Game */}
                <div className="flex-1 flex flex-col gap-4">
                  <div className="flex-1 border-2 border-[#936DFF] bg-[#05010A] p-8 flex flex-col items-center justify-center gap-6 relative overflow-hidden">
                    <div className="w-full">
                      <label className="block font-display text-[10px] uppercase tracking-widest text-[#936DFF] mb-2 text-center">Enter Game Code</label>
                      <input
                        type="text"
                        placeholder="GAME ID : DEALER KEY"
                        value={joinGameCode}
                        onChange={(e) => setJoinGameCode(e.target.value)}
                        className="w-full px-4 py-3 bg-[#05010A] border border-[#936DFF]/50 text-white placeholder:text-[#936DFF]/30 focus:outline-none focus:border-[#936DFF] font-mono text-xs text-center uppercase"
                      />
                    </div>
                    <button
                      onClick={handleStartJoinBetting}
                      disabled={loading || !joinGameCode.trim()}
                      className="w-full py-4 bg-[#936DFF] hover:bg-[#C049FF] text-white font-display font-bold uppercase tracking-widest text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "JOIN GAME"}
                    </button>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-4 w-full max-w-md bg-red-500/10 border border-red-500/20 text-center">
                  <p className="text-red-400 text-xs font-mono">{error}</p>
                </div>
              )}
            </div>
          </BlurFade>
        ) : gameState === GAME_STATES.BETTING ? (
          /* Betting State - Player places private bet before joining */
          <BlurFade delay={0.1}>
            <div className="flex flex-col items-center justify-center min-h-[60vh] relative z-10">
              <div className="w-full max-w-md p-1 border-2 border-[#936DFF] bg-[#05010A] relative">
                {/* Decorative corners */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white -mt-1 -ml-1"></div>
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white -mt-1 -mr-1"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white -mb-1 -ml-1"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white -mb-1 -mr-1"></div>

                <div className="p-8 bg-[#05010A] border border-[#936DFF]/30 relative overflow-hidden">
                  <div className="absolute inset-0 bg-[#936DFF]/5 pointer-events-none"></div>
                  
                  <div className="text-center mb-8 relative z-10">
                    <h1 className="font-display font-bold text-3xl uppercase tracking-widest text-white mb-2">
                      Place Your Bet
                    </h1>
                    <p className="font-body text-[#B8B8CC] text-sm">
                      Place your private bet before joining the game
                    </p>
                  </div>

                  <div className="relative z-10">
                    <BetSelector
                      onBetPlaced={handleBetPlaced}
                      disabled={loading}
                      defaultPaymentMode="shadowwire"
                    />
                  </div>

                  <button
                    onClick={() => { setPendingJoinCode(null); setGameState(GAME_STATES.IDLE); }}
                    className="w-full mt-6 py-3 font-display text-xs uppercase tracking-widest text-[#936DFF] hover:text-white hover:bg-[#936DFF]/10 transition-colors border border-transparent hover:border-[#936DFF]/30"
                  >
                    Cancel
                  </button>

                  {error && (
                    <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 text-center">
                      <p className="text-red-400 text-xs font-mono">{error}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </BlurFade>
        ) : gameState === GAME_STATES.WAITING_DEALER_BET ? (
          /* Waiting for Dealer to Match Bet */
          <BlurFade delay={0.1}>
            <div className="flex flex-col items-center justify-center min-h-[60vh] relative z-10">
              <div className="w-full max-w-lg p-1 border-2 border-[#936DFF] bg-[#05010A] relative">
                {/* Decorative corners */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white -mt-1 -ml-1"></div>
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white -mt-1 -mr-1"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white -mb-1 -ml-1"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white -mb-1 -mr-1"></div>

                <div className="p-8 bg-[#05010A] border border-[#936DFF]/30 relative overflow-hidden">
                  <div className="absolute inset-0 bg-[#936DFF]/5 pointer-events-none"></div>
                  
                  {isDealer ? (
                    /* Dealer View - Match the player's bet */
                    <>
                      <div className="text-center mb-8 relative z-10">
                        <h1 className="font-display font-bold text-3xl uppercase tracking-widest text-white mb-2">
                          Match Bet
                        </h1>
                        <p className="font-body text-[#B8B8CC] text-sm">
                          A player has bet <span className="text-[#936DFF] font-bold">{playerBetAmount} SOL</span>.
                          <br />
                          Match it to start the game.
                        </p>
                      </div>

                      <div className="w-full p-6 border border-[#936DFF] bg-[#05010A] relative overflow-hidden mb-8">
                        <div className="absolute inset-0 bg-[#936DFF]/10 pointer-events-none"></div>
                        <div className="text-center relative z-10">
                          <Coins className="w-8 h-8 mx-auto mb-2 text-[#936DFF]" />
                          <p className="font-display text-[10px] uppercase tracking-widest text-[#936DFF]/60">Player&apos;s Bet</p>
                          <p className="font-display font-bold text-4xl text-white tracking-tighter">{playerBetAmount} SOL</p>
                        </div>
                      </div>

                      <div className="relative z-10">
                        <BetSelector
                          mode="fixed"
                          fixedAmount={playerBetAmount}
                          onBetPlaced={handleDealerBetPlaced}
                          disabled={loading}
                          defaultPaymentMode="shadowwire"
                        />
                      </div>

                      {error && (
                        <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 text-center">
                          <p className="text-red-400 text-xs font-mono">{error}</p>
                        </div>
                      )}
                    </>
                  ) : (
                    /* Player View - Waiting for dealer */
                    <>
                      <div className="text-center mb-8 relative z-10">
                        <h1 className="font-display font-bold text-3xl uppercase tracking-widest text-white mb-2">
                          Bet Placed
                        </h1>
                        <p className="font-body text-[#B8B8CC] text-sm">
                          Waiting for dealer to match...
                        </p>
                      </div>

                      <div className="w-full p-6 border border-[#936DFF] bg-[#05010A] relative overflow-hidden mb-8">
                        <div className="absolute inset-0 bg-[#936DFF]/10 pointer-events-none"></div>
                        <div className="text-center relative z-10">
                          <Clock className="w-8 h-8 mx-auto mb-2 text-[#936DFF] animate-pulse" />
                          <p className="font-display text-[10px] uppercase tracking-widest text-[#936DFF]/60">Your Bet</p>
                          <p className="font-display font-bold text-4xl text-white tracking-tighter">{currentBet} SOL</p>
                          <p className="font-display text-[10px] uppercase tracking-widest text-[#936DFF]/40 mt-2">
                            Total pot: {(currentBet || 0) * 2} SOL
                          </p>
                        </div>
                      </div>

                      <div className="w-full p-4 bg-[#936DFF]/10 border border-[#936DFF]/30 relative z-10">
                        <div className="flex items-center gap-4">
                          <MessageCircle className="w-6 h-6 text-[#936DFF] flex-shrink-0" />
                          <div>
                            <p className="font-display text-[10px] uppercase tracking-widest text-[#936DFF]/60">
                              Tell the dealer:
                            </p>
                            <p className="font-display font-bold text-lg text-white tracking-wide">
                              &ldquo;I bet {currentBet} SOL&rdquo;
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest text-[#B8B8CC]/60">
                        <div className="w-1.5 h-1.5 bg-[#936DFF] rounded-full animate-pulse" />
                        <span>Waiting for match</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </BlurFade>
        ) : (
          /* Game Table */
          <div className="flex flex-col gap-8 relative z-10 max-w-6xl mx-auto">
            
            {/* Game Info Bar */}
            <div className="flex flex-wrap justify-between items-center gap-4 p-4 border-y-2 border-[#936DFF] bg-[#05010A]/80 backdrop-blur-md relative">
              <div className="flex items-center gap-4">
                <div className="flex flex-col">
                  <span className="font-display text-[10px] uppercase tracking-widest text-[#B8B8CC]">Game ID</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[#936DFF] text-sm">{gameId}</span>
                    <button
                      onClick={copyGameCode}
                      className="text-[#B8B8CC] hover:text-white transition-colors"
                    >
                      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    </button>
                    
                    {txSignature && (
                      <a 
                        href={`https://solscan.io/tx/${txSignature}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-4 font-display text-[10px] uppercase tracking-widest text-[#936DFF] hover:text-white transition-colors flex items-center gap-1 border border-[#936DFF]/30 px-2 py-0.5 bg-[#936DFF]/10"
                      >
                        View Transaction
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6">
                {currentBet && (
                  <div className="flex flex-col items-end">
                    <span className="font-display text-[10px] uppercase tracking-widest text-[#B8B8CC]">Current Bet</span>
                    <span className="font-display font-bold text-[#936DFF] flex items-center gap-1">
                      <Coins className="w-3 h-3" />
                      {currentBet} SOL
                    </span>
                  </div>
                )}
                
                <div className="h-8 w-px bg-[#936DFF]/30"></div>

                <div className="flex flex-col items-end">
                  <span className="font-display text-[10px] uppercase tracking-widest text-[#B8B8CC]">Role</span>
                  <span className={cn(
                    "font-display font-bold uppercase tracking-widest text-sm",
                    isDealer ? "text-[#C049FF]" : "text-[#FFFFFF]"
                  )}>
                    {isDealer ? "Dealer" : "Player"}
                  </span>
                </div>
              </div>


            </div>

            {/* --- MAIN GAME TABLE --- */}
            <div className="relative w-full aspect-[3/4] md:aspect-[16/9] border-2 border-[#936DFF] rounded-[3rem] bg-[#05010A] overflow-hidden flex flex-col justify-between p-8 md:p-12">
              {/* Table Felt Texture/Gradient */}
              <div className="absolute inset-0 bg-gradient-to-b from-[#936DFF]/5 via-transparent to-[#936DFF]/5 pointer-events-none"></div>
              
              {/* Center Logo Watermark */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-5 pointer-events-none">
                <h1 className="font-display font-bold text-[15vw] text-[#936DFF] tracking-tighter">UMBRA</h1>
              </div>

              {/* Deck of Cards (Right Side) */}
              <div className="absolute right-4 md:right-8 top-1/2 transform -translate-y-1/2 z-0 hidden md:block">
                <div className="relative w-24 h-32">
                  {[...Array(3)].map((_, i) => (
                    <div 
                      key={i}
                      className="absolute w-full h-full rounded-xl border-2 border-[#936DFF] bg-[#05010A] shadow-lg shadow-[#936DFF]/20"
                      style={{ 
                        top: -i * 2, 
                        left: -i * 2,
                        transform: `rotate(${i * 2}deg)`,
                        zIndex: 10 - i
                      }}
                    >
                      <img 
                        src="/umbra_back.jpg" 
                        alt="Card Back" 
                        className="w-full h-full object-cover rounded-[10px] opacity-60"
                      />
                    </div>
                  ))}
                  {/* Top Card of Deck */}
                  <div className="absolute w-full h-full rounded-xl border-2 border-[#936DFF] bg-[#05010A] shadow-xl shadow-[#936DFF]/30 z-20">
                     <img 
                        src="/umbra_back.jpg" 
                        alt="Card Back" 
                        className="w-full h-full object-cover rounded-[10px]"
                      />
                  </div>
                </div>
              </div>

              {/* DEALER SECTION (TOP) */}
              <div className="flex flex-col items-center gap-4 relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-display font-bold text-sm uppercase tracking-widest text-[#B8B8CC]">Dealer</span>
                  {gameData?.dealer && (
                    <span className="font-mono text-[10px] text-[#936DFF] opacity-60">
                      {gameData.dealer.slice(0, 4)}...{gameData.dealer.slice(-4)}
                    </span>
                  )}
                </div>
                
                <div className="flex gap-4 justify-center min-h-[140px] items-center perspective-1000">
                  {dealerCards.length === 0 ? (
                    <>
                      <CardSlot />
                      <CardSlot />
                    </>
                  ) : (
                    dealerCards.map((_, index) =>
                      dealerRevealed[index] !== undefined ? (
                        <PlayingCard
                          key={index}
                          value={dealerRevealed[index] % 13}
                          suit={SUITS[Math.floor(dealerRevealed[index] / 13)]}
                          delay={index * 0.2}
                        />
                      ) : (
                        <HiddenCard key={index} delay={index * 0.2} />
                      )
                    )
                  )}
                </div>
                
                {dealerRevealed.length > 0 && (
                  <AnimatedValue value={calculateHandValue(dealerRevealed)} isPlayer={false} />
                )}
              </div>

              {/* CENTER AREA (Turn Indicator, Result, Messages) */}
              <div className="flex-1 flex flex-col items-center justify-center gap-6 relative z-10 my-4">
                <AnimatePresence>
                  {(proofPhase || proofError) && (
                    <ProofProgress phase={proofPhase} error={proofError} />
                  )}
                </AnimatePresence>

                {!isGameOver && !proofPhase && (
                  <TurnIndicator
                    gameState={gameState}
                    isDealer={isDealer}
                    cardsDealt={cardsDealt}
                    playerJoined={playerJoined}
                  />
                )}

                <AnimatePresence>
                  {isGameOver && (
                    <div className="flex justify-center">
                      {renderGameResult()}
                    </div>
                  )}
                </AnimatePresence>

                {error && (
                  <div className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-red-400 text-xs font-mono text-center">{error}</p>
                  </div>
                )}

                {isDealer && gameState === GAME_STATES.AWAITING_PLAYER && (
                  <div className="flex flex-col items-center gap-2 bg-[#936DFF]/10 border border-[#936DFF]/30 p-4 rounded-xl backdrop-blur-sm">
                    <p className="font-display text-[10px] uppercase tracking-widest text-[#B8B8CC]">Share Code</p>
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-[#936DFF] text-sm">{getGameCode()}</code>
                      <button onClick={copyGameCode} className="text-white hover:text-[#936DFF]">
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* PLAYER SECTION (BOTTOM) */}
              <div className="flex flex-col items-center gap-4 relative z-10">
                {playerRevealed.length > 0 && (
                  <AnimatedValue value={calculateHandValue(playerRevealed)} isPlayer={true} />
                )}

                <div className="flex gap-4 justify-center min-h-[140px] items-center perspective-1000">
                  {playerCards.length === 0 ? (
                    <>
                      <CardSlot />
                      <CardSlot />
                    </>
                  ) : (
                    playerCards.map((_, index) =>
                      playerRevealed[index] !== undefined ? (
                        <PlayingCard
                          key={index}
                          value={playerRevealed[index] % 13}
                          suit={SUITS[Math.floor(playerRevealed[index] / 13)]}
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

                <div className="flex items-center gap-2 mt-2">
                  <span className="font-display font-bold text-sm uppercase tracking-widest text-[#FFFFFF]">You</span>
                  {gameData?.player && (
                    <span className="font-mono text-[10px] text-[#B8B8CC] opacity-60">
                      {gameData.player.slice(0, 4)}...{gameData.player.slice(-4)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap justify-center gap-4 mt-4 relative z-20">
              {/* Dealer: Verify Shuffle (retry, only if proof data available) */}
              {isDealer && gameState === GAME_STATES.CREATED && shuffleProofData && (
                <button
                  onClick={handleVerifyShuffle}
                  disabled={loading}
                  className="group relative px-6 py-3 border-2 border-[#936DFF] bg-[#05010A] overflow-hidden hover:border-white transition-colors"
                >
                  <span className="relative z-10 flex items-center gap-2 font-display font-bold text-sm uppercase tracking-widest text-[#FFFFFF] group-hover:text-[#05010A] transition-colors duration-300">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Shield className="w-5 h-5" />}
                    Retry Verify Shuffle
                  </span>
                  <div className="absolute inset-0 bg-[#936DFF] transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-in-out"></div>
                </button>
              )}

              {/* Dealer: Enter Player's Bet Amount (cross-browser sync) */}
              {isDealer && gameState === GAME_STATES.PLAYING && !cardsDealt && gameData?.player && !playerBetAmount && (
                <BlurFade delay={0.1}>
                  <div className="w-full max-w-md p-6 border border-[#936DFF] bg-[#05010A] mb-4 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[#936DFF]/5 pointer-events-none"></div>
                    <div className="text-center mb-4 relative z-10">
                      <Coins className="w-12 h-12 mx-auto mb-2 text-[#936DFF]" />
                      <h3 className="font-display font-bold text-lg uppercase tracking-widest text-[#FFFFFF]">
                        Player Joined!
                      </h3>
                      <p className="font-body text-[#B8B8CC] text-xs mt-2">
                        Ask the player how much they bet, then enter it below to match.
                      </p>
                    </div>
                    <div className="flex gap-2 relative z-10">
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="e.g., 0.1"
                        value={manualBetInput}
                        onChange={(e) => setManualBetInput(e.target.value)}
                        className="flex-1 px-4 py-3 bg-[#05010A] border border-[#936DFF] text-[#FFFFFF] placeholder:text-[#936DFF]/50 focus:outline-none focus:bg-[#936DFF]/10 font-display text-sm"
                      />
                      <button
                        onClick={() => {
                          const amount = parseFloat(manualBetInput);
                          if (amount > 0) {
                            setPlayerBetAmount(amount);
                            setGameState(GAME_STATES.WAITING_DEALER_BET);
                          }
                        }}
                        disabled={!manualBetInput || parseFloat(manualBetInput) <= 0}
                        className="group relative px-6 py-3 border border-[#936DFF] overflow-hidden"
                      >
                        <span className="relative z-10 font-display font-bold text-sm uppercase tracking-widest text-[#FFFFFF] group-hover:text-[#05010A] transition-colors duration-300">
                          Match Bet
                        </span>
                        <div className="absolute inset-0 bg-[#936DFF] transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-in-out"></div>
                      </button>
                    </div>
                  </div>
                </BlurFade>
              )}

              {/* Dealer: Deal Cards (only after player joins) */}
              {isDealer && gameState === GAME_STATES.PLAYING && !cardsDealt && (
                <button
                  onClick={handleDealCards}
                  disabled={loading}
                  className="group relative px-8 py-4 border-2 border-[#936DFF] bg-[#05010A] overflow-hidden hover:border-white transition-colors"
                >
                  <span className="relative z-10 flex items-center gap-2 font-display font-bold text-lg uppercase tracking-widest text-[#FFFFFF] group-hover:text-[#05010A] transition-colors duration-300">
                    {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Play className="w-6 h-6" />}
                    Deal Cards
                  </span>
                  <div className="absolute inset-0 bg-[#936DFF] transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-in-out"></div>
                </button>
              )}

              {/* Player: Hit/Stand/Double (only after cards dealt, disabled while pending reveal) */}
              {!isDealer && gameState === GAME_STATES.PLAYING && cardsDealt && playerCards.length <= playerRevealed.length && (
                <>
                  <button
                    onClick={handleHit}
                    disabled={loading}
                    className="group relative px-8 py-4 border-2 border-[#936DFF] bg-[#05010A] overflow-hidden hover:border-white transition-colors"
                  >
                    <span className="relative z-10 flex items-center gap-2 font-display font-bold text-lg uppercase tracking-widest text-[#FFFFFF] group-hover:text-[#05010A] transition-colors duration-300">
                      {loading ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : (
                        <Hand className="w-6 h-6" />
                      )}
                      Hit
                    </span>
                    <div className="absolute inset-0 bg-[#936DFF] transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-in-out"></div>
                  </button>
                  <button
                    onClick={handleStand}
                    disabled={loading}
                    className="group relative px-8 py-4 border-2 border-[#FFFFFF] bg-[#05010A] overflow-hidden hover:border-[#936DFF] transition-colors"
                  >
                    <span className="relative z-10 flex items-center gap-2 font-display font-bold text-lg uppercase tracking-widest text-[#FFFFFF] group-hover:text-[#05010A] transition-colors duration-300">
                      {loading ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : (
                        <Square className="w-6 h-6" />
                      )}
                      Stand
                    </span>
                    <div className="absolute inset-0 bg-[#FFFFFF] transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-in-out"></div>
                  </button>
                  <button
                    onClick={handleDouble}
                    disabled={loading || playerCards.length > 2}
                    className="group relative px-8 py-4 border-2 border-[#936DFF] bg-[#05010A] overflow-hidden hover:border-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="relative z-10 flex items-center gap-2 font-display font-bold text-lg uppercase tracking-widest text-[#FFFFFF] group-hover:text-[#05010A] transition-colors duration-300">
                      {loading ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : (
                        <CopyPlus className="w-6 h-6" />
                      )}
                      Double
                    </span>
                    <div className="absolute inset-0 bg-[#936DFF] transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-in-out"></div>
                  </button>
                </>
              )}

              {/* Dealer: Play turn (reveal hole card, auto-hit until 17+) */}
              {isDealer && gameState === GAME_STATES.DEALER_TURN && (
                <button
                  onClick={handleDealerPlayTurn}
                  disabled={loading}
                  className="group relative px-8 py-4 border-2 border-[#936DFF] bg-[#05010A] overflow-hidden hover:border-white transition-colors"
                >
                  <span className="relative z-10 flex items-center gap-2 font-display font-bold text-lg uppercase tracking-widest text-[#FFFFFF] group-hover:text-[#05010A] transition-colors duration-300">
                    {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Zap className="w-6 h-6" />}
                    Play Dealer Turn
                  </span>
                  <div className="absolute inset-0 bg-[#936DFF] transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-in-out"></div>
                </button>
              )}

              {/* Game over - payout + new game */}
              {isGameOver && (
                <div className="flex flex-wrap justify-center gap-4">
                  {/* Payout button (only for winner/push with active bet) */}
                  {/* Show claim button only to the actual winner based on role */}
                  {currentBet && !payoutProcessed && (
                    (!isDealer && (gameState === GAME_STATES.PLAYER_WON || gameState === GAME_STATES.PUSH)) ||
                    (isDealer && (gameState === GAME_STATES.DEALER_WON || gameState === GAME_STATES.PUSH))
                  ) && (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      whileHover={{ scale: 1.02 }}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      onClick={handlePayout}
                      disabled={loading}
                      className={cn(
                        "flex items-center gap-2 px-8 py-4 border-2 border-[#22c55e] bg-[#05010A] overflow-hidden group relative"
                      )}
                    >
                      <span className="relative z-10 flex items-center gap-2 font-display font-bold text-lg uppercase tracking-widest text-[#22c55e] group-hover:text-[#05010A] transition-colors duration-300">
                        {loading ? (
                          <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                          <Gift className="w-6 h-6" />
                        )}
                        Claim {(gameState === GAME_STATES.PLAYER_WON || gameState === GAME_STATES.DEALER_WON) ? currentBet * 2 : currentBet} SOL
                      </span>
                      <div className="absolute inset-0 bg-[#22c55e] transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-in-out"></div>
                    </motion.button>
                  )}

                  {/* Show payout success */}
                  {payoutProcessed && currentBet && (
                    <div className="flex items-center gap-2 px-8 py-4 border border-[#936DFF] bg-[#936DFF]/10 text-[#936DFF] font-display text-sm uppercase tracking-widest">
                      <Check className="w-6 h-6" />
                      Payout Claimed!
                    </div>
                  )}

                  <button
                    onClick={handleNewGame}
                    className="group relative px-8 py-4 border-2 border-[#FFFFFF] bg-[#05010A] overflow-hidden hover:border-[#936DFF] transition-colors"
                  >
                    <span className="relative z-10 flex items-center gap-2 font-display font-bold text-lg uppercase tracking-widest text-[#FFFFFF] group-hover:text-[#05010A] transition-colors duration-300">
                      <RefreshCw className="w-6 h-6" />
                      New Game
                    </span>
                    <div className="absolute inset-0 bg-[#FFFFFF] transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-in-out"></div>
                  </button>
                </div>
              )}
            </div>

            {/* Debug Panel */}
            {gameData && (
              <details className="mt-12 p-4 rounded-xl bg-white/5 border border-white/10 max-w-2xl mx-auto">
                <summary className="cursor-pointer text-[#B8B8CC] text-xs font-display uppercase tracking-widest hover:text-white transition-colors">
                  Debug: Game Account Data
                </summary>
                <pre className="mt-4 text-[10px] text-[#936DFF] font-mono overflow-auto bg-black/50 p-4 rounded-lg">
                  {JSON.stringify(gameData, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
