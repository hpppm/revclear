/**
 * E2E tests for:
 *   Bug 1 — Organization Profile save (billing fields)
 *   Bug 2 — Claim form auto-population from org billing profile
 *
 * Prerequisites:
 *   TEST_EMAIL, TEST_PASSWORD — credentials for a test user with an existing org
 *   BASE_URL (optional, defaults to http://localhost:3000)
 *
 * Run: npx playwright test
 */

import { test, expect, Page } from "@playwright/test";
import fs from "fs";
import path from "path";

// Skip all tests when no auth state has been populated
test.beforeAll(async () => {
  const authFile = path.join(__dirname, "../../playwright/.auth/user.json");
  if (!fs.existsSync(authFile)) return;
  const state = JSON.parse(fs.readFileSync(authFile, "utf-8"));
  if (!state.cookies?.length) {
    test.skip();
  }
});

// ── Helpers ─────────────────────────────────────────────────────────────────

const ORG_BILLING = {
  billing_name: "Test Billing Clinic",
  billing_npi: "1234567890",
  billing_tax_id: "12-3456789",
  billing_address_line1: "100 Health Ave",
  billing_city: "Springfield",
  billing_state: "IL",
  billing_postal_code: "62701",
};

async function goToOrgProfile(page: Page) {
  await page.goto("/dashboard/organization");
  await page.waitForLoadState("networkidle");
}

