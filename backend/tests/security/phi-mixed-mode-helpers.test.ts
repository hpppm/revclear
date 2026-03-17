describe("shared PHI mixed-mode helpers", () => {
  const originalKey = process.env.PHI_ENCRYPTION_KEY;

  beforeEach(() => {
    jest.resetModules();
    process.env.PHI_ENCRYPTION_KEY =
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  });

  afterAll(() => {
    process.env.PHI_ENCRYPTION_KEY = originalKey;
  });

  it("decrypts configured text fields while preserving plaintext and untouched fields", () => {
    const {
      decryptPHITextFields,
      encryptPHIText,
    } = require("../../src/utils/crypto");

    const row = {
      full_name: encryptPHIText("Jane Doe"),
      dob: "1980-01-01",
      insurance_payer_id: "PAYER001",
      created_at: "2026-03-16T00:00:00.000Z",
    };

    expect(
      decryptPHITextFields(row, ["full_name", "dob"]),
    ).toEqual({
      full_name: "Jane Doe",
      dob: "1980-01-01",
      insurance_payer_id: "PAYER001",
      created_at: "2026-03-16T00:00:00.000Z",
    });
  });

  it("decrypts configured json fields while preserving plaintext legacy payloads", () => {
    const {
      decryptPHIJsonFields,
      encryptPHIJson,
    } = require("../../src/utils/crypto");

    const encryptedRow = {
      input_json: encryptPHIJson({ transcript: "encrypted" }),
      output_json: { transcript: "legacy" },
      flow_name: "whisper_transcript",
    };

    expect(
      decryptPHIJsonFields(encryptedRow, ["input_json", "output_json"]),
    ).toEqual({
      input_json: { transcript: "encrypted" },
      output_json: { transcript: "legacy" },
      flow_name: "whisper_transcript",
    });
  });

  it("is null-safe for optional row reads", () => {
    const { decryptPHIJsonFields, decryptPHITextFields } = require("../../src/utils/crypto");

    expect(decryptPHIJsonFields(null, ["input_json"])).toBeNull();
    expect(decryptPHITextFields(undefined, ["chief_complaint"])).toBeUndefined();
  });
});
