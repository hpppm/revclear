import request from "supertest";
import app from "../src/server";
import { query } from "../src/config/db";

// Mock the authMiddleware to simulate an authenticated user
jest.mock("../src/middleware/auth", () => ({
  authMiddleware: jest.fn((req, res, next) => {
    (req as any).user = {
      sub: "mockCognitoIdPatientsEncounters",
      email: "patient.encounter@example.com",
      name: "Patient Encounter User",
    };
    next();
  }),
}));

// Mock database functions for patient and encounter routes
jest.mock("../src/config/db", () => ({
  query: jest.fn(),
}));

describe("Patients and Encounters API Routes", () => {
  let patientId: string;
  let encounterId: string;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock IDs for each test to ensure isolation
    patientId = "";
    encounterId = "";
  });

  describe("Patients CRUD", () => {
    // Test POST /api/patients - Create patient
    it("should create a new patient", async () => {
      const newPatient = {
        full_name: "John Doe",
        date_of_birth: "1990-01-01",
        gender: "Male",
      };
      const mockCreatedPatient = { id: "pat-123", ...newPatient, created_at: new Date().toISOString() };
      (query as jest.Mock).mockResolvedValueOnce({ rows: [mockCreatedPatient] });

      const res = await request(app).post("/api/patients").send(newPatient);
      expect(res.statusCode).toEqual(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(mockCreatedPatient);
      patientId = mockCreatedPatient.id; // Save patient ID for subsequent tests
    });

    it("should return 400 for invalid patient creation data", async () => {
      const invalidPatient = { full_name: "", date_of_birth: "invalid-date", gender: "" };
      const res = await request(app).post("/api/patients").send(invalidPatient);
      expect(res.statusCode).toEqual(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBeInstanceOf(Array); // Zod errors are an array
    });

    // Test GET /api/patients - Get all patients
    it("should return a list of patients", async () => {
      const mockPatients = [
        { id: "pat-123", full_name: "John Doe", date_of_birth: "1990-01-01", gender: "Male", created_at: new Date().toISOString() },
      ];
      (query as jest.Mock).mockResolvedValueOnce({ rows: mockPatients });

      const res = await request(app).get("/api/patients");
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(mockPatients);
    });

    // Test GET /api/patients/:id - Get patient by ID
    it("should return a patient by ID", async () => {
      const mockPatient = { id: "pat-123", full_name: "John Doe", date_of_birth: "1990-01-01", gender: "Male", created_at: new Date().toISOString() };
      (query as jest.Mock).mockResolvedValueOnce({ rows: [mockPatient] });

      const res = await request(app).get("/api/patients/pat-123");
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(mockPatient);
    });

    it("should return 404 if patient not found", async () => {
      (query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const res = await request(app).get("/api/patients/non-existent-id");
      expect(res.statusCode).toEqual(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toEqual("Patient not found");
    });

    // Test PUT /api/patients/:id - Update patient
    it("should update an existing patient", async () => {
      const updatedData = { full_name: "Jane Doe" };
      const mockUpdatedPatient = { id: "pat-123", full_name: "Jane Doe", date_of_birth: "1990-01-01", gender: "Female", created_at: new Date().toISOString() };
      (query as jest.Mock).mockResolvedValueOnce({ rows: [mockUpdatedPatient] });

      const res = await request(app).put("/api/patients/pat-123").send(updatedData);
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.full_name).toEqual("Jane Doe");
    });

    it("should return 404 if patient to update not found", async () => {
      const updatedData = { full_name: "Jane Doe" };
      (query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const res = await request(app).put("/api/patients/non-existent-id").send(updatedData);
      expect(res.statusCode).toEqual(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toEqual("Patient not found");
    });

    // Test DELETE /api/patients/:id - Delete patient
    it("should delete an existing patient", async () => {
      (query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: "pat-123" }] });

      const res = await request(app).delete("/api/patients/pat-123");
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toEqual("Patient deleted successfully");
    });

    it("should return 404 if patient to delete not found", async () => {
      (query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const res = await request(app).delete("/api/patients/non-existent-id");
      expect(res.statusCode).toEqual(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toEqual("Patient not found");
    });
  });

  describe("Encounters CRUD", () => {
    let testPatientId = "pat-for-enc";

    beforeEach(() => {
      jest.clearAllMocks();
    });

    // Test POST /api/encounters - Create encounter
    it("should create a new encounter", async () => {
      const newEncounter = {
        patient_id: testPatientId,
        encounter_date: "2023-10-26T10:00:00.000Z",
        type: "Initial Visit",
      };
      const mockCreatedEncounter = { id: "enc-456", ...newEncounter, created_at: new Date().toISOString() };
      (query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: testPatientId }] }) // Patient exists
        .mockResolvedValueOnce({ rows: [mockCreatedEncounter] });

      const res = await request(app).post("/api/encounters").send(newEncounter);
      expect(res.statusCode).toEqual(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(mockCreatedEncounter);
      encounterId = mockCreatedEncounter.id; // Save encounter ID
    });

    it("should return 400 for invalid encounter creation data", async () => {
      const invalidEncounter = { patient_id: "invalid-uuid", encounter_date: "invalid-date", type: "" };
      const res = await request(app).post("/api/encounters").send(invalidEncounter);
      expect(res.statusCode).toEqual(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBeInstanceOf(Array);
    });

    it("should return 404 if patient_id does not exist when creating an encounter", async () => {
      const newEncounter = {
        patient_id: "non-existent-pat-id",
        encounter_date: "2023-10-26T10:00:00.000Z",
        type: "Follow-up",
      };
      (query as jest.Mock).mockResolvedValueOnce({ rows: [] }); // Patient not found

      const res = await request(app).post("/api/encounters").send(newEncounter);
      expect(res.statusCode).toEqual(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toEqual("Patient not found");
    });

    // Test GET /api/encounters - Get all encounters
    it("should return a list of encounters", async () => {
      const mockEncounters = [
        { id: "enc-456", patient_id: testPatientId, encounter_date: "2023-10-26T10:00:00.000Z", type: "Initial Visit", created_at: new Date().toISOString() },
      ];
      (query as jest.Mock).mockResolvedValueOnce({ rows: mockEncounters });

      const res = await request(app).get("/api/encounters");
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(mockEncounters);
    });

    // Test GET /api/encounters/:id - Get encounter by ID
    it("should return an encounter by ID", async () => {
      const mockEncounter = { id: "enc-456", patient_id: testPatientId, encounter_date: "2023-10-26T10:00:00.000Z", type: "Initial Visit", created_at: new Date().toISOString() };
      (query as jest.Mock).mockResolvedValueOnce({ rows: [mockEncounter] });

      const res = await request(app).get("/api/encounters/enc-456");
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(mockEncounter);
    });

    it("should return 404 if encounter not found", async () => {
      (query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const res = await request(app).get("/api/encounters/non-existent-id");
      expect(res.statusCode).toEqual(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toEqual("Encounter not found");
    });

    // Test PUT /api/encounters/:id - Update encounter
    it("should update an existing encounter", async () => {
      const updatedData = { type: "Follow-up Visit" };
      const mockUpdatedEncounter = { id: "enc-456", patient_id: testPatientId, encounter_date: "2023-10-26T10:00:00.000Z", type: "Follow-up Visit", created_at: new Date().toISOString() };
      (query as jest.Mock).mockResolvedValueOnce({ rows: [mockUpdatedEncounter] });

      const res = await request(app).put("/api/encounters/enc-456").send(updatedData);
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.type).toEqual("Follow-up Visit");
    });

    it("should return 404 if encounter to update not found", async () => {
      const updatedData = { type: "Follow-up Visit" };
      (query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const res = await request(app).put("/api/encounters/non-existent-id").send(updatedData);
      expect(res.statusCode).toEqual(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toEqual("Encounter not found");
    });

    it("should return 404 if updating with a non-existent patient_id", async () => {
      const updatedData = { patient_id: "non-existent-pat-id-2" };
      (query as jest.Mock).mockResolvedValueOnce({ rows: [] }); // Patient not found

      const res = await request(app).put("/api/encounters/enc-456").send(updatedData);
      expect(res.statusCode).toEqual(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toEqual("Patient not found");
    });

    // Test DELETE /api/encounters/:id - Delete encounter
    it("should delete an existing encounter", async () => {
      (query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: "enc-456" }] });

      const res = await request(app).delete("/api/encounters/enc-456");
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toEqual("Encounter deleted successfully");
    });

    it("should return 404 if encounter to delete not found", async () => {
      (query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const res = await request(app).delete("/api/encounters/non-existent-id");
      expect(res.statusCode).toEqual(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toEqual("Encounter not found");
    });
  });
});
