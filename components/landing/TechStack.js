/**
 * TechStack Section
 *
 * Technical credibility section showcasing the technology:
 * - Tech logos (Solana, Noir, Sunspot) with 3D flip reveal
 * - Circuit diagram SVG that draws on scroll
 * - Count-up stats: constraints, witness gen time, verification CU
 *
 * Features:
 * - Logo cards with 3D flip animation on scroll
 * - Full circuit diagram stroke animation
 * - Animated count-up numbers
 * - Continuous data flow animation after draw completes
 */
'use client';

import { useRef, useEffect, useState } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap, ScrollTrigger, MotionPathPlugin } from '../../lib/gsap';
import { BlurFade } from '../ui/blur-fade';
import CircuitDiagram from '../svg/CircuitDiagram';

// Tech stack items with their logos (SVG paths inline for simplicity)
const techItems = [
  {
    id: 'solana',
    name: 'Solana',
    description: 'High-performance blockchain',
    // Simplified Solana logo path
    logo: (
      <svg viewBox="0 0 40 32" fill="currentColor" className="w-10 h-8">
        <path d="M6.5 24.5L10 21H38L34.5 24.5H6.5Z" />
        <path d="M6.5 7.5L10 11H38L34.5 7.5H6.5Z" />
        <path d="M6.5 16L10 12.5H38L34.5 16H6.5Z" />
      </svg>
    ),
  },
  {
    id: 'noir',
    name: 'Noir',
    description: 'ZK circuit language',
    // Simplified Noir logo (N monogram)
    logo: (
      <svg viewBox="0 0 40 40" fill="currentColor" className="w-10 h-10">
        <path d="M10 8L10 32L16 32L16 18L24 32L30 32L30 8L24 8L24 22L16 8L10 8Z" />
      </svg>
    ),
  },
  {
    id: 'sunspot',
    name: 'Sunspot',
    description: 'Groth16 on Solana',
    // Sun-like icon for Sunspot
    logo: (
      <svg viewBox="0 0 40 40" fill="currentColor" className="w-10 h-10">
        <circle cx="20" cy="20" r="8" />
        <rect x="18" y="2" width="4" height="8" rx="2" />
        <rect x="18" y="30" width="4" height="8" rx="2" />
        <rect x="2" y="18" width="8" height="4" rx="2" />
        <rect x="30" y="18" width="8" height="4" rx="2" />
        <rect x="6" y="6" width="4" height="6" rx="2" transform="rotate(45 8 9)" />
        <rect x="30" y="6" width="4" height="6" rx="2" transform="rotate(-45 32 9)" />
        <rect x="6" y="28" width="4" height="6" rx="2" transform="rotate(-45 8 31)" />
        <rect x="30" y="28" width="4" height="6" rx="2" transform="rotate(45 32 31)" />
      </svg>
    ),
  },
];

// Stats to count up
const stats = [
  {
    id: 'constraints',
    value: 812,
    prefix: '~',
    suffix: '',
    label: 'Constraints',
    description: 'Minimal circuit complexity',
  },
  {
    id: 'witness',
    value: 2,
    prefix: '<',
    suffix: 's',
    label: 'Witness Gen',
    description: 'Browser-side proof prep',
  },
  {
    id: 'verification',
    value: 200,
    prefix: '<',
    suffix: 'k CU',
    label: 'Verification',
    description: 'On-chain compute units',
  },
];

/**
 * TechCard - 3D flip card for tech logos
 */
function TechCard({ item, index }) {
  const cardRef = useRef(null);

  useGSAP(() => {
    if (!cardRef.current) return;

    const mm = gsap.matchMedia();

    mm.add('(prefers-reduced-motion: no-preference)', () => {
      // 3D flip animation on scroll
      gsap.from(cardRef.current, {
        rotateY: -90,
        opacity: 0,
        duration: 0.8,
        ease: 'back.out(1.2)',
        scrollTrigger: {
          trigger: cardRef.current,
          start: 'top 85%',
          toggleActions: 'play none none reverse',
        },
      });
    });

    return () => mm.revert();
  }, []);

  return (
    <div
      ref={cardRef}
      className="group relative bg-white rounded-2xl border border-zinc-200 p-8
                 hover:border-zinc-300 hover:shadow-lg transition-all duration-300
                 flex flex-col items-center text-center"
      style={{ perspective: '1000px', transformStyle: 'preserve-3d' }}
    >
      {/* Logo container */}
      <div className="w-20 h-20 mb-4 rounded-xl bg-zinc-100 flex items-center justify-center
                      text-zinc-800 group-hover:bg-zinc-900 group-hover:text-white
                      transition-colors duration-300">
        {item.logo}
      </div>

      {/* Name */}
      <h3 className="text-xl font-bold text-zinc-900 mb-1">{item.name}</h3>

      {/* Description */}
      <p className="text-sm text-zinc-500">{item.description}</p>
    </div>
  );
}

