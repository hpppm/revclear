import { Express } from "express";
import authRoutes from "./auth";
import patientRoutes from "./patients";
import encounterRoutes from "./encounters";
import aiRoutes from "./ai";
import claimRoutes from "./claims";
import feedbackRoutes from "./feedback";
import notificationRoutes from "./notifications";

export function registerRoutes(app: Express) {
  app.use("/api/auth", authRoutes);
  app.use("/api/patients", patientRoutes);
  app.use("/api/encounters", encounterRoutes);
  app.use("/api/ai", aiRoutes);
  app.use("/api/claims", claimRoutes);
  app.use("/api/feedback", feedbackRoutes);
  app.use("/api/notifications", notificationRoutes);
}
