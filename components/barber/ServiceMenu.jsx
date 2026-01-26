import React from 'react';

// Game features with descriptions
const FEATURES = [
  { id: '01', name: 'ZK Shuffle', price: 'FAIR', desc: 'Cryptographically proven random deck generation' },
  { id: '02', name: 'Privacy', price: 'SECURE', desc: 'ShadowWire integration for confidential betting' },
  { id: '03', name: 'Trustless', price: 'VERIFIED', desc: 'Cards are dealt as encrypted commitments' },
  { id: '04', name: 'Instant', price: 'FAST', desc: 'Solana speed with on-chain verification' },
  { id: '05', name: 'Multiplayer', price: 'LIVE', desc: 'Join games remotely with friends' },
  { id: '06', name: 'Open Source', price: 'CODE', desc: 'Fully auditable Noir circuits and contracts' },
];

// Features list section with hover effects
export const ServiceMenu = () => {
  return (
    <div className="w-full min-h-screen bg-[#05010A] text-[#FFFFFF] relative overflow-hidden flex flex-col items-center py-12 md:py-20 px-4 md:px-10 border-t-8 border-[#936DFF]">
        
        {/* Background Texture Pattern (CSS Dots) */}
        <div className="absolute inset-0 opacity-20 pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(#936DFF 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
        </div>

        {/* Header */}
        <div className="w-full max-w-6xl mb-10 md:mb-16 relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end border-b-4 border-[#936DFF] pb-4 gap-4">
            <h2 className="font-display font-bold text-6xl md:text-9xl tracking-tighter uppercase leading-[0.8] text-[#FFFFFF]">
                Game<br/>Features
            </h2>
            <div className="text-left md:text-right w-full md:w-auto flex flex-row md:flex-col justify-between md:justify-end items-end md:items-end border-t-2 md:border-t-0 border-[#936DFF]/20 pt-2 md:pt-0">
                <span className="font-display font-bold text-lg md:text-xl tracking-widest uppercase block mb-1 text-[#C049FF]">Powered by Solana</span>
                <span className="font-body font-bold text-xs md:text-sm tracking-wider uppercase block opacity-80 text-[#B8B8CC]">Noir ZK Circuits</span>
            </div>
        </div>

        {/* The Menu Grid */}
        <div className="w-full max-w-6xl grid grid-cols-1 gap-3 md:gap-4 relative z-10">
            {FEATURES.map((feature) => (
                <div key={feature.id} className="group relative w-full min-h-[5rem] md:h-32 perspective-1000">
                    
                    {/* Visual Container */}
                    <div className="relative w-full h-full bg-[#111] text-[#936DFF] flex items-center justify-between px-4 md:px-12 py-4 md:py-0
                                    transition-all duration-300 ease-out transform origin-center
                                    group-hover:scale-[1.02] group-hover:bg-[#FFFFFF] group-hover:text-[#05010A] 
                                    shadow-[4px_4px_0px_rgba(147,109,255,0.3)] md:shadow-[8px_8px_0px_rgba(147,109,255,0.3)] border border-[#936DFF]/30">
                        
                        {/* Left: ID & Name */}
                        <div className="flex items-center gap-3 md:gap-12 flex-1 mr-2">
                            <span className="font-display font-bold text-xl md:text-3xl opacity-50 group-hover:opacity-100 transition-opacity shrink-0">
                                {feature.id}
                            </span>
                            <h3 className="font-display font-bold text-2xl sm:text-3xl md:text-6xl uppercase tracking-tight leading-none break-words">
                                {feature.name}
                            </h3>
                        </div>

                        {/* Right: Price/Tag */}
                        <div className="relative shrink-0">
                            <span className="font-display font-bold text-3xl md:text-6xl tracking-tighter group-hover:blur-[2px] transition-all duration-300">
                                {feature.price}
                            </span>
                        </div>

                        {/* Hover Description Reveal (Slide In) */}
                        <div className="absolute inset-0 bg-[#936DFF] text-[#FFFFFF] flex items-center justify-center 
                                        transform translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-[cubic-bezier(0.25,1,0.5,1)]
                                        overflow-hidden pointer-events-none z-20">
                             <div className="w-full h-full border-2 md:border-4 border-[#FFFFFF] flex flex-col md:flex-row items-center justify-center md:justify-between px-4 md:px-10 py-2 gap-1 md:gap-4">
                                <span className="font-display font-bold text-lg md:text-2xl uppercase tracking-widest hidden md:block">{feature.name}</span>
                                <span className="font-body font-bold text-xs sm:text-sm md:text-xl uppercase tracking-wider text-center">{feature.desc}</span>
                                <span className="font-display font-bold text-2xl md:text-3xl hidden md:block">{feature.price}</span>
                             </div>
                        </div>

                        {/* Decorative Lines - Hidden on mobile */}
                        <div className="hidden md:block absolute top-0 left-4 w-[2px] h-4 bg-[#C049FF] group-hover:bg-[#05010A]"></div>
                        <div className="hidden md:block absolute bottom-0 left-4 w-[2px] h-4 bg-[#C049FF] group-hover:bg-[#05010A]"></div>
                        <div className="hidden md:block absolute top-0 right-4 w-[2px] h-4 bg-[#C049FF] group-hover:bg-[#05010A]"></div>
                        <div className="hidden md:block absolute bottom-0 right-4 w-[2px] h-4 bg-[#C049FF] group-hover:bg-[#05010A]"></div>
                    </div>
                </div>
            ))}
        </div>

        {/* Footer Note */}
        <div className="w-full max-w-6xl mt-10 md:mt-16 text-center md:text-left font-body uppercase tracking-widest text-xs md:text-sm opacity-80 border-t-2 border-[#936DFF] pt-4 md:pt-6 flex flex-col md:flex-row justify-between gap-2 text-[#B8B8CC]">
             <span>Provably Fair Gaming on Solana</span>
             <span>Umbra Casino • 2024</span>
        </div>

    </div>
  );
};

