import request from "supertest";
import app from "../src/server";
import { Readable } from "stream";
import { mock } from "jest-mock-extended";

// Mock AWS S3 functions
jest.mock("../src/config/awsS3", () => ({
  uploadFile: jest.fn(),
  getFile: jest.fn(),
  // Add other S3 functions if they are used in the transcribe route and need mocking
}));

// Mock database functions
jest.mock("../src/db/queries", () => ({
  createAudioRecord: jest.fn(),
  createAiResult: jest.fn(),
}));

// Mock child_process.spawn
const mockSpawn = jest.fn();
const mockStdin = mock<Readable>();
const mockStdout = mock<Readable>();
const mockStderr = mock<Readable>();

mockSpawn.mockReturnValue({
  stdin: mockStdin,
  stdout: mockStdout,
  stderr: mockStderr,
  on: jest.fn((event, handler) => {
    if (event === 'close') {
      // Simulate successful close
      handler(0);
    }
  }),
});

jest.mock('child_process', () => ({
  spawn: mockSpawn,
}));

// Mock authMiddleware to allow requests through
jest.mock("../src/middleware/auth", () => ({
  authMiddleware: (req: any, res: any, next: any) => {
    req.user = { id: "test-user-id" }; // Mock authenticated user
    next();
  },
}));

