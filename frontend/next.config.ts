import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${process.env.BACKEND_PORT || "5001"}`;

const nextConfig: NextConfig = {
  devIndicators: false,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
