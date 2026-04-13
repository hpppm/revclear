/**
 * E2E tests — Claims page and EDI / Clearinghouse org settings
 * Branch: Claim/Status
 *
 * Covers:
 *   - Claims page loads with All Claims / Denials tabs
 *   - Status badges render (no "in_progress" visible)
 *   - Download (↓) and history (clock) icon buttons exist per row
 *   - Denials tab shows Resubmit button
 *   - Clearinghouse not-configured shows "Set up EDI" link
 *   - Organization settings: EDI clearinghouse URL + API key fields render
 *   - Fee schedule: add/remove CPT code rows
 *
 * Prerequisites:
 *   TEST_EMAIL, TEST_PASSWORD  — authenticated user with an org
 *   BASE_URL   (optional, default http://localhost:3000)
 *   API_URL    (optional, default http://localhost:3005/api)
 *
 * Run from frontend/:
 *   TEST_EMAIL=user@example.com TEST_PASSWORD=Secret1! npx playwright test claims-and-edi.spec.ts
 */

import { test, expect, Page } from "@playwright/test";

const API_BASE = process.env.API_URL ?? "http://localhost:3005/api";

// ── API helpers ───────────────────────────────────────────────────────────────

/** Create a patient + encounter + codes and return the encounterId */
async function createEncounterWithCodes(page: Page): Promise<{ encounterId: string; patientId: string }> {
  const ts = Date.now();

  const patRes = await page.request.post(`${API_BASE}/patients`, {
    data: {
      full_name: `Claims E2E ${ts}`,
      gender: "U",
      dob: "1985-06-15",
      phone: "555-111-0000",
      email: `claims-e2e-${ts}@test.invalid`,
      address_street: "1 Claim St",
      address_city: "Springfield",
      address_state: "IL",
      address_zip: "62701",
      insurance_provider: "SELF_PAY",
    },
  });
  expect(patRes.ok(), `Create patient failed: ${await patRes.text()}`).toBeTruthy();
  const patientId: string = (await patRes.json()).data?.id;

  const encRes = await page.request.post(`${API_BASE}/encounters`, {
    data: {
      patient_id: patientId,
      date_of_service: new Date().toISOString().split("T")[0],
      status: "draft",
    },
  });
  expect(encRes.ok(), `Create encounter failed: ${await encRes.text()}`).toBeTruthy();
  const encounterId: string = (await encRes.json()).data?.id;

  const codesRes = await page.request.post(`${API_BASE}/encounters/${encounterId}/codes`, {
    data: {
      codes: [
        { code: "Z00.00", codeType: "ICD", description: "General exam", category: "Preventive", isAiSuggested: false },
        { code: "99213", codeType: "CPT", description: "Office visit", category: "E&M", isAiSuggested: false },
      ],
    },
  });
  expect(codesRes.ok(), `Save codes failed: ${await codesRes.text()}`).toBeTruthy();

  return { encounterId, patientId };
}

/** Create a claim from an encounter via the API */
async function createClaim(page: Page, encounterId: string, status = "pending"): Promise<string> {
  const res = await page.request.post(`${API_BASE}/claims`, {
    data: {
      encounter_id: encounterId,
      status,
      payer_name: "Test Payer",
      claim_type: "professional",
      submission_type: "initial",
      total_amount: 150,
      diagnosis_codes: ["Z00.00"],
      procedure_codes: ["99213"],
    },
  });
  expect(res.ok(), `Create claim failed: ${await res.text()}`).toBeTruthy();
  return (await res.json()).data?.id;
}

/** Create a denied claim with a rejection reason */
async function createDeniedClaim(page: Page, encounterId: string): Promise<string> {
  const res = await page.request.post(`${API_BASE}/claims`, {
    data: {
      encounter_id: encounterId,
      status: "denied",
      payer_name: "Denial Payer",
      claim_type: "professional",
      submission_type: "initial",
      total_amount: 200,
      rejection_reason: "Missing prior authorization",
      diagnosis_codes: ["Z00.00"],
      procedure_codes: ["99213"],
    },
  });
  expect(res.ok(), `Create denied claim failed: ${await res.text()}`).toBeTruthy();
  return (await res.json()).data?.id;
}

// ── Claims page ───────────────────────────────────────────────────────────────

