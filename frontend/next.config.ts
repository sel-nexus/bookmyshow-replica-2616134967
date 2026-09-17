import type { NextConfig } from 'next';

/** Configures the development-only proxy so browser calls remain same-origin. */
const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.BACKEND_URL ?? 'http://localhost:4000'}/api/:path*`
      }
    ];
  }
};

export default nextConfig;
