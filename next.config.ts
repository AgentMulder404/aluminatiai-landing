import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable Turbopack for production builds (Vercel compatibility)
  experimental: {
    // @ts-ignore - turbo option exists but not in types
    turbo: undefined,
  },
};

export default nextConfig;
