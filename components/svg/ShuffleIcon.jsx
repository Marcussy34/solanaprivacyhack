/**
 * ShuffleIcon - Two card stacks mid-riffle shuffle
 *
 * Detailed wireframe illustration showing cards interweaving during shuffle.
 * Designed for stroke-by-stroke draw animation with GSAP ScrollTrigger.
 */
import { forwardRef } from 'react';

const ShuffleIcon = forwardRef(({ className = '' }, ref) => {
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
      {/* Left card stack - 3 cards fanning left */}
      <rect x="8" y="20" width="24" height="36" rx="2" className="card-path" />
      <rect x="12" y="17" width="24" height="36" rx="2" className="card-path" />
      <rect x="16" y="14" width="24" height="36" rx="2" className="card-path" />

      {/* Right card stack - 3 cards fanning right */}
      <rect x="48" y="20" width="24" height="36" rx="2" className="card-path" />
      <rect x="44" y="17" width="24" height="36" rx="2" className="card-path" />
      <rect x="40" y="14" width="24" height="36" rx="2" className="card-path" />

      {/* Interweaving cards in middle (motion lines) */}
      <line x1="35" y1="25" x2="45" y2="22" strokeDasharray="2 2" className="detail-path" />
      <line x1="35" y1="32" x2="45" y2="35" strokeDasharray="2 2" className="detail-path" />
      <line x1="35" y1="40" x2="45" y2="38" strokeDasharray="2 2" className="detail-path" />
      <line x1="35" y1="48" x2="45" y2="50" strokeDasharray="2 2" className="detail-path" />

      {/* Motion arc indicating shuffle action */}
      <path d="M28 58 Q40 68 52 58" strokeDasharray="3 3" className="detail-path" />

      {/* Small corner detail on center cards */}
      <path d="M18 18 L22 18 L22 22" strokeWidth="1" className="detail-path" />
      <path d="M58 18 L62 18 L62 22" strokeWidth="1" className="detail-path" />
    </svg>
  );
});

ShuffleIcon.displayName = 'ShuffleIcon';

export default ShuffleIcon;
