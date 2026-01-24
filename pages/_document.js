import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* ShadowPay dependencies - web3.js and snarkjs might still be needed by other parts or the SDK internally if not bundled, keeping for safety but removing the main client script */}
        <script
          src="https://unpkg.com/@solana/web3.js@latest/lib/index.iife.min.js"
          defer
        />
        <script
          src="https://unpkg.com/snarkjs@latest/build/snarkjs.min.js"
          defer
        />
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
