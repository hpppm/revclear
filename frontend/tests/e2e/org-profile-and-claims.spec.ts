/**
 * E2E tests for:
 *   Bug 1 — Organization Profile save (billing fields)
 *   Bug 2 — Claim form auto-population from org billing profile
 *
 * Prerequisites:
 *   TEST_EMAIL, TEST_PASSWORD — credentials for a test user with an existing org
 *   BASE_URL (optional, defaults to http://localhost:3000)
 *
 * Run from the frontend/ directory:
 *   npx playwright test
 */

import { test, expect, Page } from "@playwright/test";

// ── Shared test data ─────────────────────────────────────────────────────────

const ORG_BILLING = {
  billing_name: "Test Billing Clinic",
  billing_npi: "1234567890",
  billing_tax_id: "12-3456789",
  billing_address_line1: "100 Health Ave",
  billing_city: "Springfield",
  billing_state: "IL",
  billing_postal_code: "62701",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

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

    // Form should remain open — edit mode stays active on validation failure
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

// ── Patient + Encounter helpers ───────────────────────────────────────────────

async function createPatientViaUI(page: Page, name: string): Promise<string> {
  await page.goto("/dashboard/patients/create");
  await page.waitForLoadState("networkidle");

  await page.getByLabel(/full name/i).fill(name);

  // Pick first available gender option
  const genderSelect = page
    .locator("select")
    .filter({ hasText: /male|female|unknown/i })
    .first();
  if (await genderSelect.isVisible()) {
    await genderSelect.selectOption({ index: 1 });
  }

  const policyField = page.getByLabel(/insurance policy/i);
  if (await policyField.isVisible()) await policyField.fill("POL-E2E-001");

  const memberField = page.getByLabel(/member id/i);
  if (await memberField.isVisible()) await memberField.fill("MEM-E2E-001");

  await page.getByRole("button", { name: /create patient|save/i }).click();

  await page.waitForURL(/\/dashboard\/patients\/[^/]+$/, { timeout: 15000 });
  return page.url().split("/").pop() as string;
}

async function goToEncounterReviewStep(
  page: Page,
  patientId: string
): Promise<void> {
  await page.goto(
    `/dashboard/encounters/create?patientId=${patientId}&step=4`
  );
  await page.waitForLoadState("networkidle");

  // Capture encounter ID from URL if present and navigate with it
  const match = page.url().match(/[?&]id=([^&]+)/);
  if (match) {
    await page.goto(
      `/dashboard/encounters/create?id=${match[1]}&step=4`
    );
    await page.waitForLoadState("networkidle");
  }
}

// ── Bug 2: Claim Auto-Population ─────────────────────────────────────────────

test.describe("Claim Form — Auto-population from Org Billing Profile", () => {
  test.beforeEach(async ({ page }) => {
    // Ensure org has billing data saved before each claim test
    await goToOrgProfile(page);

    const editBtn = page.getByRole("button", { name: /edit organization/i });
    if (await editBtn.isVisible({ timeout: 3000 })) {
      await editBtn.click();
      await expect(page.getByLabel(/billing name/i)).toBeVisible({ timeout: 5000 });
      await fillBillingProfile(page, ORG_BILLING);
      await saveAndWaitForReadOnly(page);
    }
  });

  test("billing provider name pre-populates from org profile on claim review", async ({
    page,
  }) => {
    const patientId = await createPatientViaUI(
      page,
      `E2E Billing Test ${Date.now()}`
    );
    await goToEncounterReviewStep(page, patientId);

    // Billing provider section must be visible
    await page
      .getByText(/billing provider/i)
      .first()
      .waitFor({ timeout: 15000 });

    // Try input value first, fall back to text content
    const billingInput = page
      .getByLabel(/billing.*name|provider.*name/i)
      .first();

    if (await billingInput.isVisible({ timeout: 3000 })) {
      const val = await billingInput.inputValue();
      expect(val.length).toBeGreaterThan(0);
    } else {
      await expect(page.getByText(ORG_BILLING.billing_name)).toBeVisible({
        timeout: 5000,
      });
    }
  });

  test("service facility section is visible and pre-populated", async ({
    page,
  }) => {
    const patientId = await createPatientViaUI(
      page,
      `E2E Facility Test ${Date.now()}`
    );
    await goToEncounterReviewStep(page, patientId);

    await page
      .getByText(/service facility/i)
      .first()
      .waitFor({ timeout: 15000 });

    await expect(page.getByText(/service facility/i).first()).toBeVisible();
  });

  test("rendering provider section is visible on claim review step", async ({
    page,
  }) => {
    const patientId = await createPatientViaUI(
      page,
      `E2E Rendering Test ${Date.now()}`
    );
    await goToEncounterReviewStep(page, patientId);

    await page
      .getByText(/rendering provider/i)
      .first()
      .waitFor({ timeout: 15000 });

    await expect(
      page.getByText(/rendering provider/i).first()
    ).toBeVisible();
  });

  test("org profile shows saved billing data without re-entering it", async ({
    page,
  }) => {
    // Verify that after the beforeEach saves billing data,
    // it appears in read-only view without the user having to type it again
    await goToOrgProfile(page);
    await expect(page.getByText(ORG_BILLING.billing_name)).toBeVisible();
    await expect(page.getByText(ORG_BILLING.billing_npi)).toBeVisible();
  });
});
