/**
 * CircuitBackground - Floating nodes network pattern
 *
 * Abstract background pattern of interconnected nodes and lines.
 * Creates depth with varying opacity and sizes.
 * Designed for parallax scrolling effects.
 */
import { forwardRef } from 'react';

const CircuitBackground = forwardRef(({ className = '' }, ref) => {
  // Generate random but deterministic node positions
  const nodes = [
    { x: 50, y: 30, r: 4, opacity: 0.3 },
    { x: 150, y: 60, r: 6, opacity: 0.4 },
    { x: 280, y: 40, r: 3, opacity: 0.2 },
    { x: 380, y: 80, r: 5, opacity: 0.35 },
    { x: 100, y: 120, r: 4, opacity: 0.25 },
    { x: 220, y: 100, r: 7, opacity: 0.4 },
    { x: 320, y: 140, r: 4, opacity: 0.3 },
    { x: 420, y: 50, r: 5, opacity: 0.35 },
    { x: 80, y: 180, r: 3, opacity: 0.2 },
    { x: 180, y: 160, r: 6, opacity: 0.4 },
    { x: 260, y: 200, r: 4, opacity: 0.3 },
    { x: 360, y: 180, r: 5, opacity: 0.35 },
    { x: 450, y: 120, r: 4, opacity: 0.25 },
    { x: 30, y: 90, r: 3, opacity: 0.2 },
    { x: 480, y: 190, r: 6, opacity: 0.4 },
  ];

  // Connection lines between nearby nodes
  const connections = [
    [0, 1], [1, 2], [2, 3], [1, 4], [4, 5], [5, 6], [3, 7],
    [4, 8], [8, 9], [9, 10], [10, 11], [6, 11], [7, 12],
    [0, 13], [11, 14], [5, 2], [9, 5], [10, 6]
  ];

  return (
    <svg
      ref={ref}
      viewBox="0 0 500 220"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      preserveAspectRatio="xMidYMid slice"
    >
      {/* Connection lines */}
      {connections.map(([from, to], i) => (
        <line
          key={`line-${i}`}
          x1={nodes[from].x}
          y1={nodes[from].y}
          x2={nodes[to].x}
          y2={nodes[to].y}
          strokeWidth="1"
          opacity={Math.min(nodes[from].opacity, nodes[to].opacity) * 0.6}
          className="connection-path"
        />
      ))}

      {/* Nodes */}
      {nodes.map((node, i) => (
        <g key={`node-${i}`}>
          {/* Outer ring for larger nodes */}
          {node.r > 4 && (
            <circle
              cx={node.x}
              cy={node.y}
              r={node.r + 3}
              strokeWidth="0.5"
              strokeDasharray="2 2"
              opacity={node.opacity * 0.5}
              className="node-ring"
            />
          )}
          {/* Main node */}
          <circle
            cx={node.x}
            cy={node.y}
            r={node.r}
            strokeWidth="1.5"
            opacity={node.opacity}
            className="node-circle"
          />
          {/* Inner dot for accent */}
          <circle
            cx={node.x}
            cy={node.y}
            r={1}
            fill="currentColor"
            stroke="none"
            opacity={node.opacity * 0.8}
          />
        </g>
      ))}

      {/* Decorative small dots scattered */}
      {[
        { x: 120, y: 45 }, { x: 200, y: 130 }, { x: 340, y: 60 },
        { x: 400, y: 160 }, { x: 60, y: 150 }, { x: 300, y: 25 }
      ].map((dot, i) => (
        <circle
          key={`dot-${i}`}
          cx={dot.x}
          cy={dot.y}
          r="1.5"
          fill="currentColor"
          stroke="none"
          opacity={0.15}
        />
      ))}
    </svg>
  );
});

CircuitBackground.displayName = 'CircuitBackground';

export default CircuitBackground;
