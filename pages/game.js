import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { motion, AnimatePresence } from "framer-motion";
import { PlayingCard, HiddenCard, CardSlot } from "../components/game/PlayingCard";
import { ProofProgress } from "../components/game/ProofProgress";
import { BlurFade } from "../components/ui/blur-fade";
import { useGameProgram } from "../hooks/useGameProgram";
import { useZKGame } from "../hooks/useZKGame";
import { cn } from "../lib/utils";
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
} from "lucide-react";

// Game states matching smart contract
const GAME_STATES = {
  IDLE: "idle",
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
  let colorClass = "text-gray-300";
  let glowClass = "";

  if (value === 21) {
    colorClass = "text-yellow-400";
    glowClass = "drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]";
  } else if (value > 21) {
    colorClass = "text-red-500";
    glowClass = "drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]";
  } else if (value >= 17 && value <= 20) {
    colorClass = isPlayer ? "text-green-400" : "text-gray-300";
    glowClass = isPlayer ? "drop-shadow-[0_0_8px_rgba(34,197,94,0.3)]" : "";
  } else if (value >= 12 && value < 17 && isPlayer) {
    colorClass = "text-yellow-300";
  }

  return (
    <motion.span
      animate={isAnimating ? { scale: [1, 1.2, 1] } : {}}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className={cn("text-lg font-bold", colorClass, glowClass)}
    >
      Total: {displayValue}
      {value === 21 && (
        <motion.span
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="ml-2 text-yellow-400"
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
  let color = "text-yellow-400";

  if (gameState === GAME_STATES.CREATED) {
    if (isDealer) {
      message = "Verify Your Shuffle";
      subMessage = "Submit the ZK proof to prove fair shuffle";
      icon = <Shield className="w-6 h-6" />;
      color = "text-purple-400";
    } else {
      message = "Waiting for Dealer";
      subMessage = "Dealer is preparing the game...";
      icon = <Clock className="w-6 h-6 animate-pulse" />;
    }
  } else if (gameState === GAME_STATES.AWAITING_PLAYER) {
    if (isDealer) {
      message = "Waiting for Player";
      subMessage = "Share the game code with a friend";
      icon = <Users className="w-6 h-6 animate-pulse" />;
    } else {
      message = "Ready to Join";
      subMessage = "Click Join to enter the game";
      icon = <Zap className="w-6 h-6" />;
      color = "text-green-400";
    }
  } else if (gameState === GAME_STATES.PLAYING) {
    if (!cardsDealt) {
      if (isDealer) {
        message = "Deal the Cards";
        subMessage = "Deal 2 cards to each player";
        icon = <Play className="w-6 h-6" />;
        color = "text-green-400";
      } else {
        message = "Waiting for Cards";
        subMessage = "Dealer is dealing cards...";
        icon = <Clock className="w-6 h-6 animate-pulse" />;
      }
    } else {
      if (isDealer) {
        message = "Player's Turn";
        subMessage = "Waiting for player to Hit or Stand...";
        icon = <Hand className="w-6 h-6" />;
        color = "text-blue-400";
      } else {
        message = "Your Turn!";
        subMessage = "Choose: Hit, Stand, or Double";
        icon = <Zap className="w-6 h-6" />;
        color = "text-green-400";
      }
    }
  } else if (gameState === GAME_STATES.DEALER_TURN) {
    if (isDealer) {
      message = "Play Your Turn";
      subMessage = "Reveal hole card, hit until 17+";
      icon = <Zap className="w-6 h-6" />;
      color = "text-green-400";
    } else {
      message = "Dealer's Turn";
      subMessage = "Dealer is playing their hand...";
      icon = <Clock className="w-6 h-6 animate-pulse" />;
    }
  }

  if (!message) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex items-center gap-3 px-6 py-4 rounded-xl",
        "bg-white/5 border border-white/10",
        color
      )}
    >
      {icon}
      <div>
        <p className="font-semibold">{message}</p>
        <p className="text-sm text-gray-400">{subMessage}</p>
      </div>
    </motion.div>
  );
}

