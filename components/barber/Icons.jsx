import React from 'react';

// Left arrow icon for navigation
export const ArrowLeft = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

// Right arrow with circle border
export const ArrowCircleRight = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className={className}>
    <circle cx="12" cy="12" r="10" />
    <path d="M10 8L14 12L10 16" strokeWidth="1.5" />
  </svg>
);

// X close icon
export const CloseIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// Oval with number inside for service list
export const OvalNumber = ({ num }) => (
  <span className="inline-flex items-center justify-center relative mx-1 align-middle" style={{ width: '2.4em', height: '1.4em' }}>
    <svg viewBox="0 0 40 24" className="absolute inset-0 w-full h-full text-current" fill="none" stroke="currentColor" strokeWidth="1">
       <ellipse cx="20" cy="12" rx="19" ry="11" />
    </svg>
    <span className="font-body text-[0.65em] font-bold relative z-10 translate-y-[1px]">
        {num.toString().padStart(2, '0')}
    </span>
  </span>
);

// Stacked "BARBER" text logo
// The Symbol (The Diamond)
export const LogoStack = ({ className }) => (
  <div className={`relative flex items-center justify-center ${className}`}>
    {/* Purple Diamond */}
    <div className="w-8 h-8 bg-[#936DFF] transform rotate-45 flex items-center justify-center">
        {/* Inner Black Square (Cutout effect) */}
        <div className="w-4 h-4 bg-[#05010A]"></div>
    </div>
  </div>
);

