/**
 * CardFan - 5 cards in spread formation
 *
 * Five playing cards fanned out, each showing a different suit in the corner.
 * Matches WireframeCard style with stroke-only paths and wireframe details.
 * Designed for scroll-triggered spread animation with GSAP.
 */
import { forwardRef } from 'react';

const CardFan = forwardRef(({ className = '' }, ref) => {
  // Card configurations: rotation, x offset, suit symbol path
  const cards = [
    {
      rotation: -20,
      x: 0,
      suit: 'spade',
      // Spade path
      suitPath: 'M0 -6 C0 -6 -4 0 -4 3 C-4 5 -2 6 0 4 C2 6 4 5 4 3 C4 0 0 -6 0 -6 M0 4 L0 8 M-2 8 L2 8'
    },
    {
      rotation: -10,
      x: 20,
      suit: 'heart',
      // Heart path
      suitPath: 'M0 2 C0 2 -5 -2 -5 -4 C-5 -7 -2 -8 0 -5 C2 -8 5 -7 5 -4 C5 -2 0 2 0 6'
    },
    {
      rotation: 0,
      x: 40,
      suit: 'diamond',
      // Diamond path
      suitPath: 'M0 -7 L5 0 L0 7 L-5 0 Z'
    },
    {
      rotation: 10,
      x: 60,
      suit: 'club',
      // Club path
      suitPath: 'M0 -6 C-2 -6 -3 -4 -3 -2 C-3 0 -1 1 0 0 C-3 0 -5 2 -5 4 C-5 6 -3 7 -1 6 C0 6 0 6 0 8 M0 0 C1 1 3 0 3 -2 C3 -4 2 -6 0 -6 M0 0 C3 0 5 2 5 4 C5 6 3 7 1 6'
    },
    {
      rotation: 20,
      x: 80,
      suit: 'spade',
      // Another spade
      suitPath: 'M0 -6 C0 -6 -4 0 -4 3 C-4 5 -2 6 0 4 C2 6 4 5 4 3 C4 0 0 -6 0 -6 M0 4 L0 8 M-2 8 L2 8'
    }
  ];

  return (
    <svg
      ref={ref}
      viewBox="0 0 200 160"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {cards.map((card, i) => (
        <g
          key={i}
          transform={`rotate(${card.rotation} 100 140)`}
          className="card-group"
          style={{ transformOrigin: '100px 140px' }}
        >
          {/* Card outline */}
          <rect
            x={60 + card.x * 0.2}
            y="20"
            width="50"
            height="70"
            rx="4"
            className="card-path"
          />

          {/* Inner border */}
          <rect
            x={64 + card.x * 0.2}
            y="24"
            width="42"
            height="62"
            rx="2"
            strokeWidth="0.5"
            strokeDasharray="2 2"
            className="detail-path"
          />

          {/* Top-left suit symbol */}
          <g transform={`translate(${72 + card.x * 0.2}, 38) scale(0.8)`}>
            <path d={card.suitPath} strokeWidth="1.2" className="detail-path" />
          </g>

          {/* Bottom-right suit symbol (rotated 180) */}
          <g transform={`translate(${98 + card.x * 0.2}, 78) rotate(180) scale(0.8)`}>
            <path d={card.suitPath} strokeWidth="1.2" className="detail-path" />
          </g>

          {/* Wireframe accent lines */}
          <line
            x1={85 + card.x * 0.2}
            y1="50"
            x2={85 + card.x * 0.2}
            y2="60"
            strokeWidth="0.5"
            strokeDasharray="1 2"
            className="detail-path"
          />
        </g>
      ))}

      {/* Shadow/base indicator at bottom */}
      <ellipse
        cx="100"
        cy="145"
        rx="60"
        ry="8"
        strokeWidth="1"
        strokeDasharray="4 4"
        opacity="0.3"
        className="detail-path"
      />
    </svg>
  );
});

CardFan.displayName = 'CardFan';

export default CardFan;
