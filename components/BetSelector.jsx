/**
 * BetSelector - Private betting component using ShadowPay
 *
 * Supports three modes:
 * 1. 'preset' - Select from preset bet amounts (default)
 * 2. 'custom' - Enter any custom amount (for dealers creating rooms)
 * 3. 'fixed' - Display-only amount that must be matched (for players joining)
 *
 * Payment Modes:
 * - 'test' - Skip payment entirely for quick testing (default for hackathon)
 * - 'shadowwire' - Real private payment via ShadowPay
 *
 * @author Marcus (ZK Engineer)
 * @created Jan 24, 2026
 * @updated Jan 25, 2026 - Added custom/fixed modes for room deposit matching
 * @updated Jan 26, 2026 - Simplified to Test Mode vs ShadowWire toggle for hackathon
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

// Preset bet amounts in SOL
// Test mode uses lower amounts (devnet SOL is free via airdrop)
// ShadowWire uses higher amounts with privacy (minimum 0.1 SOL anti-spam)
const TEST_BET_OPTIONS = [0.01, 0.05, 0.1, 0.25];
const SHADOWWIRE_BET_OPTIONS = [0.1, 0.25, 0.5, 1.0];

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
    <div className="flex items-center justify-center gap-1 text-[10px] font-display uppercase tracking-widest">
      {steps.map((step, index) => {
        const isActive = step.key === status;
        const isComplete = index < currentIndex;
        const isPending = index > currentIndex;

        return (
          <div key={step.key} className="flex items-center">
            <div
              className={cn(
                "flex items-center gap-1 px-2 py-1 transition-all border",
                isActive && "bg-[#936DFF]/20 text-[#936DFF] border-[#936DFF]",
                isComplete && "bg-[#22c55e]/20 text-[#22c55e] border-[#22c55e]",
                isPending && "bg-transparent text-[#B8B8CC] border-transparent"
              )}
            >
              {isActive && <Loader2 className="w-3 h-3 animate-spin" />}
              {isComplete && <Check className="w-3 h-3" />}
              <span className="hidden sm:inline">{step.label}</span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "w-2 h-px mx-1",
                  isComplete ? "bg-[#22c55e]/50" : "bg-[#FFFFFF]/10"
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
 * @param {string} defaultPaymentMode - 'test' | 'shadowwire' (default: 'test')
 */
