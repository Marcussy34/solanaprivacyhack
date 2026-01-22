import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { motion, AnimatePresence } from "framer-motion";
import { PlayingCard, HiddenCard, CardSlot } from "../components/game/PlayingCard";
import { BlurFade } from "../components/ui/blur-fade";
import { useGameProgram } from "../hooks/useGameProgram";
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

// Turn Indicator Component
function TurnIndicator({ gameState, isDealer, cardsDealt, playerJoined, pendingHit }) {
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
        if (pendingHit) {
          message = "Player Wants a Card!";
          subMessage = "Click 'Deal Card to Player' now";
          icon = <Zap className="w-6 h-6 animate-bounce" />;
          color = "text-red-400";
        } else {
          message = "Player's Turn";
          subMessage = "Waiting for player to Hit or Stand...";
          icon = <Hand className="w-6 h-6" />;
          color = "text-blue-400";
        }
      } else {
        if (pendingHit) {
          message = "Hit Requested";
          subMessage = "Waiting for dealer to deal card...";
          icon = <Clock className="w-6 h-6 animate-pulse" />;
          color = "text-yellow-400";
        } else {
          message = "Your Turn!";
          subMessage = "Choose: Hit, Stand, or Double";
          icon = <Zap className="w-6 h-6" />;
          color = "text-green-400";
        }
      }
    }
  } else if (gameState === GAME_STATES.DEALER_TURN) {
    if (isDealer) {
      message = "Reveal Cards";
      subMessage = "Show all cards and determine winner";
      icon = <Zap className="w-6 h-6" />;
      color = "text-green-400";
    } else {
      message = "Dealer's Turn";
      subMessage = "Waiting for dealer to reveal cards...";
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
  const { publicKey, connected } = useWallet();
  const {
    createGame,
    verifyShuffle,
    joinGame,
    dealCard,
    playerAction,
    revealCard,
    fetchGame,
    subscribeToGame,
    connected: programConnected,
  } = useGameProgram();

  // Game state
  const [gameState, setGameState] = useState(GAME_STATES.IDLE);
  const [isDealer, setIsDealer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [txSignature, setTxSignature] = useState(null);

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
  const pendingHit = gameData?.pendingHit || false;

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

    try {
      const newGameId = Date.now();
      const result = await createGame(newGameId);

      setGameId(newGameId);
      setDealerPubkey(result.dealer);
      setGamePda(result.gamePda.toBase58());
      setIsDealer(true);
      setGameState(GAME_STATES.CREATED);
      setTxSignature(result.tx);
    } catch (err) {
      console.error("Create game error:", err);
      setError(err.message || "Failed to create game");
    }

    setLoading(false);
  };

  const handleVerifyShuffle = async () => {
    if (!gameId || !dealerPubkey) return;

    setLoading(true);
    setError(null);

    try {
      const result = await verifyShuffle(gameId, dealerPubkey);
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
    if (!gameId || !dealerPubkey) return;

    setLoading(true);
    setError(null);

    try {
      // Deal 2 cards to player, 2 to dealer
      await dealCard(gameId, true, dealerPubkey);
      await dealCard(gameId, true, dealerPubkey);
      await dealCard(gameId, false, dealerPubkey);
      await dealCard(gameId, false, dealerPubkey);
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
      await playerAction(gameId, "double", dealerPubkey);
    } catch (err) {
      console.error("Double error:", err);
      setError(err.message || "Failed to double");
    }

    setLoading(false);
  };

  const handleRevealCards = async () => {
    if (!gameId || !dealerPubkey || !gameData) return;

    setLoading(true);
    setError(null);

    try {
      // Reveal player cards
      for (let i = 0; i < gameData.playerCards.length; i++) {
        if (gameData.playerRevealed[i] === undefined) {
          const cardValue = Math.floor(Math.random() * 13);
          await revealCard(gameId, i, cardValue, true, dealerPubkey);
        }
      }

      // Reveal dealer cards
      for (let i = 0; i < gameData.dealerCards.length; i++) {
        if (gameData.dealerRevealed[i] === undefined) {
          const cardValue = Math.floor(Math.random() * 13);
          await revealCard(gameId, i, cardValue, false, dealerPubkey);
        }
      }
    } catch (err) {
      console.error("Reveal cards error:", err);
      setError(err.message || "Failed to reveal cards");
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
  };

  // Render game result
  const renderGameResult = () => {
    if (gameState === GAME_STATES.PLAYER_WON) {
      return (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="flex flex-col items-center gap-2 text-green-400"
        >
          <Trophy className="w-12 h-12" />
          <span className="text-2xl font-bold">PLAYER WINS!</span>
        </motion.div>
      );
    }
    if (gameState === GAME_STATES.DEALER_WON) {
      return (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="flex flex-col items-center gap-2 text-red-400"
        >
          <XCircle className="w-12 h-12" />
          <span className="text-2xl font-bold">DEALER WINS</span>
        </motion.div>
      );
    }
    if (gameState === GAME_STATES.PUSH) {
      return (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="flex flex-col items-center gap-2 text-yellow-400"
        >
          <RefreshCw className="w-12 h-12" />
          <span className="text-2xl font-bold">PUSH - TIE!</span>
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
              <Wallet className="w-16 h-16 text-purple-400" />
              <h1 className="text-3xl md:text-4xl font-bold text-center">
                Connect Your Wallet to Play
              </h1>
              <p className="text-gray-400 text-center max-w-md">
                Connect your Phantom or Solflare wallet to start playing
                provably fair Blackjack on Solana.
              </p>
              <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700 !rounded-lg !py-3 !px-6 !text-lg" />
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
                <button
                  onClick={handleCreateGame}
                  disabled={loading}
                  className={cn(
                    "flex items-center gap-3 px-8 py-4 rounded-xl",
                    "bg-gradient-to-r from-purple-600 to-pink-600",
                    "hover:from-purple-500 hover:to-pink-500",
                    "transition-all duration-300",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  {loading ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <Play className="w-6 h-6" />
                  )}
                  <span className="text-lg font-semibold">Create Game (Dealer)</span>
                </button>

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
                    <button
                      onClick={handleJoinGame}
                      disabled={loading || !joinGameCode.trim()}
                      className={cn(
                        "flex items-center gap-2 px-6 py-3 rounded-xl",
                        "bg-white/10 border border-white/20",
                        "hover:bg-white/20",
                        "transition-all duration-300",
                        "disabled:opacity-50 disabled:cursor-not-allowed"
                      )}
                    >
                      {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <UserPlus className="w-5 h-5" />
                      )}
                      <span>Join</span>
                    </button>
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

            {/* Turn Indicator */}
            {!isGameOver && (
              <TurnIndicator
                gameState={gameState}
                isDealer={isDealer}
                cardsDealt={cardsDealt}
                playerJoined={playerJoined}
                pendingHit={pendingHit}
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
                <span className="text-lg font-bold text-gray-300">
                  Total: {calculateHandValue(dealerRevealed)}
                </span>
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
                <span className="text-lg font-bold text-green-400">
                  Total: {calculateHandValue(playerRevealed)}
                  {calculateHandValue(playerRevealed) === 21 &&
                    playerRevealed.length === 2 &&
                    " - BLACKJACK!"}
                </span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              {/* Dealer: Verify Shuffle */}
              {isDealer && gameState === GAME_STATES.CREATED && (
                <button
                  onClick={handleVerifyShuffle}
                  disabled={loading}
                  className={cn(
                    "flex items-center gap-2 px-6 py-3 rounded-xl",
                    "bg-purple-600 hover:bg-purple-500",
                    "transition-all duration-300",
                    "disabled:opacity-50"
                  )}
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Shield className="w-5 h-5" />}
                  Verify Shuffle
                </button>
              )}

              {/* Dealer: Deal Cards (only after player joins) */}
              {isDealer && gameState === GAME_STATES.PLAYING && !cardsDealt && (
                <button
                  onClick={handleDealCards}
                  disabled={loading}
                  className={cn(
                    "flex items-center gap-2 px-6 py-3 rounded-xl",
                    "bg-green-600 hover:bg-green-500",
                    "transition-all duration-300",
                    "disabled:opacity-50"
                  )}
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                  Deal Cards
                </button>
              )}

              {/* Dealer: Deal more cards when cards already dealt */}
              {isDealer && gameState === GAME_STATES.PLAYING && cardsDealt && (
                <button
                  onClick={async () => {
                    setLoading(true);
                    try {
                      await dealCard(gameId, true, dealerPubkey);
                    } catch (err) {
                      console.error("Deal card error:", err);
                      setError(err.message || "Failed to deal card");
                    }
                    setLoading(false);
                  }}
                  disabled={loading}
                  className={cn(
                    "flex items-center gap-2 px-6 py-3 rounded-xl",
                    "transition-all duration-300",
                    "disabled:opacity-50",
                    pendingHit
                      ? "bg-red-600 hover:bg-red-500 animate-pulse ring-2 ring-red-400"
                      : "bg-green-600 hover:bg-green-500"
                  )}
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Hand className="w-5 h-5" />}
                  {pendingHit ? "Deal Card Now!" : "Deal Card to Player"}
                </button>
              )}

              {/* Player: Hit/Stand/Double (only after cards dealt) */}
              {!isDealer && gameState === GAME_STATES.PLAYING && cardsDealt && (
                <>
                  <button
                    onClick={handleHit}
                    disabled={loading || pendingHit}
                    className={cn(
                      "flex items-center gap-2 px-6 py-3 rounded-xl",
                      "bg-green-600 hover:bg-green-500",
                      "transition-all duration-300",
                      "disabled:opacity-50"
                    )}
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : pendingHit ? (
                      <Clock className="w-5 h-5 animate-pulse" />
                    ) : (
                      <Hand className="w-5 h-5" />
                    )}
                    {pendingHit ? "Waiting..." : "Hit"}
                  </button>
                  <button
                    onClick={handleStand}
                    disabled={loading || pendingHit}
                    className={cn(
                      "flex items-center gap-2 px-6 py-3 rounded-xl",
                      "bg-yellow-600 hover:bg-yellow-500",
                      "transition-all duration-300",
                      "disabled:opacity-50"
                    )}
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                    Stand
                  </button>
                  <button
                    onClick={handleDouble}
                    disabled={loading || playerCards.length > 2 || pendingHit}
                    className={cn(
                      "flex items-center gap-2 px-6 py-3 rounded-xl",
                      "bg-purple-600 hover:bg-purple-500",
                      "transition-all duration-300",
                      "disabled:opacity-50"
                    )}
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <CopyPlus className="w-5 h-5" />
                    )}
                    Double
                  </button>
                </>
              )}

              {/* Dealer: Reveal cards */}
              {isDealer && gameState === GAME_STATES.DEALER_TURN && (
                <button
                  onClick={handleRevealCards}
                  disabled={loading}
                  className={cn(
                    "flex items-center gap-2 px-6 py-3 rounded-xl",
                    "bg-purple-600 hover:bg-purple-500",
                    "transition-all duration-300",
                    "disabled:opacity-50"
                  )}
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                  Reveal All Cards
                </button>
              )}

              {/* Game over - new game */}
              {isGameOver && (
                <button
                  onClick={handleNewGame}
                  className={cn(
                    "flex items-center gap-2 px-6 py-3 rounded-xl",
                    "bg-white/10 border border-white/20 hover:bg-white/20",
                    "transition-all duration-300"
                  )}
                >
                  <RefreshCw className="w-5 h-5" />
                  New Game
                </button>
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
