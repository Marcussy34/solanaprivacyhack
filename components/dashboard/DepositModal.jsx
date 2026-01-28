import React, { useState } from 'react';
import { Copy, Check, X, QrCode, CreditCard, Shield, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

export const DepositModal = ({
  isOpen,
  onClose,
  publicKey,
  onDeposit,
  isMainnet,
  isLoading,
  error,
  onClearError,
  onRefreshBalance,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('privacy'); // 'privacy', 'crypto', or 'fiat'
  const [depositAmount, setDepositAmount] = useState('');
  const [depositSuccess, setDepositSuccess] = useState(null);
  const [localError, setLocalError] = useState(null);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(publicKey?.toBase58() || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      setLocalError('Please enter a valid amount');
      return;
    }

    if (amount < 0.001) {
      setLocalError('Minimum deposit is 0.001 SOL');
      return;
    }

    setLocalError(null);
    setDepositSuccess(null);

    try {
      const result = await onDeposit(amount);
      if (result?.success) {
        setDepositSuccess({
          amount,
          signature: result.signature,
        });
        setDepositAmount('');
        // Refresh balances after successful deposit
        if (onRefreshBalance) {
          setTimeout(() => onRefreshBalance(), 2000);
        }
      } else {
        setLocalError(result?.error || 'Deposit failed');
      }
    } catch (err) {
      setLocalError(err.message);
    }
  };

  const handleClose = () => {
    setDepositAmount('');
    setDepositSuccess(null);
    setLocalError(null);
    if (onClearError) onClearError();
    onClose();
  };

  const displayError = localError || error;

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
                    Deposit Funds
                </h2>
                <button
                    onClick={handleClose}
                    className="text-[#B8B8CC] hover:text-white transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mb-8 relative z-10 border-b border-[#936DFF]/20">
                <button
                    onClick={() => setActiveTab('privacy')}
                    className={`pb-2 font-display text-xs uppercase tracking-widest transition-colors ${
                        activeTab === 'privacy'
                            ? 'text-[#936DFF] border-b-2 border-[#936DFF]'
                            : 'text-[#B8B8CC] hover:text-white'
                    }`}
                >
                    Privacy Pool
                </button>
                <button
                    onClick={() => setActiveTab('crypto')}
                    className={`pb-2 font-display text-xs uppercase tracking-widest transition-colors ${
                        activeTab === 'crypto'
                            ? 'text-[#936DFF] border-b-2 border-[#936DFF]'
                            : 'text-[#B8B8CC] hover:text-white'
                    }`}
                >
                    Crypto Transfer
                </button>
                <button
                    onClick={() => setActiveTab('fiat')}
                    className={`pb-2 font-display text-xs uppercase tracking-widest transition-colors ${
                        activeTab === 'fiat'
                            ? 'text-[#936DFF] border-b-2 border-[#936DFF]'
                            : 'text-[#B8B8CC] hover:text-white'
                    }`}
                >
                    Buy with Card
                </button>
            </div>

            {/* Content */}
            <div className="relative z-10">
                {activeTab === 'privacy' ? (
                    <div className="space-y-6">
                        {/* ShadowWire Info */}
                        <div className="flex items-start gap-4 p-4 bg-[#936DFF]/10 border border-[#936DFF]/20">
                            <Shield className="w-8 h-8 text-[#936DFF] flex-shrink-0 mt-1" />
                            <div>
                                <h3 className="text-white font-display text-sm uppercase tracking-wider mb-1">
                                    ShadowWire Privacy Pool
                                </h3>
                                <p className="text-[#B8B8CC] text-xs leading-relaxed">
                                    Deposit SOL into the privacy pool for anonymous transfers.
                                    Your transactions will be shielded using zero-knowledge proofs.
                                </p>
                            </div>
                        </div>

                        {/* Network Warning (if not mainnet) */}
                        {!isMainnet && (
                            <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30">
                                <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-yellow-400 text-xs font-bold mb-1">
                                        Mainnet Required
                                    </p>
                                    <p className="text-yellow-400/70 text-xs">
                                        ShadowWire privacy pool only works on Solana mainnet-beta.
                                        Switch your wallet to mainnet to enable deposits.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Deposit Amount Input */}
                        <div>
                            <label className="block text-[#936DFF] font-display text-[10px] uppercase tracking-widest mb-2">
                                Amount (SOL)
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    value={depositAmount}
                                    onChange={(e) => setDepositAmount(e.target.value)}
                                    placeholder="0.00"
                                    min="0.001"
                                    step="0.001"
                                    disabled={isLoading || !isMainnet}
                                    className="flex-1 p-3 bg-[#05010A] border border-[#936DFF]/30 text-white font-mono text-lg placeholder-[#B8B8CC]/50 focus:border-[#936DFF] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                                <span className="text-[#936DFF] font-display font-bold">SOL</span>
                            </div>
                            {/* Quick amount buttons */}
                            <div className="flex gap-2 mt-3">
                                {[0.1, 0.5, 1, 5].map((amount) => (
                                    <button
                                        key={amount}
                                        onClick={() => setDepositAmount(amount.toString())}
                                        disabled={isLoading || !isMainnet}
                                        className="flex-1 py-1.5 px-2 border border-[#936DFF]/30 text-[#936DFF] hover:bg-[#936DFF]/10 font-display text-xs uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {amount}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Error Display */}
                        {displayError && (
                            <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30">
                                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                                <p className="text-red-400 text-xs">{displayError}</p>
                            </div>
                        )}

                        {/* Success Display */}
                        {depositSuccess && (
                            <div className="flex items-start gap-3 p-4 bg-green-500/10 border border-green-500/30">
                                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-green-400 text-xs font-bold mb-1">
                                        Deposit Successful!
                                    </p>
                                    <p className="text-green-400/70 text-xs">
                                        {depositSuccess.amount} SOL deposited to privacy pool.
                                    </p>
                                    {depositSuccess.signature && (
                                        <a
                                            href={`https://solscan.io/tx/${depositSuccess.signature}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-green-400 text-xs underline hover:text-green-300 mt-1 inline-block"
                                        >
                                            View Transaction
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Deposit Button */}
                        <button
                            onClick={handleDeposit}
                            disabled={isLoading || !isMainnet || !depositAmount}
                            className="w-full py-4 bg-[#936DFF] hover:bg-[#C049FF] disabled:bg-[#936DFF]/30 disabled:cursor-not-allowed text-white font-display font-bold uppercase tracking-widest text-sm transition-colors flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <Shield className="w-5 h-5" />
                                    Deposit to Privacy Pool
                                </>
                            )}
                        </button>

                        <p className="text-[#B8B8CC]/60 text-[10px] text-center">
                            Powered by ShadowWire - Zero-Knowledge Privacy Transfers
                        </p>
                    </div>
                ) : activeTab === 'crypto' ? (
                    <div className="space-y-6">
                        <div className="flex flex-col items-center justify-center p-6 bg-white/5 border border-[#936DFF]/20 rounded-lg">
                            <QrCode className="w-32 h-32 text-white mb-4" />
                            <p className="text-[#B8B8CC] text-xs font-mono mb-2">Scan to deposit SOL</p>
                        </div>

                        <div>
                            <label className="block text-[#936DFF] font-display text-[10px] uppercase tracking-widest mb-2">
                                Your Wallet Address
                            </label>
                            <div className="flex items-center gap-2 p-3 bg-[#05010A] border border-[#936DFF]/30">
                                <code className="flex-1 text-[#B8B8CC] font-mono text-xs truncate">
                                    {publicKey?.toBase58()}
                                </code>
                                <button
                                    onClick={handleCopy}
                                    className="text-[#936DFF] hover:text-white transition-colors"
                                >
                                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="p-4 bg-[#936DFF]/10 border border-[#936DFF]/20">
                            <p className="text-[#B8B8CC] text-xs">
                                <span className="text-[#936DFF] font-bold">NOTE:</span> Only send Solana (SOL) to this address. Sending other assets may result in permanent loss.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6 text-center py-8">
                        <CreditCard className="w-16 h-16 text-[#936DFF] mx-auto mb-4 opacity-50" />
                        <h3 className="text-white font-display text-lg uppercase tracking-widest mb-2">
                            Fiat On-Ramp
                        </h3>
                        <p className="text-[#B8B8CC] text-sm mb-6">
                            Purchase SOL directly using your credit card or bank transfer via our partners.
                        </p>
                        <button className="w-full py-4 bg-[#936DFF] hover:bg-[#C049FF] text-white font-display font-bold uppercase tracking-widest text-sm transition-colors">
                            Continue to MoonPay
                        </button>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};
