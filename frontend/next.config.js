/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
};

// next-intl v4 plugin
const withNextIntl = require('next-intl/plugin')();
module.exports = withNextIntl(nextConfig);