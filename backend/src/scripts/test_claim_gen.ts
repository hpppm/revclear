import "../setupEnv";
import { query, closePool } from "../config/db";
import { encryptPHIJson } from "../utils/crypto";

const testClaimGen = async () => {
    try {
        // 1. Create a dummy patient and encounter if needed, or just use random UUIDs if constraints allow.
        // Actually, constraints (foreign keys) will fail if IDs don't exist.
        // Let's try to fetch an existing encounter to use.

        console.log("Fetching an existing encounter...");
        const encRes = await query("SELECT * FROM encounters LIMIT 1");
        if (encRes.rows.length === 0) {
            console.log("No encounters found to test with.");
            return;
        }
        const encounter = encRes.rows[0];
        console.log("Using encounter:", encounter.id);

        const data = {
            encounter_id: encounter.id,
            clinician_id: encounter.clinician_id, // Assuming this exists
            patient_id: encounter.patient_id,
            diagnosis_codes: ["R51"],
            procedure_codes: ["99213"],
            total_amount: 150.00,
            insurance_provider: "Test Ins",
            status: "draft",
            payer_id: "PAYER001",
            payer_name: "Test Payer",
            claim_type: "professional",
            submission_type: "initial",
            patient_responsibility: 0,
            line_items: [],
            billing_provider: { name: "Test Provider" },
            service_facility: { name: "Test Facility" }
        };

        console.log("Attempting to insert claim...");
        const result = await query(
            `INSERT INTO claims (encounter_id, clinician_id, patient_id, diagnosis_codes, procedure_codes, total_amount, insurance_provider, status, payer_id, payer_name, claim_type, submission_type, patient_responsibility, line_items, billing_provider, service_facility)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
     RETURNING *`,
            [
                data.encounter_id,
                data.clinician_id,
                data.patient_id,
                data.diagnosis_codes,
                data.procedure_codes,
                data.total_amount,
                data.insurance_provider,
                data.status,
                data.payer_id,
                data.payer_name,
                data.claim_type,
                data.submission_type,
                data.patient_responsibility,
                JSON.stringify(data.line_items),
                encryptPHIJson(data.billing_provider),
                encryptPHIJson(data.service_facility),
            ]
        );
        console.log("Claim created successfully:", result.rows[0].id);

    } catch (err) {
        console.error("Claim generation failed:", err);
    } finally {
        await closePool();
    }
};

testClaimGen();
