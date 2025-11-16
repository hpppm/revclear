import { Express } from "express";
import authRoutes from "./auth";
import patientRoutes from "./patients";
import dashboardRoutes from "./dashboard";
import dynamodbRoutes from "./dynamodb"; // Import dynamodb routes

// TODO: Re-enable the following routes once their controllers are restored.
/* import encounterRoutes from "./encounters";
import aiRoutes from "./ai";
import claimRoutes from "./claims";
import feedbackRoutes from "./feedback";
import notificationRoutes from "./notifications"; */

export function registerRoutes(app: Express) {
  app.use("/api/auth", authRoutes);
  app.use("/api/patients", patientRoutes);
  // app.use("/api/encounters", encounterRoutes);
  // app.use("/api/ai", aiRoutes);
  // app.use("/api/claims", claimRoutes);
  // app.use("/api/feedback", feedbackRoutes);
  // app.use("/api/notifications", notificationRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/dynamodb", dynamodbRoutes); // Register dynamodb routes
}
