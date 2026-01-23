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
      className="p-5 rounded-xl bg-purple-500/10 border border-purple-500/20"
    >
      <div className="flex items-center gap-3 mb-4">
        <Shield className="w-5 h-5 text-purple-400" />
        <span className="font-semibold text-purple-300">ZK Proof Generation</span>
        <span className="ml-auto text-sm text-gray-400 font-mono">{elapsed}s</span>
      </div>

      <div className="flex flex-col gap-3">
        {PHASES.map((p, index) => {
          const isActive = p.key === phase;
          const isDone = index < currentIndex;

          return (
            <div key={p.key} className="flex items-center gap-3">
              <div className="w-6 h-6 flex items-center justify-center">
                {isDone ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : isActive ? (
                  <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-gray-600" />
                )}
              </div>
              <div>
                <p className={cn(
                  "text-sm",
                  isActive ? "text-white" : isDone ? "text-green-400" : "text-gray-500"
                )}>
                  {p.label}
                </p>
                {isActive && (
                  <p className="text-xs text-gray-400">{p.detail}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {phase === "shuffle" && (
        <p className="mt-3 text-xs text-gray-500">
          Groth16 proof generation typically takes 30-60 seconds...
        </p>
      )}
    </motion.div>
  );
}
