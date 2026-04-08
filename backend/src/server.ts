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
  "http://localhost:3005",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3005",
];
const DEFAULT_PROD_ORIGINS = [
  "https://revclear.gannon.edu",
  "https://revclear.tech",
  "https://www.revclear.tech",
];

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
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean) || (appConfig.env === "production"
    ? DEFAULT_PROD_ORIGINS
    : [...DEFAULT_DEV_ORIGINS, ...DEFAULT_PROD_ORIGINS]);

app.use(
  cors((req, callback) => {
    const origin = req.header("Origin");
    const requestPath = req.path || "";
    const isHealthRoute = HEALTH_ROUTE_PREFIXES.some((prefix) =>
      requestPath.startsWith(prefix),
    );

    // In production, require Origin for browser requests but allow health probes
    if (!origin) {
      if (appConfig.env === "production" && !isHealthRoute) {
        return callback(new Error("Origin header required"), {
          origin: false,
        });
      }

      return callback(null, {
        origin: true,
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
      });
    }

    if (allowedOrigins.includes(origin)) {
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
  if (
    appConfig.env === "production" &&
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
// Global catch-all: any /api route not explicitly listed below gets this limit.
// Must come BEFORE specific limiters so specific ones take precedence.
app.use(
  "/api",
  rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    message: "Too many requests. Try again later.",
    skip: (req) => req.path === "/health" || req.path === "/health/ai",
  }),
);

app.use(
  "/api/auth",
  rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: "Too many auth requests. Try again later.",
  }),
);

app.use(
  "/api/transcribe",
  rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    message: "Too many transcribe requests. Try again later.",
  }),
);

// Rate limiting for other API routes
app.use(
  "/api/patients",
  rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    message: "Too many patient requests. Try again later.",
  }),
);

app.use(
  "/api/encounters",
  rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    message: "Too many encounter requests. Try again later.",
  }),
);

app.use(
  "/api/claims",
  rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    message: "Too many claim requests. Try again later.",
  }),
);

app.use(
  "/api/organizations",
  rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: "Too many organization requests. Try again later.",
  }),
);

app.use(
  "/api/me",
  rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: "Too many profile requests. Try again later.",
  }),
);

app.use(
  "/api/users",
  rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: "Too many user requests. Try again later.",
  }),
);

app.use(
  "/api/codes",
  rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    message: "Too many code requests. Try again later.",
  }),
);

app.use(
  "/api/security",
  rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: "Too many security requests. Try again later.",
  }),
);

app.use(
  "/api/health",
  rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: "Too many health check requests. Try again later.",
  }),
);

// Rate limiting for AI endpoints (SOAP generation and code matching)
// These are expensive operations that call external AI APIs
app.use(
  "/api/encounters/:id/soap",
  rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: "Too many SOAP generation requests. Try again later.",
  }),
);

app.use(
  "/api/encounters/:id/codes",
  rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: "Too many code matching requests. Try again later.",
  }),
);

// --------------------------------------------------
// Security Headers + Audit (MUST come before routes, including transcribe)
// helmet and auditLogger apply to ALL routes including multipart uploads.
// Only express.json() must come after transcribe to preserve Multer's stream.
// --------------------------------------------------
const helmetOptions: HelmetOptions = {
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      fontSrc: ["'self'"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  referrerPolicy: { policy: "no-referrer" },
};

app.use(helmet(helmetOptions));
// SECURITY: Custom Morgan token strips query string from URL before logging
// to prevent query params (which may contain PHI on some routes) from reaching stdout.
morgan.token("url-no-query", (req: Request) =>
  (req.originalUrl || req.url || "").split("?")[0]
);
app.use(morgan(":method :url-no-query :status :res[content-length] - :response-time ms"));
app.use(auditLogger);

// --------------------------------------------------
// Transcribe route — registered BEFORE express.json() so Multer sees raw stream.
// Helmet and auditLogger are already applied above, so this route IS audited.
// --------------------------------------------------
import transcribeRoutes from "./api/routes/transcribe";
app.use("/api/transcribe", transcribeRoutes);

// express.json() comes after transcribe (Multer handles multipart; json() handles the rest)
app.use(express.json({ limit: "1mb" }));

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
app.use("/api/codes", codesRoutes);
app.use("/api/claims", claimRoutes);
app.use("/api/me", meRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/users", userRoutes);
app.use("/api/organizations", organizationRoutes);
app.use("/api/security", securityRoutes);

import swaggerUi from "swagger-ui-express";
import { generateOpenApiSpec } from "./config/swagger";

// Dev routes and Swagger docs only available in development environment
const isDevelopment =
  appConfig.env === "development" && process.env.NODE_ENV !== "production";

if (isDevelopment && !isTestEnv) {
  // Rate limit dev routes - less restrictive than production but still protected
  app.use(
    "/api/dev",
    rateLimit({
      windowMs: 60 * 1000,
      max: 30,
      message: "Too many dev requests. Try again later.",
    }),
  );

  // Lazily load dev routes only in development to avoid exposure in production
  const devRoutes = require("./api/routes/dev").default;
  app.use("/api/dev", devRoutes);
  logger.warn('Dev routes enabled at /api/dev');

  // Swagger Documentation
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
