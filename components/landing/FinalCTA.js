/**
 * FinalCTA Section
 *
 * Final call-to-action section with:
 * - Card fan animation: 5 cards spread from stack on scroll
 * - Continuous floating effect on cards
 * - Large CTA button with scale entrance
 * - Social links: GitHub, Discord, Twitter
 *
 * Features:
 * - GSAP scroll-triggered card fan spread
 * - Infinite floating animation
 * - Staggered entrance for buttons
 */
'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { useGSAP } from '@gsap/react';
import { gsap, ScrollTrigger } from '../../lib/gsap';
import { BlurFade } from '../ui/blur-fade';
import CardFan from '../svg/CardFan';
import { ArrowRight, Github, MessageCircle } from 'lucide-react';
import { Button } from '../ui/button';

// Social links configuration
const socialLinks = [
  {
    id: 'github',
    label: 'GitHub',
    href: 'https://github.com/umbra-zk',
    Icon: Github,
  },
  {
    id: 'discord',
    label: 'Discord',
    href: 'https://discord.gg/umbra',
    Icon: MessageCircle,
  },
  {
    id: 'twitter',
    label: 'Twitter',
    href: 'https://twitter.com/umbra_zk',
    // X/Twitter icon (simple version)
    Icon: ({ className }) => (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
];

export default function FinalCTA() {
  const sectionRef = useRef(null);
  const cardFanRef = useRef(null);
  const cardGroupsRef = useRef([]);

  useGSAP(() => {
    if (!cardFanRef.current) return;

    const mm = gsap.matchMedia();

    mm.add('(prefers-reduced-motion: no-preference)', () => {
      // Get all card groups from the SVG
      const cardGroups = cardFanRef.current.querySelectorAll('.card-group');

      // Initial state: cards stacked (no rotation spread)
      gsap.set(cardGroups, {
        transformOrigin: '100px 140px',
      });

      // Fan spread animation on scroll
      cardGroups.forEach((card, index) => {
        const targetRotation = (index - 2) * 10; // -20, -10, 0, 10, 20

        gsap.from(card, {
          rotation: 0,
          y: 20 * (Math.abs(index - 2)),
          opacity: index === 2 ? 1 : 0.5,
          duration: 0.8,
          ease: 'back.out(1.4)',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 70%',
            toggleActions: 'play none none reverse',
          },
          delay: Math.abs(index - 2) * 0.1,
        });
      });

      // Continuous floating effect on the whole card fan
      gsap.to(cardFanRef.current, {
        y: -15,
        duration: 3,
        repeat: -1,
        yoyo: true,
        ease: 'power1.inOut',
      });

      // Subtle rotation sway
      gsap.to(cardFanRef.current, {
        rotate: 3,
        duration: 4,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
    });

    return () => mm.revert();
  }, { scope: sectionRef });

  return (
    <section
      ref={sectionRef}
      className="relative py-24 md:py-40 bg-zinc-900 overflow-hidden"
    >
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-800 via-zinc-900 to-zinc-900" />

      {/* Subtle grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:48px_48px]" />

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
        {/* Card fan animation */}
        <BlurFade delay={0} inView>
          <div className="mb-12 flex justify-center">
            <div ref={cardFanRef} className="text-zinc-400 w-64 h-48">
              <CardFan className="w-full h-full" />
            </div>
          </div>
        </BlurFade>

        {/* Headline */}
        <BlurFade delay={0.1} inView>
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight text-white mb-6">
            Ready to Play?
          </h2>
        </BlurFade>

        {/* Subheadline */}
        <BlurFade delay={0.2} inView>
          <p className="text-xl md:text-2xl text-zinc-400 mb-10 max-w-2xl mx-auto">
            Experience the future of provably fair gaming.
            <br />
            <span className="text-white">No trust required.</span>
          </p>
        </BlurFade>

        {/* CTA buttons */}
        <BlurFade delay={0.3} inView>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link href="/game">
              <Button
                size="lg"
                className="h-16 px-10 text-xl bg-white hover:bg-zinc-100 text-zinc-900
                           rounded-full shadow-lg hover:shadow-xl transition-all
                           hover:scale-105 active:scale-95"
              >
                Play Now
                <ArrowRight className="ml-2 w-6 h-6" />
              </Button>
            </Link>
            <Link href="/docs">
              <Button
                size="lg"
                variant="outline"
                className="h-16 px-10 text-xl border-zinc-700 text-white
                           hover:bg-zinc-800 rounded-full"
              >
                Read the Docs
              </Button>
            </Link>
          </div>
        </BlurFade>

        {/* Social links */}
        <BlurFade delay={0.4} inView>
          <div className="flex items-center justify-center gap-6">
            {socialLinks.map((link) => (
              <a
                key={link.id}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-zinc-500 hover:text-white
                           transition-colors duration-200"
              >
                <link.Icon className="w-5 h-5" />
                <span className="text-sm font-medium">{link.label}</span>
              </a>
            ))}
          </div>
        </BlurFade>

        {/* Bottom tagline */}
        <BlurFade delay={0.5} inView>
          <div className="mt-20 pt-8 border-t border-zinc-800">
            <p className="text-zinc-600 text-sm font-mono">
              Built for the Solana Privacy Hackathon 2026
            </p>
          </div>
        </BlurFade>
      </div>
    </section>
  );
}
