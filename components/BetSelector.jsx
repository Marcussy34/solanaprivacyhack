/**
 * BetSelector - Private betting component using ShadowPay
 *
 * Supports three modes:
 * 1. 'preset' - Select from preset bet amounts (default)
 * 2. 'custom' - Enter any custom amount (for dealers creating rooms)
 * 3. 'fixed' - Display-only amount that must be matched (for players joining)
 *
 * @author Marcus (ZK Engineer)
 * @created Jan 24, 2026
 * @updated Jan 25, 2026 - Added custom/fixed modes for room deposit matching
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
  Edit3,
} from "lucide-react";

// Preset bet amounts in SOL (minimum 0.1 SOL due to ShadowWire anti-spam)
const BET_OPTIONS = [0.1, 0.25, 0.5, 1.0];

// ShadowWire minimum transaction amount (anti-spam protection)
const SHADOWWIRE_MIN_AMOUNT = 0.1;

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
 * @param {string} mode - 'preset' | 'custom' | 'fixed'
 * @param {number} fixedAmount - For 'fixed' mode, the amount player must pay
 * @param {number} minAmount - Minimum for custom input (default: 0.01)
 * @param {number} maxAmount - Maximum for custom input (default: 10.0)
 */
export function BetSelector({
  onBetPlaced,
  disabled = false,
  mode = "preset",
  fixedAmount = null,
  minAmount = 0.01,
  maxAmount = 10.0,
}) {
  const [selectedBet, setSelectedBet] = useState(BET_OPTIONS[0]);
  const [showDeposit, setShowDeposit] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");

  // Custom amount state (for 'custom' mode)
  const [customAmount, setCustomAmount] = useState("");
  const [inputError, setInputError] = useState(null);

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
    SHADOWWIRE_ENABLED,
    usingShadowWire,
    IS_MAINNET,
  } = useShadowPay();

  // Enforce ShadowWire minimum (0.1 SOL) when on mainnet
  const effectiveMinAmount = IS_MAINNET && SHADOWWIRE_ENABLED
    ? Math.max(minAmount, SHADOWWIRE_MIN_AMOUNT)
    : minAmount;

  // Fetch balance on mount and when connected
  useEffect(() => {
    if (connected) {
      getBalance().catch(console.error);
    }
  }, [connected, getBalance]);

  // Get the current bet amount based on mode
  const getBetAmount = () => {
    if (mode === "fixed") return fixedAmount;
    if (mode === "custom") return parseFloat(customAmount) || 0;
    return selectedBet;
  };

  const currentBetAmount = getBetAmount();

  // Check if deposit is needed
  const needsDeposit = escrowBalance !== null && escrowBalance < currentBetAmount;

  // Validate custom amount input
  const validateCustomAmount = (value) => {
    if (!value || value === "") return null; // Empty is OK until submit
    const amount = parseFloat(value);
    if (isNaN(amount)) return "Please enter a valid number";
    if (amount < effectiveMinAmount) {
      const reason = IS_MAINNET && SHADOWWIRE_ENABLED ? " (ShadowWire minimum)" : "";
      return `Minimum is ${effectiveMinAmount} SOL${reason}`;
    }
    if (amount > maxAmount) return `Maximum is ${maxAmount} SOL`;
    return null;
  };

  // Handle custom amount change
  const handleCustomAmountChange = (e) => {
    const value = e.target.value;
    setCustomAmount(value);
    setInputError(validateCustomAmount(value));
  };

  // Handle placing a bet
  const handlePlaceBet = async () => {
    if (disabled || isLoading) return;

    // Validate amount based on mode
    const betAmount = getBetAmount();

    if (mode === "custom") {
      const error = validateCustomAmount(customAmount);
      if (error) {
        setInputError(error);
        return;
      }
      if (!customAmount || betAmount <= 0) {
        setInputError("Please enter a deposit amount");
        return;
      }
    }

    if (mode === "fixed" && (!fixedAmount || fixedAmount <= 0)) {
      console.error("Invalid fixed amount");
      return;
    }

    try {
      clearError();
      setInputError(null);

      // Generate a unique resource URL for this bet
      const resourceUrl = `${window.location.origin}/game?bet=${Date.now()}`;

      // Make the private payment
      const result = await pay(HOUSE_WALLET, betAmount, resourceUrl);

      // Notify parent component
      if (onBetPlaced) {
        onBetPlaced({
          amount: betAmount,
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
      {/* Escrow Balance Display - Only show in preset mode (for players choosing bet amount) */}
      {mode === "preset" && (
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
      )}

      {/* Deposit Panel (collapsible) - Only in preset mode */}
      <AnimatePresence>
        {mode === "preset" && showDeposit && (
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
        {/* Header - changes based on mode */}
        <div className="flex items-center gap-2 mb-4">
          {mode === "custom" ? (
            <>
              <Edit3 className="w-5 h-5 text-purple-400" />
              <span className="text-sm font-medium text-gray-300">Enter Deposit Amount</span>
            </>
          ) : mode === "fixed" ? (
            <>
              <Lock className="w-5 h-5 text-yellow-400" />
              <span className="text-sm font-medium text-gray-300">Required Deposit</span>
            </>
          ) : (
            <>
              <Coins className="w-5 h-5 text-yellow-400" />
              <span className="text-sm font-medium text-gray-300">Select Bet Amount</span>
            </>
          )}
        </div>

        {/* MODE: PRESET - Grid of preset buttons */}
        {mode === "preset" && (
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
        )}

        {/* MODE: CUSTOM - Input field for dealer */}
        {mode === "custom" && (
          <div className="mb-4">
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min={effectiveMinAmount}
                max={maxAmount}
                placeholder={`Enter amount (${effectiveMinAmount} - ${maxAmount} SOL)`}
                value={customAmount}
                onChange={handleCustomAmountChange}
                disabled={disabled || isLoading}
                className={cn(
                  "w-full px-4 py-4 rounded-xl text-lg font-bold text-center",
                  "bg-black/50 border-2",
                  inputError
                    ? "border-red-500 focus:border-red-400"
                    : "border-purple-500/50 focus:border-purple-500",
                  "focus:outline-none transition-colors",
                  "disabled:opacity-50"
                )}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
                SOL
              </span>
            </div>
            {inputError && (
              <p className="mt-2 text-sm text-red-400 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {inputError}
              </p>
            )}
            <p className="mt-2 text-xs text-gray-500">
              Players joining your room must deposit this exact amount.
            </p>
            {IS_MAINNET && SHADOWWIRE_ENABLED && (
              <p className="mt-1 text-xs text-purple-400 flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Minimum {SHADOWWIRE_MIN_AMOUNT} SOL (ShadowWire privacy enabled)
              </p>
            )}
          </div>
        )}

        {/* MODE: FIXED - Display-only amount for player joining */}
        {mode === "fixed" && fixedAmount && (
          <div className="mb-4">
            <div className="p-6 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-2 border-purple-500/50 text-center">
              <p className="text-sm text-gray-400 mb-1">Room Deposit</p>
              <p className="text-4xl font-bold text-white">{fixedAmount}</p>
              <p className="text-lg text-purple-400">SOL</p>
            </div>
            <p className="mt-3 text-xs text-center text-gray-500">
              You must deposit exactly {fixedAmount} SOL to join this room.
            </p>
          </div>
        )}

        {/* Insufficient balance warning */}
        {needsDeposit && currentBetAmount > 0 && (
          <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
            <p className="text-xs text-yellow-400">
              Insufficient balance. {(currentBetAmount - (escrowBalance || 0)).toFixed(3)} SOL needed.
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
          disabled={disabled || isLoading || (mode === "custom" && (!customAmount || inputError))}
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
          ) : mode === "custom" ? (
            <>
              <Shield className="w-5 h-5" />
              <span>
                {customAmount && !inputError
                  ? `Create Room with ${customAmount} SOL Deposit`
                  : "Enter Deposit Amount"}
              </span>
            </>
          ) : mode === "fixed" ? (
            <>
              <Shield className="w-5 h-5" />
              <span>Deposit {fixedAmount} SOL to Join</span>
            </>
          ) : (
            <>
              <Shield className="w-5 h-5" />
              <span>Place {selectedBet} SOL Private Bet</span>
            </>
          )}
        </motion.button>

        {/* Privacy notice */}
        <div className="mt-3 text-center">
          {SHADOWWIRE_ENABLED && usingShadowWire ? (
            <div className="flex items-center justify-center gap-2 text-xs text-green-400">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <Shield className="w-3 h-3" />
              <span>Private betting via ShadowWire</span>
            </div>
          ) : SHADOWWIRE_ENABLED ? (
            <div className="flex items-center justify-center gap-2 text-xs text-yellow-400">
              <span className="w-2 h-2 bg-yellow-400 rounded-full" />
              <Shield className="w-3 h-3" />
              <span>ShadowWire enabled (SDK loading...)</span>
            </div>
          ) : (
            <p className="text-xs text-gray-500">
              <Shield className="w-3 h-3 inline mr-1" />
              Direct transfer mode (ShadowWire disabled)
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default BetSelector;