export function BetSelector({
  onBetPlaced,
  disabled = false,
  mode = "preset",
  fixedAmount = null,
  minAmount = 0.01,
  maxAmount = 10.0,
  defaultPaymentMode = "test",
}) {
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

  // Payment mode state: 'test' skips payment, 'shadowwire' uses real privacy payments
  const [paymentMode, setPaymentMode] = useState(defaultPaymentMode);

  // Derive bet options based on payment mode
  // Test mode uses lower amounts (devnet SOL is free), ShadowWire uses higher amounts
  const betOptions = paymentMode === 'shadowwire' ? SHADOWWIRE_BET_OPTIONS : TEST_BET_OPTIONS;

  // Selected bet amount - defaults to first option of current network
  const [selectedBet, setSelectedBet] = useState(() => betOptions[0]);

  const [showDeposit, setShowDeposit] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");

  // Custom amount state (for 'custom' mode)
  const [customAmount, setCustomAmount] = useState("");
  const [inputError, setInputError] = useState(null);

  // Handle payment mode change - updates mode and resets bet to first option
  const handlePaymentModeChange = (newMode) => {
    if (newMode === paymentMode) return;
    setPaymentMode(newMode);
    // Reset bet to first option of new mode's bet amounts
    const newBetOptions = newMode === 'shadowwire' ? SHADOWWIRE_BET_OPTIONS : TEST_BET_OPTIONS;
    setSelectedBet(newBetOptions[0]);
  };

  // Enforce ShadowWire minimum (0.1 SOL) when using real payments
  // Test mode allows very low amounts for testing
  const effectiveMinAmount = paymentMode === 'shadowwire' && SHADOWWIRE_ENABLED
    ? Math.max(minAmount, SHADOWWIRE_MIN_AMOUNT)
    : 0.001; // Very low for test mode

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
      const reason = paymentMode === 'shadowwire' && SHADOWWIRE_ENABLED ? " (ShadowWire minimum)" : "";
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

      let result;

      if (paymentMode === 'test') {
        // TEST MODE: Skip payment entirely, simulate success immediately
        console.log('[BetSelector] Test mode - skipping payment');
        result = {
          txSignature: 'test-mode-' + Date.now(),
          paymentId: 'test-mode-' + Date.now(),
          amount: betAmount,
          method: 'test',
          simulated: true,
        };
      } else {
        // SHADOWWIRE MODE: Real private payment via ShadowPay
        const resourceUrl = `${window.location.origin}/game?bet=${Date.now()}`;
        result = await pay(HOUSE_WALLET, betAmount, resourceUrl);
      }

      // Notify parent component with bet details including payment mode
      if (onBetPlaced) {
        onBetPlaced({
          amount: betAmount,
          txSignature: result.txSignature,
          paymentId: result.paymentId,
          mode: paymentMode, // Track which payment mode was used
          simulated: result.simulated || false,
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
      <div className="p-6 border border-[#936DFF] bg-[#05010A] text-center">
        <Wallet className="w-12 h-12 mx-auto mb-4 text-[#B8B8CC]" />
        <p className="font-display text-sm uppercase tracking-widest text-[#B8B8CC]">Connect wallet to place bets</p>
      </div>
    );
  }

  // SDK not ready
  if (!isClientReady) {
    return (
      <div className="p-6 border border-[#936DFF] bg-[#05010A] text-center">
        <Loader2 className="w-8 h-8 mx-auto mb-4 text-[#936DFF] animate-spin" />
        <p className="font-display text-sm uppercase tracking-widest text-[#B8B8CC]">Loading ShadowPay SDK...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Escrow Balance Display - Only show in preset mode with ShadowWire */}
      {mode === "preset" && paymentMode === 'shadowwire' && (
        <div className="flex items-center justify-between p-4 border border-[#936DFF] bg-[#05010A]">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-[#936DFF]" />
            <span className="font-display text-xs uppercase tracking-widest text-[#B8B8CC]">Escrow Balance</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-display font-bold text-lg text-[#FFFFFF]">
              {escrowBalance !== null ? `${escrowBalance.toFixed(3)} SOL` : "..."}
            </span>
            <button
              onClick={() => setShowDeposit(!showDeposit)}
              className={cn(
                "flex items-center gap-1 px-3 py-1.5 border border-[#936DFF] text-[10px] font-display uppercase tracking-widest",
                "bg-[#936DFF]/10 text-[#936DFF] hover:bg-[#936DFF]/20",
                "transition-colors"
              )}
            >
              <ArrowUp className="w-4 h-4" />
              Deposit
            </button>
          </div>
        </div>
      )}

      {/* Deposit Panel (collapsible) - Only in preset mode with ShadowWire */}
      <AnimatePresence>
        {mode === "preset" && paymentMode === 'shadowwire' && showDeposit && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 border border-[#936DFF] bg-[#05010A]">
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
                    "flex-1 px-4 py-2 bg-[#05010A] border border-[#936DFF] text-[#FFFFFF]",
                    "focus:outline-none focus:bg-[#936DFF]/10 font-display text-sm",
                    "disabled:opacity-50"
                  )}
                />
                <button
                  onClick={handleDeposit}
                  disabled={isLoading || !depositAmount}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 border border-[#936DFF]",
                    "bg-[#936DFF]/10 hover:bg-[#936DFF]/20 text-[#FFFFFF]",
                    "transition-colors font-display text-xs uppercase tracking-widest",
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
              <p className="mt-2 text-[10px] font-display uppercase tracking-widest text-[#B8B8CC]">
                Funds are held securely in ShadowPay escrow for private betting.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment Mode Toggle - Test Mode vs ShadowWire */}
      {mode === "preset" && (
        <div className="p-1 border border-[#936DFF]/30 bg-[#05010A]">
          <div className="flex gap-1">
            <button
              onClick={() => handlePaymentModeChange('test')}
              disabled={disabled || isLoading}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-display uppercase tracking-widest transition-all",
                paymentMode === 'test'
                  ? "bg-[#3b82f6] text-white"
                  : "text-[#B8B8CC] hover:text-white hover:bg-[#FFFFFF]/5",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              <span className="text-base">🧪</span>
              <span>Test Mode</span>
              <span className="text-[10px] opacity-70 ml-1">(Skip Payment)</span>
            </button>
            <button
              onClick={() => handlePaymentModeChange('shadowwire')}
              disabled={disabled || isLoading}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-display uppercase tracking-widest transition-all",
                paymentMode === 'shadowwire'
                  ? "bg-[#936DFF] text-white"
                  : "text-[#B8B8CC] hover:text-white hover:bg-[#FFFFFF]/5",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              <Shield className="w-4 h-4" />
              <span>ShadowWire</span>
              <span className="text-[10px] opacity-70 ml-1">(Private)</span>
            </button>
          </div>
        </div>
      )}

      {/* Bet Amount Selection */}
      <div className="p-4 border border-[#936DFF] bg-[#05010A] relative overflow-hidden">
        <div className="absolute inset-0 bg-[#936DFF]/5 pointer-events-none"></div>
        {/* Header - changes based on mode */}
        <div className="flex items-center gap-2 mb-4 relative z-10">
          {mode === "custom" ? (
            <>
              <Edit3 className="w-5 h-5 text-[#936DFF]" />
              <span className="font-display text-xs uppercase tracking-widest text-[#B8B8CC]">Enter Deposit Amount</span>
            </>
          ) : mode === "fixed" ? (
            <>
              <Lock className="w-5 h-5 text-[#936DFF]" />
              <span className="font-display text-xs uppercase tracking-widest text-[#B8B8CC]">Required Deposit</span>
            </>
          ) : (
            <>
              <Coins className="w-5 h-5 text-[#936DFF]" />
              <span className="font-display text-xs uppercase tracking-widest text-[#B8B8CC]">Select Bet Amount</span>
            </>
          )}
        </div>

        {/* MODE: PRESET - Grid of preset buttons (amounts vary by network) */}
        {mode === "preset" && (
          <div className="grid grid-cols-4 gap-2 mb-4 relative z-10">
            {betOptions.map((amount) => (
              <motion.button
                key={amount}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedBet(amount)}
                disabled={disabled || isLoading}
                className={cn(
                  "py-3 px-2 text-center transition-all border",
                  selectedBet === amount
                    ? "bg-[#936DFF] border-[#936DFF] text-white"
                    : "bg-transparent border-[#936DFF]/30 text-[#B8B8CC] hover:border-[#936DFF]",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                <span className="font-display font-bold text-lg block">{amount}</span>
                <span className="font-display text-[10px] uppercase tracking-widest block opacity-70">SOL</span>
              </motion.button>
            ))}
          </div>
        )}

        {/* MODE: CUSTOM - Input field for dealer */}
        {mode === "custom" && (
          <div className="mb-4 relative z-10">
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
                  "w-full px-4 py-4 font-display font-bold text-lg text-center",
                  "bg-[#05010A] border-2",
                  inputError
                    ? "border-red-500 focus:border-red-400"
                    : "border-[#936DFF] focus:border-[#936DFF]",
                  "focus:outline-none transition-colors text-[#FFFFFF]",
                  "disabled:opacity-50"
                )}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#B8B8CC] font-display text-xs uppercase tracking-widest">
                SOL
              </span>
            </div>
            {inputError && (
              <p className="mt-2 text-xs font-display uppercase tracking-widest text-red-400 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {inputError}
              </p>
            )}
            <p className="mt-2 text-[10px] font-display uppercase tracking-widest text-[#B8B8CC]">
              Players joining your room must deposit this exact amount.
            </p>
            {paymentMode === 'shadowwire' && SHADOWWIRE_ENABLED && (
              <p className="mt-1 text-[10px] font-display uppercase tracking-widest text-[#936DFF] flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Minimum {SHADOWWIRE_MIN_AMOUNT} SOL (ShadowWire privacy enabled)
              </p>
            )}
          </div>
        )}

        {/* MODE: FIXED - Display-only amount for player joining */}
        {mode === "fixed" && fixedAmount && (
          <div className="mb-4 relative z-10">
            <div className="p-6 border-2 border-[#936DFF] bg-[#05010A] text-center">
              <p className="font-display text-xs uppercase tracking-widest text-[#B8B8CC] mb-1">Room Deposit</p>
              <p className="font-display font-bold text-4xl text-[#FFFFFF]">{fixedAmount}</p>
              <p className="font-display text-lg uppercase tracking-widest text-[#936DFF]">SOL</p>
            </div>
            <p className="mt-3 text-[10px] font-display uppercase tracking-widest text-center text-[#B8B8CC]">
              You must deposit exactly {fixedAmount} SOL to join this room.
            </p>
          </div>
        )}

        {/* Insufficient balance warning */}
        {needsDeposit && currentBetAmount > 0 && (
          <div className="flex items-center gap-2 p-3 mb-4 border border-yellow-500/20 bg-yellow-500/5 relative z-10">
            <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
            <p className="font-display text-[10px] uppercase tracking-widest text-yellow-400">
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
              className="mb-4 relative z-10"
            >
              <PaymentProgress status={status} />
              <p className="text-center font-display text-[10px] uppercase tracking-widest text-[#936DFF] mt-2">
                {STATUS_MESSAGES[status] || "Processing..."}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Display */}
        {error && (
          <div className="flex items-start gap-2 p-3 mb-4 border border-red-500/20 bg-red-500/5 relative z-10">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-display text-[10px] uppercase tracking-widest text-red-400">{error}</p>
              <button
                onClick={clearError}
                className="font-display text-[10px] uppercase tracking-widest text-[#B8B8CC] hover:text-[#FFFFFF] underline mt-1"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Place Bet Button */}
        <button
          onClick={handlePlaceBet}
          disabled={disabled || isLoading || (mode === "custom" && (!customAmount || inputError))}
          className={cn(
            "w-full group relative px-6 py-4 border-2 border-[#936DFF] overflow-hidden relative z-10",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          <span className="relative z-10 flex items-center justify-center gap-3 font-display font-bold text-lg uppercase tracking-widest text-[#FFFFFF] group-hover:text-[#05010A] transition-colors duration-300">
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : paymentMode === 'test' ? (
              // Test mode: Skip payment, go straight to game
              <>
                <span>🧪</span>
                <span>Start Game (Test Mode)</span>
              </>
            ) : mode === "custom" ? (
              <>
                <Shield className="w-5 h-5" />
                <span>
                  {customAmount && !inputError
                    ? `Create Room`
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
          </span>
          <div className="absolute inset-0 bg-[#936DFF] transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-in-out"></div>
        </button>

        {/* Payment Mode Status - shows different messaging based on selected mode */}
        <div className="mt-3 text-center relative z-10">
          {paymentMode === 'test' ? (
            // Test mode: Payment will be skipped
            <div className="flex items-center justify-center gap-2 font-display text-[10px] uppercase tracking-widest text-[#3b82f6]">
              <span className="w-2 h-2 bg-[#3b82f6] rounded-full" />
              <span>🧪 Test mode - payment will be skipped</span>
            </div>
          ) : SHADOWWIRE_ENABLED && usingShadowWire ? (
            // ShadowWire active and SDK ready
            <div className="flex items-center justify-center gap-2 font-display text-[10px] uppercase tracking-widest text-[#22c55e]">
              <span className="w-2 h-2 bg-[#22c55e] rounded-full animate-pulse" />
              <Shield className="w-3 h-3" />
              <span>Private betting via ShadowWire</span>
            </div>
          ) : SHADOWWIRE_ENABLED ? (
            // ShadowWire enabled but SDK still loading
            <div className="flex items-center justify-center gap-2 font-display text-[10px] uppercase tracking-widest text-yellow-400">
              <span className="w-2 h-2 bg-yellow-400 rounded-full" />
              <Shield className="w-3 h-3" />
              <span>ShadowWire enabled (SDK loading...)</span>
            </div>
          ) : (
            // ShadowWire mode selected but not available
            <p className="font-display text-[10px] uppercase tracking-widest text-yellow-400">
              <AlertCircle className="w-3 h-3 inline mr-1" />
              ShadowWire not available - will use direct transfer
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default BetSelector;
