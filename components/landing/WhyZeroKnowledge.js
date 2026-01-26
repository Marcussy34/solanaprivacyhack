/**
 * WhyZeroKnowledge Section
 *
 * 2×2 grid of benefit cards highlighting ZK advantages:
 * Trustless, Provably Fair, Private, On-Chain
 *
 * Features:
 * - Staggered blur-fade entrance on scroll
 * - Hover micro-interaction: radial gradient follows cursor
 * - Floating circuit nodes parallax in background
 */
'use client';

import { useRef, useState, useCallback } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap, ScrollTrigger } from '../../lib/gsap';
import { BlurFade } from '../ui/blur-fade';
import CircuitBackground from '../svg/CircuitBackground';
import { Shield, Scale, Eye, Link2 } from 'lucide-react';

// Feature card configurations
const features = [
  {
    id: 'trustless',
    title: 'Trustless',
    description: 'No casino or dealer can manipulate the outcome. The math guarantees fairness.',
    Icon: Shield,
    gradient: 'from-zinc-100 to-zinc-50',
  },
  {
    id: 'provably-fair',
    title: 'Provably Fair',
    description: 'Cryptographic proofs verify every shuffle, deal, and reveal. Anyone can audit.',
    Icon: Scale,
    gradient: 'from-zinc-100 to-zinc-50',
  },
  {
    id: 'private',
    title: 'Private',
    description: 'Your cards remain hidden until reveal. Zero-knowledge means zero data leaks.',
    Icon: Eye,
    gradient: 'from-zinc-100 to-zinc-50',
  },
  {
    id: 'on-chain',
    title: 'On-Chain',
    description: 'All game state and proofs are verified on Solana. Immutable and transparent.',
    Icon: Link2,
    gradient: 'from-zinc-100 to-zinc-50',
  },
];

/**
 * FeatureCard - Individual card with cursor-tracking gradient
 */
function FeatureCard({ feature, index }) {
  const cardRef = useRef(null);
  const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 });

  // Track mouse position relative to card for gradient effect
  const handleMouseMove = useCallback((e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePosition({ x, y });
  }, []);

  const handleMouseLeave = useCallback(() => {
    // Reset to center when mouse leaves
    setMousePosition({ x: 50, y: 50 });
  }, []);

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="group relative bg-white rounded-2xl border border-zinc-200 p-8
                 hover:border-zinc-300 hover:shadow-lg transition-all duration-300
                 overflow-hidden cursor-default"
    >
      {/* Cursor-following radial gradient overlay */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background: `radial-gradient(circle at ${mousePosition.x}% ${mousePosition.y}%, rgba(39, 39, 42, 0.05) 0%, transparent 50%)`,
        }}
      />

      {/* Card content */}
      <div className="relative z-10">
        {/* Icon */}
        <div className="w-14 h-14 mb-6 rounded-xl bg-zinc-100 flex items-center justify-center
                        group-hover:bg-zinc-900 group-hover:text-white transition-colors duration-300">
          <feature.Icon className="w-7 h-7" />
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-zinc-900 mb-3">{feature.title}</h3>

        {/* Description */}
        <p className="text-zinc-600 leading-relaxed">{feature.description}</p>
      </div>

      {/* Decorative corner accent */}
      <div className="absolute bottom-4 right-4 w-8 h-8 border-r border-b border-zinc-200
                      group-hover:border-zinc-400 transition-colors duration-300" />
    </div>
  );
}

export default function WhyZeroKnowledge() {
  const sectionRef = useRef(null);
  const backgroundRef = useRef(null);

  useGSAP(() => {
    if (!backgroundRef.current || !sectionRef.current) return;

    const mm = gsap.matchMedia();

    mm.add('(prefers-reduced-motion: no-preference)', () => {
      // Parallax effect on circuit background
      gsap.to(backgroundRef.current, {
        y: -80,
        ease: 'none',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1,
        },
      });

      // Subtle rotation for depth
      gsap.to(backgroundRef.current, {
        rotate: 3,
        ease: 'none',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 2,
        },
      });
    });

    return () => mm.revert();
  }, { scope: sectionRef });

  return (
    <section
      ref={sectionRef}
      className="relative py-24 md:py-32 bg-zinc-50 overflow-hidden"
    >
      {/* Background circuit pattern with parallax */}
      <div
        ref={backgroundRef}
        className="absolute inset-0 -top-20 -bottom-20 text-zinc-300 opacity-40 pointer-events-none"
      >
        <CircuitBackground className="w-full h-full" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-4">
        {/* Section header */}
        <div className="text-center mb-16">
          <BlurFade delay={0} inView>
            <span className="font-mono text-xs text-zinc-500 tracking-wider uppercase mb-4 block">
              // Why It Matters
            </span>
          </BlurFade>
          <BlurFade delay={0.1} inView>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-zinc-900 mb-4">
              Why Zero-Knowledge?
            </h2>
          </BlurFade>
          <BlurFade delay={0.2} inView>
            <p className="text-lg text-zinc-600 max-w-2xl mx-auto">
              Traditional online casinos ask you to trust them. We ask you to verify.
            </p>
          </BlurFade>
        </div>

        {/* 2×2 Feature grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature, index) => (
            <BlurFade key={feature.id} delay={0.3 + index * 0.1} inView>
              <FeatureCard feature={feature} index={index} />
            </BlurFade>
          ))}
        </div>

        {/* Bottom quote/tagline */}
        <BlurFade delay={0.7} inView>
          <div className="mt-16 text-center">
            <p className="text-2xl md:text-3xl font-light text-zinc-700 italic">
              "Don't trust. <span className="font-medium text-zinc-900 not-italic">Verify.</span>"
            </p>
          </div>
        </BlurFade>
      </div>
    </section>
  );
}
