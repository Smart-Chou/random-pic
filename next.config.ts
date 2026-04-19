import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Enable eslint and typescript checking
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;