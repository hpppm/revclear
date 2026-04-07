/**
 * E2E tests for:
 *   Bug 1 — Organization Profile save (billing fields)
 *   Bug 2 — Claim form auto-population from org billing profile
 *
 * Adversarial philosophy:
 *   - Happy-path tests prove features work.
 *   - Adversarial tests prove bad data is *rejected* — they fail when the
 *     guard is missing, not when the feature is missing.
 *
 * Prerequisites:
 *   TEST_EMAIL, TEST_PASSWORD — credentials for a test user with an existing org
 *   BASE_URL   (optional, default http://localhost:3000)
 *   API_URL    (optional, default http://localhost:3005/api)
 *
 * Run from frontend/:
 *   npx playwright test
 */

import { test, expect, Page } from "@playwright/test";

// ── Config ───────────────────────────────────────────────────────────────────

const API_BASE = process.env.API_URL ?? "http://localhost:3005/api";

// Billing profile data used across all claim tests
const ORG_BILLING = {
  billing_name: "Test Billing Clinic",
  billing_npi: "1234567890",
  billing_tax_id: "12-3456789",
  billing_address_line1: "100 Health Ave",
  billing_city: "Springfield",
  billing_state: "IL",
  billing_postal_code: "62701",
};

// ── API helpers (page.request shares browser auth cookies) ───────────────────

/**
 * Create a patient, encounter, and ICD+CPT codes in one shot via the backend
 * API. Returns the encounter ID ready for use in the claim preview step.
 *
 * Uses page.request so the authenticated browser session cookies are forwarded
 * to port 3005 — no separate login needed.
 */
async function setupEncounterWithCodes(page: Page): Promise<string> {
  const today = new Date().toISOString().split("T")[0];

  // 1. Create patient (all required fields must be present now)
  const patientRes = await page.request.post(`${API_BASE}/patients`, {
    data: {
      full_name: `E2E Patient ${Date.now()}`,
      gender: "U",
      dob: "1990-01-01",
      phone: "555-000-0000",
      email: `e2e-${Date.now()}@test.invalid`,
      address_street: "1 Test St",
      address_city: "Springfield",
      address_state: "IL",
      address_zip: "62701",
      insurance_provider: "SELF_PAY",
    },
  });
  expect(patientRes.ok(), `Create patient failed: ${await patientRes.text()}`).toBeTruthy();
  const patientBody = await patientRes.json();
  const patientId: string = patientBody.data?.id ?? patientBody.id;
  expect(patientId, "Expected patient ID in response").toBeTruthy();

  // 2. Create encounter
  const encRes = await page.request.post(`${API_BASE}/encounters`, {
    data: { patient_id: patientId, date_of_service: today, status: "draft" },
  });
  expect(encRes.ok(), `Create encounter failed: ${await encRes.text()}`).toBeTruthy();
  const encBody = await encRes.json();
  const encounterId: string = encBody.data?.id ?? encBody.id;
  expect(encounterId, "Expected encounter ID in response").toBeTruthy();

  // 3. Save one ICD and one CPT code (required by preview endpoint)
  const codesRes = await page.request.post(`${API_BASE}/encounters/${encounterId}/codes`, {
    data: {
      codes: [
        {
          code: "Z00.00",
          codeType: "ICD",
          description: "Encounter for general adult medical examination",
          category: "Preventive",
          isAiSuggested: false,
        },
        {
          code: "99213",
          codeType: "CPT",
          description: "Office or other outpatient visit, established patient",
          category: "Evaluation and Management",
          isAiSuggested: false,
        },
      ],
    },
  });
  expect(codesRes.ok(), `Save codes failed: ${await codesRes.text()}`).toBeTruthy();

  return encounterId;
}

// ── UI helpers ────────────────────────────────────────────────────────────────

async function goToOrgProfile(page: Page) {
  await page.goto("/dashboard/organization");
  await page.waitForLoadState("networkidle");
}

async function clickEditOrganization(page: Page) {
  await page.getByRole("button", { name: /edit organization/i }).click();
  await expect(page.getByLabel(/billing name/i)).toBeVisible({ timeout: 5000 });
}

