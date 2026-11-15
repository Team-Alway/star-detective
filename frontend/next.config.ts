import type { NextConfig } from "next";
import path from "node:path";

/** Where the FastAPI backend lives (Render in production). Used to proxy account calls. */
const BACKEND_URL = (process.env.BACKEND_URL ?? "").replace(/\/$/, "");

const nextConfig: NextConfig = {
  // Lets a production build run beside `next dev` without sharing the .next folder.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  async rewrites() {
    if (!BACKEND_URL) return [];
    // Same-origin proxy for cookie-based account calls only. Sky images go straight to the backend,
    // because building a new patch can take minutes.
    return [
      { source: "/api/auth/:path*", destination: `${BACKEND_URL}/api/auth/:path*` },
      { source: "/api/progress", destination: `${BACKEND_URL}/api/progress` },
      { source: "/api/leaderboard", destination: `${BACKEND_URL}/api/leaderboard` },
    ];
  },
  turbopack: {
    root: path.resolve(__dirname),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
