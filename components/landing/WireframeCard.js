import { motion } from 'framer-motion';

export default function WireframeCard() {
  const strokeColor = "#64748b"; // Desaturated blue-grey
  const strokeWidth = 1.5;

  const draw = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: (i) => {
      const delay = 0.2 + i * 0.1;
      return {
        pathLength: 1,
        opacity: 1,
        transition: {
          pathLength: { delay, type: "spring", duration: 1.5, bounce: 0 },
          opacity: { delay, duration: 0.01 }
        }
      };
    }
  };

  const floatingAnimation = {
    y: [-10, -20, -10],
    rotate: [0, 1, 0], // Subtle rotation
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: "easeInOut"
    }
  };

  return (
    <div className="relative w-80 h-96 flex items-center justify-center">
      <motion.svg
        width="100%"
        height="100%"
        viewBox="0 0 400 500"
        initial="hidden"
        animate="visible"
        className="w-full h-full"
      >
        {/* Isometric Deck (Flat on ground) */}
        {/* We draw multiple layers to show thickness */}
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <motion.g key={`deck-layer-${i}`} variants={draw} custom={i * 0.05}>
             <path
               d={`M 80 ${300 + i * 4} L 200 ${360 + i * 4} L 320 ${300 + i * 4} L 200 ${240 + i * 4} Z`}
               fill="none"
               stroke={strokeColor}
               strokeWidth={strokeWidth}
               opacity={i === 0 || i === 8 ? 1 : 0.5} // Top and bottom full opacity, middle less
             />
             {/* Only draw side connections for the last layer to form the block */}
             {i === 8 && (
               <>
                 <path d="M 80 332 L 80 300" stroke={strokeColor} strokeWidth={strokeWidth} />
                 <path d="M 200 392 L 200 360" stroke={strokeColor} strokeWidth={strokeWidth} />
                 <path d="M 320 332 L 320 300" stroke={strokeColor} strokeWidth={strokeWidth} />
               </>
             )}
          </motion.g>
        ))}
        
        {/* Deck Top Surface Details */}
        <motion.path
          d="M 80 300 L 200 360 L 320 300 L 200 240 Z"
          fill="white"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          variants={draw}
          custom={1}
        />
        {/* Faint Spade on Deck Top */}
        <motion.g opacity={0.2} variants={draw} custom={1.2}>
           <path d="M 200 280 C 200 280, 180 290, 180 300 C 180 310, 190 315, 200 305 C 210 315, 220 310, 220 300 C 220 290, 200 280, 200 280 Z" fill="none" stroke={strokeColor} strokeWidth="1" />
           <path d="M 200 305 L 195 315 L 205 315 Z" fill="none" stroke={strokeColor} strokeWidth="1" />
        </motion.g>


        {/* Floating Vertical Card */}
        {/* Tilted slightly back and rotated */}
        <motion.g animate={floatingAnimation}>
            
            {/* Card Outline (Rounded Rect in perspective) */}
            {/* Using a path to approximate the tilted vertical card */}
            <motion.path
                d="M 130 50 
                   L 270 80 
                   L 270 280 
                   L 130 250 
                   Z"
                fill="white"
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                variants={draw}
                custom={2}
            />
            
            {/* Card Thickness (Right side) */}
            <motion.path
                d="M 270 80 L 275 82 L 275 282 L 270 280 Z"
                fill="white"
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                variants={draw}
                custom={2.1}
            />
             {/* Card Thickness (Top side - barely visible but adds realism) */}
            <motion.path
                d="M 130 50 L 135 52 L 275 82 L 270 80 Z"
                fill="white"
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                variants={draw}
                custom={2.1}
            />

            {/* Inner Border */}
            <motion.path
                d="M 145 65 L 255 90 L 255 270 L 145 240 Z"
                fill="none"
                stroke={strokeColor}
                strokeWidth="1"
                variants={draw}
                custom={2.2}
            />

            {/* Spade Symbol */}
            <motion.g variants={draw} custom={2.5}>
                {/* Main Spade */}
                <path
                  d="M 200 130 
                     C 200 130, 160 160, 160 190 
                     C 160 210, 190 220, 200 200 
                     C 210 220, 240 210, 240 190 
                     C 240 160, 200 130, 200 130 Z"
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                />
                {/* Spade Stem */}
                <path d="M 200 200 L 185 230 L 215 230 Z" fill="none" stroke={strokeColor} strokeWidth={strokeWidth} />
                
                {/* Inner Detail Lines for Spade */}
                <path d="M 200 130 L 200 200" stroke={strokeColor} strokeWidth="0.5" />
                <path d="M 200 160 L 160 190" stroke={strokeColor} strokeWidth="0.5" />
                <path d="M 200 160 L 240 190" stroke={strokeColor} strokeWidth="0.5" />

                {/* Corner A's */}
                <text x="150" y="95" fontSize="28" fontFamily="serif" fill={strokeColor} transform="rotate(12 150 95)">A</text>
                <path d="M 150 100 L 146 108 L 154 108 Z" fill="none" stroke={strokeColor} strokeWidth="1" transform="rotate(12 150 105)" />

                <g transform="rotate(192 250 250)">
                    <text x="250" y="250" fontSize="28" fontFamily="serif" fill={strokeColor}>A</text>
                    <path d="M 250 255 L 246 263 L 254 263 Z" fill="none" stroke={strokeColor} strokeWidth="1" />
                </g>
            </motion.g>
        </motion.g>

        {/* Motion Lines (Levitation) */}
        {[0, 1].map((i) => (
            <motion.line
                key={`motion-l-${i}`}
                x1={110} y1={150 + i * 40}
                x2={110} y2={180 + i * 40}
                stroke={strokeColor}
                strokeWidth="1"
                variants={draw}
                custom={3 + i * 0.2}
                animate={{ y: [0, -10, 0], opacity: [0, 1, 0] }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
            />
        ))}
         {[0, 1].map((i) => (
            <motion.line
                key={`motion-r-${i}`}
                x1={290} y1={120 + i * 40}
                x2={290} y2={150 + i * 40}
                stroke={strokeColor}
                strokeWidth="1"
                variants={draw}
                custom={3 + i * 0.2}
                animate={{ y: [0, -10, 0], opacity: [0, 1, 0] }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.5 + i * 0.3 }}
            />
        ))}

      </motion.svg>
    </div>
  );
}
