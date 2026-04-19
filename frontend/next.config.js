/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Enable standalone output for Docker production deployments
  output: 'standalone',
  i18n: {
    locales: ['en', 'es', 'pt-BR'],
    defaultLocale: 'en',
  },
};

module.exports = nextConfig;