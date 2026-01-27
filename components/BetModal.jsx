/**
 * BetModal - Bet selection modal for players
 *
 * Shows preset bet amounts (0.1, 0.25, 0.5, 1.0 SOL)
 * Player deposits directly to dealer (house) wallet via ShadowWire
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md mx-4 p-8 bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-white/10 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-gradient-to-r from-purple-500 to-pink-500">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Place Your Bet</h2>
            <p className="text-gray-400">Select an amount to play against the house</p>
          </div>

          {/* Error Display */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm text-center"
            >
              {error}
            </motion.div>
          )}

          {/* Bet Amount Buttons */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {BET_AMOUNTS.map((amount) => (
              <motion.button
                key={amount}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleBet(amount)}
                disabled={isProcessing}
                className={`
                  relative py-5 px-6 rounded-xl font-bold text-xl transition-all
                  ${isProcessing && selectedAmount === amount
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/10 hover:bg-white/20 text-white border border-white/10 hover:border-purple-500/50'
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                {isProcessing && selectedAmount === amount ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Sending...</span>
                  </span>
                ) : (
                  <>
                    <span className="text-2xl">{amount}</span>
                    <span className="text-sm text-gray-400 ml-1">SOL</span>
                  </>
                )}
              </motion.button>
            ))}
          </div>

          {/* Info Text */}
          <p className="text-center text-gray-500 text-xs">
            Powered by ShadowWire • Private payments on Solana
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default BetModal;