describe("Transcribe API (integration)", () => {
  const MOCK_ENCOUNTER_ID = "123e4567-e89b-12d3-a456-426614174000";
  const M MOCK_S3_KEY = "audio/test-audio.wav";
  const MOCK_TRANSCRIPT = {
    language: "en",
    text: "Hello world",
    segments: [{ start: 0, end: 1, text: "Hello world" }],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Helper to simulate a Python script response
  const simulatePythonResponse = (
    stdoutData: string,
    stderrData: string = "",
    exitCode: number = 0
  ) => {
    // Resetting listeners and then setting them up again.
    // This is a simplification; in a real scenario, you might want to control
    // the 'on' method behavior more precisely for each test.
    (mockSpawn as jest.Mock).mockReturnValue({
      stdin: mockStdin,
      stdout: {
        on: jest.fn((event, handler) => {
          if (event === 'data') handler(Buffer.from(stdoutData));
        }),
        pipe: jest.fn(),
      },
      stderr: {
        on: jest.fn((event, handler) => {
          if (event === 'data') handler(Buffer.from(stderrData));
        }),
        pipe: jest.fn(),
      },
      on: jest.fn((event, handler) => {
        if (event === 'close') handler(exitCode);
        if (event === 'error' && exitCode !== 0) handler(new Error('Python error'));
      }),
    });
  };
  

  it("should transcribe an uploaded audio file successfully", async () => {
    const mockUploadFile = require("../src/config/awsS3").uploadFile;
    const mockCreateAudioRecord = require("../src/db/queries").createAudioRecord;
    const mockCreateAiResult = require("../src/db/queries").createAiResult;

    // Simulate successful Python transcription
    simulatePythonResponse(JSON.stringify(MOCK_TRANSCRIPT));

    const audioBuffer = Buffer.from("test audio data");

    const res = await request(app)
      .post("/api/transcribe")
      .set("Authorization", "Bearer mock-token")
      .field("encounterId", MOCK_ENCOUNTER_ID)
      .attach("audio", audioBuffer, "audio.wav");

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.transcript).toEqual(MOCK_TRANSCRIPT);
    expect(mockUploadFile).toHaveBeenCalledTimes(1);
    expect(mockCreateAudioRecord).toHaveBeenCalledTimes(1);
    expect(mockCreateAiResult).toHaveBeenCalledTimes(1);
    expect(mockSpawn).toHaveBeenCalledTimes(1);
    expect(mockStdin.pipe).toHaveBeenCalledTimes(1);
  });

  it("should return 400 if no encounterId is provided", async () => {
    const audioBuffer = Buffer.from("test audio data");

    const res = await request(app)
      .post("/api/transcribe")
      .set("Authorization", "Bearer mock-token")
      .attach("audio", audioBuffer, "audio.wav");

    expect(res.statusCode).toEqual(400);
    expect(res.body.error).toBe("Encounter ID is required.");
  });

  it("should return 400 if uploaded file is not an audio file", async () => {
    const audioBuffer = Buffer.from("test image data");

    const res = await request(app)
      .post("/api/transcribe")
      .set("Authorization", "Bearer mock-token")
      .field("encounterId", MOCK_ENCOUNTER_ID)
      .attach("audio", audioBuffer, "image.png"); // Attach a non-audio file

    expect(res.statusCode).toEqual(400);
    expect(res.body.error).toBe("Provided file is not an audio file.");
    expect(mockUploadFile).not.toHaveBeenCalled();
    expect(mockSpawn).not.toHaveBeenCalled();
  });

  it("should transcribe an S3-referenced audio file successfully (fallback)", async () => {
    const mockGetFile = require("../src/config/awsS3").getFile;
    const mockCreateAiResult = require("../src/db/queries").createAiResult;

    // Simulate successful Python transcription
    simulatePythonResponse(JSON.stringify(MOCK_TRANSCRIPT));

    // Mock S3 getFile to return a readable stream
    const mockS3Stream = Readable.from(Buffer.from("mock s3 audio data"));
    (mockGetFile as jest.Mock).mockResolvedValue({ Body: mockS3Stream });

    const res = await request(app)
      .post("/api/transcribe")
      .set("Authorization", "Bearer mock-token")
      .send({ s3Key: MOCK_S3_KEY, encounterId: MOCK_ENCOUNTER_ID });

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.transcript).toEqual(MOCK_TRANSCRIPT);
    expect(mockGetFile).toHaveBeenCalledWith(MOCK_S3_KEY);
    expect(mockCreateAiResult).toHaveBeenCalledTimes(1);
    expect(mockSpawn).toHaveBeenCalledTimes(1);
    expect(mockStdin.pipe).toHaveBeenCalledTimes(1);
  });

  it("should return 400 for S3 fallback if s3Key is missing", async () => {
    const res = await request(app)
      .post("/api/transcribe")
      .set("Authorization", "Bearer mock-token")
      .send({ encounterId: MOCK_ENCOUNTER_ID }); // Missing s3Key

    expect(res.statusCode).toEqual(400);
    expect(res.body.error).toBe("Invalid request body for S3 fallback.");
    expect(res.body.details[0].path[0]).toBe("s3Key");
  });

  it("should return 400 for S3 fallback if encounterId is invalid", async () => {
    const res = await request(app)
      .post("/api/transcribe")
      .set("Authorization", "Bearer mock-token")
      .send({ s3Key: MOCK_S3_KEY, encounterId: "invalid-uuid" }); // Invalid encounterId

    expect(res.statusCode).toEqual(400);
    expect(res.body.error).toBe("Invalid request body for S3 fallback.");
    expect(res.body.details[0].path[0]).toBe("encounterId");
  });

  it("should return 500 if S3 file retrieval fails (fallback)", async () => {
    const mockGetFile = require("../src/config/awsS3").getFile;
    (mockGetFile as jest.Mock).mockResolvedValue({ Body: undefined }); // Simulate file not found or empty

    const res = await request(app)
      .post("/api/transcribe")
      .set("Authorization", "Bearer mock-token")
      .send({ s3Key: MOCK_S3_KEY, encounterId: MOCK_ENCOUNTER_ID });

    expect(res.statusCode).toEqual(500);
    expect(res.body.error).toBe("Failed to retrieve file from S3.");
  });

  it("should return 500 if Python transcription script fails", async () => {
    // Simulate Python script exiting with an error
    simulatePythonResponse("{}", "Error from Whisper", 1);

    const audioBuffer = Buffer.from("test audio data");

    const res = await request(app)
      .post("/api/transcribe")
      .set("Authorization", "Bearer mock-token")
      .field("encounterId", MOCK_ENCOUNTER_ID)
      .attach("audio", audioBuffer, "audio.wav");

    expect(res.statusCode).toEqual(500);
    expect(res.body.error).toContain("Whisper transcription failed");
  });
});