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
        {/* Google Fonts for the Umbra theme */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Antonio:wght@400;500;600;700&family=Oswald:wght@400;500;600;700&family=Roboto+Condensed:ital,wght@0,300;0,400;0,700;1,300;1,400;1,700&display=swap" rel="stylesheet" />
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
