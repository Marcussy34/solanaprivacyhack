/**
 * PlayIcon - Hand holding two cards with gesture
 *
 * Wireframe style hand holding cards (blackjack hand),
 * finger pointing to indicate "hit" action.
 * Designed for stroke-by-stroke draw animation with GSAP ScrollTrigger.
 */
import { forwardRef } from 'react';

const PlayIcon = forwardRef(({ className = '' }, ref) => {
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
      {/* Hand outline - simplified wireframe */}
      <path d="M20 55 L20 45 Q20 35 28 32 L35 30" className="card-path" />
      <path d="M35 30 L35 25 Q35 22 38 22 L42 22 Q45 22 45 25 L45 35" className="card-path" />
      <path d="M45 35 L45 55" className="card-path" />
      <path d="M20 55 Q20 62 30 62 L38 62 Q48 62 48 55 L48 50" className="card-path" />

      {/* First card (partially visible, held by hand) */}
      <rect x="25" y="8" width="18" height="26" rx="1.5" className="card-path" />
      <path d="M31 15 L31 12 M34 15 L37 12 L37 15" strokeWidth="1" className="detail-path" />

      {/* Second card (overlapping, angled) */}
      <g transform="rotate(15 50 21)">
        <rect x="38" y="8" width="18" height="26" rx="1.5" className="card-path" />
        <path d="M44 14 C44 14 42 17 42 19 C42 20.5 43.5 21 44 20 C44.5 21 46 20.5 46 19 C46 17 44 14 44 14"
              strokeWidth="1" className="detail-path" />
      </g>

      {/* Pointing finger indicating action */}
      <path d="M52 40 L65 38 Q68 38 68 40 L68 44 Q68 46 65 46 L52 44" className="card-path" />

      {/* Action indicator dots */}
      <circle cx="72" cy="42" r="2" strokeDasharray="1 1" className="detail-path" />
      <circle cx="74" cy="36" r="1.5" strokeDasharray="1 1" className="detail-path" />
      <circle cx="74" cy="48" r="1.5" strokeDasharray="1 1" className="detail-path" />

      {/* Wireframe construction lines */}
      <line x1="30" y1="62" x2="30" y2="68" strokeWidth="1" strokeDasharray="2 2" className="detail-path" />
      <line x1="40" y1="62" x2="40" y2="68" strokeWidth="1" strokeDasharray="2 2" className="detail-path" />
    </svg>
  );
});

PlayIcon.displayName = 'PlayIcon';

export default PlayIcon;
