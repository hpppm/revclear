import express from "express";
import dotenv from "dotenv";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import { registerRoutes } from "./api";
import { authMiddleware } from "./middleware/auth";
import { auditLogger } from "./middleware/audit";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan("combined"));
app.use(auditLogger);

// Base API route
app.use("/api", authMiddleware);
registerRoutes(app);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`✅ Server running securely on http://localhost:${PORT}`);
});
