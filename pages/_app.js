import "../styles/globals.css";
import dynamic from "next/dynamic";

import { AnimatePresence } from "framer-motion";
import { useRouter } from "next/router";
import { PageTransition } from "../components/ui/PageTransition";

// Dynamic import to avoid SSR issues with wallet adapter
const WalletProvider = dynamic(
  () => import("../components/WalletProvider"),
  { ssr: false }
);

export default function App({ Component, pageProps }) {
  const router = useRouter();
  
  return (
    <WalletProvider>
      <AnimatePresence mode="wait" initial={false}>
        <PageTransition key={router.route}>
          <Component {...pageProps} />
        </PageTransition>
      </AnimatePresence>
    </WalletProvider>
  );
}
