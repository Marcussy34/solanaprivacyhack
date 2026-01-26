import { motion } from 'framer-motion';

const curtainVariants = {
  initial: {
    scaleY: 1, // Start fully covering (for the new page)
  },
  animate: {
    scaleY: 0, // Reveal the page
    transition: {
      duration: 0.8,
      ease: [0.22, 1, 0.36, 1],
      delay: 0.8, // Wait for "loading"
    },
  },
  exit: {
    scaleY: 1, // Cover the page
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const loaderVariants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: { duration: 0.2, delay: 0.1 } // Show quickly after curtain covers
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.2 }
  }
};

const contentVariants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: {
      duration: 0.2,
      delay: 0.1, // Become visible while curtain is still covering
    },
  },
  exit: {
    opacity: 1, // Keep content visible while curtain covers
  },
};

export const PageTransition = ({ children }) => {
  return (
    <>
      {/* The Curtain */}
      <motion.div
        className="fixed inset-0 bg-[#936DFF] z-[100] flex items-center justify-center origin-bottom"
        initial="initial"
        animate="animate"
        exit="exit"
        variants={curtainVariants}
        style={{ pointerEvents: 'none' }}
      >
        {/* Loading Indicator (Only visible when curtain is up) */}
        <motion.div 
            variants={loaderVariants}
            className="flex flex-col items-center justify-center"
        >
            <div className="w-12 h-12 border-4 border-[#05010A] border-t-transparent rounded-full animate-spin mb-4"></div>
            <span className="font-display font-bold text-[#05010A] tracking-widest uppercase text-xl">
                LOADING
            </span>
        </motion.div>
      </motion.div>

      {/* Page Content */}
      <motion.div
        initial="initial"
        animate="animate"
        exit="exit"
        variants={contentVariants}
      >
        {children}
      </motion.div>
    </>
  );
};
