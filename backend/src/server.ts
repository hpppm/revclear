import "./setupEnv";
import express from "express";
import helmet, { HelmetOptions } from "helmet";
import cors from "cors";
import morgan from "morgan";
// @ts-ignore: express-rate-limit has no TS types
import rateLimit from "express-rate-limit";

import { auditLogger } from "./middleware/audit";
import { appConfig } from "./config/appConfig";

const app = express();
const isTestEnv = appConfig.env === "test" || process.env.JEST_WORKER_ID;

// Load Genkit flows/tools in dev mode so the CLI Dev UI can attach.
if (appConfig.genkitEnv === "dev") {
  import("../genkit")
    .then(() => {
      console.log("✅ Genkit dev runtime loaded.");
    })
    .catch((err) => {
      console.warn("⚠️ Genkit dev runtime failed to load:", err);
    });
}

// --------------------------------------------------
// CORS
// --------------------------------------------------
app.use(cors());

// --------------------------------------------------
// Security Monitoring (Custom Built)
// --------------------------------------------------
import { securityMonitor } from "./middleware/securityMonitor";
console.log("✅ Security monitoring enabled");
app.use(securityMonitor);

// --------------------------------------------------
// Rate Limiting
// --------------------------------------------------
app.use(
  "/api/auth",
  rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: "Too many auth requests. Try again later.",
  })
);

app.use(
  "/api/transcribe",
  rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    message: "Too many transcribe requests. Try again later.",
  })
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
app.use(morgan("combined"));
app.use(auditLogger);

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

if (!isTestEnv) {
  // Lazily load dev routes only outside test runs to avoid heavy fixtures
  const devRoutes = require("./api/routes/dev").default;
  app.use("/api/dev", devRoutes);
}

export default app;