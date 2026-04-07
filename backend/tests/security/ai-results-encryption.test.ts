describe("ai_results PHI encryption", () => {
  const originalKey = process.env.PHI_ENCRYPTION_KEY;

  const loadModules = () => {
    jest.resetModules();

    const queryMock = jest.fn();
    jest.doMock("../../src/config/db", () => ({
      query: queryMock,
    }));

    const cryptoModule = require("../../src/utils/crypto");
    const queriesModule = require("../../src/db/queries");

    return { queryMock, ...cryptoModule, ...queriesModule };
  };

  beforeEach(() => {
    process.env.PHI_ENCRYPTION_KEY =
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  });

  afterAll(() => {
    process.env.PHI_ENCRYPTION_KEY = originalKey;
  });

  it("round-trips encrypted JSON envelopes while preserving legacy plaintext payloads", () => {
    const {
      encryptPHIJson,
      decryptPHIJson,
      isEncryptedPHIJson,
    } = require("../../src/utils/crypto");

    const plaintext = { text: "patient transcript", nested: { soap: "data" } };
    const encrypted = encryptPHIJson(plaintext);

    expect(isEncryptedPHIJson(encrypted)).toBe(true);
    expect(encrypted).toEqual(
      expect.objectContaining({
        __revclear_encrypted: true,
        ciphertext: expect.any(String),
      }),
    );
    expect(decryptPHIJson(encrypted)).toEqual(plaintext);
    expect(decryptPHIJson(plaintext)).toEqual(plaintext);
  });

  it("encrypts ai_results writes before calling the database and returns decrypted data", async () => {
    const { queryMock, createAiResult } = loadModules();
    const payload = {
      encounter_id: "enc-1",
      flow_name: "whisper_transcript",
      input_json: { s3Key: "audio/test.webm" },
      output_json: { text: "patient transcript" },
      model_version: "whisper-base",
      confidence_score: null,
    };

    queryMock.mockResolvedValueOnce({
      rows: [
        {
          id: "row-1",
          created_at: "2026-03-16T00:00:00.000Z",
          ...payload,
        },
      ],
    });

    const result = await createAiResult(payload);

    const dbParams = queryMock.mock.calls[0][1];
    expect(dbParams[2]).toEqual(
      expect.objectContaining({
        __revclear_encrypted: true,
        ciphertext: expect.any(String),
      }),
    );
    expect(dbParams[3]).toEqual(
      expect.objectContaining({
        __revclear_encrypted: true,
        ciphertext: expect.any(String),
      }),
    );
    expect(result.input_json).toEqual(payload.input_json);
    expect(result.output_json).toEqual(payload.output_json);
  });

  it("decrypts marked rows and leaves legacy plaintext rows unchanged on read", async () => {
    const { queryMock, encryptPHIJson, getLatestAiResult } = loadModules();
    const encryptedOutput = encryptPHIJson({ text: "encrypted transcript" });
    const encryptedInput = encryptPHIJson({ s3Key: "audio/encrypted.webm" });

    queryMock.mockResolvedValueOnce({
      rows: [
        {
          id: "row-1",
          encounter_id: "enc-1",
          flow_name: "whisper_transcript",
          input_json: encryptedInput,
          output_json: encryptedOutput,
          model_version: "whisper-base",
          confidence_score: null,
          created_at: "2026-03-16T00:00:00.000Z",
        },
      ],
    });

    const encryptedResult = await getLatestAiResult("enc-1", "whisper_transcript");
    expect(encryptedResult?.input_json).toEqual({ s3Key: "audio/encrypted.webm" });
    expect(encryptedResult?.output_json).toEqual({ text: "encrypted transcript" });

    queryMock.mockResolvedValueOnce({
      rows: [
        {
          id: "row-legacy",
          encounter_id: "enc-1",
          flow_name: "whisper_transcript",
          input_json: { s3Key: "audio/legacy.webm" },
          output_json: { text: "legacy transcript" },
          model_version: "whisper-base",
          confidence_score: null,
          created_at: "2026-03-16T00:00:00.000Z",
        },
      ],
    });

    const legacyResult = await getLatestAiResult("enc-1", "whisper_transcript");
    expect(legacyResult?.input_json).toEqual({ s3Key: "audio/legacy.webm" });
    expect(legacyResult?.output_json).toEqual({ text: "legacy transcript" });
  });

  it("routes transcript reads through the shared repository helper", () => {
    const fs = require("fs");
    const path = require("path");
    const transcribePath = path.join(__dirname, "../../src/api/routes/transcribe.ts");
    const content = fs.readFileSync(transcribePath, "utf-8");

    expect(content).toMatch(/getLatestAiResult/);
    expect(content).not.toMatch(/SELECT output_json FROM ai_results/);
  });
});
