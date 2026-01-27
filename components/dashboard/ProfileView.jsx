import React, { useEffect, useState, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Wallet, History, Trophy, TrendingUp, Plus, ArrowUpRight, Copy, Check, RefreshCw } from 'lucide-react';
import { DepositModal } from './DepositModal';
import { WithdrawModal } from './WithdrawModal';
import { useShadowPay } from '../../hooks/useShadowPay';

export const ProfileView = () => {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);

  // ShadowWire integration for pool withdrawal
  const { withdrawFromPool, getPoolBalance, usingShadowWire } = useShadowPay();
  const [poolBalance, setPoolBalance] = useState(0);
  const [isLoadingPoolBalance, setIsLoadingPoolBalance] = useState(false);

  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [addressCopied, setAddressCopied] = useState(false);

  const handleCopyAddress = () => {
    if (publicKey) {
        navigator.clipboard.writeText(publicKey.toBase58());
        setAddressCopied(true);
        setTimeout(() => setAddressCopied(false), 2000);
    }
  };

  // Fetch pool balance from ShadowWire
  const fetchPoolBalance = useCallback(async () => {
    if (!publicKey || !getPoolBalance) return;

    setIsLoadingPoolBalance(true);
    try {
      const balance = await getPoolBalance();
      setPoolBalance(balance || 0);
    } catch (err) {
      console.log('Could not fetch pool balance:', err);
      setPoolBalance(0);
    } finally {
      setIsLoadingPoolBalance(false);
    }
  }, [publicKey, getPoolBalance]);

  useEffect(() => {
    if (!publicKey) return;

    const getBalance = async () => {
      try {
        const bal = await connection.getBalance(publicKey);
        setBalance(bal / LAMPORTS_PER_SOL);
      } catch (e) {
        console.error("Error fetching balance:", e);
      }
    };

    getBalance();
    fetchPoolBalance(); // Also fetch ShadowWire pool balance

    // Mock transactions for now
    setTransactions([
        { id: 1, type: 'Deposit', amount: 5.0, date: '2024-05-20', status: 'Completed' },
        { id: 2, type: 'Game Win', amount: 2.5, date: '2024-05-21', status: 'Completed' },
        { id: 3, type: 'Withdrawal', amount: -1.0, date: '2024-05-22', status: 'Processing' },
    ]);

  }, [publicKey, connection, fetchPoolBalance]);

  if (!publicKey) {
      return (
          <div className="flex flex-col items-center justify-center h-[50vh] text-center">
              <Wallet className="w-16 h-16 text-[#936DFF] mb-4 opacity-50" />
              <h2 className="text-2xl font-display font-bold text-white mb-2">Wallet Not Connected</h2>
              <p className="text-[#B8B8CC]">Please connect your wallet to view your profile.</p>
          </div>
      );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <DepositModal 
        isOpen={isDepositModalOpen} 
        onClose={() => setIsDepositModalOpen(false)} 
        publicKey={publicKey}
      />
      
      <WithdrawModal
        isOpen={isWithdrawModalOpen}
        onClose={() => setIsWithdrawModalOpen(false)}
        poolBalance={poolBalance}
        onWithdraw={withdrawFromPool}
        onRefreshBalance={() => {
          fetchPoolBalance();
          // Also refresh wallet balance after withdrawal
          connection.getBalance(publicKey).then(bal => setBalance(bal / LAMPORTS_PER_SOL));
        }}
      />

      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Balance Card */}
          <div className="p-8 border border-[#936DFF] bg-[#05010A] relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-[#936DFF]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3 text-[#936DFF]">
                          <Wallet className="w-6 h-6" />
                          <span className="font-display text-xs uppercase tracking-widest">Wallet Balance</span>
                      </div>
                      <div className="flex gap-2">
                        <button 
                            onClick={() => setIsWithdrawModalOpen(true)}
                            className="flex items-center gap-1 px-3 py-1 bg-transparent hover:bg-[#936DFF]/10 border border-[#936DFF]/50 text-[#936DFF] hover:text-white transition-all duration-300 text-[10px] font-display uppercase tracking-widest"
                        >
                            <ArrowUpRight className="w-3 h-3" />
                            Withdraw
                        </button>
                        <button 
                            onClick={() => setIsDepositModalOpen(true)}
                            className="flex items-center gap-1 px-3 py-1 bg-[#936DFF]/10 hover:bg-[#936DFF] border border-[#936DFF] text-[#936DFF] hover:text-white transition-all duration-300 text-[10px] font-display uppercase tracking-widest"
                        >
                            <Plus className="w-3 h-3" />
                            Deposit
                        </button>
                      </div>
                  </div>
                  <div className="flex items-baseline gap-2 mb-4">
                      <span className="text-5xl font-display font-bold text-white tracking-tighter">
                          {balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                      </span>
                      <span className="text-xl font-display font-bold text-[#936DFF]">SOL</span>
                  </div>
                  
                  {/* Address Copy */}
                  <button
                    onClick={handleCopyAddress}
                    className="flex items-center gap-2 text-[#B8B8CC] hover:text-white transition-colors group/copy"
                  >
                    <span className="font-mono text-xs opacity-60 group-hover/copy:opacity-100 transition-opacity">
                        {publicKey?.toBase58().slice(0, 4)}...{publicKey?.toBase58().slice(-4)}
                    </span>
                    {addressCopied ? (
                        <Check className="w-3 h-3 text-green-400" />
                    ) : (
                        <Copy className="w-3 h-3 opacity-60 group-hover/copy:opacity-100" />
                    )}
                  </button>

                  {/* ShadowWire Pool Balance (shown if > 0) */}
                  {poolBalance > 0 && (
                    <div className="mt-4 pt-4 border-t border-[#936DFF]/20">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase tracking-widest text-[#936DFF]/70">
                            ShadowWire Pool
                          </span>
                          <button
                            onClick={fetchPoolBalance}
                            disabled={isLoadingPoolBalance}
                            className="text-[#936DFF]/50 hover:text-[#936DFF] transition-colors"
                          >
                            <RefreshCw className={`w-3 h-3 ${isLoadingPoolBalance ? 'animate-spin' : ''}`} />
                          </button>
                        </div>
                        <span className="font-mono text-sm text-yellow-400">
                          {poolBalance.toFixed(4)} SOL
                        </span>
                      </div>
                      <p className="text-[10px] text-yellow-400/60 mt-1">
                        Funds stuck in privacy pool - click Withdraw to recover
                      </p>
                    </div>
                  )}
              </div>
          </div>

          {/* Total Wagered (Mock) */}
          <div className="p-8 border border-[#936DFF]/30 bg-[#05010A]/50 relative overflow-hidden group">
              <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4 text-[#B8B8CC]">
                      <TrendingUp className="w-6 h-6" />
                      <span className="font-display text-xs uppercase tracking-widest">Total Wagered</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-display font-bold text-white tracking-tighter opacity-80">
                          12.50
                      </span>
                      <span className="text-lg font-display font-bold text-[#B8B8CC]">SOL</span>
                  </div>
              </div>
          </div>

          {/* Games Played (Mock) */}
          <div className="p-8 border border-[#936DFF]/30 bg-[#05010A]/50 relative overflow-hidden group">
              <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4 text-[#B8B8CC]">
                      <Trophy className="w-6 h-6" />
                      <span className="font-display text-xs uppercase tracking-widest">Games Played</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-display font-bold text-white tracking-tighter opacity-80">
                          42
                      </span>
                      <span className="text-lg font-display font-bold text-[#B8B8CC]">Rounds</span>
                  </div>
              </div>
          </div>
      </div>

      {/* Transaction History */}
      <div className="w-full">
          <div className="flex items-center gap-4 mb-6">
              <History className="w-6 h-6 text-[#936DFF]" />
              <h3 className="font-display font-bold text-2xl text-white uppercase tracking-widest">
                  Recent Activity
              </h3>
          </div>

          <div className="w-full border border-[#936DFF]/30 bg-[#05010A]/80 backdrop-blur-sm">
              <div className="grid grid-cols-4 p-4 border-b border-[#936DFF]/20 text-[#936DFF] font-display text-xs uppercase tracking-widest">
                  <div>Type</div>
                  <div>Amount</div>
                  <div>Date</div>
                  <div className="text-right">Status</div>
              </div>
              
              {transactions.map((tx) => (
                  <div key={tx.id} className="grid grid-cols-4 p-4 border-b border-[#936DFF]/10 text-sm hover:bg-[#936DFF]/5 transition-colors font-mono">
                      <div className="text-white">{tx.type}</div>
                      <div className={tx.amount > 0 ? "text-green-400" : "text-red-400"}>
                          {tx.amount > 0 ? "+" : ""}{tx.amount} SOL
                      </div>
                      <div className="text-[#B8B8CC]">{tx.date}</div>
                      <div className="text-right">
                          <span className={`px-2 py-1 text-[10px] uppercase tracking-wider border ${
                              tx.status === 'Completed' 
                                  ? 'border-green-500/30 text-green-400 bg-green-500/10' 
                                  : 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10'
                          }`}>
                              {tx.status}
                          </span>
                      </div>
                  </div>
              ))}
          </div>
      </div>
    </div>
  );
};
