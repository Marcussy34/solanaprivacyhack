import { useEffect, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

const symbols = ['∑', '∫', 'π', '√', '∞', '∆', 'λ', 'θ', 'Ω', '⊕'];
const snippets = [
  'zk-SNARKs.verify(proof)',
  'public_inputs',
  'poseidon_hash(commitment)',
  'merkle_root',
  'const a = witness;',
  'return proof;'
];

export default function MathBackground() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 1000], [0, 200]);
  const y2 = useTransform(scrollY, [0, 1000], [0, -150]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({
        x: e.clientX,
        y: e.clientY,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-zinc-50">
      {/* Grid Pattern Removed */}
      
      {/* Floating Symbols */}
      {symbols.map((symbol, i) => (
        <motion.div
          key={`symbol-${i}`}
          className="absolute text-zinc-200 font-serif select-none"
          initial={{ 
            x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000), 
            y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1000),
            opacity: 0.3,
            scale: 0.8 + Math.random() * 0.5
          }}
          animate={{
            x: mousePosition.x * (0.02 + i * 0.005),
            y: mousePosition.y * (0.02 + i * 0.005),
          }}
          style={{
            fontSize: `${20 + Math.random() * 40}px`,
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            y: i % 2 === 0 ? y1 : y2,
          }}
          transition={{ type: "spring", damping: 50, stiffness: 50 }}
        >
          {symbol}
        </motion.div>
      ))}

      {/* Code Snippets */}
      {snippets.map((snippet, i) => (
        <motion.div
          key={`snippet-${i}`}
          className="absolute text-zinc-200 font-mono text-xs sm:text-sm select-none opacity-20"
          initial={{ 
            x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000), 
            y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1000),
          }}
          animate={{
            x: -mousePosition.x * (0.01 + i * 0.002),
            y: -mousePosition.y * (0.01 + i * 0.002),
          }}
          style={{
            top: `${10 + Math.random() * 80}%`,
            left: `${10 + Math.random() * 80}%`,
            y: i % 2 === 0 ? y2 : y1,
          }}
        >
          {snippet}
        </motion.div>
      ))}
      
      {/* Gradient Overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/50 via-transparent to-white/80" />
    </div>
  );
}
