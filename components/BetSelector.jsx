/**
 * BetSelector - Private betting component using ShadowPay
 *
 * Allows players to:
 * 1. Select a bet amount from preset options
 * 2. View their escrow balance
 * 3. Deposit to escrow if needed
 * 4. Place a private bet using ZK proofs
 *
 * @author Marcus (ZK Engineer)
 * @created Jan 24, 2026
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useShadowPay, PaymentStatus } from "../hooks/useShadowPay";
import { cn } from "../lib/utils";
import {
  Loader2,
  Wallet,
  Shield,
  ArrowUp,
  Check,
  AlertCircle,
  Coins,
  Lock,
} from "lucide-react";

// Preset bet amounts in SOL
const BET_OPTIONS = [0.1, 0.25, 0.5, 1.0];

// Status messages for each payment phase
const STATUS_MESSAGES = {
  [PaymentStatus.CHECKING_BALANCE]: "Checking escrow balance...",
  [PaymentStatus.DEPOSITING]: "Depositing to escrow...",
  [PaymentStatus.GENERATING_PROOF]: "Generating ZK proof (5-10s)...",
  [PaymentStatus.VERIFYING]: "Verifying payment proof...",
  [PaymentStatus.SETTLING]: "Settling on-chain (gasless)...",
  [PaymentStatus.COMPLETE]: "Bet placed successfully!",
};

/**
 * Progress indicator for multi-step payment process
 */
