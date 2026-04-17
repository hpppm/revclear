import "./setupEnv";
import express, { Request } from "express";
import helmet, { HelmetOptions } from "helmet";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
// @ts-ignore: express-rate-limit has no TS types
import rateLimit from "express-rate-limit";

import { auditLogger } from "./middleware/audit";
import { appConfig } from "./config/appConfig";
import logger from "./utils/logger";

const app = express();
const isTestEnv = appConfig.env === "test" || process.env.JEST_WORKER_ID;
const HEALTH_ROUTE_PREFIXES = ["/api/health"];
const DEFAULT_DEV_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3005",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
  "http://127.0.0.1:3005",
];
const DEFAULT_PROD_ORIGINS = [
  "https://revclear.gannon.edu",
  "https://revclear.tech",
  "https://www.revclear.tech",
  "https://txgfeozc.up.railway.app",
  "https://revclear-frontend-production.up.railway.app",
];

const normalizeOrigin = (origin: string) =>
  origin.trim().toLowerCase().replace(/\/$/, "");

// --------------------------------------------------
// Trust Proxy
// In production (behind a load balancer/reverse proxy), trust exactly 1 hop
// so that req.ip is the real client IP from X-Forwarded-For.
// In development/test, set to false so X-Forwarded-For cannot be spoofed
// to bypass IP-based rate limiting.
// --------------------------------------------------
if (appConfig.env === "production") {
  app.set("trust proxy", 1);
} else {
  app.set("trust proxy", false);
}

// Cookie parser for httpOnly JWT cookies
app.use(cookieParser());

// --------------------------------------------------
// CORS - Configured for security (not allowing all origins)
// --------------------------------------------------
const configuredOrigins = process.env.ALLOWED_ORIGINS?.split(",")
  .map((origin) => normalizeOrigin(origin))
  .filter(Boolean) || [];

const baseAllowedOrigins = appConfig.env === "production"
  ? DEFAULT_PROD_ORIGINS
  : [...DEFAULT_DEV_ORIGINS, ...DEFAULT_PROD_ORIGINS];

const allowedOrigins = Array.from(new Set([
  ...baseAllowedOrigins.map((origin) => normalizeOrigin(origin)),
  ...configuredOrigins,
]));

app.use(
  cors((req, callback) => {
    const origin = req.header("Origin");
    const requestPath = req.path || "";
    const isHealthRoute = HEALTH_ROUTE_PREFIXES.some((prefix) =>
      requestPath.startsWith(prefix),
    );

    // Requests without Origin are valid for same-origin and server-to-server flows.
    // CORS checks are only meaningful when Origin is present.
    if (!origin) {
      return callback(null, {
        origin: true,
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
      });
    }

    const normalizedOrigin = normalizeOrigin(origin);

    if (allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, {
        origin: true,
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
      });
    }

    logger.warn({ origin }, 'CORS blocked request from origin');
    return callback(new Error("Not allowed by CORS"), { origin: false });
  }),
);

// --------------------------------------------------
// HTTPS Enforcement (production only)
// --------------------------------------------------
app.use((req, res, next) => {
  const requestPath = req.path || "";
  const isHealthRoute = HEALTH_ROUTE_PREFIXES.some((prefix) =>
    requestPath.startsWith(prefix),
  );

  if (
    appConfig.env === "production" &&
    !isHealthRoute &&
    req.headers["x-forwarded-proto"] !== "https"
  ) {
    return res
      .status(403)
      .json({ error: "HTTPS required for all API requests" });
  }
  next();
});

// --------------------------------------------------
// Security Monitoring (Custom Built)
// --------------------------------------------------
import { securityMonitor } from "./middleware/securityMonitor";
logger.info('Security monitoring enabled');
app.use(securityMonitor);

// --------------------------------------------------
// Rate Limiting
// --------------------------------------------------
const authRateLimitStore = new (rateLimit as any).MemoryStore();

const createRateLimiter = (
  max: number,
  message: string,
  store?: any,
) => {
  return rateLimit({
    windowMs: 60 * 1000,
    max,
    message,
    ...(store ? { store } : {}),
  });
};

app.use(
  "/api/auth",
  createRateLimiter(
    10,
    "Too many auth requests. Try again later.",
    authRateLimitStore,
  ),
);

app.use(
  "/api/transcribe",
  createRateLimiter(
    20,
    "Too many transcribe requests. Try again later.",
  ),
);

// Rate limiting for other API routes
app.use(
  "/api/patients",
  createRateLimiter(
    60,
    "Too many patient requests. Try again later.",
  ),
);

