/**
 * HowItWorks Section
 *
 * 4-step horizontal timeline showing the game flow:
 * Shuffle → Deal → Play → Reveal
 *
 * Features:
 * - SVG icons that draw stroke-by-stroke on scroll (scrub animation)
 * - Connecting lines animate between steps
 * - ZK verification badge pulses at the end
 * - Responsive: horizontal on desktop, vertical on mobile
 */
'use client';

import { useRef, useEffect } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap, ScrollTrigger } from '../../lib/gsap';
import ShuffleIcon from '../svg/ShuffleIcon';
import DealIcon from '../svg/DealIcon';
import PlayIcon from '../svg/PlayIcon';
import RevealIcon from '../svg/RevealIcon';
import ZKBadge from '../svg/ZKBadge';

// Timeline step configuration
const steps = [
  {
    id: 'shuffle',
    title: 'Shuffle',
    description: 'Deck is randomly shuffled using a private seed',
    Icon: ShuffleIcon,
  },
  {
    id: 'deal',
    title: 'Deal',
    description: 'Cards dealt with cryptographic commitments',
    Icon: DealIcon,
  },
  {
    id: 'play',
    title: 'Play',
    description: 'Hit, stand, or double down your hand',
    Icon: PlayIcon,
  },
  {
    id: 'reveal',
    title: 'Reveal',
    description: 'ZK proof verifies cards match commitments',
    Icon: RevealIcon,
  },
];

