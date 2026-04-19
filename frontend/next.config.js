/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Enable standalone output for Docker production deployments
  output: 'standalone',
};

module.exports = nextConfig;