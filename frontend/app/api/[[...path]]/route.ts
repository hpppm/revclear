import { NextRequest, NextResponse } from "next/server";

const BACKEND_INTERNAL_URL =
  process.env.BACKEND_INTERNAL_URL || "http://localhost:3005/api";
const API_PROXY_TIMEOUT_MS = 15000;

const ALLOWED_ORIGINS = new Set(
  (process.env.NEXT_PUBLIC_ALLOWED_ORIGINS || "")
    .split(",")
    .map((o) => o.trim().toLowerCase().replace(/\/$/, ""))
    .filter(Boolean),
);

// Dev origins always allowed so local development works without env config.
const DEV_ORIGINS = new Set([
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
]);

function isOriginAllowed(origin: string | null, request: NextRequest): boolean {
  if (!origin) return true; // same-origin / server-to-server — no Origin header
  const normalized = origin.toLowerCase().replace(/\/$/, "");
  if (process.env.NODE_ENV !== "production" && DEV_ORIGINS.has(normalized)) return true;
  // Same-origin requests: browser sends Origin matching the host of this server.
  const host = request.headers.get("host");
  if (host && normalized === `https://${host.toLowerCase()}`) return true;
  if (host && normalized === `http://${host.toLowerCase()}`) return true;
  return ALLOWED_ORIGINS.has(normalized);
}

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "content-length",
  "host",
]);

type RouteContext = {
  params: Promise<{
    path?: string[];
  }>;
};

const buildTargetUrl = (request: NextRequest, path: string[] = []) => {
  const target = new URL(BACKEND_INTERNAL_URL);
  const suffix = path.length > 0 ? `/${path.map(encodeURIComponent).join("/")}` : "";
  target.pathname = `${target.pathname.replace(/\/$/, "")}${suffix}`;
  target.search = request.nextUrl.search;
  return target;
};

const proxyRequest = async (request: NextRequest, path: string[] = []) => {
  const origin = request.headers.get("origin");
  if (!isOriginAllowed(origin, request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const targetUrl = buildTargetUrl(request, path);
  const headers = new Headers(request.headers);

  for (const header of HOP_BY_HOP_HEADERS) {
    headers.delete(header);
  }

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const body = hasBody ? await request.arrayBuffer() : undefined;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_PROXY_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      redirect: "manual",
      signal: controller.signal,
    });
  } catch (error: any) {
    clearTimeout(timeout);

    if (error?.name === "AbortError") {
      return NextResponse.json(
        { error: "Upstream API timed out" },
        { status: 504 },
      );
    }

    return NextResponse.json(
      { error: "Upstream API unavailable" },
      { status: 502 },
    );
  }

  clearTimeout(timeout);

  const responseHeaders = new Headers(response.headers);
  for (const header of HOP_BY_HOP_HEADERS) {
    responseHeaders.delete(header);
  }

  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { path = [] } = await context.params;
  return proxyRequest(request, path);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { path = [] } = await context.params;
  return proxyRequest(request, path);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { path = [] } = await context.params;
  return proxyRequest(request, path);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { path = [] } = await context.params;
  return proxyRequest(request, path);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { path = [] } = await context.params;
  return proxyRequest(request, path);
}

export async function OPTIONS(request: NextRequest, context: RouteContext) {
  const { path = [] } = await context.params;
  return proxyRequest(request, path);
}

export async function HEAD(request: NextRequest, context: RouteContext) {
  const { path = [] } = await context.params;
  return proxyRequest(request, path);
}
