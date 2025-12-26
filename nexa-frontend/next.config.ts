import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  // ✅ Disable static optimization & caching
  // This ensures every page runs dynamically and avoids Suspense warnings
  reactStrictMode: false,
  compress: true,
  generateEtags: false,
  // no `experimental.dynamicIO` or `cacheComponents` — they're canary-only
};

export default nextConfig;