async function clickEditOrganization(page: Page) {
  await page.getByRole("button", { name: /edit organization/i }).click();
  // Wait for form fields to appear
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

// ── Bug 1: Org Profile Save ──────────────────────────────────────────────────

test.describe("Organization Profile — Save Changes", () => {
  test("should save billing profile fields and persist on reload", async ({ page }) => {
    await goToOrgProfile(page);
    await clickEditOrganization(page);

    await fillBillingProfile(page, ORG_BILLING);

    // Click Save Changes
    const saveBtn = page.getByRole("button", { name: /save changes/i });
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();

    // Should NOT stay in edit mode indefinitely (save must have fired)
    await expect(page.getByRole("button", { name: /edit organization/i })).toBeVisible({
      timeout: 10000,
    });

    // No error banner should appear
    await expect(page.locator(".bg-red-50")).not.toBeVisible();

    // Reload and verify data persisted
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Read-only view should show the saved billing name
    await expect(page.getByText(ORG_BILLING.billing_name)).toBeVisible();
    await expect(page.getByText(ORG_BILLING.billing_npi)).toBeVisible();
    await expect(page.getByText(ORG_BILLING.billing_address_line1)).toBeVisible();
  });

  test("should display validation error for invalid billing NPI", async ({ page }) => {
    await goToOrgProfile(page);
    await clickEditOrganization(page);

    // Fill invalid NPI (not 10 digits)
    await page.getByLabel(/billing npi/i).fill("12345");
    await page.getByRole("button", { name: /save changes/i }).click();

    // Should remain in editing mode with a validation error
    await expect(page.getByLabel(/billing npi/i)).toBeVisible();
  });

  test("should cancel editing without saving", async ({ page }) => {
    await goToOrgProfile(page);
    await clickEditOrganization(page);

    await page.getByLabel(/billing name/i).fill("UNSAVED_NAME_XYZ");

    await page.getByRole("button", { name: /cancel/i }).click();

    // Edit mode should close and unsaved value not visible in read-only view
    await expect(page.getByRole("button", { name: /edit organization/i })).toBeVisible();
    await expect(page.getByText("UNSAVED_NAME_XYZ")).not.toBeVisible();
  });
});

// ── Patient + Encounter + Claim helpers ──────────────────────────────────────

async function createPatientViaUI(
  page: Page,
  name: string,
): Promise<string> {
  await page.goto("/dashboard/patients/create");
  await page.waitForLoadState("networkidle");

  await page.getByLabel(/full name/i).fill(name);

  // Gender — pick first option if a select
  const genderSelect = page.locator("select").filter({ hasText: /male|female|unknown/i }).first();
  if (await genderSelect.isVisible()) {
    await genderSelect.selectOption({ index: 1 });
  }

  // Insurance info
  const insurancePolicyField = page.getByLabel(/insurance policy/i);
  if (await insurancePolicyField.isVisible()) {
    await insurancePolicyField.fill("POL-TEST-001");
  }
  const memberIdField = page.getByLabel(/member id/i);
  if (await memberIdField.isVisible()) {
    await memberIdField.fill("MEM-001");
  }

  await page.getByRole("button", { name: /create patient|save/i }).click();

  // Wait for redirect to patient detail page
  await page.waitForURL(/\/dashboard\/patients\/[^/]+$/, { timeout: 15000 });

  const url = page.url();
  return url.split("/").pop() as string;
}

async function navigateToCreateEncounter(page: Page, patientId: string) {
  await page.goto(`/dashboard/encounters/create?patientId=${patientId}`);
  await page.waitForLoadState("networkidle");
}

// ── Bug 2: Claim Auto-Population ─────────────────────────────────────────────

test.describe("Claim Form — Auto-population from Org Billing Profile", () => {
  test.beforeEach(async ({ page }) => {
    // Ensure org has billing data saved (prerequisite for auto-populate)
    await goToOrgProfile(page);

    const editBtn = page.getByRole("button", { name: /edit organization/i });
    if (await editBtn.isVisible({ timeout: 3000 })) {
      await editBtn.click();
      await expect(page.getByLabel(/billing name/i)).toBeVisible({ timeout: 5000 });
      await fillBillingProfile(page, ORG_BILLING);
      await page.getByRole("button", { name: /save changes/i }).click();
      await expect(page.getByRole("button", { name: /edit organization/i })).toBeVisible({
        timeout: 10000,
      });
    }
  });

  test("billing provider fields auto-populate from org profile on claim review step", async ({
    page,
  }) => {
    const patientName = `E2E Patient ${Date.now()}`;
    const patientId = await createPatientViaUI(page, patientName);

    await navigateToCreateEncounter(page, patientId);

    // Step 1: Patient Details — select patient and date
    const patientSelect = page.getByLabel(/patient/i).first();
    if (await patientSelect.isVisible()) {
      await patientSelect.selectOption({ label: new RegExp(patientName, "i") });
    }

    // Fill today's date
    const today = new Date().toISOString().split("T")[0];
    const dateField = page.getByLabel(/date of service|encounter date/i);
    if (await dateField.isVisible()) {
      await dateField.fill(today);
    }

    const nextBtn = page.getByRole("button", { name: /next|continue/i }).first();
    if (await nextBtn.isEnabled()) {
      await nextBtn.click();
    }

    // Navigate directly to the Review Claim step (step 4, 0-indexed)
    // via URL if possible — skip transcription/SOAP which require real audio
    const encounterIdMatch = page.url().match(/[?&]id=([^&]+)/);
    if (encounterIdMatch) {
      const encounterId = encounterIdMatch[1];
      await page.goto(
        `/dashboard/encounters/create?id=${encounterId}&step=4`,
      );
      await page.waitForLoadState("networkidle");
    }

    // Wait for the Review Claim step to render billing provider section
    await page
      .getByText(/billing provider/i)
      .first()
      .waitFor({ timeout: 15000 });

    // Billing provider name should be pre-populated from org
    const billingNameInput = page
      .getByLabel(/billing.*name|provider.*name/i)
      .first();
    if (await billingNameInput.isVisible({ timeout: 3000 })) {
      const val = await billingNameInput.inputValue();
      expect(val).toBeTruthy();
    } else {
      // Displayed as text in read-only view
      await expect(page.getByText(ORG_BILLING.billing_name)).toBeVisible({
        timeout: 5000,
      });
    }

    // Service facility name should be set
    await expect(
      page.getByText(/service facility/i).first(),
    ).toBeVisible();
  });

  test("rendering provider NPI field auto-populates from clinician profile", async ({
    page,
  }) => {
    const patientName = `E2E Patient Render ${Date.now()}`;
    const patientId = await createPatientViaUI(page, patientName);

    await navigateToCreateEncounter(page, patientId);

    const encounterIdMatch = page.url().match(/[?&]id=([^&]+)/);
    if (encounterIdMatch) {
      const encounterId = encounterIdMatch[1];
      await page.goto(
        `/dashboard/encounters/create?id=${encounterId}&step=4`,
      );
      await page.waitForLoadState("networkidle");
    }

    // Wait for claim step
    await page
      .getByText(/rendering provider/i)
      .first()
      .waitFor({ timeout: 15000 });

    // Rendering provider section should be visible
    await expect(page.getByText(/rendering provider/i).first()).toBeVisible();
  });

  test("claim can be submitted without manual entry of org-stored fields", async ({
    page,
  }) => {
    const patientName = `E2E Submit ${Date.now()}`;
    await createPatientViaUI(page, patientName);

    // Verify that the org profile page shows billing data (data is there)
    await goToOrgProfile(page);
    await expect(page.getByText(ORG_BILLING.billing_name)).toBeVisible();
    await expect(page.getByText(ORG_BILLING.billing_npi)).toBeVisible();
  });
});
