/**
 * RevealIcon - Card in mid-flip with verification checkmark
 *
 * Shows a card mid-rotation revealing its face, with a ZK verification
 * checkmark badge. Demonstrates the "reveal" phase of ZK blackjack.
 * Designed for stroke-by-stroke draw animation with GSAP ScrollTrigger.
 */
import { forwardRef } from 'react';

const RevealIcon = forwardRef(({ className = '' }, ref) => {
  return (
    <svg
      ref={ref}
      viewBox="0 0 80 80"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Card back (left side, showing during flip) */}
      <path d="M10 18 L10 58 L24 62" className="card-path" />
      <path d="M10 18 L24 14" className="card-path" />

      {/* Card back pattern (crosshatch) */}
      <line x1="12" y1="24" x2="20" y2="28" strokeWidth="1" strokeDasharray="2 2" className="detail-path" />
      <line x1="12" y1="32" x2="22" y2="38" strokeWidth="1" strokeDasharray="2 2" className="detail-path" />
      <line x1="12" y1="40" x2="22" y2="48" strokeWidth="1" strokeDasharray="2 2" className="detail-path" />
      <line x1="12" y1="48" x2="22" y2="56" strokeWidth="1" strokeDasharray="2 2" className="detail-path" />

      {/* Card front (right side, revealed) */}
      <path d="M24 14 L24 62 L56 54" className="card-path" />
      <path d="M24 14 L56 10 L56 54" className="card-path" />

      {/* Revealed spade on card front */}
      <path d="M40 22 C40 22 32 32 32 40 C32 46 38 50 40 44 C42 50 48 46 48 40 C48 32 40 22 40 22"
            className="card-path" />
      <line x1="40" y1="44" x2="40" y2="52" className="detail-path" />
      <path d="M36 52 L44 52" className="detail-path" />

      {/* Verification checkmark badge */}
      <circle cx="62" cy="58" r="12" className="card-path" />
      <path d="M56 58 L60 62 L68 54" strokeWidth="2" className="card-path" />

      {/* Radiating verification lines */}
      <line x1="62" y1="44" x2="62" y2="40" strokeDasharray="2 2" className="detail-path" />
      <line x1="74" y1="52" x2="77" y2="50" strokeDasharray="2 2" className="detail-path" />
      <line x1="74" y1="64" x2="77" y2="66" strokeDasharray="2 2" className="detail-path" />
      <line x1="62" y1="72" x2="62" y2="76" strokeDasharray="2 2" className="detail-path" />

      {/* 3D perspective lines (flip motion) */}
      <path d="M20 38 Q26 38 30 34" strokeWidth="1" strokeDasharray="3 3" className="detail-path" />
    </svg>
  );
});

RevealIcon.displayName = 'RevealIcon';

export default RevealIcon;
