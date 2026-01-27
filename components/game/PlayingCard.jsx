import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";

// Card value to display mapping
const VALUES = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const SUITS = {
  hearts: { symbol: "♥", color: "text-red-500" },
  diamonds: { symbol: "♦", color: "text-red-500" },
  clubs: { symbol: "♣", color: "text-black" },
  spades: { symbol: "♠", color: "text-black" },
};

// Convert card value (0-12) to display
function getCardDisplay(value) {
  if (value === undefined || value === null) return { display: "?", isAce: false };
  return {
    display: VALUES[value] || "?",
    isAce: value === 0,
  };
}

export function PlayingCard({
  value, // 0-12 (Ace to King)
  suit = "spades", // hearts, diamonds, clubs, spades
  faceDown = false,
  revealed = false,
  isNew = false, // For newly dealt cards (arc animation)
  className,
  delay = 0,
}) {
  const { display } = getCardDisplay(value);
  const suitInfo = SUITS[suit] || SUITS.spades;

  // Arc animation for dealing cards
  // Arc animation for dealing cards
  const dealVariants = {
    initial: {
      opacity: 0,
      x: 300, // Start from right (deck position)
      y: 0,
      rotate: 45,
      scale: 0.5,
    },
    animate: {
      opacity: 1,
      x: 0,
      y: 0,
      rotate: 0,
      scale: 1,
    },
  };

  // Flip animation for revealing cards
  const flipVariants = {
    hidden: { rotateY: 180 },
    visible: { rotateY: 0 },
  };

  return (
    <motion.div
      variants={dealVariants}
      initial="initial"
      animate="animate"
      transition={{
        duration: 0.6,
        delay,
        type: "spring",
        stiffness: 80,
        damping: 12,
      }}
      whileHover={{ y: -8, scale: 1.02 }}
      className={cn(
        "relative w-16 h-24 sm:w-20 sm:h-28 md:w-24 md:h-32 rounded-xl cursor-pointer",
        className
      )}
      style={{ perspective: "1000px" }}
    >
      {/* Card Container with 3D flip */}
      <motion.div
        className="relative w-full h-full"
        style={{ transformStyle: "preserve-3d" }}
        variants={flipVariants}
        initial={faceDown ? "hidden" : "visible"}
        animate={faceDown ? "hidden" : "visible"}
        transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
      >
        {/* Card Front */}
        <div
          className={cn(
            "absolute inset-0 rounded-xl border-2 border-[#936DFF]",
            "bg-white",
            "shadow-lg shadow-[#936DFF]/20",
            "backface-hidden"
          )}
        >
          {/* Top left */}
          <div className={cn("absolute top-1 left-1.5 flex flex-col items-center leading-none", suitInfo.color)}>
            <span className="text-sm md:text-base font-bold font-display">{display}</span>
            <span className="text-[10px] md:text-xs">{suitInfo.symbol}</span>
          </div>

          {/* Center suit */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={cn("text-2xl md:text-3xl", suitInfo.color)}>
              {suitInfo.symbol}
            </span>
          </div>

          {/* Bottom right (rotated) */}
          <div className={cn("absolute bottom-1 right-1.5 flex flex-col items-center leading-none rotate-180", suitInfo.color)}>
            <span className="text-sm md:text-base font-bold font-display">{display}</span>
            <span className="text-[10px] md:text-xs">{suitInfo.symbol}</span>
          </div>
        </div>

        {/* Card Back */}
        <div
          className={cn(
            "absolute inset-0 rounded-xl border-2 border-[#936DFF]",
            "bg-[#05010A]",
            "flex items-center justify-center overflow-hidden",
            "shadow-lg shadow-[#936DFF]/30",
            "backface-hidden"
          )}
          style={{ transform: "rotateY(180deg)" }}
        >
          <img 
            src="/umbra_back.jpg" 
            alt="Card Back" 
            className="w-full h-full object-cover"
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

// Hidden card (commitment only, not revealed) - with flip capability
export function HiddenCard({ className, delay = 0, isRevealing = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 300, rotate: 45, scale: 0.5 }}
      animate={{ opacity: 1, x: 0, rotate: 0, scale: 1 }}
      transition={{
        duration: 0.6,
        delay,
        type: "spring",
        stiffness: 80,
        damping: 12,
      }}
      whileHover={{ y: -4 }}
      className={cn(
        "w-16 h-24 sm:w-20 sm:h-28 md:w-24 md:h-32 rounded-xl",
        "border-2 border-[#936DFF]",
        "bg-[#05010A]",
        "flex items-center justify-center overflow-hidden",
        "shadow-lg shadow-[#936DFF]/30",
        "transition-shadow duration-300",
        "hover:shadow-xl hover:shadow-[#936DFF]/40",
        className
      )}
    >
      <img 
        src="/umbra_back.jpg" 
        alt="Card Back" 
        className="w-full h-full object-cover"
      />
    </motion.div>
  );
}

// Pending card (waiting for dealer to reveal) - with spinner
export function PendingCard({ className, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 300, rotate: 45, scale: 0.5 }}
      animate={{ opacity: 1, x: 0, rotate: 0, scale: 1 }}
      transition={{ duration: 0.6, delay, type: "spring", stiffness: 80, damping: 12 }}
      className={cn(
        "w-16 h-24 sm:w-20 sm:h-28 md:w-24 md:h-32 rounded-xl",
        "border-2 border-yellow-500/50",
        "bg-[#05010A]",
        "flex items-center justify-center",
        "shadow-lg shadow-yellow-500/20",
        "animate-pulse",
        className
      )}
    >
      <div className="w-14 h-20 md:w-16 md:h-24 rounded-lg border border-yellow-400/30 bg-yellow-500/10 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-yellow-400 animate-spin" />
      </div>
    </motion.div>
  );
}

// Card placeholder (empty slot) - with pulse animation
export function CardSlot({ className, isPulsing = true }) {
  return (
    <motion.div
      animate={isPulsing ? {
        borderColor: ["rgba(255,255,255,0.1)", "rgba(147,51,234,0.3)", "rgba(255,255,255,0.1)"],
        boxShadow: [
          "0 0 0 0 rgba(147,51,234,0)",
          "0 0 20px 2px rgba(147,51,234,0.2)",
          "0 0 0 0 rgba(147,51,234,0)",
        ],
      } : {}}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      className={cn(
        "w-16 h-24 sm:w-20 sm:h-28 md:w-24 md:h-32 rounded-xl",
        "border-2 border-dashed border-[#936DFF]/30",
        "bg-[#05010A]",
        className
      )}
    />
  );
}

export default PlayingCard;
