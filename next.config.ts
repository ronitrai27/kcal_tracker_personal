import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev only: also allow opening the app by IP (127.0.0.1, or your PC on the home Wi-Fi).
  allowedDevOrigins: ["127.0.0.1", "192.168.*.*", "10.*.*.*"],
  /* config options here */
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
