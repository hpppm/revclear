import request from "supertest";
import app from "../src/server";
import { findUserByCognitoId, createUser, query } from "../src/config/db";

// Mock the authMiddleware to simulate an authenticated user
jest.mock("../src/middleware/auth", () => ({
  authMiddleware: jest.fn((req, res, next) => {
    // Default mock user
    (req as any).user = {
      sub: "mockCognitoId123",
      email: "test@example.com",
      name: "Test User",
    };
    next();
  }),
}));

// Mock database functions
jest.mock("../src/config/db", () => ({
  findUserByCognitoId: jest.fn(),
  createUser: jest.fn(),
  query: jest.fn(),
}));

describe("User API Routes", () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe("GET /api/me", () => {
    it("should return 401 if user data is missing from token", async () => {
      // Override mock for this specific test
      const { authMiddleware } = require("../src/middleware/auth");
      authMiddleware.mockImplementationOnce((req: any, res: any, next: any) => {
        req.user = { sub: null, email: null }; // Simulate missing data
        next();
      });

      const res = await request(app).get("/api/me");
      expect(res.statusCode).toEqual(401);
      expect(res.body.error).toEqual("Unauthorized");
      expect(res.body.message).toContain("not found in token");
    });

    it("should return an existing user", async () => {
      const mockUser = {
        id: "user-uuid-1",
        cognito_id: "mockCognitoId123",
        email: "test@example.com",
        full_name: "Test User",
        role: "clinician",
      };
      (findUserByCognitoId as jest.Mock).mockResolvedValue(mockUser);

      const res = await request(app).get("/api/me");
      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual(mockUser);
      expect(findUserByCognitoId).toHaveBeenCalledWith("mockCognitoId123");
      expect(createUser).not.toHaveBeenCalled();
    });

    it("should create a new user if not found", async () => {
      const newUser = {
        id: "user-uuid-new",
        cognito_id: "mockCognitoId123",
        email: "test@example.com",
        full_name: "Test User",
        role: "clinician",
      };
      (findUserByCognitoId as jest.Mock).mockResolvedValue(undefined); // User not found
      (createUser as jest.Mock).mockResolvedValue(newUser);

      const res = await request(app).get("/api/me");
      expect(res.statusCode).toEqual(201); // 201 for resource created
      expect(res.body).toEqual(newUser);
      expect(findUserByCognitoId).toHaveBeenCalledWith("mockCognitoId123");
      expect(createUser).toHaveBeenCalledWith("mockCognitoId123", "test@example.com", "Test User");
    });

    it("should handle full_name fallback to email when name is missing from token", async () => {
      const { authMiddleware } = require("../src/middleware/auth");
      authMiddleware.mockImplementationOnce((req: any, res: any, next: any) => {
        req.user = {
          sub: "mockCognitoIdWithNoName",
          email: "noname@example.com",
          name: undefined,
        };
        next();
      });

      const newUser = {
        id: "user-uuid-noname",
        cognito_id: "mockCognitoIdWithNoName",
        email: "noname@example.com",
        full_name: "noname@example.com", // Expecting fallback
        role: "clinician",
      };
      (findUserByCognitoId as jest.Mock).mockResolvedValue(undefined);
      (createUser as jest.Mock).mockResolvedValue(newUser);

      const res = await request(app).get("/api/me");
      expect(res.statusCode).toEqual(201);
      expect(createUser).toHaveBeenCalledWith(
        "mockCognitoIdWithNoName",
        "noname@example.com",
        "noname@example.com"
      );
    });

    it("should return 500 if there's a database error", async () => {
      (findUserByCognitoId as jest.Mock).mockRejectedValue(new Error("DB error"));

      const res = await request(app).get("/api/me");
      expect(res.statusCode).toEqual(500);
      expect(res.body.error).toEqual("Server Error");
      expect(res.body.message).toContain("DB error");
    });
  });

  describe("GET /api/users", () => {
    it("should return a list of users", async () => {
      const mockUsers = [
        {
          id: "user-uuid-1",
          cognito_id: "cognitoId1",
          email: "user1@example.com",
          full_name: "User One",
          role: "clinician",
        },
        {
          id: "user-uuid-2",
          cognito_id: "cognitoId2",
          email: "user2@example.com",
          full_name: "User Two",
          role: "clinician",
        },
      ];
      (query as jest.Mock).mockResolvedValue({ rows: mockUsers });

      const res = await request(app).get("/api/users");
      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual(mockUsers);
      expect(query).toHaveBeenCalledWith(
        "SELECT id, cognito_id, email, full_name, role, created_at FROM users"
      );
    });

    it("should return 500 if there's a database error when listing users", async () => {
      (query as jest.Mock).mockRejectedValue(new Error("DB list error"));

      const res = await request(app).get("/api/users");
      expect(res.statusCode).toEqual(500);
      expect(res.body.error).toEqual("Server Error");
      expect(res.body.message).toContain("DB list error");
    });
  });

  describe("GET /api/users/:cognitoId", () => {
    it("should return a specific user by cognitoId", async () => {
      const mockUser = {
        id: "user-uuid-1",
        cognito_id: "cognitoId1",
        email: "user1@example.com",
        full_name: "User One",
        role: "clinician",
      };
      (query as jest.Mock).mockResolvedValue({ rows: [mockUser] });

      const res = await request(app).get("/api/users/cognitoId1");
      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual(mockUser);
      expect(query).toHaveBeenCalledWith(
        "SELECT id, cognito_id, email, full_name, role, created_at FROM users WHERE cognito_id = $1",
        ["cognitoId1"]
      );
    });

    it("should return 404 if user is not found by cognitoId", async () => {
      (query as jest.Mock).mockResolvedValue({ rows: [] }); // No user found

      const res = await request(app).get("/api/users/nonExistentCognitoId");
      expect(res.statusCode).toEqual(404);
      expect(res.body.error).toEqual("Not Found");
      expect(res.body.message).toEqual("User not found.");
    });

    it("should return 500 if there's a database error when getting a specific user", async () => {
      (query as jest.Mock).mockRejectedValue(new Error("DB single user error"));

      const res = await request(app).get("/api/users/cognitoId1");
      expect(res.statusCode).toEqual(500);
      expect(res.body.error).toEqual("Server Error");
      expect(res.body.message).toContain("DB single user error");
    });
  });
});