import React, { useState } from 'react';
import { Check, X, ArrowRight, Wallet } from 'lucide-react';

export const WithdrawModal = ({ isOpen, onClose, balance }) => {
  const [amount, setAmount] = useState('');
  const [address, setAddress] = useState('');
  const [step, setStep] = useState(1); // 1: Input, 2: Confirm, 3: Success

  if (!isOpen) return null;

  const handleWithdraw = () => {
    setStep(2);
  };

  const confirmWithdraw = () => {
    // Mock withdrawal logic
    setStep(3);
    setTimeout(() => {
        onClose();
        setStep(1);
        setAmount('');
        setAddress('');
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
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
                    Withdraw Funds
                </h2>
                <button 
                    onClick={onClose}
                    className="text-[#B8B8CC] hover:text-white transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>
            </div>

            {/* Content */}
            <div className="relative z-10">
                {step === 1 && (
                    <div className="space-y-6">
                        <div>
                            <label className="block text-[#936DFF] font-display text-[10px] uppercase tracking-widest mb-2">
                                Recipient Address (SOL)
                            </label>
                            <input
                                type="text"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                placeholder="Enter Solana wallet address"
                                className="w-full px-4 py-3 bg-[#05010A] border border-[#936DFF]/30 text-white placeholder:text-[#936DFF]/30 focus:outline-none focus:border-[#936DFF] font-mono text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-[#936DFF] font-display text-[10px] uppercase tracking-widest mb-2">
                                Amount (SOL)
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full px-4 py-3 bg-[#05010A] border border-[#936DFF]/30 text-white placeholder:text-[#936DFF]/30 focus:outline-none focus:border-[#936DFF] font-mono text-xl"
                                />
                                <button 
                                    onClick={() => setAmount(balance)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-widest text-[#936DFF] hover:text-white"
                                >
                                    Max
                                </button>
                            </div>
                            <p className="text-right text-[#B8B8CC] text-[10px] mt-2 font-mono">
                                Available: {balance?.toFixed(4)} SOL
                            </p>
                        </div>

                        <button 
                            onClick={handleWithdraw}
                            disabled={!address || !amount || parseFloat(amount) > balance}
                            className="w-full py-4 bg-[#936DFF] hover:bg-[#C049FF] text-white font-display font-bold uppercase tracking-widest text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            Review Withdrawal <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-6">
                        <div className="p-4 bg-[#936DFF]/10 border border-[#936DFF]/20 space-y-4">
                            <div>
                                <p className="text-[#936DFF] text-[10px] uppercase tracking-widest mb-1">Recipient</p>
                                <p className="text-white font-mono text-xs break-all">{address}</p>
                            </div>
                            <div>
                                <p className="text-[#936DFF] text-[10px] uppercase tracking-widest mb-1">Amount</p>
                                <p className="text-white font-display font-bold text-xl">{amount} SOL</p>
                            </div>
                            <div>
                                <p className="text-[#936DFF] text-[10px] uppercase tracking-widest mb-1">Network Fee</p>
                                <p className="text-white font-mono text-xs">~0.000005 SOL</p>
                            </div>
                        </div>

                        <button 
                            onClick={confirmWithdraw}
                            className="w-full py-4 bg-[#936DFF] hover:bg-[#C049FF] text-white font-display font-bold uppercase tracking-widest text-sm transition-colors"
                        >
                            Confirm Withdrawal
                        </button>
                        <button 
                            onClick={() => setStep(1)}
                            className="w-full py-2 text-[#B8B8CC] hover:text-white font-display text-xs uppercase tracking-widest transition-colors"
                        >
                            Back
                        </button>
                    </div>
                )}

                {step === 3 && (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-6">
                            <Check className="w-8 h-8 text-green-500" />
                        </div>
                        <h3 className="text-white font-display font-bold text-xl uppercase tracking-widest mb-2">
                            Withdrawal Initiated
                        </h3>
                        <p className="text-[#B8B8CC] text-sm">
                            Your funds are on the way.
                        </p>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};