app.use(
  "/api/encounters",
  createRateLimiter(
    60,
    "Too many encounter requests. Try again later.",
  ),
);

app.use(
  "/api/claims",
  createRateLimiter(60, "Too many claim requests. Try again later."),
);

app.use(
  "/api/organizations",
  createRateLimiter(
    30,
    "Too many organization requests. Try again later.",
  ),
);

app.use(
  "/api/me",
  createRateLimiter(30, "Too many profile requests. Try again later."),
);

app.use(
  "/api/users",
  createRateLimiter(30, "Too many user requests. Try again later."),
);

app.use(
  "/api/codes",
  createRateLimiter(60, "Too many code requests. Try again later."),
);

app.use(
  "/api/security",
  createRateLimiter(
    10,
    "Too many security requests. Try again later.",
  ),
);

app.use(
  "/api/health",
  createRateLimiter(
    30,
    "Too many health check requests. Try again later.",
  ),
);

// Rate limiting for AI endpoints (SOAP generation and code matching)
// These are expensive operations that call external AI APIs
app.use(
  "/api/encounters/:id/soap",
  createRateLimiter(
    10,
    "Too many SOAP generation requests. Try again later.",
  ),
);

app.use(
  "/api/encounters/:id/codes",
  createRateLimiter(
    10,
    "Too many code matching requests. Try again later.",
  ),
);

/**
 * 🚀 FIX #1:
 * Register /api/transcribe BEFORE express.json(), helmet, auditLogger, etc.
 * This ensures Multer sees the raw file stream.
 */
import transcribeRoutes from "./api/routes/transcribe";
app.use("/api/transcribe", transcribeRoutes);

/**
 * Normal middleware can now follow safely.
 */
app.use(express.json({ limit: "1mb" }));

const helmetOptions: HelmetOptions = {
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://cdn.tailwindcss.com",
        "https://cdnjs.cloudflare.com",
        "https://cdn.lineicons.com",
        "https://cdn.jsdelivr.net",
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://cdnjs.cloudflare.com",
        "https://cdn.lineicons.com",
      ],
      imgSrc: ["'self'", "data:", "https://hpppm.github.io"],
      fontSrc: [
        "'self'",
        "https://cdnjs.cloudflare.com",
        "https://cdn.lineicons.com",
      ],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'self'"],
    },
  },
  referrerPolicy: { policy: "no-referrer" },
};

app.use(helmet(helmetOptions));
app.use((req, res, next) => {
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  );
  next();
});
// SECURITY: Custom Morgan token strips query string from URL before logging
// to prevent query params (which may contain PHI on some routes) from reaching stdout.
morgan.token("url-no-query", (req: Request) =>
  (req.originalUrl || req.url || "").split("?")[0]
);
app.use(morgan(":method :url-no-query :status :res[content-length] - :response-time ms"));
app.use(auditLogger);

// Security headers for API responses - prevent caching of sensitive data
app.use("/api", (req, res, next) => {
  res.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate",
  );
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  res.set("Surrogate-Control", "no-store");
  next();
});

/**
 * Register ALL OTHER routes AFTER middleware
 */
import authRoutes from "./api/routes/auth";
import patientRoutes from "./api/routes/patients";
import encounterRoutes from "./api/routes/encounters";
import claimRoutes from "./api/routes/claims";
import meRoutes from "./api/routes/me";
import healthRoutes from "./api/routes/health";
import userRoutes from "./api/routes/users";
import soapRoutes from "./api/routes/soap";
import codesRoutes from "./api/routes/codes";
import organizationRoutes from "./api/routes/organizations";
import securityRoutes from "./api/routes/security";

app.use("/api/auth", authRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/encounters", encounterRoutes);
app.use("/api/encounters", soapRoutes);
app.use("/api/encounters", codesRoutes);
app.use("/api/claims", claimRoutes);
app.use("/api/me", meRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/users", userRoutes);
app.use("/api/organizations", organizationRoutes);
app.use("/api/security", securityRoutes);

import swaggerUi from "swagger-ui-express";
import { generateOpenApiSpec } from "./config/swagger";

// Swagger Documentation
const isDevelopment =
  appConfig.env === "development" && process.env.NODE_ENV !== "production";

if (isDevelopment && !isTestEnv) {
  const swaggerSpec = generateOpenApiSpec();
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get("/docs.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });
  logger.info('Swagger docs enabled at /docs');
}

import { errorHandler } from "./middleware/error";
app.use(errorHandler);

export default app;

export const resetTestRateLimits = () => {
  authRateLimitStore.resetAll();
};
