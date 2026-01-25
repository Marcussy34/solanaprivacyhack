import { useMemo, useCallback } from "react";
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";

// Import wallet adapter styles
import "@solana/wallet-adapter-react-ui/styles.css";

export default function WalletProvider({ children }) {
  // Use network from environment variable (default: devnet)
  const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK || "devnet";

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

  // Configure supported wallets
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  // Handle wallet errors
  const onError = useCallback((error) => {
    console.error("Wallet error:", error);
    // Error will be handled by wallet adapter UI or caught in game.js
  }, []);

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