export default function GamePage() {
  const { publicKey, connected, connecting, wallet } = useWallet();
  const {
    createGame,
    verifyShuffle,
    joinGame,
    dealInitialHand,
    dealCard,
    playerAction,
    revealCard,
    revealAllCards,
    dealerPlayTurn,
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
    fieldTo32Bytes,
    resetGame: zkResetGame,
    shuffleProofData,
  } = useZKGame();

  // Proof generation progress
  const [proofPhase, setProofPhase] = useState(null);
  const [proofError, setProofError] = useState(null);

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

  // Join game input
  const [joinGameCode, setJoinGameCode] = useState("");
  const [copied, setCopied] = useState(false);

  // Derived state
  const playerCards = gameData?.playerCards || [];
  const dealerCards = gameData?.dealerCards || [];
  const playerRevealed = gameData?.playerRevealed || [];
  const dealerRevealed = gameData?.dealerRevealed || [];
  const cardsDealt = playerCards.length >= 2 && dealerCards.length >= 2;
  const playerJoined = gameData?.player !== null;

  // Subscribe to game updates
  useEffect(() => {
    if (!gameId || !dealerPubkey || !programConnected) return;

    const unsubscribe = subscribeToGame(gameId, dealerPubkey, (data) => {
      console.log("Game update:", data);
      setGameData(data);
      setGameState(data.state);

      if (publicKey) {
        setIsDealer(data.dealer === publicKey.toBase58());
      }
    });

    // Initial fetch
    fetchGame(gameId, dealerPubkey).then((data) => {
      if (data) {
        console.log("Initial game data:", data);
        setGameData(data);
        setGameState(data.state);
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

  const handleJoinGame = async () => {
    const code = joinGameCode.trim();
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
      // Compute 10 real card commitments via Poseidon hash (~1s each, ~10s total)
      console.log("[Game] Computing 10 card commitments...");
      const commitments = [];
      for (let i = 0; i < 10; i++) {
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

      await dealInitialHand(gameId, dealerPubkey, commitments, initialCardValues);
    } catch (err) {
      console.error("Deal cards error:", err);
      setError(err.message || "Failed to deal cards");
    }

    setLoading(false);
  };

  const handleHit = async () => {
    if (!gameId || !dealerPubkey) return;

    setLoading(true);
    setError(null);

    try {
      // Get real card value from shuffled deck at current deck position
      const cardValue = shuffledDeck ? shuffledDeck[gameData?.deckPosition || 4] : null;
      console.log("[Game] Hit - card value:", cardValue, "from position:", gameData?.deckPosition);
      await playerAction(gameId, "hit", dealerPubkey, cardValue);
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
      const cardValue = shuffledDeck ? shuffledDeck[gameData?.deckPosition || 4] : null;
      console.log("[Game] Double - card value:", cardValue, "from position:", gameData?.deckPosition);
      await playerAction(gameId, "double", dealerPubkey, cardValue);
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

      // Generate random values for unrevealed cards only
      const playerCardValues = [];
      for (let i = 0; i < playerUnrevealedCount; i++) {
        playerCardValues.push(Math.floor(Math.random() * 13));
      }

      const dealerCardValues = [];
      for (let i = 0; i < dealerUnrevealedCount; i++) {
        dealerCardValues.push(Math.floor(Math.random() * 13));
      }

      // Reveal unrevealed cards in one batched transaction
      if (playerCardValues.length > 0 || dealerCardValues.length > 0) {
        await revealAllCards(
          gameId,
          playerCardValues,
          dealerCardValues,
          dealerPubkey,
          playerAlreadyRevealed,  // Start index for player
          dealerAlreadyRevealed   // Start index for dealer
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
      // Build real dealer card values from shuffled deck:
      // [0] = hole card (position 3 in deck), [1..5] = potential hit cards
      let dealerCardValues = null;
      if (shuffledDeck) {
        const deckPos = gameData?.deckPosition || 4;
        dealerCardValues = [
          shuffledDeck[3],  // Hole card
          ...shuffledDeck.slice(deckPos, deckPos + 5),  // Up to 5 hit cards
        ];
        console.log("[Game] Dealer turn - hole card:", shuffledDeck[3], "hit cards from pos:", deckPos);
      }

      await dealerPlayTurn(gameId, dealerPubkey, dealerCardValues);

      // Refetch game state to show result
      const data = await fetchGame(gameId, dealerPubkey);
      if (data) {
        setGameData(data);
        setGameState(data.state);
      }
    } catch (err) {
      console.error("Dealer turn error:", err);
      setError(err.message || "Failed to play dealer turn");
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
    zkResetGame();
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
                  backgroundColor: ['#22c55e', '#eab308', '#3b82f6', '#ec4899'][i % 4],
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
              <Trophy className="w-16 h-16 text-green-400 drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]" />
            </motion.div>
          </div>
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-bold text-green-400 drop-shadow-[0_0_10px_rgba(34,197,94,0.3)]"
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
            <XCircle className="w-16 h-16 text-red-400 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]" />
          </motion.div>
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-bold text-red-400"
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
            <RefreshCw className="w-16 h-16 text-yellow-400 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]" />
          </motion.div>
          <span className="text-3xl font-bold text-yellow-400">PUSH - TIE!</span>
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
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-white/10 p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <a
            href="/"
            className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"
          >
            ZK Card Arena
          </a>
          <div className="flex items-center gap-3">
            <span className="text-xs px-2 py-1 rounded bg-yellow-500/20 text-yellow-400">
              Devnet
            </span>
            <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700 !rounded-lg" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-4 md:p-8">
        {!connected ? (
          /* Not Connected State */
          <BlurFade delay={0.1}>
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
              {connecting ? (
                /* Connecting State */
                <>
                  <Loader2 className="w-16 h-16 text-purple-400 animate-spin" />
                  <h1 className="text-3xl md:text-4xl font-bold text-center">
                    Connecting to Wallet...
                  </h1>
                  <p className="text-gray-400 text-center max-w-md">
                    Please approve the connection in your wallet.
                  </p>
                </>
              ) : (
                /* Not Connected State */
                <>
                  <Wallet className="w-16 h-16 text-purple-400" />
                  <h1 className="text-3xl md:text-4xl font-bold text-center">
                    Connect Your Wallet to Play
                  </h1>
                  <p className="text-gray-400 text-center max-w-md">
                    Connect your Phantom or Solflare wallet to start playing
                    provably fair Blackjack on Solana.
                  </p>
                  <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700 !rounded-lg !py-3 !px-6 !text-lg" />

                  {/* Wallet Error Display */}
                  {walletError && (
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 max-w-md">
                      <p className="text-red-400 text-sm mb-2">{walletError}</p>
                      <button
                        onClick={() => setWalletError(null)}
                        className="text-xs text-gray-400 hover:text-white underline"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </BlurFade>
        ) : gameState === GAME_STATES.IDLE ? (
          /* Lobby State */
          <BlurFade delay={0.1}>
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
              <h1 className="text-3xl md:text-4xl font-bold text-center">
                Ready to Play?
              </h1>
              <p className="text-gray-400 text-center">
                Connected: {publicKey?.toBase58().slice(0, 4)}...
                {publicKey?.toBase58().slice(-4)}
              </p>

              <div className="flex flex-col md:flex-row gap-6">
                {/* Create Game */}
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ scale: 1.02 }}
                  onClick={handleCreateGame}
                  disabled={loading}
                  className={cn(
                    "flex items-center gap-3 px-8 py-4 rounded-xl",
                    "bg-gradient-to-r from-purple-600 to-pink-600",
                    "hover:from-purple-500 hover:to-pink-500",
                    "transition-colors duration-300",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  {loading ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <Play className="w-6 h-6" />
                  )}
                  <span className="text-lg font-semibold">Create Game (Dealer)</span>
                </motion.button>

                {/* Join Game */}
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Paste Game Code"
                      value={joinGameCode}
                      onChange={(e) => setJoinGameCode(e.target.value)}
                      className="px-4 py-3 rounded-xl bg-white/10 border border-white/20 focus:border-purple-500 focus:outline-none w-64 font-mono text-sm"
                    />
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      whileHover={{ scale: 1.02 }}
                      onClick={handleJoinGame}
                      disabled={loading || !joinGameCode.trim()}
                      className={cn(
                        "flex items-center gap-2 px-6 py-3 rounded-xl",
                        "bg-white/10 border border-white/20",
                        "hover:bg-white/20",
                        "transition-colors duration-300",
                        "disabled:opacity-50 disabled:cursor-not-allowed"
                      )}
                    >
                      {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <UserPlus className="w-5 h-5" />
                      )}
                      <span>Join</span>
                    </motion.button>
                  </div>
                  <p className="text-xs text-gray-500">Format: gameId:dealerAddress</p>
                </div>
              </div>

              {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 max-w-md">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}
            </div>
          </BlurFade>
        ) : (
          /* Game Table */
          <div className="flex flex-col gap-6">
            {/* Game Info Bar */}
            <div className="flex flex-wrap justify-between items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Game:</span>
                <span className="font-mono text-purple-400 text-xs">
                  {gameId}
                </span>
                <button
                  onClick={copyGameCode}
                  className="p-1 hover:bg-white/10 rounded transition-colors"
                  title="Copy Game Code"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              </div>
              <div className="flex items-center gap-2">
                {zkDeckCommitment && (
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                    ZK Active
                  </span>
                )}
                <span
                  className={cn(
                    "px-3 py-1 rounded-full text-sm font-medium",
                    isDealer
                      ? "bg-purple-500/20 text-purple-400"
                      : "bg-green-500/20 text-green-400"
                  )}
                >
                  {isDealer ? "Dealer" : "Player"}
                </span>
              </div>
              {txSignature && (
                <a
                  href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300"
                >
                  <ExternalLink className="w-3 h-3" />
                  View TX
                </a>
              )}
            </div>

            {/* Proof Progress (during game creation) */}
            <AnimatePresence>
              {(proofPhase || proofError) && (
                <ProofProgress phase={proofPhase} error={proofError} />
              )}
            </AnimatePresence>

            {/* Turn Indicator */}
            {!isGameOver && !proofPhase && (
              <TurnIndicator
                gameState={gameState}
                isDealer={isDealer}
                cardsDealt={cardsDealt}
                playerJoined={playerJoined}
              />
            )}

            {/* Error Display */}
            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Game Code Share (Dealer waiting for player) */}
            {isDealer && gameState === GAME_STATES.AWAITING_PLAYER && (
              <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <p className="text-sm text-gray-400 mb-2">Share this code with a friend:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-3 bg-black/50 rounded-lg text-xs text-purple-400 font-mono break-all">
                    {getGameCode()}
                  </code>
                  <button
                    onClick={copyGameCode}
                    className="p-3 bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors"
                  >
                    {copied ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Dealer Section */}
            <div className="flex flex-col items-center gap-4 p-6 rounded-xl bg-white/5">
              <h2 className="text-lg font-semibold text-gray-400">
                Dealer's Hand
                {gameData?.dealer && (
                  <span className="text-xs ml-2 text-gray-500">
                    ({gameData.dealer.slice(0, 4)}...{gameData.dealer.slice(-4)})
                  </span>
                )}
              </h2>
              <div className="flex gap-3 flex-wrap justify-center min-h-[140px] items-center">
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

            {/* Game Result */}
            <AnimatePresence>
              {isGameOver && (
                <div className="flex justify-center py-4">
                  {renderGameResult()}
                </div>
              )}
            </AnimatePresence>

            {/* Player Section */}
            <div className="flex flex-col items-center gap-4 p-6 rounded-xl bg-white/5">
              <h2 className="text-lg font-semibold text-gray-400">
                Player's Hand
                {gameData?.player && (
                  <span className="text-xs ml-2 text-gray-500">
                    ({gameData.player.slice(0, 4)}...{gameData.player.slice(-4)})
                  </span>
                )}
              </h2>
              <div className="flex gap-3 flex-wrap justify-center min-h-[140px] items-center">
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
                    ) : (
                      <HiddenCard key={index} delay={index * 0.2} />
                    )
                  )
                )}
              </div>
              {playerRevealed.length > 0 && (
                <AnimatedValue value={calculateHandValue(playerRevealed)} isPlayer={true} />
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              {/* Dealer: Verify Shuffle (retry, only if proof data available) */}
              {isDealer && gameState === GAME_STATES.CREATED && shuffleProofData && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ scale: 1.02 }}
                  onClick={handleVerifyShuffle}
                  disabled={loading}
                  className={cn(
                    "flex items-center gap-2 px-6 py-3 rounded-xl",
                    "bg-purple-600 hover:bg-purple-500",
                    "transition-colors duration-300",
                    "disabled:opacity-50"
                  )}
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Shield className="w-5 h-5" />}
                  Retry Verify Shuffle
                </motion.button>
              )}

              {/* Dealer: Deal Cards (only after player joins) */}
              {isDealer && gameState === GAME_STATES.PLAYING && !cardsDealt && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ scale: 1.02 }}
                  onClick={handleDealCards}
                  disabled={loading}
                  className={cn(
                    "flex items-center gap-2 px-6 py-3 rounded-xl",
                    "bg-green-600 hover:bg-green-500",
                    "transition-colors duration-300",
                    "disabled:opacity-50"
                  )}
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                  Deal Cards
                </motion.button>
              )}

              {/* Player: Hit/Stand/Double (only after cards dealt) */}
              {/* Note: Hit now auto-deals from pre-committed cards - no dealer action needed */}
              {!isDealer && gameState === GAME_STATES.PLAYING && cardsDealt && (
                <>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    whileHover={{ scale: 1.02 }}
                    onClick={handleHit}
                    disabled={loading}
                    className={cn(
                      "flex items-center gap-2 px-6 py-3 rounded-xl",
                      "bg-green-600 hover:bg-green-500",
                      "transition-colors duration-300",
                      "disabled:opacity-50"
                    )}
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Hand className="w-5 h-5" />
                    )}
                    Hit
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    whileHover={{ scale: 1.02 }}
                    onClick={handleStand}
                    disabled={loading}
                    className={cn(
                      "flex items-center gap-2 px-6 py-3 rounded-xl",
                      "bg-yellow-600 hover:bg-yellow-500",
                      "transition-colors duration-300",
                      "disabled:opacity-50"
                    )}
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                    Stand
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    whileHover={{ scale: 1.02 }}
                    onClick={handleDouble}
                    disabled={loading || playerCards.length > 2}
                    className={cn(
                      "flex items-center gap-2 px-6 py-3 rounded-xl",
                      "bg-purple-600 hover:bg-purple-500",
                      "transition-colors duration-300",
                      "disabled:opacity-50"
                    )}
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <CopyPlus className="w-5 h-5" />
                    )}
                    Double
                  </motion.button>
                </>
              )}

              {/* Dealer: Play turn (reveal hole card, auto-hit until 17+) */}
              {isDealer && gameState === GAME_STATES.DEALER_TURN && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ scale: 1.02 }}
                  onClick={handleDealerPlayTurn}
                  disabled={loading}
                  className={cn(
                    "flex items-center gap-2 px-6 py-3 rounded-xl",
                    "bg-purple-600 hover:bg-purple-500",
                    "transition-colors duration-300",
                    "disabled:opacity-50"
                  )}
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                  Play Dealer Turn
                </motion.button>
              )}

              {/* Game over - new game */}
              {isGameOver && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ scale: 1.02 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  onClick={handleNewGame}
                  className={cn(
                    "flex items-center gap-2 px-6 py-3 rounded-xl",
                    "bg-white/10 border border-white/20 hover:bg-white/20",
                    "transition-colors duration-300"
                  )}
                >
                  <RefreshCw className="w-5 h-5" />
                  New Game
                </motion.button>
              )}
            </div>

            {/* Debug Panel */}
            {gameData && (
              <details className="mt-8 p-4 rounded-xl bg-white/5 border border-white/10">
                <summary className="cursor-pointer text-gray-400 text-sm">
                  Debug: Game Account Data
                </summary>
                <pre className="mt-4 text-xs text-gray-500 overflow-auto">
                  {JSON.stringify(gameData, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
