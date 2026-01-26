import "../styles/globals.css";
import dynamic from "next/dynamic";

import { TransitionProvider } from "../components/ui/PageTransition";

// Dynamic import to avoid SSR issues with wallet adapter
const WalletProvider = dynamic(
  () => import("../components/WalletProvider"),
  { ssr: false }
);

export default function App({ Component, pageProps }) {
  return (
    <WalletProvider>
      <TransitionProvider>
        <Component {...pageProps} />
      </TransitionProvider>
    </WalletProvider>
  );
}
