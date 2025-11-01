import { Express } from "express";
import authRoutes from "./auth";
import patientRoutes from "./patients";
import encounterRoutes from "./encounters";
import aiRoutes from "./ai";
import claimRoutes from "./claims";
import feedbackRoutes from "./feedback";
import notificationRoutes from "./notifications";
import transcriptionRoutes from "./transcription";
import hitlRoutes from "./hitl";
import mlRoutes from "./ml";
import codesRoutes from "./codes";
import fhirRoutes from "./fhir";
import ediRoutes from "./edi";
import pubsubRoutes from "./pubsub";
import clearinghouseRoutes from "./clearinghouse";
import analyticsRoutes from "./analytics";

export function registerRoutes(app: Express) {
  // API v1 routes - versioned for future compatibility
  
  // Core routes
  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/patients", patientRoutes);
  app.use("/api/v1/encounters", encounterRoutes);
  app.use("/api/v1/claims", claimRoutes);
  app.use("/api/v1/notifications", notificationRoutes);
  
  // AI & ML routes
  app.use("/api/v1/transcription", transcriptionRoutes);
  app.use("/api/v1/ai", aiRoutes);
  app.use("/api/v1/ml", mlRoutes);
  
  // HITL & Validation routes
  app.use("/api/v1/hitl", hitlRoutes);
  app.use("/api/v1/codes", codesRoutes);
  app.use("/api/v1/feedback", feedbackRoutes);
  
  // Healthcare standards routes
  app.use("/api/v1/fhir", fhirRoutes);
  app.use("/api/v1/edi", ediRoutes);
  
  // Integration routes
  app.use("/api/v1/pubsub", pubsubRoutes);
  app.use("/api/v1/clearinghouse", clearinghouseRoutes);
  app.use("/api/v1/analytics", analyticsRoutes);
}