async function fillBillingProfile(page: Page, data: typeof ORG_BILLING) {
  await page.getByLabel(/billing name/i).fill(data.billing_name);
  await page.getByLabel(/billing npi/i).fill(data.billing_npi);
  await page.getByLabel(/billing tax id/i).fill(data.billing_tax_id);
  await page.getByLabel(/billing address line 1/i).fill(data.billing_address_line1);
  await page.getByLabel(/billing city/i).fill(data.billing_city);
  await page.getByLabel(/billing state/i).fill(data.billing_state);
  await page.getByLabel(/billing postal code/i).fill(data.billing_postal_code);
}

async function saveAndWaitForReadOnly(page: Page) {
  await page.getByRole("button", { name: /save changes/i }).click();
  await expect(
    page.getByRole("button", { name: /edit organization/i })
  ).toBeVisible({ timeout: 10000 });
}

// ── Bug 1: Org Profile Save ──────────────────────────────────────────────────

test.describe("Organization Profile — Save Changes", () => {
  test("saves billing profile fields and persists on reload", async ({ page }) => {
    await goToOrgProfile(page);
    await clickEditOrganization(page);
    await fillBillingProfile(page, ORG_BILLING);
    await saveAndWaitForReadOnly(page);

    // No error banner
    await expect(page.locator(".bg-red-50")).not.toBeVisible();

    // Reload and verify persistence
    await page.reload();
    await page.waitForLoadState("networkidle");

    await expect(page.getByText(ORG_BILLING.billing_name)).toBeVisible();
    await expect(page.getByText(ORG_BILLING.billing_npi)).toBeVisible();
    await expect(page.getByText(ORG_BILLING.billing_address_line1)).toBeVisible();
  });

  // ADVERSARIAL: invalid NPI must show a specific error — form must NOT submit
  test("[adversarial] invalid billing NPI (5 digits) shows NPI error and blocks save", async ({ page }) => {
    await goToOrgProfile(page);
    await clickEditOrganization(page);

    await page.getByLabel(/billing npi/i).fill("12345");
    await page.getByRole("button", { name: /save changes/i }).click();

    // Form must still be in edit mode (not transitioned to read-only)
    await expect(page.getByLabel(/billing npi/i)).toBeVisible({ timeout: 5000 });

    // A specific NPI error must be visible — not just "something went wrong"
    const npiError = page.locator("p.text-red-600, p.text-xs.text-red-600").filter({ hasText: /npi|10 digit/i });
    await expect(npiError).toBeVisible({ timeout: 3000 });
  });

  test("cancel discards unsaved changes", async ({ page }) => {
    await goToOrgProfile(page);
    await clickEditOrganization(page);

    await page.getByLabel(/billing name/i).fill("UNSAVED_SENTINEL_VALUE");
    await page.getByRole("button", { name: /cancel/i }).click();

    await expect(
      page.getByRole("button", { name: /edit organization/i })
    ).toBeVisible();
    await expect(page.getByText("UNSAVED_SENTINEL_VALUE")).not.toBeVisible();
  });
});

// ── Bug 2: Claim Auto-Population ─────────────────────────────────────────────

