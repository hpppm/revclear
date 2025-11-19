import "./setupEnv";
import express from "express";
import helmet, { HelmetOptions } from "helmet";
import cors from "cors";
import morgan from "morgan";
import { registerRoutes } from "./api";
import { auditLogger } from "./middleware/audit";

const app = express();

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
import devRoutes from "./api/routes/dev";

app.use("/api/auth", authRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/dev", devRoutes);

// Start server
const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
  console.log(`✅ API running securely on http://localhost:${PORT}`);
});
