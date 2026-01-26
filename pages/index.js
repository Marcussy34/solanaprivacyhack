import React from 'react';
import Head from 'next/head';
import { Poster } from '../components/arena/Poster';
import { HeroOverlay } from '../components/arena/HeroOverlay';
import { Scene } from '../components/arena/Scene';
import { ServiceMenu } from '../components/arena/ServiceMenu';
import { ParticleText } from '../components/arena/ParticleText';

export default function Home() {
  return (
    <>
      <Head>
        <title>Provably Fair Casino | ZK Blackjack</title>
        <meta name="description" content="Provably fair casino on Solana using Zero-Knowledge Proofs (Noir) and ShadowWire privacy." />
        {/* Google Fonts for the Umbra theme */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Antonio:wght@400;500;600;700&family=Oswald:wght@400;500;600;700&family=Roboto+Condensed:ital,wght@0,300;0,400;0,700;1,300;1,400;1,700&display=swap" rel="stylesheet" />
      </Head>

      <div className="bg-[#05010A] min-h-screen text-[#FFFFFF] w-full overflow-x-hidden arena-theme">
        
        {/* SECTION 1: THE FLAT POSTER + CARD OVERLAY */}
        <section className="w-full h-screen flex items-center justify-center p-2 sm:p-4 box-border bg-[#05010A] relative z-10">
          {/* The 3D Overlay sits on top of the poster */}
          <HeroOverlay />
          
          <div className="w-full h-full max-h-[95vh] aspect-[1/1.4] shadow-2xl mx-auto border-[1px] border-[#936DFF] relative z-0">
               <Poster />
          </div>
        </section>

        {/* SECTION 2: SPLIT LAYOUT (3D Cloth + Info) */}
        <section className="w-full min-h-screen relative bg-black overflow-hidden border-t-8 border-[#936DFF] flex flex-col md:flex-row">
          
          {/* Left: 3D Scene Wrapper */}
          <div className="w-full md:w-1/2 h-[50vh] md:h-screen relative border-b-8 md:border-b-0 md:border-r-8 border-[#936DFF]">
              <div className="absolute top-4 left-4 z-10 text-[#936DFF] font-display uppercase tracking-widest text-sm opacity-50 pointer-events-none">
                  Provably Fair System
              </div>
              {/* The Scene component will fit this container */}
              <Scene />
          </div>

          {/* Right: Product Information */}
          <div className="w-full md:w-1/2 min-h-[50vh] md:h-screen bg-[#05010A] text-[#936DFF] p-6 sm:p-8 md:p-12 lg:p-20 flex flex-col justify-center relative z-20">
               <h2 className="font-display font-bold text-5xl sm:text-6xl md:text-7xl lg:text-8xl leading-[0.85] tracking-tighter uppercase mb-6 text-[#FFFFFF]">
                   Trustless<br/>Gambling
               </h2>
               
               <div className="w-20 h-1 bg-[#936DFF] mb-8 opacity-80"></div>
               
               <p className="font-body text-[#B8B8CC] text-base sm:text-lg md:text-xl leading-relaxed opacity-90 mb-10 max-w-md">
                   Experience the future of casino gaming. Built on Solana with Noir Zero-Knowledge Proofs.
                   Every shuffle is cryptographically proven, ensuring the house cannot cheat.
               </p>

               <div className="grid grid-cols-2 gap-8 mb-12 font-display uppercase tracking-widest text-xs sm:text-sm">
                  <div>
                      <span className="block text-[#B8B8CC] opacity-50 text-[10px] sm:text-xs mb-1">Network</span>
                      <span className="text-lg sm:text-xl text-[#FFFFFF]">Solana</span>
                  </div>
                  <div>
                      <span className="block text-[#B8B8CC] opacity-50 text-[10px] sm:text-xs mb-1">Technology</span>
                      <span className="text-lg sm:text-xl text-[#FFFFFF]">Noir ZK</span>
                  </div>
               </div>

               <button className="group relative px-6 py-3 sm:px-8 sm:py-4 border-2 border-[#936DFF] w-max overflow-hidden">
                  <span className="relative z-10 font-display font-bold text-base sm:text-lg uppercase tracking-widest group-hover:text-[#05010A] transition-colors duration-300 text-[#FFFFFF]">
                      Play Demo
                  </span>
                  <div className="absolute inset-0 bg-[#936DFF] transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-in-out"></div>
               </button>
          </div>
        </section>

        {/* SECTION 3: FEATURES MENU */}
        <section className="w-full bg-[#936DFF] relative">
           <ServiceMenu />
        </section>

        {/* SECTION 4: CREATIVE PARTICLE TYPOGRAPHY (Interactive) */}
        <section className="w-full h-[50vh] md:h-[60vh] bg-[#05010A] relative border-t-8 border-[#936DFF] overflow-hidden">
          <div className="w-full h-full cursor-crosshair">
               <ParticleText />
          </div>
          <div className="absolute bottom-4 right-4 text-[#936DFF] font-display text-xs tracking-[0.3em] uppercase opacity-60">
              Disrupt to reveal
          </div>
        </section>

        {/* SECTION 5: FOOTER BRANDING */}
        <section className="w-full bg-[#936DFF] relative overflow-hidden flex flex-col sm:flex-row h-auto min-h-[40vh] border-t-8 border-[#05010A]">
          
          {/* LEFT: Text Content */}
          <div className="flex-grow flex items-center justify-center pl-4 sm:pl-8 z-10">
               <h1 className="font-display font-bold text-[18vw] sm:text-[16vw] leading-[0.85] tracking-tighter uppercase text-[#05010A]">
                  UMBRA
              </h1>
          </div>

          {/* RIGHT: SVG SHAPE BLOCK */}
          <div className="w-full sm:w-[40%] md:w-[35%] h-[30vh] sm:h-auto relative self-stretch shrink-0">
               <svg 
                  className="w-full h-full absolute inset-0" 
                  viewBox="0 0 100 100" 
                  preserveAspectRatio="none"
               >
                  <path 
                      d="M 0 0 L 100 0 L 100 100 L 40 100 L 40 40 L 0 40 Z" 
                      fill="#05010A" 
                  />
               </svg>
               
               <div className="absolute inset-0 flex items-center justify-end pr-[10%] sm:pr-[15%]">
                   <div className="h-[80%] flex items-center justify-center">
                      <span className="font-display font-bold text-[#936DFF] text-[15vw] sm:text-[8vw] leading-none tracking-tighter transform -rotate-90 whitespace-nowrap origin-center">
                          CASINO
                      </span>
                   </div>
               </div>
          </div>

        </section>
        
      </div>
    </>
  );
}
