import type { NextConfig } from "next";
import path from "path";

// SECURITY: ignoreBuildErrors was removed — TypeScript errors must be fixed
// before deployment. Silencing them masks type-unsafe API payloads and
// allows unvalidated data to reach production.
const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
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
          // HIPAA compliance: HSTS applied to static/fallback paths.
          // The proxy.ts middleware sets this on dynamic requests.
          // max-age=2yr, includeSubDomains, preload per HSTS preload requirements.
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
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
