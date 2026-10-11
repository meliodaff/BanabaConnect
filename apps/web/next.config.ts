import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The shared package (report categories, statuses, MCPS weights) is plain TypeScript.
  transpilePackages: ["@banabaconnect/shared"],
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