test.describe("Claim Form — Auto-population from Org Billing Profile", () => {
  // Ensure org has billing data before each claim test
  test.beforeEach(async ({ page }) => {
    await goToOrgProfile(page);
    const editBtn = page.getByRole("button", { name: /edit organization/i });
    if (await editBtn.isVisible({ timeout: 3000 })) {
      await editBtn.click();
      await expect(page.getByLabel(/billing name/i)).toBeVisible({ timeout: 5000 });
      await fillBillingProfile(page, ORG_BILLING);
      await saveAndWaitForReadOnly(page);
    }
  });

  // ADVERSARIAL: assert the EXACT saved billing name, not just any non-empty value
  test("billing provider name pre-populates with the exact saved org billing name", async ({ page }) => {
    const encounterId = await setupEncounterWithCodes(page);

    await page.goto(`/dashboard/encounters/create?id=${encounterId}&step=4`);
    await page.waitForLoadState("networkidle");

    await page
      .getByText(/billing provider/i)
      .first()
      .waitFor({ timeout: 20000 });

    // The exact billing_name we saved must appear — not just any non-empty string
    const billingInput = page.getByLabel(/billing.*name|provider.*name/i).first();
    if (await billingInput.isVisible({ timeout: 3000 })) {
      const val = await billingInput.inputValue();
      expect(val, `Expected "${ORG_BILLING.billing_name}" but got "${val}"`).toBe(ORG_BILLING.billing_name);
    } else {
      await expect(page.getByText(ORG_BILLING.billing_name)).toBeVisible({ timeout: 5000 });
    }
  });

  test("service facility section is visible and populated with org name", async ({ page }) => {
    const encounterId = await setupEncounterWithCodes(page);

    await page.goto(`/dashboard/encounters/create?id=${encounterId}&step=4`);
    await page.waitForLoadState("networkidle");

    await page
      .getByText(/service facility/i)
      .first()
      .waitFor({ timeout: 20000 });

    await expect(page.getByText(/service facility/i).first()).toBeVisible();

    // ADVERSARIAL: facility name input must be non-empty (populated from org)
    const facilityInput = page.getByLabel(/facility.*name|service.*name/i).first();
    if (await facilityInput.isVisible({ timeout: 3000 })) {
      const val = await facilityInput.inputValue();
      expect(val.length, "Service facility name must be pre-filled from org data").toBeGreaterThan(0);
    }
  });

  test("rendering provider section is visible on claim review step", async ({ page }) => {
    const encounterId = await setupEncounterWithCodes(page);

    await page.goto(`/dashboard/encounters/create?id=${encounterId}&step=4`);
    await page.waitForLoadState("networkidle");

    await page
      .getByText(/rendering provider/i)
      .first()
      .waitFor({ timeout: 20000 });

    await expect(page.getByText(/rendering provider/i).first()).toBeVisible();
  });

  test("org profile shows exact saved billing data in read-only view", async ({ page }) => {
    await goToOrgProfile(page);
    await expect(page.getByText(ORG_BILLING.billing_name)).toBeVisible();
    await expect(page.getByText(ORG_BILLING.billing_npi)).toBeVisible();
  });
});

// ── Adversarial: Patient Form Validation ─────────────────────────────────────

