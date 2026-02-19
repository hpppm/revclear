import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware to generate CSP nonces for each request.
 * This provides protection against XSS even if an attacker injects a script tag.
 *
 * NOTE: Next.js has limitations with dynamic CSP nonces in the App Router.
 * For full nonce support, scripts must use the nonce from headers.
 *
 * Current implementation:
 * - Generates a random nonce per request
 * - Adds it to CSP header
 * - Makes it available via x-nonce header for client-side access
 */
export function proxy(request: NextRequest) {
  // Generate a cryptographically secure nonce
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  // Build CSP with nonce
  const cspHeader = [
    "default-src 'self'",
    // Scripts: allow self + nonce-based inline scripts + strict-dynamic for trusted script loading
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    // Styles: unsafe-inline required for Tailwind/component libraries that inject styles
    // TODO: Migrate to nonce-based styles when Tailwind supports it
    `style-src 'self' 'unsafe-inline'`,
    // Connect to API
    `connect-src 'self' ${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3005"}`,
    // Images
    "img-src 'self' data: https:",
    // Fonts
    "font-src 'self' data:",
    // HIPAA: Allow audio playback from S3 presigned URLs (encounter recordings).
    // Presigned URLs are time-limited (1h) and scoped to specific objects.
    `media-src 'self' https://${process.env.NEXT_PUBLIC_S3_BUCKET || "arevclear"}.s3.us-east-1.amazonaws.com`,
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

  // Other security headers
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Make nonce available to client (for inline scripts that need it)
  response.headers.set("x-nonce", nonce);

  return response;
}

// Apply middleware to all routes except static files and API routes
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
