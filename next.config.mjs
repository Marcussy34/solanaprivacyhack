/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Use empty turbopack config to silence warning
  // bb.js WASM should work with default Turbopack settings
  turbopack: {},
  
  // Fallback webpack config (used when running with --webpack flag)
  webpack: (config, { isServer }) => {
    // Allow WASM modules
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    // Fix for bb.js in browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }

    return config;
  },
};

export default nextConfig;