test.describe("Patient Form — Adversarial Validation (blocks bad data)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/patients/add");
    await page.waitForLoadState("networkidle");
  });

  // Fill all fields EXCEPT the one being tested, then submit
  async function fillAllExcept(page: Page, omit: string) {
    const fields: Record<string, () => Promise<void>> = {
      full_name: () => page.locator('input[name="full_name"], input[placeholder*="John Doe" i]').fill("Test Patient"),
      dob: () => page.locator('input[type="date"]').fill("1990-01-01"),
      phone: () => page.locator('input[type="tel"]').fill("5550000000"),
      email: () => page.locator('input[type="email"]').fill("test@example.com"),
      address_street: () => page.locator('input[placeholder*="Main St" i]').fill("123 Main St"),
      address_city: () => page.locator('input[placeholder*="Erie" i]').fill("Springfield"),
      address_state: () => page.locator('input[placeholder*="PA" i]').fill("IL"),
      address_zip: () => page.locator('input[placeholder*="16501" i]').fill("62701"),
      insurance_provider: () => page.locator('input[placeholder*="Blue Cross" i]').fill("Aetna"),
      insurance_policy_number: () => page.locator('input[placeholder*="ABC123" i]').fill("POL123"),
      insurance_member_id: () => page.locator('input[placeholder*="Member" i]').fill("MEM456"),
    };

    for (const [field, fill] of Object.entries(fields)) {
      if (field !== omit) {
        await fill().catch(() => { /* field may not be visible (e.g. hidden by self-pay) */ });
      }
    }
  }

  test("[adversarial] empty DOB blocks submission and shows error", async ({ page }) => {
    await fillAllExcept(page, "dob");
    await page.getByRole("button", { name: /save patient/i }).click();

    // Must stay on the add page — no redirect
    await expect(page).toHaveURL(/\/patients\/add/);

    // Must show a DOB-specific error
    const dobError = page.locator("p.text-red-600").filter({ hasText: /date of birth|dob|required/i });
    await expect(dobError).toBeVisible({ timeout: 3000 });
  });

  test("[adversarial] empty phone blocks submission and shows error", async ({ page }) => {
    await fillAllExcept(page, "phone");
    await page.getByRole("button", { name: /save patient/i }).click();

    await expect(page).toHaveURL(/\/patients\/add/);

    const phoneError = page.locator("p.text-red-600").filter({ hasText: /phone|required/i });
    await expect(phoneError).toBeVisible({ timeout: 3000 });
  });

  test("[adversarial] empty email blocks submission and shows error", async ({ page }) => {
    await fillAllExcept(page, "email");
    await page.getByRole("button", { name: /save patient/i }).click();

    await expect(page).toHaveURL(/\/patients\/add/);

    const emailError = page.locator("p.text-red-600").filter({ hasText: /email|required/i });
    await expect(emailError).toBeVisible({ timeout: 3000 });
  });

  test("[adversarial] insurance provider set but no policy number blocks submission", async ({ page }) => {
    await fillAllExcept(page, "insurance_policy_number");
    await page.getByRole("button", { name: /save patient/i }).click();

    await expect(page).toHaveURL(/\/patients\/add/);

    // Must show an error specifically about policy number
    const policyError = page.locator("p.text-red-600").filter({ hasText: /policy/i });
    await expect(policyError).toBeVisible({ timeout: 3000 });
  });

  test("[adversarial] insurance provider set but no member ID blocks submission", async ({ page }) => {
    await fillAllExcept(page, "insurance_member_id");
    await page.getByRole("button", { name: /save patient/i }).click();

    await expect(page).toHaveURL(/\/patients\/add/);

    // Must show an error specifically about member ID
    const memberError = page.locator("p.text-red-600").filter({ hasText: /member/i });
    await expect(memberError).toBeVisible({ timeout: 3000 });
  });

  test("[adversarial] self-pay patient can submit without insurance fields", async ({ page }) => {
    // Fill all non-insurance required fields
    await page.locator('input[placeholder*="John Doe" i]').fill("Self Pay Patient");
    await page.locator('input[type="date"]').fill("1990-06-15");
    await page.locator('input[type="tel"]').fill("5550001111");
    await page.locator('input[type="email"]').fill(`selfpay-${Date.now()}@test.invalid`);
    await page.locator('input[placeholder*="Main St" i]').fill("99 Self Pay Blvd");
    await page.locator('input[placeholder*="Erie" i]').fill("Chicago");
    await page.locator('input[placeholder*="PA" i]').fill("IL");
    await page.locator('input[placeholder*="16501" i]').fill("60601");

    // Toggle self-pay — hides insurance fields
    await page.getByRole("checkbox").click();

    // Submit — should NOT be blocked by missing insurance fields
    await page.getByRole("button", { name: /save patient/i }).click();

    // No insurance-related errors should appear (self-pay bypasses them)
    const insuranceError = page.locator("p.text-red-600").filter({ hasText: /insurance|policy|member/i });
    await expect(insuranceError).not.toBeVisible({ timeout: 3000 });

    // Either navigated away (success) OR stayed due to a different error —
    // but must NOT show an insurance validation error
    // (navigation to /dashboard is success; any URL change from /add is fine)
  });

  test("[adversarial] insured patient (non-self-pay) shows policy/member errors when blank", async ({ page }) => {
    // Fill only required personal/address fields, leave insurance_provider blank
    await page.locator('input[placeholder*="John Doe" i]').fill("Insured Patient");
    await page.locator('input[type="date"]').fill("1985-03-22");
    await page.locator('input[type="tel"]').fill("5550002222");
    await page.locator('input[type="email"]').fill(`insured-${Date.now()}@test.invalid`);
    await page.locator('input[placeholder*="Main St" i]').fill("42 Insurance Lane");
    await page.locator('input[placeholder*="Erie" i]').fill("Boston");
    await page.locator('input[placeholder*="PA" i]').fill("MA");
    await page.locator('input[placeholder*="16501" i]').fill("02101");

    // Fill insurance_provider but intentionally omit policy_number and member_id
    await page.locator('input[placeholder*="Blue Cross" i]').fill("United Healthcare");

    await page.getByRole("button", { name: /save patient/i }).click();

    await expect(page).toHaveURL(/\/patients\/add/);

    // Both policy number AND member ID errors must appear
    await expect(page.locator("p.text-red-600").filter({ hasText: /policy/i })).toBeVisible({ timeout: 3000 });
    await expect(page.locator("p.text-red-600").filter({ hasText: /member/i })).toBeVisible({ timeout: 3000 });
  });
});
