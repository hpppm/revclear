import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // SECURITY: Disable source maps in production to prevent exposing internal code structure
  productionBrowserSourceMaps: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      // NOTE: CSP with nonces is now handled by middleware.ts
      // These headers are for static assets and fallback
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
      // HIPAA: Prevent PHI from being cached and visible via browser back button after logout
      {
        source: "/dashboard/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, private",
          },
          {
            key: "Pragma",
            value: "no-cache",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
