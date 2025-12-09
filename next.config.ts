import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // 1. Enable Static Export
  output: 'export',

  // 2. Disable Image Optimization (Required for static hosts)
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'placehold.co', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'picsum.photos', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'avatar.vercel.sh', port: '', pathname: '/**' }
    ],
  },
  // 3. (Optional) If deploying to a subdirectory like user.github.io/repo-name
  // basePath: '/repo-name',
};

export default nextConfig;
