/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {},
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'krwizgdhhtgxkwdamjpc.supabase.co',
      },
    ],
  },
  experimental: {
    // Needed for Clerk + Next.js 16
    serverActions: { bodySizeLimit: '2mb' },
  },
}

// Only wrap with PWA in production to avoid dev issues
try {
  module.exports = process.env.NODE_ENV === 'production'
    ? withPWA(nextConfig)
    : nextConfig
} catch {
  module.exports = nextConfig
}
