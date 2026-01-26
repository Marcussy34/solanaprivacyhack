import React from 'react';
import { COLORS, SERVICES } from '../../lib/barber/constants';
import { ArrowLeft, ArrowCircleRight, CloseIcon, OvalNumber, LogoStack } from './Icons';

// Main poster component - the flat design that sits behind the 3D overlay
export const Poster = ({ className = '' }) => {
  return (
    <div 
      className={`relative w-full h-full flex flex-col justify-between overflow-hidden ${className}`}
      style={{ 
        backgroundColor: COLORS.PRIMARY, 
        color: COLORS.DARK,
      }}
    >
      {/* --- TOP BAR --- */}
      <header className="flex-none border-b-2 border-[#1F0B05] h-14 sm:h-16 md:h-20 flex items-stretch">
        {/* Left Arrow Box */}
        <div className="w-14 sm:w-16 md:w-20 border-r-2 border-[#1F0B05] flex items-center justify-center shrink-0">
          <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8" />
        </div>
        
        {/* Center Title */}
        <div className="flex-grow flex items-center justify-center px-2 sm:px-4">
            <span className="font-display font-bold text-xs sm:text-sm md:text-lg tracking-widest mr-2 sm:mr-4 md:mr-8 opacity-80">20</span>
            <h1 className="font-display font-bold text-3xl sm:text-4xl md:text-6xl tracking-tighter uppercase leading-none transform scale-y-110">
                ANGIE'S
            </h1>
            <span className="font-display font-bold text-xs sm:text-sm md:text-lg tracking-widest ml-2 sm:ml-4 md:ml-8 opacity-80">16</span>
        </div>

        {/* Right Logo Stack */}
        <div className="w-14 sm:w-16 md:w-20 border-l-2 border-[#1F0B05] flex items-center justify-center shrink-0 p-1">
          <LogoStack className="scale-75 sm:scale-100" />
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-grow flex flex-col items-center justify-center py-6 sm:py-8 md:py-12 px-2 sm:px-4 text-center relative">
        
        {/* Sub-label */}
        <p className="font-display font-bold text-[10px] sm:text-xs md:text-sm tracking-[0.2em] uppercase mb-2 md:mb-4">
            Fryzjer Męski
        </p>

        {/* Huge Headline */}
        <h2 className="font-display font-bold text-[13vw] sm:text-[14vh] leading-[0.85] tracking-tight uppercase mb-4 sm:mb-6 transform scale-y-110 w-full" style={{ maxWidth: '95%' }}>
            Angie's Barber
        </h2>

        {/* Est */}
        <p className="font-display font-bold text-xs sm:text-sm md:text-base tracking-[0.25em] mb-6 sm:mb-8 md:mb-12">
            EST. 2016
        </p>

        {/* Service List */}
        <div className="max-w-2xl w-full mx-auto px-2">
            <div className="flex flex-wrap justify-center items-center gap-x-1 gap-y-2 font-body text-[10px] sm:text-xs md:text-base leading-tight italic font-medium">
                {SERVICES.map((service) => (
                    <span key={service.id} className="whitespace-nowrap px-1">
                        <OvalNumber num={service.id} />
                        <span className="ml-1 tracking-wide">{service.label}</span>
                    </span>
                ))}
            </div>
        </div>

        {/* Center Stamp (Visual decor) */}
        <div className="mt-8 sm:mt-12 md:mt-16 transform -rotate-6 opacity-90 scale-75 sm:scale-100">
             <div className="border-2 border-[#1F0B05] p-1 inline-block">
                <LogoStack className="text-base sm:text-xl" />
             </div>
        </div>

      </main>

      {/* --- BOTTOM BAR --- */}
      <footer className="flex-none border-t-2 border-[#1F0B05] h-12 sm:h-14 md:h-16 flex items-stretch">
        {/* Left Close */}
        <div className="w-12 sm:w-14 md:w-16 border-r-2 border-[#1F0B05] flex items-center justify-center shrink-0">
          <CloseIcon className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
        </div>

        {/* Center Repeater */}
        <div className="flex-grow flex items-center justify-center overflow-hidden">
            <div className="flex items-center space-x-4 sm:space-x-8 md:space-x-12 whitespace-nowrap opacity-90">
                <span className="font-display font-bold text-[10px] sm:text-xs md:text-sm tracking-[0.2em]">20</span>
                <span className="font-display font-bold text-xl sm:text-2xl md:text-3xl tracking-tighter uppercase transform scale-y-110">ANGIE'S</span>
                <span className="font-display font-bold text-[10px] sm:text-xs md:text-sm tracking-[0.2em]">16</span>
            </div>
        </div>

        {/* Right Arrow */}
        <div className="w-12 sm:w-14 md:w-16 border-l-2 border-[#1F0B05] flex items-center justify-center shrink-0">
          <ArrowCircleRight className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8" />
        </div>
      </footer>
    </div>
  );
};

