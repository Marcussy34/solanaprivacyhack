/**
 * Game Lobby Page - Create or Join a ZK Card Arena game
 *
 * Two modes:
 * 1. CREATE (As House) - Dealer creates game, becomes the house
 * 2. JOIN (As Player) - Player enters room code to join existing game
 */

import { useState } from 'react';
import { useRouter } from 'next/router';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { motion } from 'framer-motion';

// Generate 6-char alphanumeric room code
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No confusing chars (0/O, 1/I/L)
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export default function GameLobby() {
  const router = useRouter();
  const { publicKey, connected } = useWallet();
  const [joinCode, setJoinCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState(null);

  // Handle create game - generates room code and redirects
  const handleCreateGame = async () => {
    if (!connected || !publicKey) {
      setError('Please connect your wallet first');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const roomCode = generateRoomCode();

      // Store initial room data (will be populated with gameId after on-chain creation)
      localStorage.setItem(`room_${roomCode}`, JSON.stringify({
        dealerPubkey: publicKey.toBase58(),
        createdAt: Date.now(),
        status: 'creating'
      }));

      // Redirect to room as dealer
      router.push(`/game/${roomCode}?role=dealer`);
    } catch (err) {
      console.error('Failed to create game:', err);
      setError(err.message || 'Failed to create game');
      setIsCreating(false);
    }
  };

  // Handle join game - validates code and redirects
  const handleJoinGame = () => {
    if (!connected || !publicKey) {
      setError('Please connect your wallet first');
      return;
    }

    const code = joinCode.trim().toUpperCase();
    if (code.length !== 6) {
      setError('Room code must be 6 characters');
      return;
    }

    // Redirect to room as player
    // Note: Room validation removed - localStorage is browser-local
    // Cross-browser multiplayer requires direct redirect; validation happens on room page
    router.push(`/game/${code}?role=player`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white">
      {/* Header */}
      <header className="p-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          ZK Card Arena
        </h1>
        <WalletMultiButton />
      </header>

      {/* Main Content */}
      <main className="flex flex-col items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <h2 className="text-4xl font-bold text-center mb-8">
            Play Blackjack
          </h2>
          <p className="text-gray-400 text-center mb-12">
            Provably fair with zero-knowledge proofs
          </p>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-center"
            >
              {error}
            </motion.div>
          )}

          {/* Create Game Section */}
          <section className="mb-8 p-6 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10">
            <h3 className="text-xl font-semibold mb-2">Create Game</h3>
            <p className="text-gray-400 text-sm mb-4">
              You&apos;ll be the dealer (house). Players bet against you.
            </p>
            <button
              onClick={handleCreateGame}
              disabled={!connected || isCreating}
              className="w-full py-3 px-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed rounded-xl font-semibold transition-all duration-200 transform hover:scale-[1.02]"
            >
              {isCreating ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating...
                </span>
              ) : (
                'Create New Game'
              )}
            </button>
          </section>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-8">
            <div className="flex-1 h-px bg-white/20" />
            <span className="text-gray-500 text-sm">OR</span>
            <div className="flex-1 h-px bg-white/20" />
          </div>

          {/* Join Game Section */}
          <section className="p-6 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10">
            <h3 className="text-xl font-semibold mb-2">Join Game</h3>
            <p className="text-gray-400 text-sm mb-4">
              Enter the 6-character room code to join as a player.
            </p>
            <div className="flex gap-3">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                maxLength={6}
                className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-center text-2xl font-mono tracking-widest placeholder:text-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
              />
              <button
                onClick={handleJoinGame}
                disabled={!connected || joinCode.length !== 6}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:cursor-not-allowed border border-white/20 rounded-xl font-semibold transition-all"
              >
                Join
              </button>
            </div>
          </section>

          {/* Wallet Connection Prompt */}
          {!connected && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-gray-400 mt-8"
            >
              Connect your wallet to get started
            </motion.p>
          )}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 p-4 text-center text-gray-500 text-sm">
        Powered by Solana &bull; ZK Proofs by Noir &bull; Privacy by ShadowWire
      </footer>
    </div>
  );
}
