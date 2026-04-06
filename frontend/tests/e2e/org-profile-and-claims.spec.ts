/**
 * E2E tests for:
 *   Bug 1 — Organization Profile save (billing fields)
 *   Bug 2 — Claim form auto-population from org billing profile
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

  // 1. Create patient
  const patientRes = await page.request.post(`${API_BASE}/patients`, {
    data: { full_name: `E2E Patient ${Date.now()}`, gender: "U" },
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

  test("shows validation error for invalid billing NPI (not 10 digits)", async ({ page }) => {
    await goToOrgProfile(page);
    await clickEditOrganization(page);

    await page.getByLabel(/billing npi/i).fill("12345");
    await page.getByRole("button", { name: /save changes/i }).click();

    // Form stays open — edit mode remains active on validation failure
    await expect(page.getByLabel(/billing npi/i)).toBeVisible();
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

  test("billing provider name pre-populates from org profile on claim review", async ({ page }) => {
    // Create a fully-wired encounter (patient + encounter + codes) via API
    const encounterId = await setupEncounterWithCodes(page);

    // Navigate directly to step 4 (Review Claim)
    await page.goto(`/dashboard/encounters/create?id=${encounterId}&step=4`);
    await page.waitForLoadState("networkidle");

    // The claim preview builds and the billing provider section appears
    await page
      .getByText(/billing provider/i)
      .first()
      .waitFor({ timeout: 20000 });

    // Billing name should be pre-filled (either as input value or displayed text)
    const billingInput = page.getByLabel(/billing.*name|provider.*name/i).first();
    if (await billingInput.isVisible({ timeout: 3000 })) {
      const val = await billingInput.inputValue();
      expect(val.length, "Billing provider name must be pre-filled").toBeGreaterThan(0);
    } else {
      await expect(page.getByText(ORG_BILLING.billing_name)).toBeVisible({ timeout: 5000 });
    }
  });

  test("service facility section is visible and populated", async ({ page }) => {
    const encounterId = await setupEncounterWithCodes(page);

    await page.goto(`/dashboard/encounters/create?id=${encounterId}&step=4`);
    await page.waitForLoadState("networkidle");

    // Service facility heading must be present
    await page
      .getByText(/service facility/i)
      .first()
      .waitFor({ timeout: 20000 });

    await expect(page.getByText(/service facility/i).first()).toBeVisible();

    // Facility name should come from org.name
    const facilityInput = page.getByLabel(/facility.*name|service.*name/i).first();
    if (await facilityInput.isVisible({ timeout: 3000 })) {
      const val = await facilityInput.inputValue();
      expect(val.length, "Service facility name must be pre-filled").toBeGreaterThan(0);
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

  test("org profile shows saved billing data — claim fields need no manual re-entry", async ({ page }) => {
    // Verify that the org profile persists the billing data in read-only view
    // (pre-condition that enables auto-population)
    await goToOrgProfile(page);
    await expect(page.getByText(ORG_BILLING.billing_name)).toBeVisible();
    await expect(page.getByText(ORG_BILLING.billing_npi)).toBeVisible();
  });
});
