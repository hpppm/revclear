describe("claim snapshot PHI encryption", () => {
  const originalKey = process.env.PHI_ENCRYPTION_KEY;

  const loadModules = () => {
    jest.resetModules();

    const queryMock = jest.fn();
    jest.doMock("../../src/config/db", () => ({
      query: queryMock,
    }));

    const claimServiceModule = require("../../src/services/claimService");
    const cryptoModule = require("../../src/utils/crypto");

    return {
      queryMock,
      ClaimService: claimServiceModule.ClaimService,
      ...cryptoModule,
    };
  };

  beforeEach(() => {
    process.env.PHI_ENCRYPTION_KEY =
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  });

  afterAll(() => {
    process.env.PHI_ENCRYPTION_KEY = originalKey;
  });

  it("encrypts persisted claim snapshot fields on create and returns decrypted values", async () => {
    const { queryMock, ClaimService } = loadModules();

    // Call [0]: encounter ownership check
    // Call [1]: INSERT ... RETURNING (no getClaimColumns query — replaced by static CLAIM_WRITABLE_COLUMNS Set)
    queryMock
      .mockResolvedValueOnce({
        rows: [{ id: "enc-1", patient_id: "pat-1" }],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: "claim-1",
            encounter_id: "enc-1",
            patient_id: "pat-1",
            clinician_id: "clin-1",
            organization_id: "org-1",
            billing_provider: { name: "Billing Org", npi: "1234567890" },
            subscriber: { full_name: "Jane Doe", member_id: "MEM-1" },
          },
        ],
      });

    const claim = await ClaimService.create(
      {
        encounter_id: "enc-1",
        billing_provider: { name: "Billing Org", npi: "1234567890" },
        subscriber: { full_name: "Jane Doe", member_id: "MEM-1" },
      },
      "org-1",
      "clin-1",
    );

    const insertParams = queryMock.mock.calls[1][1];
    expect(insertParams[4]).toEqual(
      expect.objectContaining({
        __revclear_encrypted: true,
        ciphertext: expect.any(String),
      }),
    );
    expect(insertParams[5]).toEqual(
      expect.objectContaining({
        __revclear_encrypted: true,
        ciphertext: expect.any(String),
      }),
    );
    expect(claim.billing_provider).toEqual({ name: "Billing Org", npi: "1234567890" });
    expect(claim.subscriber).toEqual({ full_name: "Jane Doe", member_id: "MEM-1" });
  });

  it("encrypts persisted claim snapshot fields on update and keeps operational fields plaintext", async () => {
    const { queryMock, ClaimService } = loadModules();

    // Call [0]: ownership check (SELECT id FROM claims WHERE id=$1 AND organization_id=$2)
    // Call [1]: UPDATE ... RETURNING (no getClaimColumns query — replaced by static CLAIM_WRITABLE_COLUMNS Set)
    queryMock
      .mockResolvedValueOnce({ rows: [{ id: "claim-1" }] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: "claim-1",
            billing_provider: { name: "Updated Provider", npi: "9999999999" },
            status: "ready",
          },
        ],
      });

    const claim = await ClaimService.update(
      "claim-1",
      {
        billing_provider: { name: "Updated Provider", npi: "9999999999" },
        status: "ready",
      },
      "org-1",
      "clin-1",
    );

    const updateParams = queryMock.mock.calls[1][1];
    expect(updateParams[0]).toEqual(
      expect.objectContaining({
        __revclear_encrypted: true,
        ciphertext: expect.any(String),
      }),
    );
    expect(updateParams[1]).toBe("ready");
    expect(claim.billing_provider).toEqual({
      name: "Updated Provider",
      npi: "9999999999",
    });
    expect(claim.status).toBe("ready");
  });

  it("decrypts encrypted persisted claims and preserves legacy plaintext rows", async () => {
    const { queryMock, ClaimService, encryptPHIJson } = loadModules();

    queryMock.mockResolvedValueOnce({
      rows: [
        {
          id: "claim-1",
          encounter_id: "enc-1",
          organization_id: "org-1",
          clinician_id: "clin-1",
          billing_provider: encryptPHIJson({
            name: "Encrypted Provider",
            npi: "1234567890",
          }),
          subscriber: encryptPHIJson({
            full_name: "Encrypted Subscriber",
            member_id: "MEM-2",
          }),
        },
      ],
    });

    const encryptedClaim = await ClaimService.findById("claim-1", "org-1", "clin-1");
    expect(encryptedClaim?.billing_provider).toEqual({
      name: "Encrypted Provider",
      npi: "1234567890",
    });
    expect(encryptedClaim?.subscriber).toEqual({
      full_name: "Encrypted Subscriber",
      member_id: "MEM-2",
    });

    queryMock.mockResolvedValueOnce({
      rows: [
        {
          id: "claim-legacy",
          encounter_id: "enc-2",
          organization_id: "org-1",
          clinician_id: "clin-1",
          billing_provider: { name: "Legacy Provider", npi: "1111111111" },
          subscriber: { full_name: "Legacy Subscriber", member_id: "MEM-3" },
        },
      ],
    });

    const legacyClaim = await ClaimService.findById("claim-legacy", "org-1", "clin-1");
    expect(legacyClaim?.billing_provider).toEqual({
      name: "Legacy Provider",
      npi: "1111111111",
    });
    expect(legacyClaim?.subscriber).toEqual({
      full_name: "Legacy Subscriber",
      member_id: "MEM-3",
    });
  });

  it("keeps claim preview payloads in plaintext object form", async () => {
    const { queryMock, ClaimService } = loadModules();

    queryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: "enc-1",
            patient_id: "pat-1",
            clinician_id: "clin-1",
            date_of_service: "2026-03-16T00:00:00.000Z",
            place_of_service: "11",
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: "pat-1",
            full_name: "Patient Name",
            insurance_provider: "Health Plan",
            insurance_relationship: "self",
            insurance_payer_id: "PAYER001",
            subscriber_id: null,
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            code_type: "ICD",
            code: "R51",
            description: "Headache",
          },
          {
            code_type: "CPT",
            code: "99213",
            description: "Office visit",
          },
        ],
      });

    const preview = await ClaimService.getPreview(
      "enc-1",
      {
        id: "org-1",
        name: "Clinic Name",
        npi: "2222222222",
        billing_name: "Clinic Billing",
        billing_npi: "3333333333",
        billing_tax_id: "12-3456789",
        billing_phone: "555-111-2222",
        billing_address_line1: "1 Billing Way",
        billing_city: "Erie",
        billing_state: "PA",
        billing_postal_code: "16501",
        address_line1: "2 Main St",
        city: "Erie",
        state: "PA",
        postal_code: "16502",
      },
      {
        id: "clin-1",
        full_name: "Dr. Smith",
        npi: "4444444444",
        taxonomy_code: "207Q00000X",
      },
    );

    expect(preview.billing_provider).toEqual(
      expect.objectContaining({
        name: "Clinic Billing",
        npi: "3333333333",
      }),
    );
    expect(preview.service_facility).toEqual(
      expect.objectContaining({
        name: "Clinic Name",
        npi: "2222222222",
      }),
    );
    expect(preview.rendering_provider).toEqual(
      expect.objectContaining({
        name: "Dr. Smith",
        npi: "4444444444",
      }),
    );
    // subscriber is now always an object (with member_id/group_number from patient)
    expect(preview.subscriber).toBeDefined();
  });
});
