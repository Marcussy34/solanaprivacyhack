/**
 * CircuitDiagram - ZK Proof Flow Visualization
 *
 * Detailed circuit diagram showing the ZK constraint system.
 * Visualizes: seed + deck[] → multiplication/addition gates → hash → commitment
 * Designed for sequential stroke animation via GSAP ScrollTrigger.
 *
 * After draw completes, animated data pulses flow through the circuit paths.
 */
import { forwardRef } from 'react';

const CircuitDiagram = forwardRef(({ className = '' }, ref) => {
  return (
    <svg
      ref={ref}
      viewBox="0 0 400 160"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* ============================================ */}
      {/* STATIC ELEMENTS (drawn on scroll)           */}
      {/* ============================================ */}

      {/* Input boxes */}
      {/* Seed input */}
      <rect x="20" y="20" width="60" height="30" rx="4" className="card-path" />
      <text x="50" y="40" textAnchor="middle" fontSize="11" fontFamily="monospace" fill="currentColor" stroke="none">seed</text>

      {/* Deck array input */}
      <rect x="20" y="70" width="60" height="30" rx="4" className="card-path" />
      <text x="50" y="90" textAnchor="middle" fontSize="11" fontFamily="monospace" fill="currentColor" stroke="none">deck[]</text>

      {/* Blinding factor input */}
      <rect x="20" y="120" width="60" height="30" rx="4" className="card-path" />
      <text x="50" y="140" textAnchor="middle" fontSize="9" fontFamily="monospace" fill="currentColor" stroke="none">blinding</text>

      {/* Connection lines from inputs to gates */}
      {/* These paths have IDs for the data flow animation */}
      <path id="path-seed" d="M80 35 L120 35 L120 55" className="card-path flow-path" />
      <path id="path-deck" d="M80 85 L100 85 L100 65 L120 65" className="card-path flow-path" />
      <path id="path-blinding" d="M80 135 L140 135 L140 100" className="card-path flow-path" />

      {/* Multiplication gate */}
      <circle cx="140" cy="60" r="20" className="card-path gate-node" data-gate="mul" />
      <text x="140" y="65" textAnchor="middle" fontSize="18" fontFamily="serif" fill="currentColor" stroke="none">×</text>
      <text x="140" y="92" textAnchor="middle" fontSize="8" fontFamily="monospace" fill="currentColor" stroke="none" opacity="0.6">MUL</text>

      {/* Addition gate */}
      <circle cx="220" cy="60" r="20" className="card-path gate-node" data-gate="add" />
      <text x="220" y="65" textAnchor="middle" fontSize="18" fontFamily="serif" fill="currentColor" stroke="none">+</text>
      <text x="220" y="92" textAnchor="middle" fontSize="8" fontFamily="monospace" fill="currentColor" stroke="none" opacity="0.6">ADD</text>

      {/* Connection from MUL to ADD */}
      <path id="path-mul-add" d="M160 60 L200 60" className="card-path flow-path" />

      {/* Connection from blinding to ADD */}
      <path id="path-blinding-add" d="M140 100 L180 100 L180 75 L200 72" strokeDasharray="3 2" className="detail-path flow-path" />

      {/* Hash gate */}
      <rect x="270" y="40" width="50" height="40" rx="6" className="card-path gate-node" data-gate="hash" />
      <text x="295" y="65" textAnchor="middle" fontSize="10" fontFamily="monospace" fill="currentColor" stroke="none">HASH</text>

      {/* Inner hash detail (Poseidon symbol) */}
      <path d="M280 50 Q295 45 310 50" strokeWidth="1" strokeDasharray="2 2" className="detail-path" />

      {/* Connection from ADD to HASH */}
      <path id="path-add-hash" d="M240 60 L270 60" className="card-path flow-path" />

      {/* Output commitment box */}
      <rect x="350" y="35" width="40" height="50" rx="4" className="card-path gate-node" data-gate="commit" />
      <text x="370" y="55" textAnchor="middle" fontSize="7" fontFamily="monospace" fill="currentColor" stroke="none">commit</text>
      <text x="370" y="68" textAnchor="middle" fontSize="7" fontFamily="monospace" fill="currentColor" stroke="none">ment</text>

      {/* Connection from HASH to commitment */}
      <path id="path-hash-commit" d="M320 60 L350 60" className="card-path flow-path" />

      {/* Small checkmark on output indicating verified */}
      <path d="M362 75 L368 80 L378 70" strokeWidth="1.5" className="card-path checkmark" />

      {/* Dashed wireframe construction lines */}
      <line x1="140" y1="20" x2="140" y2="40" strokeWidth="1" strokeDasharray="2 2" className="detail-path" />
      <line x1="220" y1="20" x2="220" y2="40" strokeWidth="1" strokeDasharray="2 2" className="detail-path" />
      <line x1="295" y1="15" x2="295" y2="40" strokeWidth="1" strokeDasharray="2 2" className="detail-path" />

      {/* Constraint count label */}
      <text x="295" y="130" textAnchor="middle" fontSize="9" fontFamily="monospace" fill="currentColor" stroke="none" opacity="0.5">~812 constraints</text>

      {/* Flow arrows (decorative) */}
      <polygon points="347,60 342,55 342,65" fill="currentColor" stroke="none" opacity="0.5" />
      <polygon points="267,60 262,55 262,65" fill="currentColor" stroke="none" opacity="0.5" />
      <polygon points="197,60 192,55 192,65" fill="currentColor" stroke="none" opacity="0.5" />

      {/* ============================================ */}
      {/* ANIMATED DATA PULSES                        */}
      {/* These circles animate along the paths       */}
      {/* ============================================ */}

      {/* Data pulse from seed → MUL */}
      <circle
        className="data-pulse pulse-seed"
        r="4"
        fill="currentColor"
        opacity="0"
      />

      {/* Data pulse from deck → MUL */}
      <circle
        className="data-pulse pulse-deck"
        r="4"
        fill="currentColor"
        opacity="0"
      />

      {/* Data pulse from blinding → ADD */}
      <circle
        className="data-pulse pulse-blinding"
        r="3"
        fill="currentColor"
        opacity="0"
      />

      {/* Data pulse from MUL → ADD */}
      <circle
        className="data-pulse pulse-mul-add"
        r="5"
        fill="currentColor"
        opacity="0"
      />

      {/* Data pulse from ADD → HASH */}
      <circle
        className="data-pulse pulse-add-hash"
        r="5"
        fill="currentColor"
        opacity="0"
      />

      {/* Data pulse from HASH → Commitment */}
      <circle
        className="data-pulse pulse-hash-commit"
        r="6"
        fill="currentColor"
        opacity="0"
      />

      {/* Gate glow rings (pulse when data arrives) */}
      <circle className="gate-glow glow-mul" cx="140" cy="60" r="24" fill="none" strokeWidth="2" opacity="0" />
      <circle className="gate-glow glow-add" cx="220" cy="60" r="24" fill="none" strokeWidth="2" opacity="0" />
      <rect className="gate-glow glow-hash" x="266" y="36" width="58" height="48" rx="10" fill="none" strokeWidth="2" opacity="0" />
      <rect className="gate-glow glow-commit" x="346" y="31" width="48" height="58" rx="8" fill="none" strokeWidth="2" opacity="0" />
    </svg>
  );
});

CircuitDiagram.displayName = 'CircuitDiagram';

export default CircuitDiagram;
