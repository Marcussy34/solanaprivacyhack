import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import MathBackground from '../components/landing/MathBackground';
import WireframeCard from '../components/landing/WireframeCard';
import HowItWorks from '../components/landing/HowItWorks';
import WhyZeroKnowledge from '../components/landing/WhyZeroKnowledge';
import TechStack from '../components/landing/TechStack';
import FinalCTA from '../components/landing/FinalCTA';
import { Button } from "../components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans selection:bg-zinc-900 selection:text-white">
      <Head>
        <title>Umbra | ZK Blackjack</title>
        <meta name="description" content="Provably Fair Blackjack on Solana using Zero-Knowledge Proofs." />
      </Head>

      <MathBackground />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-zinc-900 rounded-full flex items-center justify-center text-white font-serif font-bold">
            U
          </div>
          <span className="font-bold text-xl tracking-tight">Umbra</span>
        </div>
        
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-600">
          <Link href="/about" className="hover:text-zinc-900 transition-colors">About</Link>
          <Link href="/technology" className="hover:text-zinc-900 transition-colors">Technology</Link>
          <Link href="/docs" className="hover:text-zinc-900 transition-colors">Docs</Link>
        </div>

        <Button variant="outline" className="border-zinc-200 hover:bg-zinc-100 text-zinc-900">
          Connect Wallet
        </Button>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 pt-20">
        <div className="flex flex-col md:flex-row items-center justify-center gap-12 md:gap-24 max-w-6xl mx-auto w-full">
          
          {/* Left: Card Animation */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="order-2 md:order-1"
          >
            <WireframeCard />
          </motion.div>

          {/* Right: Text Content */}
          <div className="order-1 md:order-2 text-center md:text-left max-w-xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <div className="font-mono text-xs text-zinc-500 mb-4 tracking-wider uppercase">
                // Zero-Knowledge Proofs Enabled
              </div>
              <h1 className="text-6xl md:text-8xl font-bold tracking-tighter text-zinc-900 mb-6">
                UMBRA
              </h1>
              <p className="text-xl md:text-2xl text-zinc-600 mb-8 leading-relaxed font-light">
                Zero-Knowledge Blackjack.<br />
                <span className="font-medium text-zinc-900">Trustless. Provably Fair.</span>
              </p>
              
              <div className="flex flex-col sm:flex-row items-center gap-4 justify-center md:justify-start">
                <Link href="/game">
                  <Button size="lg" className="h-14 px-8 text-lg bg-zinc-900 hover:bg-zinc-800 text-white rounded-full shadow-lg hover:shadow-xl transition-all">
                    Play Now (Beta)
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Link href="/docs">
                  <Button size="lg" variant="ghost" className="h-14 px-8 text-lg text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-full">
                    Read the Whitepaper
                  </Button>
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="mt-12 flex items-center justify-center md:justify-start gap-8 text-zinc-400">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm font-mono">Mainnet Beta Live</span>
                </div>
                <div className="text-sm font-mono">
                  Audited by OtterSec
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      {/* Scroll-animated sections */}
      <HowItWorks />
      <WhyZeroKnowledge />
      <TechStack />
      <FinalCTA />
    </div>
  );
}
