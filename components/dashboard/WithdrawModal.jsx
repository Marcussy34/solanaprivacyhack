import React, { useState, useEffect } from 'react';
import { Check, X, ArrowRight, Wallet, Loader2, AlertCircle } from 'lucide-react';

/**
 * WithdrawModal - Withdraw funds from ShadowWire pool back to wallet
 *
 * Props:
 * - isOpen: boolean - Whether modal is visible
 * - onClose: function - Callback to close modal
 * - poolBalance: number - Available balance in ShadowWire pool (SOL)
 * - onWithdraw: function - Async callback to perform withdrawal (from useShadowPay)
 * - onRefreshBalance: function - Callback to refresh pool balance after withdrawal
 */
export const WithdrawModal = ({
  isOpen,
  onClose,
  poolBalance = 0,
  onWithdraw,
  onRefreshBalance
}) => {
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState(1); // 1: Input, 2: Processing, 3: Result
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setStep(1);
      setResult(null);
      setIsProcessing(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleMaxClick = () => {
    // Leave a tiny buffer for fees
    const maxAmount = Math.max(0, poolBalance - 0.0001);
    setAmount(maxAmount.toFixed(4));
  };

  const handleWithdraw = async () => {
    const withdrawAmount = parseFloat(amount);

    // Validate amount
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      setResult({ success: false, error: 'Please enter a valid amount' });
      setStep(3);
      return;
    }

    if (withdrawAmount > poolBalance) {
      setResult({
        success: false,
        error: `Insufficient pool balance. Available: ${poolBalance.toFixed(4)} SOL`
      });
      setStep(3);
      return;
    }

    // Check if onWithdraw is provided
    if (!onWithdraw) {
      setResult({
        success: false,
        error: 'Withdrawal function not available. ShadowWire may not be configured.'
      });
      setStep(3);
      return;
    }

    // Start processing
    setIsProcessing(true);
    setStep(2);

    try {
      const withdrawResult = await onWithdraw(withdrawAmount);
      setResult(withdrawResult);
      setStep(3);

      // Refresh balance after successful withdrawal
      if (withdrawResult.success && onRefreshBalance) {
        onRefreshBalance();
      }
    } catch (err) {
      setResult({ success: false, error: err.message });
      setStep(3);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      setStep(1);
      setAmount('');
      setResult(null);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={handleClose}
      ></div>

      {/* Modal Content */}
      <div className="relative w-full max-w-md bg-[#05010A] border border-[#936DFF] p-1 shadow-[0_0_50px_rgba(147,109,255,0.2)] animate-in fade-in zoom-in-95 duration-200">
        {/* Decorative corners */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white -mt-1 -ml-1"></div>
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white -mt-1 -mr-1"></div>
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white -mb-1 -ml-1"></div>
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white -mb-1 -mr-1"></div>

        <div className="bg-[#05010A] border border-[#936DFF]/30 p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-[#936DFF]/5 pointer-events-none"></div>

            {/* Header */}
            <div className="flex items-center justify-between mb-8 relative z-10">
                <h2 className="font-display font-bold text-2xl text-white uppercase tracking-widest">
                    Withdraw from Pool
                </h2>
                <button
                    onClick={handleClose}
                    disabled={isProcessing}
                    className="text-[#B8B8CC] hover:text-white transition-colors disabled:opacity-50"
                >
                    <X className="w-6 h-6" />
                </button>
            </div>

            {/* Content */}
            <div className="relative z-10">
                {/* Step 1: Input Amount */}
                {step === 1 && (
                    <div className="space-y-6">
                        {/* Pool Balance Display */}
                        <div className="p-4 bg-[#936DFF]/10 border border-[#936DFF]/20">
                            <p className="text-[#936DFF] text-[10px] uppercase tracking-widest mb-2">
                                ShadowWire Pool Balance
                            </p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-display font-bold text-white">
                                    {poolBalance.toFixed(4)}
                                </span>
                                <span className="text-lg font-display text-[#936DFF]">SOL</span>
                            </div>
                        </div>

                        {/* Info Box */}
                        <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/20 text-sm">
                            <Wallet className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                            <p className="text-blue-300/80">
                                Funds will be withdrawn from your ShadowWire privacy pool back to your connected wallet.
                            </p>
                        </div>

                        {/* Amount Input */}
                        <div>
                            <label className="block text-[#936DFF] font-display text-[10px] uppercase tracking-widest mb-2">
                                Amount to Withdraw (SOL)
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    step="0.01"
                                    min="0"
                                    max={poolBalance}
                                    className="w-full px-4 py-3 bg-[#05010A] border border-[#936DFF]/30 text-white placeholder:text-[#936DFF]/30 focus:outline-none focus:border-[#936DFF] font-mono text-xl"
                                />
                                <button
                                    onClick={handleMaxClick}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-widest text-[#936DFF] hover:text-white transition-colors"
                                >
                                    Max
                                </button>
                            </div>
                        </div>

                        {/* Withdraw Button */}
                        <button
                            onClick={handleWithdraw}
                            disabled={!amount || parseFloat(amount) <= 0 || parseFloat(amount) > poolBalance || poolBalance <= 0}
                            className="w-full py-4 bg-[#936DFF] hover:bg-[#C049FF] text-white font-display font-bold uppercase tracking-widest text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            Withdraw to Wallet <ArrowRight className="w-4 h-4" />
                        </button>

                        {poolBalance <= 0 && (
                            <p className="text-center text-yellow-400/80 text-sm">
                                No funds in ShadowWire pool to withdraw.
                            </p>
                        )}
                    </div>
                )}

                {/* Step 2: Processing */}
                {step === 2 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Loader2 className="w-16 h-16 text-[#936DFF] animate-spin mb-6" />
                        <h3 className="text-white font-display font-bold text-xl uppercase tracking-widest mb-2">
                            Processing Withdrawal
                        </h3>
                        <p className="text-[#B8B8CC] text-sm">
                            Please approve the transaction in your wallet...
                        </p>
                    </div>
                )}

                {/* Step 3: Result */}
                {step === 3 && result && (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        {result.success ? (
                            <>
                                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-6">
                                    <Check className="w-8 h-8 text-green-500" />
                                </div>
                                <h3 className="text-white font-display font-bold text-xl uppercase tracking-widest mb-2">
                                    Withdrawal Complete
                                </h3>
                                <p className="text-[#B8B8CC] text-sm mb-4">
                                    {amount} SOL has been sent to your wallet.
                                </p>
                                {result.signature && (
                                    <a
                                        href={`https://explorer.solana.com/tx/${result.signature}?cluster=devnet`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[#936DFF] text-sm hover:underline"
                                    >
                                        View Transaction on Explorer
                                    </a>
                                )}
                            </>
                        ) : (
                            <>
                                <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-6">
                                    <AlertCircle className="w-8 h-8 text-red-500" />
                                </div>
                                <h3 className="text-white font-display font-bold text-xl uppercase tracking-widest mb-2">
                                    Withdrawal Failed
                                </h3>
                                <p className="text-red-400/80 text-sm mb-4">
                                    {result.error}
                                </p>
                            </>
                        )}

                        <button
                            onClick={handleClose}
                            className="mt-4 px-6 py-2 bg-[#936DFF]/20 hover:bg-[#936DFF]/30 text-white font-display text-xs uppercase tracking-widest transition-colors"
                        >
                            Close
                        </button>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};
