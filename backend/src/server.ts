import "./setupEnv";
import express from "express";
import helmet, { HelmetOptions } from "helmet";
import cors from "cors";
import morgan from "morgan";

import { auditLogger } from "./middleware/audit";

const app = express();

// Load Genkit flows/tools in dev mode so the CLI Dev UI can attach.
if (process.env.GENKIT_ENV === "dev") {
  import("../genkit")
    .then(() => {
      console.log("✅ Genkit dev runtime loaded.");
    })
    .catch((err) => {
      console.warn("⚠️ Genkit dev runtime failed to load:", err);
    });
}

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
app.use(express.json());
app.use(cors());

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
import devRoutes from "./api/routes/dev";
import userRoutes from "./api/routes/users"; // Added userRoutes

app.use("/api/auth", authRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/encounters", encounterRoutes);
app.use("/api/claims", claimRoutes);
app.use("/api/me", meRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/dev", devRoutes);
app.use("/api/users", userRoutes); // Added userRoutes

// Start server
const PORT = process.env.PORT || 3005;
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`✅ API running securely on http://localhost:${PORT}`);
  });
}

export default app;