function PaymentProgress({ status }) {
  const steps = [
    { key: PaymentStatus.CHECKING_BALANCE, label: "Check Balance" },
    { key: PaymentStatus.DEPOSITING, label: "Deposit" },
    { key: PaymentStatus.GENERATING_PROOF, label: "ZK Proof" },
    { key: PaymentStatus.VERIFYING, label: "Verify" },
    { key: PaymentStatus.SETTLING, label: "Settle" },
  ];

  const currentIndex = steps.findIndex((s) => s.key === status);

  return (
    <div className="flex items-center justify-center gap-1 text-xs">
      {steps.map((step, index) => {
        const isActive = step.key === status;
        const isComplete = index < currentIndex;
        const isPending = index > currentIndex;

        return (
          <div key={step.key} className="flex items-center">
            <div
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-full transition-all",
                isActive && "bg-purple-500/20 text-purple-400",
                isComplete && "bg-green-500/20 text-green-400",
                isPending && "bg-white/5 text-gray-500"
              )}
            >
              {isActive && <Loader2 className="w-3 h-3 animate-spin" />}
              {isComplete && <Check className="w-3 h-3" />}
              <span className="hidden sm:inline">{step.label}</span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "w-2 h-0.5 mx-1",
                  isComplete ? "bg-green-500/50" : "bg-white/10"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * BetSelector component
 *
 * @param {function} onBetPlaced - Callback when bet is successfully placed
 * @param {boolean} disabled - Disable all interactions
 */
export function BetSelector({ onBetPlaced, disabled = false }) {
  const [selectedBet, setSelectedBet] = useState(BET_OPTIONS[0]);
  const [showDeposit, setShowDeposit] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");

  const {
    connected,
    isClientReady,
    escrowBalance,
    status,
    error,
    isLoading,
    getBalance,
    deposit,
    pay,
    clearError,
    HOUSE_WALLET,
  } = useShadowPay();

  // Fetch balance on mount and when connected
  useEffect(() => {
    if (connected) {
      getBalance().catch(console.error);
    }
  }, [connected, getBalance]);

  // Check if deposit is needed
  const needsDeposit = escrowBalance !== null && escrowBalance < selectedBet;

  // Handle placing a bet
  const handlePlaceBet = async () => {
    if (disabled || isLoading) return;

    try {
      clearError();

      // Generate a unique resource URL for this bet
      const resourceUrl = `${window.location.origin}/game?bet=${Date.now()}`;

      // Make the private payment
      const result = await pay(HOUSE_WALLET, selectedBet, resourceUrl);

      // Notify parent component
      if (onBetPlaced) {
        onBetPlaced({
          amount: selectedBet,
          txSignature: result.txSignature,
          paymentId: result.paymentId,
        });
      }
    } catch (err) {
      console.error("Bet placement failed:", err);
    }
  };

  // Handle manual deposit
  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      return;
    }

    try {
      clearError();
      await deposit(amount);
      setShowDeposit(false);
      setDepositAmount("");
    } catch (err) {
      console.error("Deposit failed:", err);
    }
  };

  // Not connected state
  if (!connected) {
    return (
      <div className="p-6 rounded-xl bg-white/5 border border-white/10 text-center">
        <Wallet className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p className="text-gray-400">Connect wallet to place bets</p>
      </div>
    );
  }

  // SDK not ready
  if (!isClientReady) {
    return (
      <div className="p-6 rounded-xl bg-white/5 border border-white/10 text-center">
        <Loader2 className="w-8 h-8 mx-auto mb-4 text-purple-400 animate-spin" />
        <p className="text-gray-400">Loading ShadowPay SDK...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Escrow Balance Display */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
        <div className="flex items-center gap-2">
          <Lock className="w-5 h-5 text-purple-400" />
          <span className="text-sm text-gray-400">Escrow Balance</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-white">
            {escrowBalance !== null ? `${escrowBalance.toFixed(3)} SOL` : "..."}
          </span>
          <button
            onClick={() => setShowDeposit(!showDeposit)}
            className={cn(
              "flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm",
              "bg-purple-600/20 text-purple-400 hover:bg-purple-600/30",
              "transition-colors"
            )}
          >
            <ArrowUp className="w-4 h-4" />
            Deposit
          </button>
        </div>
      </div>

      {/* Deposit Panel (collapsible) */}
      <AnimatePresence>
        {showDeposit && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.1"
                  min="0.01"
                  placeholder="Amount in SOL"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  disabled={isLoading}
                  className={cn(
                    "flex-1 px-4 py-2 rounded-lg",
                    "bg-black/50 border border-white/20",
                    "focus:border-purple-500 focus:outline-none",
                    "disabled:opacity-50"
                  )}
                />
                <button
                  onClick={handleDeposit}
                  disabled={isLoading || !depositAmount}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg",
                    "bg-purple-600 hover:bg-purple-500",
                    "transition-colors",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  {status === PaymentStatus.DEPOSITING ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowUp className="w-4 h-4" />
                  )}
                  Deposit
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-400">
                Funds are held securely in ShadowPay escrow for private betting.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bet Amount Selection */}
      <div className="p-4 rounded-xl bg-white/5 border border-white/10">
        <div className="flex items-center gap-2 mb-4">
          <Coins className="w-5 h-5 text-yellow-400" />
          <span className="text-sm font-medium text-gray-300">Select Bet Amount</span>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-4">
          {BET_OPTIONS.map((amount) => (
            <motion.button
              key={amount}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedBet(amount)}
              disabled={disabled || isLoading}
              className={cn(
                "py-3 px-2 rounded-xl text-center transition-all",
                "border-2",
                selectedBet === amount
                  ? "bg-purple-600/30 border-purple-500 text-white"
                  : "bg-white/5 border-white/10 text-gray-300 hover:border-white/30",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              <span className="text-lg font-bold">{amount}</span>
              <span className="text-xs text-gray-400 block">SOL</span>
            </motion.button>
          ))}
        </div>

        {/* Insufficient balance warning */}
        {needsDeposit && (
          <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
            <p className="text-xs text-yellow-400">
              Insufficient escrow balance. {(selectedBet - (escrowBalance || 0)).toFixed(3)} SOL needed.
              Auto-deposit will be triggered.
            </p>
          </div>
        )}

        {/* Payment Progress */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4"
            >
              <PaymentProgress status={status} />
              <p className="text-center text-sm text-purple-400 mt-2">
                {STATUS_MESSAGES[status] || "Processing..."}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Display */}
        {error && (
          <div className="flex items-start gap-2 p-3 mb-4 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-400">{error}</p>
              <button
                onClick={clearError}
                className="text-xs text-gray-400 hover:text-white underline mt-1"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Place Bet Button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.02 }}
          onClick={handlePlaceBet}
          disabled={disabled || isLoading}
          className={cn(
            "w-full flex items-center justify-center gap-3 py-4 rounded-xl",
            "bg-gradient-to-r from-purple-600 to-pink-600",
            "hover:from-purple-500 hover:to-pink-500",
            "text-white font-semibold text-lg",
            "transition-all duration-300",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Processing...</span>
            </>
          ) : (
            <>
              <Shield className="w-5 h-5" />
              <span>Place {selectedBet} SOL Private Bet</span>
            </>
          )}
        </motion.button>

        {/* Privacy notice */}
        <p className="mt-3 text-center text-xs text-gray-500">
          <Shield className="w-3 h-3 inline mr-1" />
          Your bet amount is hidden on-chain via ZK proofs
        </p>
      </div>
    </div>
  );
}

export default BetSelector;