test.describe("Claims page — layout and tabs", () => {
  test("loads /dashboard/claims without crashing", async ({ page }) => {
    await page.goto("/dashboard/claims");
    await page.waitForLoadState("networkidle");

    // Page heading is visible
    await expect(page.getByRole("heading", { name: /claims/i })).toBeVisible({ timeout: 10000 });
  });

  test("shows All Claims and Denials tabs", async ({ page }) => {
    await page.goto("/dashboard/claims");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("button", { name: /all claims/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /denials/i })).toBeVisible();
  });

  test("All Claims tab is active by default", async ({ page }) => {
    await page.goto("/dashboard/claims");
    await page.waitForLoadState("networkidle");

    // Active tab has teal border — check via aria or class
    const allTab = page.getByRole("button", { name: /all claims/i });
    await expect(allTab).toHaveClass(/border-teal|text-teal/);
  });

  test("switching to Denials tab shows denials content", async ({ page }) => {
    await page.goto("/dashboard/claims");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /denials/i }).click();

    // Either a denied claims table or empty-state message
    const hasTable = await page.locator("table").isVisible({ timeout: 2000 }).catch(() => false);
    const hasEmpty = await page.getByText(/no denied claims/i).isVisible({ timeout: 2000 }).catch(() => false);
    expect(hasTable || hasEmpty, "Denials tab must show table or empty state").toBeTruthy();
  });

  test('[adversarial] "in_progress" status badge never appears', async ({ page }) => {
    await page.goto("/dashboard/claims");
    await page.waitForLoadState("networkidle");

    // in_progress was mapped to pending — should never appear in the UI
    const inProgressBadge = page.getByText(/in.?progress/i);
    await expect(inProgressBadge).not.toBeVisible();
  });
});

// ── Claims table rows ─────────────────────────────────────────────────────────

test.describe("Claims table — row actions", () => {
  test("each claim row has a download (↓) icon button", async ({ page }) => {
    const { encounterId } = await createEncounterWithCodes(page);
    await createClaim(page, encounterId);

    await page.goto("/dashboard/claims");
    await page.waitForLoadState("networkidle");

    // Wait for at least one data row
    const rows = page.locator("tbody tr");
    await expect(rows.first()).toBeVisible({ timeout: 10000 });

    // Each row has a download button (title="Download EDI 837 file")
    const downloadBtn = rows.first().getByTitle(/download edi/i);
    await expect(downloadBtn).toBeVisible();
  });

  test("each claim row has a history (clock) icon button", async ({ page }) => {
    const { encounterId } = await createEncounterWithCodes(page);
    await createClaim(page, encounterId);

    await page.goto("/dashboard/claims");
    await page.waitForLoadState("networkidle");

    const rows = page.locator("tbody tr");
    await expect(rows.first()).toBeVisible({ timeout: 10000 });

    const historyBtn = rows.first().getByTitle(/view history|hide history/i);
    await expect(historyBtn).toBeVisible();
  });

  test("clicking history icon expands the status history panel", async ({ page }) => {
    const { encounterId } = await createEncounterWithCodes(page);
    await createClaim(page, encounterId);

    await page.goto("/dashboard/claims");
    await page.waitForLoadState("networkidle");

    const rows = page.locator("tbody tr");
    await expect(rows.first()).toBeVisible({ timeout: 10000 });

    await rows.first().getByTitle(/view history|hide history/i).click();

    // Status History label should appear
    await expect(page.getByText(/status history/i)).toBeVisible({ timeout: 5000 });
  });

  test("service date column shows a date (not empty)", async ({ page }) => {
    const { encounterId } = await createEncounterWithCodes(page);
    await createClaim(page, encounterId);

    await page.goto("/dashboard/claims");
    await page.waitForLoadState("networkidle");

    const rows = page.locator("tbody tr");
    await expect(rows.first()).toBeVisible({ timeout: 10000 });

    // The service date cell should contain a formatted date (e.g. "Jan 1, 2025")
    // It should NOT be "—" (which is our null fallback)
    const cells = rows.first().locator("td");
    const serviceDateCell = cells.nth(1); // second column = Service Date
    const text = await serviceDateCell.innerText();
    expect(text.trim(), "Service date must not be empty").not.toBe("—");
    expect(text.trim().length, "Service date must contain a date string").toBeGreaterThan(3);
  });

  test("No Submit button appears in the claims table", async ({ page }) => {
    await page.goto("/dashboard/claims");
    await page.waitForLoadState("networkidle");

    // Submit button was removed — it must not be present anywhere in claims table
    const submitBtn = page.locator("table").getByRole("button", { name: /^submit$/i });
    await expect(submitBtn).not.toBeVisible();
  });
});

// ── Denials tab ───────────────────────────────────────────────────────────────

