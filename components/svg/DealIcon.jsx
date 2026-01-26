/**
 * DealIcon - Card separating from deck with arc trail
 *
 * Shows a card being dealt from a deck in perspective, with motion trail.
 * Designed for stroke-by-stroke draw animation with GSAP ScrollTrigger.
 */
import { forwardRef } from 'react';

const DealIcon = forwardRef(({ className = '' }, ref) => {
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
      {/* Deck stack (perspective view) - 4 cards */}
      <rect x="10" y="30" width="26" height="38" rx="2" className="card-path" />
      <line x1="10" y1="34" x2="36" y2="34" strokeWidth="1" className="detail-path" />
      <line x1="10" y1="38" x2="36" y2="38" strokeWidth="1" className="detail-path" />
      <line x1="10" y1="42" x2="36" y2="42" strokeWidth="1" className="detail-path" />

      {/* Card being dealt (in motion) */}
      <rect x="44" y="16" width="26" height="38" rx="2" className="card-path" />

      {/* Motion arc trail from deck to dealt card */}
      <path d="M36 40 Q50 30 44 24" strokeDasharray="4 3" className="detail-path" />
      <path d="M38 45 Q55 35 48 26" strokeDasharray="3 3" opacity="0.5" className="detail-path" />

      {/* Speed lines indicating movement */}
      <line x1="40" y1="35" x2="42" y2="30" strokeDasharray="2 2" className="detail-path" />
      <line x1="41" y1="40" x2="44" y2="34" strokeDasharray="2 2" className="detail-path" />

      {/* Small suit indicator on dealt card (spade) */}
      <path d="M57 28 C57 28 54 32 54 35 C54 37 56 38 57 36 C58 38 60 37 60 35 C60 32 57 28 57 28"
            strokeWidth="1" className="detail-path" />
      <line x1="57" y1="36" x2="57" y2="40" strokeWidth="1" className="detail-path" />

      {/* Deck corner wireframe detail */}
      <path d="M14 34 L14 50 L32 50" strokeWidth="1" strokeDasharray="2 2" className="detail-path" />
    </svg>
  );
});

DealIcon.displayName = 'DealIcon';

export default DealIcon;