/**
 * StatCounter - Animated count-up stat display
 */
function StatCounter({ stat, index }) {
  const numberRef = useRef(null);

  useGSAP(() => {
    if (!numberRef.current) return;

    const mm = gsap.matchMedia();

    mm.add('(prefers-reduced-motion: no-preference)', () => {
      // Count-up animation
      gsap.from(numberRef.current, {
        textContent: 0,
        duration: 2,
        snap: { textContent: 1 },
        ease: 'power2.out',
        scrollTrigger: {
          trigger: numberRef.current,
          start: 'top 85%',
          toggleActions: 'play none none reverse',
        },
      });
    });

    // For reduced motion, just show the value
    mm.add('(prefers-reduced-motion: reduce)', () => {
      numberRef.current.textContent = stat.value;
    });

    return () => mm.revert();
  }, [stat.value]);

  return (
    <div className="text-center">
      {/* Number with prefix/suffix */}
      <div className="text-4xl md:text-5xl font-bold text-zinc-900 mb-2 font-mono">
        {stat.prefix}
        <span ref={numberRef}>{stat.value}</span>
        {stat.suffix}
      </div>

      {/* Label */}
      <div className="text-lg font-medium text-zinc-700 mb-1">{stat.label}</div>

      {/* Description */}
      <div className="text-sm text-zinc-500">{stat.description}</div>
    </div>
  );
}

