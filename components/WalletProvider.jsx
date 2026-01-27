import { useMemo, useCallback, useEffect, useState } from "react";
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";

// Import wallet adapter styles
import "@solana/wallet-adapter-react-ui/styles.css";

export default function WalletProvider({ children }) {
  // Use network from environment variable (default: devnet)
  const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK || "devnet";

  // Track if wallet-standard has initialized (helps with Chrome timing issues)
  const [isReady, setIsReady] = useState(false);

  // Wait for wallet extensions to register before rendering wallet provider
  // This fixes Chrome-specific timing issues where extensions aren't ready immediately
  useEffect(() => {
    // Small delay to allow wallet extensions to register with wallet-standard
    const timer = setTimeout(() => setIsReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Use custom RPC endpoint if provided, otherwise use default cluster URL
  const endpoint = useMemo(() => {
    const customEndpoint = process.env.NEXT_PUBLIC_RPC_ENDPOINT;
    if (customEndpoint) {
      console.log(`[WalletProvider] Using custom RPC: ${customEndpoint}`);
      return customEndpoint;
    }
    console.log(`[WalletProvider] Using default RPC for: ${network}`);
    return clusterApiUrl(network);
  }, [network]);

  // Only include PhantomWalletAdapter - Solflare causes duplicate MetaMask keys
  // Other wallets will be auto-detected via wallet-standard protocol
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  // Handle wallet errors with more detail for debugging
  const onError = useCallback((error) => {
    console.error("Wallet error:", error);
    // Don't re-throw - let the UI handle the error gracefully
  }, []);

  // Show nothing until wallet extensions have time to register
  if (!isReady) {
    return null;
  }

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider
        wallets={wallets}
        autoConnect={false}
        onError={onError}
      >
        <WalletModalProvider>{children}</WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}
