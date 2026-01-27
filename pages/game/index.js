/**
 * Game Lobby Page - Create or Join a ZK Card Arena game
 *
 * Two modes:
 * 1. CREATE (As House) - Dealer creates game, becomes the house
 * 2. JOIN (As Player) - Player enters room code to join existing game
 *
 * Design: Uses Umbra design system with #05010A background, #936DFF accent
 */

import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { motion, AnimatePresence } from 'framer-motion';
import { BlurFade } from '../../components/ui/blur-fade';
import { LogoStack } from '../../components/arena/Icons';
import { Play, UserPlus, Loader2, Wallet } from 'lucide-react';

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
  const { publicKey, connected, connecting } = useWallet();
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
    <div className="min-h-screen bg-[#05010A] text-white font-body selection:bg-[#936DFF] selection:text-white overflow-x-hidden relative">
      <Head>
        <title>Game Lobby | Umbra</title>
      </Head>

      {/* Fixed Navbar */}
      <div className="fixed top-0 left-0 w-full flex justify-between items-center px-4 sm:px-6 md:px-8 py-4 sm:py-6 z-50 bg-[#05010A]/80 backdrop-blur-md border-b border-[#936DFF]/20">
        <button
          onClick={() => router.push('/dashboard')}
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

      {/* Main Content */}
      <main className="pt-24 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto pb-12">
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
                    <>
                      <Loader2 className="w-16 h-16 text-[#936DFF] animate-spin" />
                      <div className="text-center relative z-10">
                        <h1 className="font-display font-bold text-3xl uppercase tracking-widest text-white mb-2">
                          Connecting...
                        </h1>
                        <p className="font-body text-[#B8B8CC] text-sm">
                          Please approve the connection in your wallet.
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <Wallet className="w-16 h-16 text-[#936DFF] relative z-10" />
                      <div className="text-center relative z-10">
                        <h1 className="font-display font-bold text-3xl uppercase tracking-widest text-white mb-2">
                          Connect Wallet
                        </h1>
                        <p className="font-body text-[#B8B8CC] text-sm max-w-xs mx-auto">
                          Connect your Phantom or Solflare wallet to enter the arena.
                        </p>
                      </div>
                      <WalletMultiButton className="!bg-[#936DFF] hover:!bg-[#C049FF] !rounded-none !py-4 !px-8 !font-display !uppercase !tracking-widest !text-sm transition-all duration-300 relative z-10" />
                    </>
                  )}
                </div>
              </div>
            </div>
          </BlurFade>
        ) : (
          /* Connected - Show Game Options */
          <BlurFade delay={0.1}>
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
              <div className="w-full max-w-md">
                {/* Title */}
                <div className="text-center mb-12">
                  <h2 className="font-display font-bold text-4xl uppercase tracking-widest text-white mb-4">
                    Play Blackjack
                  </h2>
                  <p className="text-[#B8B8CC] text-sm">
                    Provably fair with zero-knowledge proofs
                  </p>
                </div>

                {/* Error Message */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-300 text-center"
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

                {/* Create Game Section */}
                <section className="mb-8 p-1 border-2 border-[#936DFF] bg-[#05010A] relative">
                  {/* Decorative corners */}
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white -mt-1 -ml-1"></div>
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white -mt-1 -mr-1"></div>
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white -mb-1 -ml-1"></div>
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white -mb-1 -mr-1"></div>

                  <div className="p-6 bg-[#05010A] border border-[#936DFF]/30 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[#936DFF]/5 pointer-events-none"></div>

                    <div className="relative z-10">
                      <div className="flex items-center gap-3 mb-3">
                        <Play className="w-5 h-5 text-[#936DFF]" />
                        <h3 className="font-display font-bold text-xl uppercase tracking-widest text-white">
                          Create Game
                        </h3>
                      </div>
                      <p className="text-[#B8B8CC] text-sm mb-6">
                        You&apos;ll be the dealer (house). Players bet against you.
                      </p>
                      <button
                        onClick={handleCreateGame}
                        disabled={!connected || isCreating}
                        className="group relative w-full py-4 border-2 border-[#936DFF] bg-[#05010A] overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <span className="relative z-10 font-display font-bold text-lg uppercase tracking-widest text-white group-hover:text-[#05010A] transition-colors duration-300 flex items-center justify-center gap-2">
                          {isCreating ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            'Create New Game'
                          )}
                        </span>
                        <div className="absolute inset-0 bg-[#936DFF] transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-in-out"></div>
                      </button>
                    </div>
                  </div>
                </section>

                {/* Divider */}
                <div className="flex items-center gap-4 mb-8">
                  <div className="flex-1 h-px bg-[#936DFF]/30" />
                  <span className="text-[#B8B8CC] text-sm font-display uppercase tracking-widest">OR</span>
                  <div className="flex-1 h-px bg-[#936DFF]/30" />
                </div>

                {/* Join Game Section */}
                <section className="p-1 border-2 border-[#936DFF] bg-[#05010A] relative">
                  {/* Decorative corners */}
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white -mt-1 -ml-1"></div>
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white -mt-1 -mr-1"></div>
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white -mb-1 -ml-1"></div>
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white -mb-1 -mr-1"></div>

                  <div className="p-6 bg-[#05010A] border border-[#936DFF]/30 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[#936DFF]/5 pointer-events-none"></div>

                    <div className="relative z-10">
                      <div className="flex items-center gap-3 mb-3">
                        <UserPlus className="w-5 h-5 text-[#936DFF]" />
                        <h3 className="font-display font-bold text-xl uppercase tracking-widest text-white">
                          Join Game
                        </h3>
                      </div>
                      <p className="text-[#B8B8CC] text-sm mb-6">
                        Enter the 6-character room code to join as a player.
                      </p>
                      <div className="flex gap-3">
                        <input
                          type="text"
                          value={joinCode}
                          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                          placeholder="ABC123"
                          maxLength={6}
                          className="flex-1 px-4 py-3 bg-[#05010A] border-2 border-[#936DFF]/50 text-center text-2xl font-mono tracking-widest placeholder:text-[#B8B8CC]/30 focus:outline-none focus:border-[#936DFF] focus:bg-[#936DFF]/10 transition-colors"
                        />
                        <button
                          onClick={handleJoinGame}
                          disabled={!connected || joinCode.length !== 6}
                          className="group relative px-6 py-3 border-2 border-white bg-[#05010A] overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed hover:border-[#936DFF] transition-colors"
                        >
                          <span className="relative z-10 font-display font-bold uppercase tracking-widest text-white group-hover:text-[#05010A] transition-colors duration-300">
                            Join
                          </span>
                          <div className="absolute inset-0 bg-white transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-in-out"></div>
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </BlurFade>
        )}
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 p-4 text-center text-[#B8B8CC]/50 text-xs font-body bg-[#05010A]/80 backdrop-blur-sm border-t border-[#936DFF]/10">
        Powered by Solana &bull; ZK Proofs by Noir &bull; Privacy by ShadowWire
      </footer>
    </div>
  );
}
