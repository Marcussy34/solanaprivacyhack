/**
 * GSAP Configuration
 *
 * Centralized GSAP setup with plugin registration.
 * Import from here instead of 'gsap' directly to ensure plugins are registered.
 *
 * Registered plugins:
 * - ScrollTrigger: Scroll-based animations
 * - MotionPathPlugin: Animate elements along SVG paths
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';

// Register plugins only on client-side (Next.js SSR safety)
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);
}

export { gsap, ScrollTrigger, MotionPathPlugin };
