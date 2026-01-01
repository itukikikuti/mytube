import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
  httpAgentOptions: {
    keepAlive: true,
  },
  experimental: {
    serverComponentsExternalPackages: ['fs'],
  },
};

export default nextConfig;
