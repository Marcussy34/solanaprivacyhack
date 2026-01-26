/**
 * ZKBadge - Shield with circuit pattern and "ZK" text
 *
 * Verification badge showing Zero-Knowledge authentication.
 * Features shield outline, internal circuit pattern, and lock icon.
 * Designed for stroke-by-stroke draw animation with GSAP ScrollTrigger.
 */
import { forwardRef } from 'react';

const ZKBadge = forwardRef(({ className = '', size = 80 }, ref) => {
  return (
    <svg
      ref={ref}
      viewBox="0 0 80 80"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Shield outline */}
      <path
        d="M40 8 L68 18 L68 42 C68 58 54 70 40 76 C26 70 12 58 12 42 L12 18 L40 8"
        className="card-path"
      />

      {/* Inner shield border */}
      <path
        d="M40 14 L62 22 L62 42 C62 54 52 64 40 68 C28 64 18 54 18 42 L18 22 L40 14"
        strokeDasharray="4 2"
        className="detail-path"
      />

      {/* Circuit pattern inside shield */}
      {/* Horizontal circuit lines */}
      <line x1="24" y1="36" x2="32" y2="36" className="detail-path" />
      <line x1="48" y1="36" x2="56" y2="36" className="detail-path" />
      <line x1="24" y1="48" x2="32" y2="48" className="detail-path" />
      <line x1="48" y1="48" x2="56" y2="48" className="detail-path" />

      {/* Vertical circuit lines */}
      <line x1="40" y1="28" x2="40" y2="32" className="detail-path" />
      <line x1="40" y1="52" x2="40" y2="58" className="detail-path" />

      {/* Circuit nodes (small circles) */}
      <circle cx="32" cy="36" r="2" className="detail-path" />
      <circle cx="48" cy="36" r="2" className="detail-path" />
      <circle cx="32" cy="48" r="2" className="detail-path" />
      <circle cx="48" cy="48" r="2" className="detail-path" />
      <circle cx="40" cy="32" r="2" className="detail-path" />
      <circle cx="40" cy="52" r="2" className="detail-path" />

      {/* ZK text in center */}
      <text
        x="40"
        y="46"
        textAnchor="middle"
        fontSize="14"
        fontFamily="monospace"
        fontWeight="bold"
        fill="currentColor"
        stroke="none"
      >
        ZK
      </text>

      {/* Small lock icon at top */}
      <rect x="36" y="18" width="8" height="6" rx="1" className="detail-path" />
      <path d="M38 18 L38 15 Q38 12 40 12 Q42 12 42 15 L42 18" className="detail-path" />

      {/* Radiating verification lines */}
      <line x1="40" y1="2" x2="40" y2="6" strokeDasharray="1 1" className="detail-path" />
      <line x1="70" y1="30" x2="74" y2="28" strokeDasharray="1 1" className="detail-path" />
      <line x1="70" y1="50" x2="74" y2="52" strokeDasharray="1 1" className="detail-path" />
      <line x1="10" y1="30" x2="6" y2="28" strokeDasharray="1 1" className="detail-path" />
      <line x1="10" y1="50" x2="6" y2="52" strokeDasharray="1 1" className="detail-path" />
    </svg>
  );
});

ZKBadge.displayName = 'ZKBadge';

export default ZKBadge;
