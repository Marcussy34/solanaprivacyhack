import "../styles/globals.css";
import dynamic from "next/dynamic";

// Dynamic import to avoid SSR issues with wallet adapter
const WalletProvider = dynamic(
  () => import("../components/WalletProvider"),
  { ssr: false }
);

export default function App({ Component, pageProps }) {
  return (
    <WalletProvider>
      <Component {...pageProps} />
    </WalletProvider>
  );
}
