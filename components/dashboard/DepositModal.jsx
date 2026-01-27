import React, { useState } from 'react';
import { Copy, Check, X, QrCode, CreditCard, Wallet } from 'lucide-react';

export const DepositModal = ({ isOpen, onClose, publicKey }) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('crypto'); // 'crypto' or 'fiat'

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(publicKey?.toBase58() || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
                    Deposit Funds
                </h2>
                <button 
                    onClick={onClose}
                    className="text-[#B8B8CC] hover:text-white transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mb-8 relative z-10 border-b border-[#936DFF]/20">
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
                {activeTab === 'crypto' ? (
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
