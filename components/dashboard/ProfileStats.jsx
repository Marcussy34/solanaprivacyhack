import React, { useEffect, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

export const ProfileStats = () => {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    if (!publicKey) {
        setBalance(0);
        return;
    }

    const getBalance = async () => {
      try {
        const bal = await connection.getBalance(publicKey);
        setBalance(bal / LAMPORTS_PER_SOL);
      } catch (e) {
        console.error("Error fetching balance:", e);
      }
    };

    getBalance();
    // Set up a listener for account changes could be added here
    const id = connection.onAccountChange(publicKey, (accountInfo) => {
        setBalance(accountInfo.lamports / LAMPORTS_PER_SOL);
    });

    return () => {
        connection.removeAccountChangeListener(id);
    };

  }, [publicKey, connection]);

  if (!publicKey) {
      return (
          <div className="w-full p-6 border border-[#936DFF]/30 bg-[#05010A]/50 backdrop-blur-sm">
              <p className="text-[#B8B8CC] font-body text-sm">Connect your wallet to view profile stats.</p>
          </div>
      );
  }

  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Balance Card */}
        <div className="p-6 border border-[#936DFF] bg-[#05010A] relative group overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-[#936DFF]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            <h3 className="text-[#B8B8CC] font-display uppercase tracking-widest text-xs mb-2">Total Balance</h3>
            <div className="flex items-baseline gap-2">
                <span className="text-4xl md:text-5xl font-display font-bold text-white tracking-tighter">
                    {balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                </span>
                <span className="text-[#936DFF] font-display font-bold text-xl">SOL</span>
            </div>
        </div>

        {/* Address Card */}
        <div className="p-6 border border-[#936DFF]/30 bg-[#05010A]/50 relative group">
             <h3 className="text-[#B8B8CC] font-display uppercase tracking-widest text-xs mb-2">Wallet Address</h3>
             <p className="text-xl md:text-2xl font-mono text-white truncate opacity-80 group-hover:opacity-100 transition-opacity">
                 {publicKey.toBase58()}
             </p>
             <div className="mt-4 flex gap-4">
                 <div className="px-3 py-1 bg-[#936DFF]/10 border border-[#936DFF]/30 text-[#936DFF] text-xs font-display uppercase tracking-wider">
                     Level 1
                 </div>
                 <div className="px-3 py-1 bg-[#936DFF]/10 border border-[#936DFF]/30 text-[#936DFF] text-xs font-display uppercase tracking-wider">
                     VIP Access
                 </div>
             </div>
        </div>
    </div>
  );
};
