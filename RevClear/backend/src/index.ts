import "./setupEnv";
import express from "express";
import helmet, { HelmetOptions } from "helmet";
import cors from "cors";
import morgan from "morgan";
import { registerRoutes } from "./api";
import { auditLogger } from "./middleware/audit";

const app = express();
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
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://cdn.lineicons.com"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'self'"],
    },
  },
};

app.use(helmet(helmetOptions));
app.use(morgan("combined"));
app.use(auditLogger);

// Base API route
registerRoutes(app);

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
  console.log(`✅ API running securely on http://localhost:${PORT}`);
  console.log(
    "🧪 Dashboard UI: run `cd ../dash-backend && npm run dev` then visit http://localhost:3000 (or the port Next.js prints)."
  );
});