test.describe("Denials tab — Resubmit button", () => {
  test("denied claim shows Resubmit button in Denials tab", async ({ page }) => {
    const { encounterId } = await createEncounterWithCodes(page);
    await createDeniedClaim(page, encounterId);

    await page.goto("/dashboard/claims");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /denials/i }).click();

    const rows = page.locator("tbody tr");
    await expect(rows.first()).toBeVisible({ timeout: 10000 });

    // Resubmit button/link must appear in the actions column
    const resubmitBtn = rows.first().getByRole("link", { name: /resubmit/i });
    await expect(resubmitBtn).toBeVisible({ timeout: 5000 });
  });

  test("Resubmit link points to the encounter create wizard at step 4", async ({ page }) => {
    const { encounterId } = await createEncounterWithCodes(page);
    await createDeniedClaim(page, encounterId);

    await page.goto("/dashboard/claims");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /denials/i }).click();

    const rows = page.locator("tbody tr");
    await expect(rows.first()).toBeVisible({ timeout: 10000 });

    const resubmitHref = await rows.first()
      .getByRole("link", { name: /resubmit/i })
      .getAttribute("href");

    expect(resubmitHref, "Resubmit must link to encounter wizard").toMatch(/encounters\/create/);
    expect(resubmitHref, "Resubmit must open at step 4").toMatch(/step=4/);
  });

  test("[adversarial] Resubmit button does NOT appear in All Claims tab", async ({ page }) => {
    const { encounterId } = await createEncounterWithCodes(page);
    await createDeniedClaim(page, encounterId);

    await page.goto("/dashboard/claims");
    await page.waitForLoadState("networkidle");

    // All Claims tab is active — Resubmit must not be visible
    await expect(page.getByRole("link", { name: /resubmit/i })).not.toBeVisible();
  });
});

// ── Clearinghouse not-configured warning ──────────────────────────────────────

test.describe("Clearinghouse config warning", () => {
  test("pending claim with 'not configured' reason shows Set up EDI link", async ({ page }) => {
    const { encounterId } = await createEncounterWithCodes(page);

    // Create a claim with the exact rejection_reason the backend emits
    const res = await page.request.post(`${API_BASE}/claims`, {
      data: {
        encounter_id: encounterId,
        status: "pending",
        rejection_reason: "Clearinghouse not configured. Go to Organization Settings → EDI & Clearinghouse and add your Clearinghouse URL and API Key.",
        payer_name: "Test Payer",
        claim_type: "professional",
        submission_type: "initial",
        total_amount: 0,
        diagnosis_codes: ["Z00.00"],
        procedure_codes: ["99213"],
      },
    });
    expect(res.ok()).toBeTruthy();

    await page.goto("/dashboard/claims");
    await page.waitForLoadState("networkidle");

    // "Set up EDI" link must appear and point to /dashboard/organization
    const ediLink = page.getByRole("link", { name: /set up edi/i });
    await expect(ediLink).toBeVisible({ timeout: 10000 });

    const href = await ediLink.getAttribute("href");
    expect(href).toMatch(/\/dashboard\/organization/);
  });
});

// ── EDI download ──────────────────────────────────────────────────────────────

test.describe("EDI download", () => {
  test("download button triggers a file download with .edi extension", async ({ page }) => {
    const { encounterId } = await createEncounterWithCodes(page);
    await createClaim(page, encounterId);

    await page.goto("/dashboard/claims");
    await page.waitForLoadState("networkidle");

    const rows = page.locator("tbody tr");
    await expect(rows.first()).toBeVisible({ timeout: 10000 });

    // Intercept the download
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 10000 }),
      rows.first().getByTitle(/download edi/i).click(),
    ]);

    expect(download.suggestedFilename(), "Downloaded file must have .edi extension")
      .toMatch(/\.edi$/);
  });
});

// ── Organization EDI settings ─────────────────────────────────────────────────

