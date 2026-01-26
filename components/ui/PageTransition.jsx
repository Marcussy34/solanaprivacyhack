import { motion } from 'framer-motion';
import { DotLottiePlayer } from '@dotlottie/react-player';
import '@dotlottie/react-player/dist/index.css';
import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/router';

const TransitionContext = createContext();

export const useTransition = () => useContext(TransitionContext);

const curtainVariants = {
  hidden: {
    y: "100%", // Revealed (curtain at bottom)
    transition: {
      duration: 0.8,
      ease: [0.22, 1, 0.36, 1],
    },
  },
  visible: {
    y: "0%", // Covered (curtain fills screen)
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const loaderVariants = {
  hidden: { 
    opacity: 0,
    transition: { duration: 0.2 }
  },
  visible: { 
    opacity: 1,
    transition: { duration: 0.2, delay: 0.1 }
  }
};

const TransitionCurtain = ({ isTransitioning }) => {
  return (
    <motion.div
      className="fixed inset-0 bg-[#936DFF] z-[100] flex items-center justify-center"
      initial="visible" 
      animate={isTransitioning ? "visible" : "hidden"}
      variants={curtainVariants}
    >
      <motion.div 
          variants={loaderVariants}
          className="flex flex-col items-center justify-center"
      >
          <div className="w-32 h-32 mb-2" style={{ filter: 'brightness(0)' }}>
              <DotLottiePlayer
                  src="/Insider-loading.lottie"
                  autoplay
                  loop
              />
          </div>
      </motion.div>
    </motion.div>
  );
};

export const TransitionProvider = ({ children }) => {
  const router = useRouter();
  const [isTransitioning, setIsTransitioning] = useState(true); 

  // Initial load reveal
  useEffect(() => {
     const timer = setTimeout(() => setIsTransitioning(false), 500);
     return () => clearTimeout(timer);
  }, []);

  const navigate = (url) => {
    setIsTransitioning(true);
    // Wait for curtain animation (500ms) before changing route
    setTimeout(() => {
      router.push(url);
    }, 500);
  };

  // Handle standard route changes (back button etc)
  useEffect(() => {
    const handleStart = () => setIsTransitioning(true);
    const handleComplete = () => {
        // Keep curtain down for a moment to show "Loading" state
        setTimeout(() => setIsTransitioning(false), 1000); 
    };

    router.events.on('routeChangeStart', handleStart);
    router.events.on('routeChangeComplete', handleComplete);
    router.events.on('routeChangeError', handleComplete);

    return () => {
      router.events.off('routeChangeStart', handleStart);
      router.events.off('routeChangeComplete', handleComplete);
      router.events.off('routeChangeError', handleComplete);
    };
  }, [router]);

  return (
    <TransitionContext.Provider value={{ navigate }}>
      <TransitionCurtain isTransitioning={isTransitioning} />
      {children}
    </TransitionContext.Provider>
  );
};
