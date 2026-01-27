import React from 'react';
import { DashboardLayout } from '../components/dashboard/DashboardLayout';
import { ProfileStats } from '../components/dashboard/ProfileStats';
import { GameCard } from '../components/dashboard/GameCard';

export default function Dashboard() {
  return (
    <DashboardLayout>
      {/* Header Section */}
      <div className="mb-12">
        <h2 className="font-display font-bold text-4xl md:text-5xl text-white uppercase tracking-tighter mb-4">
          Player Dashboard
        </h2>
        <div className="w-20 h-1 bg-[#936DFF] opacity-80 mb-8"></div>
        
        {/* Profile Stats */}
        <ProfileStats />
      </div>

      {/* Games Grid */}
      <div className="mb-20">
        <div className="flex items-center justify-between mb-8">
            <h3 className="font-display font-bold text-2xl text-white uppercase tracking-widest">
                Available Games
            </h3>
            <span className="text-[#936DFF] font-mono text-sm">1 Live Game</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* ZK Blackjack - Active */}
            <GameCard 
                title="ZK Blackjack" 
                description="Provably fair Blackjack powered by Noir Zero-Knowledge Proofs. The house cannot cheat."
                link="/game"
                active={true}
                image="/blackjack.jpg"
            />

            {/* Coming Soon Games */}
            <GameCard 
                title="ZK Poker" 
                description="Texas Hold'em with hidden hand privacy. Coming soon to the arena."
                link="#"
                active={false}
                image="/comingsoon.jpg"
            />
            
            <GameCard 
                title="Roulette" 
                description="Classic roulette with cryptographic fairness verification."
                link="#"
                active={false}
                image="/comingsoon.jpg"
            />
        </div>
      </div>

      {/* Recent Activity (Placeholder for future) */}
      <div className="opacity-50 pointer-events-none grayscale">
          <div className="flex items-center justify-between mb-8">
              <h3 className="font-display font-bold text-2xl text-white uppercase tracking-widest">
                  Recent Activity
              </h3>
          </div>
          
          <div className="w-full border border-[#936DFF]/30 bg-[#05010A] p-8 text-center">
              <p className="text-[#B8B8CC] font-body">No recent games played.</p>
          </div>
      </div>

    </DashboardLayout>
  );
}
