import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, Shield, Check } from "lucide-react";
import { cn } from "../../lib/utils";

const PHASES = [
  { key: "shuffle", label: "Generating shuffle proof...", detail: "Computing Groth16 proof via Sunspot" },
  { key: "create", label: "Creating game on-chain...", detail: "Submitting deck commitment to Solana" },
  { key: "verify", label: "Verifying shuffle on-chain...", detail: "Submitting ZK proof for verification" },
];

export function ProofProgress({ phase, error }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!phase) {
      setElapsed(0);
      return;
    }
    setElapsed(0);
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, [phase]);

  if (!phase && !error) return null;

  const currentIndex = PHASES.findIndex((p) => p.key === phase);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="p-5 border border-[#936DFF] bg-[#05010A] relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-[#936DFF]/5 pointer-events-none"></div>
      <div className="flex items-center gap-3 mb-4 relative z-10">
        <Shield className="w-5 h-5 text-[#936DFF]" />
        <span className="font-display font-bold text-[#FFFFFF] uppercase tracking-widest text-sm">ZK Proof Generation</span>
        <span className="ml-auto text-xs text-[#B8B8CC] font-mono">{elapsed}s</span>
      </div>

      <div className="flex flex-col gap-3 relative z-10">
        {PHASES.map((p, index) => {
          const isActive = p.key === phase;
          const isDone = index < currentIndex;

          return (
            <div key={p.key} className="flex items-center gap-3">
              <div className="w-6 h-6 flex items-center justify-center">
                {isDone ? (
                  <Check className="w-4 h-4 text-[#22c55e]" />
                ) : isActive ? (
                  <Loader2 className="w-4 h-4 text-[#936DFF] animate-spin" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-[#B8B8CC]/20" />
                )}
              </div>
              <div>
                <p className={cn(
                  "font-display text-xs uppercase tracking-widest",
                  isActive ? "text-[#FFFFFF]" : isDone ? "text-[#22c55e]" : "text-[#B8B8CC]/50"
                )}>
                  {p.label}
                </p>
                {isActive && (
                  <p className="text-[10px] font-display uppercase tracking-widest text-[#936DFF] mt-1">{p.detail}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="mt-3 p-3 border border-red-500/20 bg-red-500/5 relative z-10">
          <p className="font-display text-[10px] uppercase tracking-widest text-red-400">{error}</p>
        </div>
      )}

      {phase === "shuffle" && (
        <p className="mt-3 text-[10px] font-display uppercase tracking-widest text-[#B8B8CC] relative z-10">
          Groth16 proof generation typically takes 30-60 seconds...
        </p>
      )}
    </motion.div>
  );
}
