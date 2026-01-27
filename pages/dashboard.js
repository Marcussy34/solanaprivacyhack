import { useRouter } from 'next/router';
import { DashboardLayout } from '../components/dashboard/DashboardLayout';
import { ProfileStats } from '../components/dashboard/ProfileStats';
import { GameCard } from '../components/dashboard/GameCard';
import { ProfileView } from '../components/dashboard/ProfileView';

export default function Dashboard() {
  const router = useRouter();
  const { tab } = router.query;
  const activeTab = tab === 'profile' ? 'profile' : 'games';

  return (
    <DashboardLayout activeTab={activeTab}>
      {/* Header Section */}
      <div className="mb-12">
        <h2 className="font-display font-bold text-4xl md:text-5xl text-white uppercase tracking-tighter mb-4">
          {activeTab === 'profile' ? 'Player Profile' : 'Player Dashboard'}
        </h2>
        <div className="w-20 h-1 bg-[#936DFF] opacity-80 mb-8"></div>
        
        {/* Profile Stats - Always show on games tab, maybe hide on profile tab since it has its own? 
            Actually, let's keep it consistent or just show it on games tab. 
            The user said "profile page... within the same dashboard.js".
            Let's show ProfileStats only on 'games' tab to avoid duplication if ProfileView has similar info.
        */}
        {activeTab === 'games' && <ProfileStats />}
      </div>

      {activeTab === 'games' ? (
        /* Games Grid */
        <div className="mb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
      ) : (
        /* Profile View */
        <ProfileView />
      )}

      {/* Recent Activity (Placeholder for future) - Only on Games tab */}
      {activeTab === 'games' && (
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
      )}

    </DashboardLayout>
  );
}
