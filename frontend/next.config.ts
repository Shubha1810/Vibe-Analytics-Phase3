import type { NextConfig } from "next";
import { config as dotenvConfig } from "dotenv";
import path from "path";

// Load .env from the monorepo root (one level up from frontend/)
dotenvConfig({ path: path.resolve(__dirname, "..", ".env") });

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