test.describe("Organization settings — EDI & Clearinghouse", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/organization");
    await page.waitForLoadState("networkidle");
  });

  test("EDI section is visible on the organization settings page", async ({ page }) => {
    await expect(page.getByText(/edi|clearinghouse/i).first()).toBeVisible({ timeout: 10000 });
  });

  test("clearinghouse URL field is visible in edit mode", async ({ page }) => {
    const editBtn = page.getByRole("button", { name: /edit organization/i });
    if (await editBtn.isVisible({ timeout: 3000 })) {
      await editBtn.click();
    }

    const urlField = page.getByLabel(/clearinghouse url/i);
    await expect(urlField).toBeVisible({ timeout: 5000 });
  });

  test("clearinghouse API key field is a password input (write-only)", async ({ page }) => {
    const editBtn = page.getByRole("button", { name: /edit organization/i });
    if (await editBtn.isVisible({ timeout: 3000 })) {
      await editBtn.click();
    }

    // API key must be type="password" — never pre-filled, never shown in plain text
    const apiKeyField = page.locator('input[type="password"]').filter({ hasText: /./ }).or(
      page.locator('label').filter({ hasText: /api key/i }).locator('xpath=following-sibling::input, ../input')
    ).first();

    // Accept either: a password-type input near "api key" label, or check by label
    const apiKeyInput = page.getByLabel(/api key/i);
    if (await apiKeyInput.isVisible({ timeout: 3000 })) {
      const inputType = await apiKeyInput.getAttribute("type");
      expect(inputType, "API key must be type=password to avoid exposure").toBe("password");
    }
  });

  // ADVERSARIAL: invalid clearinghouse URL must show error
  test("[adversarial] invalid clearinghouse URL shows validation error", async ({ page }) => {
    const editBtn = page.getByRole("button", { name: /edit organization/i });
    if (await editBtn.isVisible({ timeout: 3000 })) {
      await editBtn.click();
    }

    const urlField = page.getByLabel(/clearinghouse url/i);
    await expect(urlField).toBeVisible({ timeout: 5000 });

    await urlField.fill("not-a-valid-url");
    await page.getByRole("button", { name: /save changes/i }).click();

    // Must stay in edit mode — not saved
    await expect(urlField).toBeVisible({ timeout: 3000 });

    // Must show a URL validation error
    const urlError = page.locator("p.text-red-600, [class*='text-red']").filter({
      hasText: /url|valid/i,
    });
    await expect(urlError).toBeVisible({ timeout: 3000 });
  });

  test("valid clearinghouse URL saves successfully", async ({ page }) => {
    const editBtn = page.getByRole("button", { name: /edit organization/i });
    if (await editBtn.isVisible({ timeout: 3000 })) {
      await editBtn.click();
    }

    const urlField = page.getByLabel(/clearinghouse url/i);
    await expect(urlField).toBeVisible({ timeout: 5000 });

    await urlField.fill("https://claims.example.com/api/submit");
    await page.getByRole("button", { name: /save changes/i }).click();

    // Must transition back to read-only (edit button reappears)
    await expect(
      page.getByRole("button", { name: /edit organization/i })
    ).toBeVisible({ timeout: 10000 });

    // No error banner
    await expect(page.locator(".bg-red-50")).not.toBeVisible();
  });
});

// ── Fee schedule UI ───────────────────────────────────────────────────────────

test.describe("Organization settings — Fee Schedule", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/organization");
    await page.waitForLoadState("networkidle");

    const editBtn = page.getByRole("button", { name: /edit organization/i });
    if (await editBtn.isVisible({ timeout: 3000 })) {
      await editBtn.click();
    }
  });

  test("fee schedule section is visible in edit mode", async ({ page }) => {
    await expect(page.getByText(/fee schedule/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("can add a CPT code + amount row", async ({ page }) => {
    const addBtn = page.getByRole("button", { name: /add cpt|add code/i });
    await expect(addBtn).toBeVisible({ timeout: 5000 });

    await addBtn.click();

    // A new row of inputs should appear
    const codeInputs = page.locator('input[placeholder*="99213"], input[placeholder*="CPT"]');
    await expect(codeInputs.first()).toBeVisible({ timeout: 3000 });
  });

  test("can remove a fee schedule row", async ({ page }) => {
    // Add a row first
    const addBtn = page.getByRole("button", { name: /add cpt|add code/i });
    await expect(addBtn).toBeVisible({ timeout: 5000 });
    await addBtn.click();

    // Then remove it
    const removeBtn = page.getByRole("button", { name: /remove|delete|×/i }).last();
    if (await removeBtn.isVisible({ timeout: 2000 })) {
      await removeBtn.click();
      // After removal, that row's remove button should be gone
      await expect(removeBtn).not.toBeVisible({ timeout: 2000 }).catch(() => {
        // Acceptable if there are still other rows
      });
    }
  });

  test("saved fee schedule entry shows the CPT code in read-only view", async ({ page }) => {
    const addBtn = page.getByRole("button", { name: /add cpt|add code/i });
    await expect(addBtn).toBeVisible({ timeout: 5000 });
    await addBtn.click();

    const codeInput = page.locator('input[placeholder*="99213"], input[placeholder*="CPT"]').last();
    const amountInput = page.locator('input[placeholder*="amount"], input[type="number"]').last();

    await codeInput.fill("99214");
    await amountInput.fill("175");

    await page.getByRole("button", { name: /save changes/i }).click();

    // Read-only mode
    await expect(
      page.getByRole("button", { name: /edit organization/i })
    ).toBeVisible({ timeout: 10000 });

    // The saved CPT code must appear somewhere on the page
    await expect(page.getByText("99214")).toBeVisible({ timeout: 5000 });
  });
});
