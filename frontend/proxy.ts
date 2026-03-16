import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js 16 proxy middleware — runs on every request.
 * Generates a per-request CSP nonce and sets security headers.
 *
 * Next.js 16 renamed "middleware.ts / export middleware" to
 * "proxy.ts / export proxy". This file must be named proxy.ts
 * and export a function named `proxy`.
 */
export function proxy(request: NextRequest) {
  // Generate a cryptographically secure nonce
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  const isDev = process.env.NODE_ENV === "development";
  const connectSrc = isDev
    ? process.env.NEXT_PUBLIC_API_URL || "http://localhost:3005"
    : "'self'";

  // Build CSP with nonce
  const cspHeader = [
    "default-src 'self'",
    // Scripts: allow self + nonce-based inline scripts + strict-dynamic for trusted script loading
    // unsafe-eval is required in development only for React/Turbopack hot reload internals
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // Styles: unsafe-inline required for Tailwind/component libraries that inject styles
    `style-src 'self' 'unsafe-inline'`,
    // Connect to API
    `connect-src ${connectSrc}`,
    // Images
    "img-src 'self' data: https:",
    // Fonts
    "font-src 'self' data:",
    // Prevent framing
    "frame-ancestors 'none'",
    // Base URI restriction
    "base-uri 'self'",
    // Form targets
    "form-action 'self'",
  ].join("; ");

  const requestHeaders = new Headers(request.headers);

  // Make nonce available to server components
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Set CSP header
  response.headers.set("Content-Security-Policy", cspHeader);

  // Security headers
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Make nonce available to client
  response.headers.set("x-nonce", nonce);

  return response;
}

// Apply to all routes except static files
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
