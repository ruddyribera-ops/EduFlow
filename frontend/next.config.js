/** @type {import('next').NextConfig} */
const withNextIntl = require('next-intl/plugin').default;

const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Enable standalone output for Docker production deployments
  output: 'standalone',
};

module.exports = withNextIntl(nextConfig);