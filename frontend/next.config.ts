import type { NextConfig } from "next";

// SECURITY: ignoreBuildErrors was removed — TypeScript errors must be fixed
// before deployment. Silencing them masks type-unsafe API payloads and
// allows unvalidated data to reach production.
const nextConfig: NextConfig = {
  // Standalone output bundles only what's needed — cuts Docker image from ~1GB to ~200MB
  // and eliminates the need to copy node_modules into the production container.
  output: "standalone",
  turbopack: {
    // Pin the workspace root to the frontend directory so Turbopack doesn't
    // walk up to the repo root and confuse itself with the backend lockfile.
    root: process.cwd(),
  },
  async headers() {
    return [
      // CSP with nonces is handled by middleware.ts on dynamic requests.
      // These headers cover static assets and edge-cache fallback paths.
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