export default function TechStack() {
  const sectionRef = useRef(null);
  const diagramRef = useRef(null);
  const [drawComplete, setDrawComplete] = useState(false);
  const flowTimelineRef = useRef(null);

  useGSAP(() => {
    if (!diagramRef.current) return;

    const mm = gsap.matchMedia();

    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const svg = diagramRef.current.querySelector('svg');
      if (!svg) return;

      // Get drawable paths (exclude animated pulse elements)
      const drawablePaths = svg.querySelectorAll('.card-path, .detail-path');
      const dataPulses = svg.querySelectorAll('.data-pulse');
      const gateGlows = svg.querySelectorAll('.gate-glow');

      // Set initial state for drawable paths
      drawablePaths.forEach((path) => {
        if (path.tagName === 'text' || path.tagName === 'polygon') return;
        const length = path.getTotalLength ? path.getTotalLength() : 100;
        gsap.set(path, {
          strokeDasharray: length,
          strokeDashoffset: length,
        });
      });

      // Hide data pulses initially
      gsap.set(dataPulses, { opacity: 0 });
      gsap.set(gateGlows, { opacity: 0 });

      // Draw animation on scroll
      const drawTween = gsap.to(drawablePaths, {
        strokeDashoffset: 0,
        duration: 0.3,
        stagger: 0.05,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: diagramRef.current,
          start: 'top 75%',
          end: 'center center',
          scrub: 1,
          onLeave: () => setDrawComplete(true),
          onEnterBack: () => setDrawComplete(false),
        },
      });

      return () => {
        drawTween.kill();
      };
    });

    return () => mm.revert();
  }, { scope: sectionRef });

  // Separate effect for continuous data flow animation (after draw completes)
  useGSAP(() => {
    if (!drawComplete || !diagramRef.current) return;

    const svg = diagramRef.current.querySelector('svg');
    if (!svg) return;

    const mm = gsap.matchMedia();

    mm.add('(prefers-reduced-motion: no-preference)', () => {
      // Get path elements for motion paths
      const pathSeed = svg.querySelector('#path-seed');
      const pathDeck = svg.querySelector('#path-deck');
      const pathBlinding = svg.querySelector('#path-blinding');
      const pathMulAdd = svg.querySelector('#path-mul-add');
      const pathBlindingAdd = svg.querySelector('#path-blinding-add');
      const pathAddHash = svg.querySelector('#path-add-hash');
      const pathHashCommit = svg.querySelector('#path-hash-commit');

      // Get pulse elements
      const pulseSeed = svg.querySelector('.pulse-seed');
      const pulseDeck = svg.querySelector('.pulse-deck');
      const pulseBlinding = svg.querySelector('.pulse-blinding');
      const pulseMulAdd = svg.querySelector('.pulse-mul-add');
      const pulseAddHash = svg.querySelector('.pulse-add-hash');
      const pulseHashCommit = svg.querySelector('.pulse-hash-commit');

      // Get glow elements
      const glowMul = svg.querySelector('.glow-mul');
      const glowAdd = svg.querySelector('.glow-add');
      const glowHash = svg.querySelector('.glow-hash');
      const glowCommit = svg.querySelector('.glow-commit');

      if (!pathSeed || !pulseSeed) return;

      // Create the main flow timeline (loops infinitely)
      const flowTl = gsap.timeline({
        repeat: -1,
        repeatDelay: 0.5,
      });

      // Helper to animate a pulse along a path
      const animatePulse = (pulse, path, duration, delay = 0) => {
        if (!pulse || !path) return;

        flowTl.fromTo(
          pulse,
          { opacity: 0 },
          { opacity: 0.8, duration: 0.1 },
          delay
        );

        flowTl.to(
          pulse,
          {
            motionPath: {
              path: path,
              align: path,
              alignOrigin: [0.5, 0.5],
            },
            duration: duration,
            ease: 'power1.inOut',
          },
          delay
        );

        flowTl.to(
          pulse,
          { opacity: 0, duration: 0.15 },
          delay + duration - 0.1
        );
      };

      // Helper to create gate glow effect
      const glowGate = (glow, delay, duration = 0.3) => {
        if (!glow) return;

        flowTl.to(
          glow,
          {
            opacity: 0.6,
            duration: duration * 0.4,
            ease: 'power2.in',
          },
          delay
        );

        flowTl.to(
          glow,
          {
            opacity: 0,
            duration: duration * 0.6,
            ease: 'power2.out',
          },
          delay + duration * 0.4
        );
      };

      // Phase 1: Inputs flow to MUL gate (parallel)
      animatePulse(pulseSeed, pathSeed, 0.6, 0);
      animatePulse(pulseDeck, pathDeck, 0.7, 0.1);
      glowGate(glowMul, 0.65, 0.4);

      // Phase 2: MUL output flows to ADD, blinding flows to ADD
      animatePulse(pulseMulAdd, pathMulAdd, 0.4, 0.9);
      animatePulse(pulseBlinding, pathBlinding, 0.8, 0.7);
      animatePulse(pulseBlinding, pathBlindingAdd, 0.5, 1.0);
      glowGate(glowAdd, 1.3, 0.4);

      // Phase 3: ADD output flows to HASH
      animatePulse(pulseAddHash, pathAddHash, 0.4, 1.6);
      glowGate(glowHash, 1.9, 0.5);

      // Phase 4: HASH output flows to Commitment
      animatePulse(pulseHashCommit, pathHashCommit, 0.4, 2.2);
      glowGate(glowCommit, 2.5, 0.6);

      // Store reference for cleanup
      flowTimelineRef.current = flowTl;
    });

    return () => {
      if (flowTimelineRef.current) {
        flowTimelineRef.current.kill();
        flowTimelineRef.current = null;
      }
      mm.revert();
    };
  }, { dependencies: [drawComplete], scope: sectionRef });

  return (
    <section
      ref={sectionRef}
      className="relative py-24 md:py-32 bg-white overflow-hidden"
    >
      <div className="max-w-6xl mx-auto px-4">
        {/* Section header */}
        <div className="text-center mb-16">
          <BlurFade delay={0} inView>
            <span className="font-mono text-xs text-zinc-500 tracking-wider uppercase mb-4 block">
              // Built With
            </span>
          </BlurFade>
          <BlurFade delay={0.1} inView>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-zinc-900 mb-4">
              Technology Stack
            </h2>
          </BlurFade>
          <BlurFade delay={0.2} inView>
            <p className="text-lg text-zinc-600 max-w-2xl mx-auto">
              Battle-tested cryptography meets blazing-fast blockchain
            </p>
          </BlurFade>
        </div>

        {/* Tech logos row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-20">
          {techItems.map((item, index) => (
            <TechCard key={item.id} item={item} index={index} />
          ))}
        </div>

        {/* Circuit diagram */}
        <div className="mb-20">
          <BlurFade delay={0.3} inView>
            <div className="text-center mb-8">
              <h3 className="text-xl font-bold text-zinc-900 mb-2">Proof Generation Flow</h3>
              <p className="text-sm text-zinc-600">How private inputs become verifiable commitments</p>
            </div>
          </BlurFade>

          <div className="bg-zinc-50 rounded-2xl border border-zinc-200 p-8 overflow-x-auto">
            <div ref={diagramRef} className="min-w-[400px] text-zinc-700">
              <CircuitDiagram className="w-full h-auto" />
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
          {stats.map((stat, index) => (
            <BlurFade key={stat.id} delay={0.4 + index * 0.1} inView>
              <StatCounter stat={stat} index={index} />
            </BlurFade>
          ))}
        </div>
      </div>
    </section>
  );
}
