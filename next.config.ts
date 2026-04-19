import type {NextConfig} from 'next'

const nextConfig: NextConfig = {
  // Enable eslint and typescript checking
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // Configure Vercel Image Optimization to proxy external images
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: process.env.IMAGE_HOSTNAME || 'pic-api.example.com',
        pathname: '/**',
      },
    ],
  },
}

export default nextConfig
