const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  // Ignored by browsers over plain HTTP, so local `npm start` is unaffected.
  { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Pin the workspace root to this project. Without it Next walks up looking for
  // lockfiles, and a stray one in a parent directory makes it resolve the
  // server-external packages below against the wrong node_modules.
  outputFileTracingRoot: __dirname,
  turbopack: { root: __dirname },
  transpilePackages: ['@rainbow-me/rainbowkit', '@vanilla-extract/sprinkles', '@vanilla-extract/css'],
  // In the Pages Router, serverExternalPackages is only honoured when dependency
  // bundling is on. Without this pair, Turbopack bundles pino -> thread-stream
  // (pulled in by WalletConnect) and the build fails on thread-stream's test files.
  bundlePagesRouterDependencies: true,
  serverExternalPackages: ['@walletconnect/ethereum-provider', '@reown/appkit', 'pino-pretty', 'lokijs', 'encoding', 'pino', 'thread-stream'],
  // Only used when building with `next build --webpack`.
  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    return config;
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

module.exports = nextConfig;
