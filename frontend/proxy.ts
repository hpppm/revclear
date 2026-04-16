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
  const backendInternalUrl =
    process.env.BACKEND_INTERNAL_URL || "http://localhost:3005/api";

  let apiOrigin = "http://localhost:3005";
  try {
    apiOrigin = new URL(backendInternalUrl).origin;
  } catch {
    apiOrigin = backendInternalUrl.replace(/\/api\/?$/, "");
  }
  const connectSrc = isDev
    ? [
        "'self'",
        apiOrigin,
        "http://localhost:3000",
        "ws://localhost:3000",
        "ws://127.0.0.1:3000",
      ].join(" ")
    : "'self'";

  // Build CSP. Next.js runtime injects inline bootstrap scripts that may not
  // always carry a nonce in all render paths, so production must permit them.
  const cspHeader = [
    "default-src 'self'",
    // Scripts: allow app scripts, trusted external scripts, and framework inline runtime.
    // unsafe-eval is required in development only for React/Turbopack hot reload internals.
    `script-src 'self' https: 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
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
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  );

  // HIPAA compliance: HSTS forces HTTPS for all future connections, preventing
  // protocol downgrade attacks and cookie hijacking over plain HTTP.
  // includeSubDomains + preload qualify the domain for HSTS preload lists.
  if (!isDev) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }

  // SECURITY: x-nonce must NOT be set on the response. A nonce placed in a
  // response header is readable by JavaScript (via fetch/XHR response headers),
  // which allows any injected script to extract it and bypass the CSP nonce check.
  // The nonce is passed only via the x-nonce *request* header (line above) so
  // server components can read it server-side — never exposed to the client.

  return response;
}

// Apply to all routes except static files
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
