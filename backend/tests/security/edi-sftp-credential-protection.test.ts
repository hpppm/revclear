/**
 * EDI SFTP Credential Protection — backend security test
 *
 * `edi_sftp_password` is a server-side-only secret: it must never be accepted
 * from an unauthenticated caller. This test sends PATCH /api/organizations/me
 * without any auth credentials and asserts the backend rejects the request
 * before the body is ever processed.
 *
 * Playwright is intentionally skipped for this field — there is no UI input
 * for edi_sftp_password, so the protection guarantee must be verified here.
 */

// ── Mocks (hoisted before all imports) ────────────────────────────────────────

const mockVerify = jest.fn();
const mockFindUser = jest.fn();
const mockQuery = jest.fn();

jest.mock("aws-jwt-verify", () => ({
  CognitoJwtVerifier: {
    create: jest.fn(() => ({
      verify: mockVerify,
      hydrate: jest.fn().mockResolvedValue(undefined),
    })),
  },
}));

jest.mock("../../src/config/db", () => ({
  query: mockQuery,
  findUserByCognitoId: mockFindUser,
  getClient: jest.fn(),
}));

jest.mock("../../src/config/awsS3", () => ({
  uploadFile: jest.fn(),
  getFile: jest.fn(),
  getUploadUrl: jest.fn().mockResolvedValue("https://s3.example.com/upload"),
  getDownloadUrl: jest.fn().mockResolvedValue("https://s3.example.com/download"),
  s3Client: {},
  bucketName: "test-bucket",
}));

jest.mock("../../src/api/routes/transcribe", () => {
  const { Router } = require("express");
  const router = Router();
  return { __esModule: true, default: router };
});

// ── Imports ───────────────────────────────────────────────────────────────────

import request from "supertest";
import app from "../../src/server";

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("PATCH /api/organizations/me — edi_sftp_password protection", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 when no auth cookie is present", async () => {
    const res = await request(app)
      .patch("/api/organizations/me")
      .send({ edi_sftp_password: "s3cr3t!" });

    expect(res.status).toBe(401);
  });

  it("does not call the DB when unauthenticated (auth fails before body is processed)", async () => {
    await request(app)
      .patch("/api/organizations/me")
      .send({ edi_sftp_password: "s3cr3t!" });

    expect(mockQuery).not.toHaveBeenCalled();
    expect(mockFindUser).not.toHaveBeenCalled();
  });

  it("returns 401 when Authorization header is used instead of cookie (cookie-only policy)", async () => {
    const res = await request(app)
      .patch("/api/organizations/me")
      .set("Authorization", "Bearer fake.jwt.token")
      .send({ edi_sftp_password: "s3cr3t!" });

    expect(res.status).toBe(401);
  });
});
