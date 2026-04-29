import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // H-1: Guard all /dashboard/* routes at the edge — cookie presence check only.
  // This prevents server-rendering dashboard pages for unauthenticated users.
  // The backend JWT verification remains the authoritative auth gate.
  if (pathname.startsWith("/dashboard")) {
    const hasSession = request.cookies.has("accessToken");
    if (!hasSession) {
      const loginUrl = new URL("/login?reason=expired", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Generate a cryptographically secure nonce for CSP
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  const isDev = process.env.NODE_ENV === "development";
  const backendInternalUrl =
    process.env.BACKEND_INTERNAL_URL || "http://localhost:3005/api";
  const publicApiUrl = process.env.NEXT_PUBLIC_API_URL || "";

  let apiOrigin = "http://localhost:3005";
  try {
    apiOrigin = new URL(backendInternalUrl).origin;
  } catch {
    apiOrigin = backendInternalUrl.replace(/\/api\/?$/, "");
  }

  // In production the browser calls NEXT_PUBLIC_API_URL directly,
  // so that origin must be in connect-src or CSP will block every API request.
  let publicApiOrigin = "";
  if (publicApiUrl) {
    try {
      publicApiOrigin = new URL(publicApiUrl).origin;
    } catch {}
  }

  const connectSrcParts = isDev
    ? ["'self'", apiOrigin, "http://localhost:3000", "ws://localhost:3000", "ws://127.0.0.1:3000"]
    : ["'self'", publicApiOrigin].filter(Boolean);

  const connectSrc = connectSrcParts.join(" ");

  const cspHeader = [
    "default-src 'self'",
    // strict-dynamic: scripts loaded by a trusted (self/nonce) script inherit trust —
    // required for Next.js static chunks which cannot carry per-request nonces.
    // unsafe-eval kept in dev only for HMR/source maps.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'unsafe-inline'`,
    `connect-src ${connectSrc}`,
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    // blob: required for local audio playback (AudioRecorder/AudioUploader blob URLs)
    "media-src 'self' blob:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  response.headers.set("Content-Security-Policy", cspHeader);
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(self), geolocation=(), payment=(), usb=()",
  );

  if (!isDev) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