export default function HowItWorks() {
  const sectionRef = useRef(null);
  const timelineRef = useRef(null);
  const stepsRef = useRef([]);
  const connectorsRef = useRef([]);
  const badgeRef = useRef(null);

  useGSAP(() => {
    // Skip animation setup if refs aren't ready
    if (!sectionRef.current) return;

    const mm = gsap.matchMedia();

    mm.add(
      {
        // Desktop: scrub-based animations
        isDesktop: '(min-width: 768px)',
        // Mobile: trigger-based (no scrub)
        isMobile: '(max-width: 767px)',
        // Reduced motion preference
        prefersReducedMotion: '(prefers-reduced-motion: reduce)',
      },
      (context) => {
        const { isDesktop, prefersReducedMotion } = context.conditions;

        // Respect reduced motion preference
        if (prefersReducedMotion) {
          // Just fade in without complex animations
          gsap.set(stepsRef.current, { opacity: 1 });
          gsap.set(connectorsRef.current, { scaleX: 1 });
          return;
        }

        // Animate each step's SVG stroke drawing
        stepsRef.current.forEach((step, index) => {
          if (!step) return;

          const paths = step.querySelectorAll('path, line, rect, circle');
          const cardPaths = step.querySelectorAll('.card-path');
          const detailPaths = step.querySelectorAll('.detail-path');

          // Set initial state for all paths
          paths.forEach((path) => {
            if (path.tagName === 'text') return;
            const length = path.getTotalLength ? path.getTotalLength() : 100;
            gsap.set(path, {
              strokeDasharray: length,
              strokeDashoffset: length,
            });
          });

          // Create staggered draw animation
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: step,
              start: isDesktop ? 'top 80%' : 'top 85%',
              end: isDesktop ? 'center center' : 'center 70%',
              scrub: isDesktop ? 1 : false,
              toggleActions: isDesktop ? undefined : 'play none none reverse',
            },
          });

          // Draw main card paths first
          tl.to(cardPaths, {
            strokeDashoffset: 0,
            duration: 0.6,
            stagger: 0.1,
            ease: 'power2.out',
          });

          // Then draw detail paths
          tl.to(
            detailPaths,
            {
              strokeDashoffset: 0,
              duration: 0.4,
              stagger: 0.05,
              ease: 'power2.out',
            },
            '-=0.3'
          );

          // Fade in title and description
          const textElements = step.querySelectorAll('h3, p');
          tl.from(
            textElements,
            {
              opacity: 0,
              y: 10,
              duration: 0.4,
              stagger: 0.1,
            },
            '-=0.2'
          );
        });

        // Animate connecting lines between steps (desktop only)
        if (isDesktop) {
          connectorsRef.current.forEach((connector, index) => {
            if (!connector) return;

            gsap.fromTo(
              connector,
              { scaleX: 0 },
              {
                scaleX: 1,
                ease: 'none',
                scrollTrigger: {
                  trigger: stepsRef.current[index],
                  start: 'center center',
                  end: () => {
                    const nextStep = stepsRef.current[index + 1];
                    return nextStep ? `top+=${nextStep.offsetTop - stepsRef.current[index].offsetTop}px center` : 'bottom center';
                  },
                  scrub: 1,
                },
              }
            );
          });
        }

        // ZK Badge pulsing animation
        if (badgeRef.current) {
          gsap.to(badgeRef.current, {
            scale: 1.05,
            duration: 1.5,
            repeat: -1,
            yoyo: true,
            ease: 'power1.inOut',
            scrollTrigger: {
              trigger: badgeRef.current,
              start: 'top 80%',
              toggleActions: 'play pause resume pause',
            },
          });
        }
      }
    );

    return () => mm.revert();
  }, { scope: sectionRef });

  return (
    <section
      ref={sectionRef}
      className="relative py-24 md:py-32 bg-white overflow-hidden"
    >
      {/* Section header */}
      <div className="max-w-6xl mx-auto px-4 mb-16 md:mb-24">
        <div className="text-center">
          <span className="font-mono text-xs text-zinc-500 tracking-wider uppercase mb-4 block">
            // Game Flow
          </span>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-zinc-900 mb-4">
            How It Works
          </h2>
          <p className="text-lg text-zinc-600 max-w-2xl mx-auto">
            Every step is cryptographically verified, ensuring provably fair gameplay
          </p>
        </div>
      </div>

      {/* Timeline container */}
      <div ref={timelineRef} className="max-w-6xl mx-auto px-4">
        {/* Desktop: Horizontal timeline */}
        <div className="hidden md:flex items-start justify-between relative">
          {/* Background line */}
          <div className="absolute top-16 left-0 right-0 h-0.5 bg-zinc-200" />

          {steps.map((step, index) => (
            <div key={step.id} className="relative flex flex-col items-center flex-1">
              {/* Animated connector line */}
              {index < steps.length - 1 && (
                <div
                  ref={(el) => (connectorsRef.current[index] = el)}
                  className="absolute top-16 left-1/2 h-0.5 bg-zinc-900 origin-left"
                  style={{ width: 'calc(100% - 2rem)' }}
                />
              )}

              {/* Step content */}
              <div
                ref={(el) => (stepsRef.current[index] = el)}
                className="relative z-10 flex flex-col items-center text-center"
              >
                {/* Icon container */}
                <div className="w-32 h-32 mb-4 p-4 bg-white border-2 border-zinc-200 rounded-2xl shadow-sm hover:shadow-md hover:border-zinc-300 transition-all duration-300">
                  <step.Icon className="w-full h-full text-zinc-800" />
                </div>

                {/* Step number */}
                <div className="w-8 h-8 bg-zinc-900 text-white rounded-full flex items-center justify-center text-sm font-bold mb-4">
                  {index + 1}
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-zinc-900 mb-2">{step.title}</h3>

                {/* Description */}
                <p className="text-sm text-zinc-600 max-w-[180px]">{step.description}</p>
              </div>
            </div>
          ))}

          {/* ZK Badge at the end */}
          <div className="absolute -right-4 top-8">
            <div ref={badgeRef} className="text-zinc-800">
              <ZKBadge size={64} />
            </div>
          </div>
        </div>

        {/* Mobile: Vertical timeline */}
        <div className="md:hidden space-y-8">
          {steps.map((step, index) => (
            <div
              key={step.id}
              ref={(el) => (stepsRef.current[index] = el)}
              className="flex gap-4 items-start"
            >
              {/* Left: Step number and line */}
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 bg-zinc-900 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  {index + 1}
                </div>
                {index < steps.length - 1 && (
                  <div className="w-0.5 h-24 bg-zinc-200 mt-2" />
                )}
              </div>

              {/* Right: Icon and content */}
              <div className="flex-1 pb-8">
                <div className="flex items-start gap-4">
                  <div className="w-20 h-20 p-2 bg-white border border-zinc-200 rounded-xl flex-shrink-0">
                    <step.Icon className="w-full h-full text-zinc-800" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-zinc-900 mb-1">{step.title}</h3>
                    <p className="text-sm text-zinc-600">{step.description}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* ZK Badge at bottom center */}
          <div className="flex justify-center pt-4">
            <div ref={badgeRef} className="text-zinc-800">
              <ZKBadge size={80} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
