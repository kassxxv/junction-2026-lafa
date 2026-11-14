import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  experimental: {
    // CV and LinkedIn PDF uploads go through Server Actions (default limit is 1 MB).
    serverActions: { bodySizeLimit: "5mb" },
  },
  // unpdf ships pdf.js; keep it out of the bundle and load it from node_modules at runtime.
  serverExternalPackages: ["unpdf"],
  partialPrefetching: true,
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
