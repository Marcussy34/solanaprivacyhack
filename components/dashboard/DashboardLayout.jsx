import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export const DashboardLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#05010A] text-white font-body selection:bg-[#936DFF] selection:text-white">
      <Head>
        <title>Dashboard | UMBRA</title>
      </Head>

      {/* Top Navigation */}
      <nav className="w-full h-20 border-b border-[#936DFF]/20 bg-[#05010A]/80 backdrop-blur-md fixed top-0 left-0 z-50 flex items-center justify-between px-6 sm:px-12">
        <div className="flex items-center gap-12">
          <Link href="/" className="group">
            <h1 className="font-display font-bold text-3xl tracking-tighter uppercase text-white group-hover:text-[#936DFF] transition-colors">
              UMBRA
            </h1>
          </Link>
          
          <div className="hidden md:flex items-center gap-8">
            <Link href="/dashboard" className="text-[#936DFF] font-display uppercase tracking-widest text-sm border-b border-[#936DFF]">
              Dashboard
            </Link>
            <Link href="/game" className="text-[#B8B8CC] hover:text-white font-display uppercase tracking-widest text-sm transition-colors">
              Games
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-6">
           {/* Wallet Button - styled to match theme */}
           <div className="wallet-adapter-button-trigger">
              <WalletMultiButton className="!bg-[#936DFF] !font-display !uppercase !tracking-widest !text-sm !h-10 !px-6 !rounded-none hover:!bg-[#7B55E6] transition-colors" />
           </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-28 px-6 sm:px-12 pb-20 max-w-[1600px] mx-auto min-h-screen relative z-10">
        {children}
      </main>

      {/* Background Elements */}
      <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-[#936DFF] rounded-full blur-[150px] opacity-5"></div>
          <div className="absolute bottom-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-[#936DFF] rounded-full blur-[150px] opacity-5"></div>
      </div>
    </div>
  );
};
