import React from 'react';
import Link from 'next/link';

export const GameCard = ({ title, description, image, link, active = true }) => {
  const CardContent = (
    <div className={`group relative border border-[#936DFF]/30 bg-[#05010A] overflow-hidden h-full transition-all duration-300 ${!active ? 'opacity-50 grayscale pointer-events-none' : 'hover:border-[#936DFF] cursor-pointer'}`}>
      {/* Image Placeholder / Background */}
      <div className="w-full h-48 bg-[#1A1A2E] relative overflow-hidden">
        {image ? (
            <img src={image} alt={title} className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700" />
        ) : (
            <div className="w-full h-full flex items-center justify-center bg-[#936DFF]/5">
                <span className="text-[#936DFF]/20 font-display font-bold text-6xl">ZK</span>
            </div>
        )}
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#05010A] via-transparent to-transparent opacity-80"></div>
      </div>

      {/* Content */}
      <div className="p-6 relative z-10 flex flex-col h-[calc(100%-12rem)]">
        <h3 className="text-2xl font-display font-bold text-white uppercase tracking-tight mb-2 group-hover:text-[#936DFF] transition-colors">
            {title}
        </h3>
        <p className="text-[#B8B8CC] font-body text-sm leading-relaxed mb-6 flex-grow">
            {description}
        </p>

        <div className="inline-flex items-center gap-2 text-white font-display uppercase tracking-widest text-sm group-hover:gap-4 transition-all duration-300 mt-auto">
            <span>Play Now</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="#936DFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
        </div>
      </div>

      {/* Hover Border Effect (now handled by main div border color change, but keeping this for the glow if needed, or removing to simplify) */}
      {/* We can keep the opacity transition for the border if we want a separate border element, but changing the parent border is cleaner. 
          The original had a separate div for border. Let's keep the original style of "inset-0 border-2" appearing. 
      */}
      <div className="absolute inset-0 border-2 border-[#936DFF] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
    </div>
  );

  if (active && link) {
      return (
          <Link href={link} className="block h-full">
              {CardContent}
          </Link>
      );
  }

  return <div className="h-full">{CardContent}</div>;
};
