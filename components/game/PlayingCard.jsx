import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

// Card value to display mapping
const VALUES = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const SUITS = {
  hearts: { symbol: "♥", color: "text-red-500" },
  diamonds: { symbol: "♦", color: "text-red-500" },
  clubs: { symbol: "♣", color: "text-white" },
  spades: { symbol: "♠", color: "text-white" },
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
  className,
  delay = 0,
}) {
  const { display } = getCardDisplay(value);
  const suitInfo = SUITS[suit] || SUITS.spades;

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, rotateY: faceDown ? 180 : 0 }}
      animate={{
        opacity: 1,
        y: 0,
        rotateY: faceDown ? 180 : 0,
      }}
      transition={{
        duration: 0.5,
        delay,
        type: "spring",
        stiffness: 100,
      }}
      className={cn(
        "relative w-20 h-28 md:w-24 md:h-32 rounded-xl cursor-pointer perspective-1000",
        className
      )}
      style={{ transformStyle: "preserve-3d" }}
    >
      {/* Card Front */}
      <div
        className={cn(
          "absolute inset-0 rounded-xl border-2 border-white/20 backface-hidden",
          "bg-gradient-to-br from-white to-gray-100",
          "flex flex-col items-center justify-between p-2",
          "shadow-lg shadow-black/50",
          faceDown && "invisible"
        )}
      >
        {/* Top left */}
        <div className={cn("self-start flex flex-col items-center leading-none", suitInfo.color)}>
          <span className="text-lg md:text-xl font-bold">{display}</span>
          <span className="text-sm md:text-base">{suitInfo.symbol}</span>
        </div>

        {/* Center suit */}
        <span className={cn("text-3xl md:text-4xl", suitInfo.color)}>
          {suitInfo.symbol}
        </span>

        {/* Bottom right (rotated) */}
        <div className={cn("self-end flex flex-col items-center leading-none rotate-180", suitInfo.color)}>
          <span className="text-lg md:text-xl font-bold">{display}</span>
          <span className="text-sm md:text-base">{suitInfo.symbol}</span>
        </div>
      </div>

      {/* Card Back */}
      <div
        className={cn(
          "absolute inset-0 rounded-xl border-2 border-purple-500/50 backface-hidden",
          "bg-gradient-to-br from-purple-900 via-purple-800 to-purple-900",
          "flex items-center justify-center",
          "shadow-lg shadow-purple-500/30",
          !faceDown && "invisible"
        )}
        style={{ transform: "rotateY(180deg)" }}
      >
        {/* Pattern on back */}
        <div className="w-14 h-20 md:w-16 md:h-24 rounded-lg border-2 border-purple-400/30 bg-purple-700/50 flex items-center justify-center">
          <div className="text-purple-300/50 text-2xl md:text-3xl font-bold">ZK</div>
        </div>
      </div>
    </motion.div>
  );
}

// Hidden card (commitment only, not revealed)
export function HiddenCard({ className, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={cn(
        "w-20 h-28 md:w-24 md:h-32 rounded-xl",
        "border-2 border-purple-500/50",
        "bg-gradient-to-br from-purple-900 via-purple-800 to-purple-900",
        "flex items-center justify-center",
        "shadow-lg shadow-purple-500/30",
        className
      )}
    >
      <div className="w-14 h-20 md:w-16 md:h-24 rounded-lg border-2 border-purple-400/30 bg-purple-700/50 flex items-center justify-center">
        <div className="text-purple-300/50 text-2xl md:text-3xl font-bold">ZK</div>
      </div>
    </motion.div>
  );
}

// Card placeholder (empty slot)
export function CardSlot({ className }) {
  return (
    <div
      className={cn(
        "w-20 h-28 md:w-24 md:h-32 rounded-xl",
        "border-2 border-dashed border-white/10",
        "bg-white/5",
        className
      )}
    />
  );
}

export default PlayingCard;
