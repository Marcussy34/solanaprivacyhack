/**
 * BetModal - Bet selection modal for players
 *
 * Shows preset bet amounts (0.01, 0.05, 0.1, 0.25 SOL)
 * Player deposits directly to dealer (house) wallet via ShadowWire
 *
 * Design: Umbra design system with #05010A bg, #936DFF accent
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, Loader2, AlertTriangle, X } from 'lucide-react';

const BET_AMOUNTS = [0.01, 0.05, 0.1, 0.25];

export function BetModal({
  isOpen,
  onClose,
  onPlaceBet,
  isProcessing = false,
  error = null
}) {
  const [selectedAmount, setSelectedAmount] = useState(null);

  const handleBet = (amount) => {
    setSelectedAmount(amount);
    onPlaceBet(amount);
  };

  // Only allow closing when not processing
  const handleClose = () => {
    if (!isProcessing) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-[#05010A]/90 backdrop-blur-sm"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md mx-4 p-1 border-2 border-[#936DFF] bg-[#05010A]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Decorative corners */}
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white -mt-1 -ml-1"></div>
          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white -mt-1 -mr-1"></div>
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white -mb-1 -ml-1"></div>
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white -mb-1 -mr-1"></div>

          <div className="p-8 bg-[#05010A] border border-[#936DFF]/30 relative overflow-hidden">
            <div className="absolute inset-0 bg-[#936DFF]/5 pointer-events-none"></div>

            {/* Close button */}
            <button
              onClick={handleClose}
              disabled={isProcessing}
              className="absolute top-4 right-4 text-[#B8B8CC] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed z-10"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="relative z-10">
              {/* Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 mb-4 border-2 border-[#936DFF] bg-[#936DFF]/10">
                  <Coins className="w-8 h-8 text-[#936DFF]" />
                </div>
                <h2 className="font-display font-bold text-2xl uppercase tracking-widest text-white mb-2">
                  Place Your Bet
                </h2>
                <p className="text-[#B8B8CC] text-sm">
                  Select an amount to play against the house
                </p>
              </div>

              {/* Error Display - More prominent */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -10, height: 0 }}
                    className="mb-6 p-4 bg-red-500/10 border-2 border-red-500/50 text-center"
                  >
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                      <span className="font-display uppercase tracking-widest text-red-400 text-sm font-bold">
                        Error
                      </span>
                    </div>
                    <p className="text-red-300 text-sm">
                      {error}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Bet Amount Buttons */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {BET_AMOUNTS.map((amount) => (
                  <motion.button
                    key={amount}
                    whileHover={{ scale: isProcessing ? 1 : 1.02 }}
                    whileTap={{ scale: isProcessing ? 1 : 0.98 }}
                    onClick={() => handleBet(amount)}
                    disabled={isProcessing}
                    className={`
                      group relative py-5 px-6 border-2 transition-all overflow-hidden
                      ${isProcessing && selectedAmount === amount
                        ? 'border-[#936DFF] bg-[#936DFF]/20'
                        : 'border-[#936DFF]/50 hover:border-[#936DFF] bg-[#05010A]'
                      }
                      disabled:cursor-not-allowed
                    `}
                  >
                    {isProcessing && selectedAmount === amount ? (
                      <span className="flex items-center justify-center gap-2 text-[#936DFF]">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="font-display uppercase tracking-widest text-sm">Sending...</span>
                      </span>
                    ) : (
                      <>
                        <span className="relative z-10 font-display font-bold text-2xl text-white group-hover:text-[#05010A] transition-colors duration-300">
                          {amount}
                        </span>
                        <span className="relative z-10 text-sm text-[#B8B8CC] ml-1 group-hover:text-[#05010A]/70 transition-colors duration-300">
                          SOL
                        </span>
                        <div className="absolute inset-0 bg-[#936DFF] transform -translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out"></div>
                      </>
                    )}
                  </motion.button>
                ))}
              </div>

              {/* Info Text */}
              <p className="text-center text-[#B8B8CC]/50 text-xs font-display uppercase tracking-widest">
                Powered by ShadowWire • Private payments on Solana
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default BetModal;
