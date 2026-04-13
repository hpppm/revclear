/**
 * E2E Test Suite — Organization Profile & Patient Management
 *
 * Covers three areas:
 *   1. Organization billing profile — save fields, read-only view, validation
 *   2. Claim form — auto-population from org billing profile
 *   3. Patient form — adversarial validation (required fields, insurance rules, self-pay)
 *
 * Philosophy:
 *   Happy-path tests prove features work.
 *   Adversarial tests prove bad data is REJECTED — they fail when a guard is
 *   missing, not when a feature is missing.
 *
 * Prerequisites:
 *   TEST_EMAIL, TEST_PASSWORD  — credentials for a test user with an existing org
 *   BASE_URL                   — (optional, default http://localhost:3000)
 *   API_URL                    — (optional, default http://localhost:3005/api)
 *
 * Both servers must be running before executing these tests:
 *   cd backend  && npm run dev   # port 3005
 *   cd frontend && npm run dev   # port 3000
 *
 * Run from frontend/:
 *   npx playwright test
 */

import { test, expect, Page } from "@playwright/test";

// ── Config ───────────────────────────────────────────────────────────────────

const API_BASE = process.env.API_URL ?? "http://localhost:3005/api";

// NPI is generated fresh per test run so the "visible after reload" assertion
// cannot be satisfied by a stale value left by a previous run. Format: 10 digits
// starting with 1, last 9 derived from the current timestamp.
const RUN_NPI = `1${String(Date.now()).slice(-9)}`;

/** Billing profile used across all org and claim tests. */
const ORG_BILLING = {
  billing_name: "Test Billing Clinic",
  billing_npi: RUN_NPI,
  billing_tax_id: "12-3456789",
  billing_address_line1: "100 Health Ave",
  billing_city: "Springfield",
  billing_state: "IL",
  billing_postal_code: "62701",
};

// ── API helpers ───────────────────────────────────────────────────────────────

/**
 * Creates a patient → encounter → ICD+CPT codes via the backend API.
 * Uses page.request so the authenticated browser session cookies are forwarded
 * to port 3005 — no separate login needed.
 *
 * Returns the encounter ID ready for use in the claim preview step.
 */
async function setupEncounterWithCodes(page: Page): Promise<string> {
  const today = new Date().toISOString().split("T")[0];

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
  const patientId: string = (await patientRes.json()).data?.id;
  expect(patientId, "Expected patient ID in response").toBeTruthy();

  const encRes = await page.request.post(`${API_BASE}/encounters`, {
    data: { patient_id: patientId, date_of_service: today, status: "draft" },
  });
  expect(encRes.ok(), `Create encounter failed: ${await encRes.text()}`).toBeTruthy();
  const encounterId: string = (await encRes.json()).data?.id;
  expect(encounterId, "Expected encounter ID in response").toBeTruthy();

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

/**
 * Resets the org billing profile to all-empty strings via API so each test in
 * the "Save Behavior" suite starts from a known clean slate, regardless of run
 * order or what a previous test left behind.
 *
 * A non-OK response is logged as a warning but does NOT throw — the downstream
 * UI assertion will surface dirty state with a more meaningful failure message.
 */
async function clearOrgBillingProfile(page: Page): Promise<void> {
  const res = await page.request.patch(`${API_BASE}/organizations/me`, {
    data: {
      billing_name: "",
      // billing_npi intentionally omitted: the backend OrganizationSchema validates
      // billing_npi against /^\d{10}$/ and rejects "" with a 400. The frontend
      // npiSchema accepts "" via .or(z.literal("")) but the backend does not.
      // Omitting the field leaves the DB value unchanged, which is acceptable —
      // any test that needs billing_npi fills it explicitly via fillBillingProfile().
      billing_tax_id: "",
      billing_address_line1: "",
      billing_city: "",
      billing_state: "",
      billing_postal_code: "",
    },
  });
  if (!res.ok()) {
    // Don't throw — let the test surface dirty state through its own assertions.
    console.warn(
      `[beforeEach] clearOrgBillingProfile: PATCH /organizations/me returned ${res.status()}`,
    );
  }
}

/**
 * Attaches a listener to page network requests and tracks whether a POST to
 * /patients was fired. Call `.stop()` after the action under test, then assert
 * `.wasCalled()` is false (blocking tests) or true (happy-path tests).
 *
 * Using a listener instead of page.route / route.fulfill means no real code
 * path is short-circuited — the network stack is observed, not intercepted.
 */
function trackPatientPost(page: Page): { wasCalled: () => boolean; stop: () => void } {
  let called = false;
  const listener = (req: any) => {
    if (req.method() === "POST" && /\/api\/patients$/.test(new URL(req.url()).pathname)) {
      called = true;
    }
  };
  page.on("request", listener);
  return {
    wasCalled: () => called,
    stop: () => page.off("request", listener),
  };
}

// ── UI helpers ────────────────────────────────────────────────────────────────

async function goToOrgProfile(page: Page) {
  await page.goto("/dashboard/organization");
  await page.waitForLoadState("networkidle");
}

async function clickEditOrganization(page: Page) {
  // Button text confirmed from organization/page.tsx:
  //   canManageOrganization && !isEditing ? <Button>Edit Organization</Button>
  await page.getByRole("button", { name: /edit organization/i }).click();
  await expect(page.getByLabel(/billing name/i)).toBeVisible({ timeout: 5000 });
}

async function fillBillingProfile(page: Page, data: typeof ORG_BILLING) {
  // All locators use getByLabel (implicit <label> wrap from the custom Input
  // component) — resilient to placeholder text changes.
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
  // Do NOT use waitForLoadState('networkidle') here. The org profile page fires
  // background requests for members/invites after the save completes, which can
  // prevent networkidle from ever settling and causes a hard timeout. Instead,
  // rely on toBeVisible()'s built-in retry loop — Playwright polls until the
  // button appears or the timeout expires, which is sufficient and more robust.
  await expect(
    page.getByRole("button", { name: /edit organization/i }),
    "Edit Organization button must reappear after a successful save",
  ).toBeVisible({ timeout: 10000 });
}

// ── Patient form helper ───────────────────────────────────────────────────────

/**
 * Fills all required patient fields EXCEPT the one named in `omit`.
 *
 * Locator strategy: getByLabel() — resolves against the implicit <label> wrap
 * that the custom Input component always renders. This survives placeholder
 * text changes and avoids the ambiguous `placeholder*=` CSS attribute selectors
 * that previously matched multiple inputs (e.g. both "Clearinghouse payer ID"
 * and "Insurance payer name" contain "payer").
 *
 * Note on address_state: this field is a <select> (variant="select" in Input),
 * so it uses selectOption() rather than fill().
 *
 * Note on email: email is optional — omitting it is always valid.
 */
async function fillPatientFormExcept(page: Page, omit: string) {
  const fields: Record<string, () => Promise<void>> = {
    // FIX: was `input[placeholder*="John Doe" i]` — fragile placeholder match
    full_name: () => page.getByLabel(/full name/i).fill("Test Patient"),

    // FIX: was `input[type="date"]` — matches any date input on the page
    dob: () => page.getByLabel(/date of birth/i).fill("1990-01-01"),

    // FIX: was `input[type="tel"]` — matches any tel input on the page
    phone: () => page.getByLabel(/^phone/i).fill("5550000000"),

    // FIX: was `input[placeholder*="Main St" i]`
    address_street: () => page.getByLabel(/street address/i).fill("123 Main St"),

    // FIX: was `input[placeholder*="Erie" i]` — placeholder "Erie" is brittle
    address_city: () => page.getByLabel(/^city/i).fill("Springfield"),

    // State is a <select> rendered via Input variant="select" — selectOption
    // is the correct API; fill() would silently no-op on a <select> element.
    address_state: async () => { await page.getByLabel(/^state/i).selectOption("IL"); },

    // FIX: was `input[placeholder*="16501" i]`
    address_zip: () => page.getByLabel(/zip code/i).fill("62701"),

    // FIX: was `input[placeholder*="Blue Cross" i]` — "Blue Cross" is a
    // placeholder, not a label. placeholder*="pa" would have also matched
    // "Payer ID" and "Payer Name" inputs; getByLabel is unambiguous.
    insurance_provider: () =>
      page.getByLabel(/insurance provider/i).fill("Aetna"),

    // FIX: was `input[placeholder*="ABC123" i]`
    insurance_policy_number: () =>
      page.getByLabel(/policy number/i).fill("POL123456"),

    // FIX: was `input[placeholder*="Member" i]` — "Member" prefix matches
    // both "Member ID *" and "Member/Subscriber ID" placeholder ambiguously
    insurance_member_id: () =>
      page.getByLabel(/^member id/i).fill("MEM45678"),
  };

  for (const [field, fill] of Object.entries(fields)) {
    if (field !== omit) {
      await fill();
    }
  }
}

// ── 1. Org Billing Profile ────────────────────────────────────────────────────

test.describe("Org Billing Profile", () => {
  test.describe("Save Behavior", () => {
    // Reset billing data before every test so save/NPI/cancel tests are
    // order-independent and never observe stale data from a previous run.
    test.beforeEach(async ({ page }) => {
      await clearOrgBillingProfile(page);
    });

    test("Org Profile | save billing data | fields persist after page reload", async ({ page }) => {
      test.info().annotations.push({ type: "feature", description: "Org Billing Profile" });
      test.info().annotations.push({ type: "severity", description: "critical" });

      await test.step("navigate to org profile", async () => {
        await goToOrgProfile(page);
      });

      await test.step("enter edit mode", async () => {
        await clickEditOrganization(page);
      });

      await test.step("fill all billing fields", async () => {
        await fillBillingProfile(page, ORG_BILLING);
      });

      await test.step("save and confirm read-only view is restored", async () => {
        await saveAndWaitForReadOnly(page);
      });

      await test.step("verify no error banner after successful save", async () => {
        // The org page renders errors as a div.bg-red-50 banner — check it is absent.
        await expect(
          page.locator(".bg-red-50").filter({ hasText: /error|could not|failed/i }),
          "Error banner must be absent after a successful save",
        ).not.toBeVisible();
      });

      await test.step("reload page to confirm server persistence", async () => {
        await page.reload();
        await page.waitForLoadState("networkidle");
      });

      await test.step("verify saved values are displayed in read-only view", async () => {
        await expect(
          page.getByText(ORG_BILLING.billing_name),
          `Billing name "${ORG_BILLING.billing_name}" must be visible after reload`,
        ).toBeVisible();
        await expect(
          page.getByText(ORG_BILLING.billing_npi),
          `Billing NPI "${ORG_BILLING.billing_npi}" must be visible after reload`,
        ).toBeVisible();
        await expect(
          page.getByText(ORG_BILLING.billing_address_line1),
          `Billing address "${ORG_BILLING.billing_address_line1}" must be visible after reload`,
        ).toBeVisible();
      });
    });

    /**
     * Adversarial: NPI must be exactly 10 digits.
     * This test proves the validation guard exists — if removed the form
     * would silently save a malformed NPI causing downstream billing rejections.
     *
     * TODO: The Zod npiSchema validates billing_npi (/^\d{10}$/) and handleSave
     * sets fieldErrors correctly, but the <Input label="Billing NPI"> in
     * organization/page.tsx is missing the `error={fieldErrors.billing_npi}` prop.
     * The save IS blocked (handleSave returns early), but the error message is
     * never rendered to the UI. Fix: add `error={fieldErrors.billing_npi}` to the
     * Billing NPI Input in the form. Track this at:
     * https://github.com/<org>/revclear/issues/<NNN>
     *
     * test.fail() is set so CI continues to track expected behavior without blocking.
     * When the prop is added, remove test.fail() and the TODO above.
     */
    test("Org Profile | save | invalid 5-digit NPI blocks save and shows inline error", async ({
      page,
    }) => {
      test.info().annotations.push({ type: "feature", description: "Org Billing Profile" });
      test.info().annotations.push({ type: "severity", description: "critical" });

      // FIX: billing_npi Input in organization/page.tsx is missing
      // `error={fieldErrors.billing_npi}` — Zod fires and save is blocked, but
      // the error <p> is never rendered. Expected to fail until the prop is added.
      test.fail(
        true,
        "billing_npi <Input> is missing error={fieldErrors.billing_npi}; error message is never rendered",
      );

      await test.step("navigate to org profile and enter edit mode", async () => {
        await goToOrgProfile(page);
        await clickEditOrganization(page);
      });

      await test.step("fill invalid 5-digit NPI", async () => {
        await page.getByLabel(/billing npi/i).fill("12345");
      });

      await test.step("submit form", async () => {
        await page.getByRole("button", { name: /save changes/i }).click();
      });

      await test.step("assert form stays in edit mode (save was blocked)", async () => {
        // The Billing NPI field must still be visible — we never left edit mode.
        await expect(
          page.getByLabel(/billing npi/i),
          "Billing NPI input must still be visible — form must not have exited edit mode",
        ).toBeVisible({ timeout: 5000 });

        // Edit Organization button must NOT reappear — the form did not save.
        await expect(
          page.getByRole("button", { name: /edit organization/i }),
          "Edit Organization button must not appear — read-only view must not be restored after a failed save",
        ).not.toBeVisible({ timeout: 3000 });
      });

      await test.step("assert NPI inline error is visible", async () => {
        // The custom Input component renders field errors as:
        //   <p class="text-xs text-red-600">{error}</p>
        // This is NOT shadcn's [id$="-form-item-message"] — it is the project's
        // own Input component in frontend/app/components/ui/Input.tsx.
        const npiError = page
          .locator("p.text-xs.text-red-600")
          .filter({ hasText: /npi|10.?digit/i });
        await expect(
          npiError,
          "NPI inline error must appear after submitting a 5-digit NPI",
        ).toBeVisible({ timeout: 3000 });
      });
    });

    test("Org Profile | cancel | unsaved changes are discarded and read-only view is restored", async ({
      page,
    }) => {
      test.info().annotations.push({ type: "feature", description: "Org Billing Profile" });
      test.info().annotations.push({ type: "severity", description: "normal" });

      await test.step("navigate to org profile and enter edit mode", async () => {
        await goToOrgProfile(page);
        await clickEditOrganization(page);
      });

      await test.step("type an unsaved sentinel value into billing name", async () => {
        await page.getByLabel(/billing name/i).fill("UNSAVED_SENTINEL_VALUE");
      });

      await test.step("click Cancel", async () => {
        await page.getByRole("button", { name: /cancel/i }).click();
      });

      await test.step("assert read-only view is restored", async () => {
        await expect(
          page.getByRole("button", { name: /edit organization/i }),
          "Edit Organization button must reappear after cancel",
        ).toBeVisible();
      });

      await test.step("assert sentinel value is not displayed anywhere on the page", async () => {
        await expect(
          page.getByText("UNSAVED_SENTINEL_VALUE"),
          "Unsaved sentinel value must not appear anywhere — cancel must discard all edits",
        ).not.toBeVisible();
      });
    });
  });

  test.describe("Read-Only View", () => {
    // Seed billing data before the read-only check so it has something to display.
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

    test("Org Profile | read-only | saved billing data is displayed after switching to read-only view", async ({
      page,
    }) => {
      test.info().annotations.push({ type: "feature", description: "Org Billing Profile" });
      test.info().annotations.push({ type: "severity", description: "normal" });

      await test.step("navigate to org profile", async () => {
        await goToOrgProfile(page);
      });

      await test.step("verify billing fields are rendered as read-only text", async () => {
        await expect(
          page.getByText(ORG_BILLING.billing_name),
          `Billing name "${ORG_BILLING.billing_name}" must be visible in read-only view`,
        ).toBeVisible();
        await expect(
          page.getByText(ORG_BILLING.billing_npi),
          `Billing NPI "${ORG_BILLING.billing_npi}" must be visible in read-only view`,
        ).toBeVisible();
      });
    });
  });
});

// ── 2. Claim Form — Auto-population from Org Billing Profile ─────────────────

test.describe("Claim Form", () => {
  test.describe("Auto-population from Org Profile", () => {
    // Ensure the org has billing data saved before each claim test runs.
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

    /**
     * Adversarial: billing provider name must be the EXACT saved org billing name.
     * Prevents a regression where the form renders empty or uses a fallback placeholder.
     */
    test("Claim Form | auto-populate | billing provider name matches saved org billing name", async ({
      page,
    }) => {
      test.info().annotations.push({ type: "feature", description: "Claim Auto-population" });
      test.info().annotations.push({ type: "severity", description: "critical" });

      let encounterId: string;

      await test.step("create encounter with ICD and CPT codes via API", async () => {
        encounterId = await setupEncounterWithCodes(page);
      });

      await test.step("navigate to claim review step", async () => {
        await page.goto(`/dashboard/encounters/create?id=${encounterId}&step=4`);
        await page.waitForLoadState("networkidle");
        // The ?step=4 param is restored by a useEffect that reads useSearchParams(),
        // which may return null on the initial render in Next.js App Router before
        // hydration completes. The WizardContainer footer "Step 5 of 5" is the
        // authoritative signal that the deep-link has taken effect.
        await expect(
          page.getByText(/step 5 of 5/i),
          "Wizard footer must show 'Step 5 of 5' — ?step=4 deep-link must have resolved",
        ).toBeVisible({ timeout: 15000 });
      });

      await test.step("verify billing provider name input is pre-populated with saved org name", async () => {
        // ReviewClaimStep.tsx always renders billing_provider.name as an editable
        // <Input label="Billing Provider Name *"> — there is no read-only branch.
        // Asserting the input value (not just text presence) proves auto-population
        // wrote the correct value, not merely that the string appears somewhere on
        // the page (e.g. in a heading or nav element).
        const billingInput = page.getByLabel(/billing.*provider.*name/i).first();
        await expect(
          billingInput,
          "Billing Provider Name input must be visible on the claim review step",
        ).toBeVisible({ timeout: 5000 });
        const val = await billingInput.inputValue();
        expect(
          val,
          `Billing provider name must equal "${ORG_BILLING.billing_name}" but got "${val}"`,
        ).toBe(ORG_BILLING.billing_name);
      });
    });

    /**
     * Adversarial: service facility name must be populated from org data, not empty.
     * Prevents a regression where the section renders but with blank fields.
     */
    test("Claim Form | auto-populate | service facility section shows org name", async ({
      page,
    }) => {
      test.info().annotations.push({ type: "feature", description: "Claim Auto-population" });
      test.info().annotations.push({ type: "severity", description: "critical" });

      let encounterId: string;

      await test.step("create encounter with ICD and CPT codes via API", async () => {
        encounterId = await setupEncounterWithCodes(page);
      });

      await test.step("navigate to claim review step", async () => {
        await page.goto(`/dashboard/encounters/create?id=${encounterId}&step=4`);
        await page.waitForLoadState("networkidle");
        // Confirm deep-link resolved before asserting section content.
        await expect(
          page.getByText(/step 5 of 5/i),
          "Wizard footer must show 'Step 5 of 5' — ?step=4 deep-link must have resolved",
        ).toBeVisible({ timeout: 15000 });
      });

      await test.step("verify service facility section is visible and pre-filled", async () => {
        await expect(
          page.getByText(/service facility/i).first(),
          "Service Facility section heading must be visible",
        ).toBeVisible();

        // The input must exist and must not be empty — the conditional check that
        // previously surrounded this was silently skipping the assertion when the
        // locator didn't match, allowing the test to pass with zero assertions.
        const facilityInput = page.getByLabel(/facility.*name|service.*name/i).first();
        await expect(
          facilityInput,
          "Service Facility name input must be visible — if absent the section is missing entirely",
        ).toBeVisible({ timeout: 5000 });
        const val = await facilityInput.inputValue();
        expect(
          val.length,
          "Service facility name must be pre-filled from org data — empty string is a regression",
        ).toBeGreaterThan(0);
      });
    });

    test("Claim Form | render | rendering provider section is visible on claim review step", async ({
      page,
    }) => {
      test.info().annotations.push({ type: "feature", description: "Claim Auto-population" });
      test.info().annotations.push({ type: "severity", description: "normal" });

      let encounterId: string;

      await test.step("create encounter with codes via API", async () => {
        encounterId = await setupEncounterWithCodes(page);
      });

      await test.step("navigate to claim review step", async () => {
        await page.goto(`/dashboard/encounters/create?id=${encounterId}&step=4`);
        await page.waitForLoadState("networkidle");
        // Confirm deep-link resolved before asserting section content.
        await expect(
          page.getByText(/step 5 of 5/i),
          "Wizard footer must show 'Step 5 of 5' — ?step=4 deep-link must have resolved",
        ).toBeVisible({ timeout: 15000 });
      });

      await test.step("verify rendering provider section is present with input fields", async () => {
        // Section heading must be visible
        await expect(
          page.getByText(/rendering provider/i).first(),
          "Rendering Provider section must be visible on the claim review step",
        ).toBeVisible();

        // The two required fields must exist as inputs, not just as heading text.
        // If the section were collapsed or removed, these would not be found.
        const nameInput = page.getByLabel(/rendering provider name/i);
        await expect(nameInput, "Rendering Provider Name input must be present").toBeVisible();

        const npiInput = page.getByLabel(/rendering provider npi/i);
        await expect(npiInput, "Rendering Provider NPI input must be present").toBeVisible();
      });
    });
  });
});

// ── 3. Patient Form — Adversarial Validation ─────────────────────────────────

test.describe("Patient Form", () => {
  test.describe("Adversarial Validation", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/dashboard/patients/add");
      await page.waitForLoadState("networkidle");
    });

    test("Patient Form | submit | empty DOB field shows required error and halts submission", async ({
      page,
    }) => {
      test.info().annotations.push({ type: "feature", description: "Patient Validation" });
      test.info().annotations.push({ type: "severity", description: "critical" });

      const tracker = trackPatientPost(page);

      await test.step("fill all required fields except DOB", async () => {
        await fillPatientFormExcept(page, "dob");
      });

      await test.step("submit form", async () => {
        await page.getByRole("button", { name: /save patient/i }).click();
        tracker.stop();
      });

      await test.step("assert URL has not changed (form was not submitted)", async () => {
        await expect(
          page,
          "Page must remain on /patients/add — form must not have navigated on submit",
        ).toHaveURL(/\/patients\/add/);
      });

      await test.step("assert DOB inline error is visible", async () => {
        // The custom Input component (frontend/app/components/ui/Input.tsx) renders
        // field errors as: <p class="text-xs text-red-600">{error}</p>
        // This is NOT a shadcn FormMessage — no [id$="-form-item-message"] needed.
        const dobError = page
          .locator("p.text-xs.text-red-600")
          .filter({ hasText: /date of birth|dob|required/i });
        await expect(
          dobError,
          "DOB inline error must appear after submitting with an empty date of birth",
        ).toBeVisible({ timeout: 3000 });
      });

      await test.step("assert POST /patients was not fired (frontend validation must block HTTP request)", async () => {
        expect(
          tracker.wasCalled(),
          "POST /patients must not be fired — frontend Zod validation must block the HTTP call before it reaches the backend",
        ).toBe(false);
      });
    });

    test("Patient Form | submit | empty phone field shows required error and halts submission", async ({
      page,
    }) => {
      test.info().annotations.push({ type: "feature", description: "Patient Validation" });
      test.info().annotations.push({ type: "severity", description: "critical" });

      const tracker = trackPatientPost(page);

      await test.step("fill all required fields except phone", async () => {
        await fillPatientFormExcept(page, "phone");
      });

      await test.step("submit form", async () => {
        await page.getByRole("button", { name: /save patient/i }).click();
        tracker.stop();
      });

      await test.step("assert URL has not changed (form was not submitted)", async () => {
        await expect(
          page,
          "Page must remain on /patients/add — form must not have navigated on submit",
        ).toHaveURL(/\/patients\/add/);
      });

      await test.step("assert phone inline error is visible", async () => {
        const phoneError = page
          .locator("p.text-xs.text-red-600")
          .filter({ hasText: /phone|required/i });
        await expect(
          phoneError,
          "Phone inline error must appear after submitting with an empty phone number",
        ).toBeVisible({ timeout: 3000 });
      });

      await test.step("assert POST /patients was not fired (frontend validation must block HTTP request)", async () => {
        expect(
          tracker.wasCalled(),
          "POST /patients must not be fired — frontend Zod validation must block the HTTP call before it reaches the backend",
        ).toBe(false);
      });
    });

    /**
     * Adversarial: if insurance provider is set but policy number is blank, the
     * form must block. Prevents incomplete insurance data from reaching the
     * backend and causing claim generation failures.
     */
    test("Patient Form | submit | insured patient with no policy number shows inline error and halts submission", async ({
      page,
    }) => {
      test.info().annotations.push({ type: "feature", description: "Patient Validation" });
      test.info().annotations.push({ type: "severity", description: "critical" });

      const tracker = trackPatientPost(page);

      await test.step("fill all required fields except policy number", async () => {
        await fillPatientFormExcept(page, "insurance_policy_number");
      });

      await test.step("submit form", async () => {
        await page.getByRole("button", { name: /save patient/i }).click();
        tracker.stop();
      });

      await test.step("assert URL has not changed (form was not submitted)", async () => {
        await expect(
          page,
          "Page must remain on /patients/add — missing policy number must halt submission",
        ).toHaveURL(/\/patients\/add/);
      });

      await test.step("assert policy number inline error is visible", async () => {
        const policyError = page
          .locator("p.text-xs.text-red-600")
          .filter({ hasText: /policy/i });
        await expect(
          policyError,
          "Policy number inline error must appear after submitting without a policy number",
        ).toBeVisible({ timeout: 3000 });
      });

      await test.step("assert POST /patients was not fired (frontend validation must block HTTP request)", async () => {
        expect(
          tracker.wasCalled(),
          "POST /patients must not be fired — frontend Zod validation must block the HTTP call before it reaches the backend",
        ).toBe(false);
      });
    });

    /**
     * Adversarial: if insurance provider is set but member ID is blank, the
     * form must block. Member ID is required for EDI claim generation.
     */
    test("Patient Form | submit | insured patient with no member ID shows inline error and halts submission", async ({
      page,
    }) => {
      test.info().annotations.push({ type: "feature", description: "Patient Validation" });
      test.info().annotations.push({ type: "severity", description: "critical" });

      const tracker = trackPatientPost(page);

      await test.step("fill all required fields except member ID", async () => {
        await fillPatientFormExcept(page, "insurance_member_id");
      });

      await test.step("submit form", async () => {
        await page.getByRole("button", { name: /save patient/i }).click();
        tracker.stop();
      });

      await test.step("assert URL has not changed (form was not submitted)", async () => {
        await expect(
          page,
          "Page must remain on /patients/add — missing member ID must halt submission",
        ).toHaveURL(/\/patients\/add/);
      });

      await test.step("assert member ID inline error is visible", async () => {
        const memberError = page
          .locator("p.text-xs.text-red-600")
          .filter({ hasText: /member/i });
        await expect(
          memberError,
          "Member ID inline error must appear after submitting without a member ID",
        ).toBeVisible({ timeout: 3000 });
      });

      await test.step("assert POST /patients was not fired (frontend validation must block HTTP request)", async () => {
        expect(
          tracker.wasCalled(),
          "POST /patients must not be fired — frontend Zod validation must block the HTTP call before it reaches the backend",
        ).toBe(false);
      });
    });

    /**
     * Adversarial: when insured (non-self-pay), both policy number AND member ID
     * errors must appear simultaneously so the user sees all problems at once.
     * Prevents the form from surfacing errors one at a time (a UX regression that
     * forces multiple save attempts).
     */
    test("Patient Form | submit | insured patient with no policy number or member ID shows both errors simultaneously", async ({
      page,
    }) => {
      test.info().annotations.push({ type: "feature", description: "Patient Validation" });
      test.info().annotations.push({ type: "severity", description: "critical" });

      const tracker = trackPatientPost(page);

      await test.step("fill personal and address fields but omit all insurance fields", async () => {
        // FIX: all placeholder-based selectors replaced with getByLabel
        await page.getByLabel(/full name/i).fill("Insured Patient");
        await page.getByLabel(/date of birth/i).fill("1985-03-22");
        await page.getByLabel(/^phone/i).fill("5550002222");
        await page.getByLabel(/street address/i).fill("42 Insurance Lane");
        await page.getByLabel(/^city/i).fill("Boston");
        await page.getByLabel(/^state/i).selectOption("MA");
        await page.getByLabel(/zip code/i).fill("02101");

        // Provide the insurance provider but intentionally omit policy number and member ID
        await page.getByLabel(/insurance provider/i).fill("United Healthcare");
      });

      await test.step("submit form", async () => {
        await page.getByRole("button", { name: /save patient/i }).click();
        tracker.stop();
      });

      await test.step("assert URL has not changed (form was not submitted)", async () => {
        await expect(
          page,
          "Page must remain on /patients/add — missing insurance fields must halt submission",
        ).toHaveURL(/\/patients\/add/);
      });

      await test.step("assert both policy number and member ID errors appear simultaneously", async () => {
        // Both errors must appear in the same render — not sequentially.
        await expect(
          page.locator("p.text-xs.text-red-600").filter({ hasText: /policy/i }),
          "Policy number error must appear when policy number is missing",
        ).toBeVisible({ timeout: 3000 });
        await expect(
          page.locator("p.text-xs.text-red-600").filter({ hasText: /member/i }),
          "Member ID error must appear simultaneously with policy number error",
        ).toBeVisible({ timeout: 3000 });
      });

      await test.step("assert POST /patients was not fired (frontend validation must block HTTP request)", async () => {
        expect(
          tracker.wasCalled(),
          "POST /patients must not be fired — frontend Zod validation must block the HTTP call before it reaches the backend",
        ).toBe(false);
      });
    });

    /**
     * Happy path: self-pay patients must NOT be blocked by missing insurance fields.
     * The self-pay toggle hides insurance inputs and marks the patient as SELF_PAY,
     * bypassing all insurance validation.
     */
    test("Patient Form | submit | self-pay patient submits successfully without insurance fields", async ({
      page,
    }) => {
      test.info().annotations.push({ type: "feature", description: "Patient Validation" });
      test.info().annotations.push({ type: "severity", description: "critical" });

      // Unique per run so the DB verification below cannot be satisfied by a
      // record left over from a previous test run.
      const selfPayName = `SP E2E ${Date.now()}`;

      await test.step("fill personal and address fields", async () => {
        await page.getByLabel(/full name/i).fill(selfPayName);
        await page.getByLabel(/date of birth/i).fill("1990-06-15");
        await page.getByLabel(/^phone/i).fill("5550001111");
        await page.getByLabel(/street address/i).fill("99 Self Pay Blvd");
        await page.getByLabel(/^city/i).fill("Chicago");
        await page.getByLabel(/^state/i).selectOption("IL");
        await page.getByLabel(/zip code/i).fill("60601");
      });

      await test.step("activate self-pay toggle", async () => {
        // The checkbox is sr-only (visually hidden) — click its wrapping label.
        await page
          .locator("label")
          .filter({ hasText: /self.?pay/i })
          .click();
      });

      await test.step("submit form", async () => {
        await page.getByRole("button", { name: /save patient/i }).click();
      });

      await test.step("assert no insurance-related errors are shown", async () => {
        await expect(
          page.locator("p.text-xs.text-red-600").filter({
            hasText: /insurance|policy|member/i,
          }),
          "No insurance validation errors must appear for a self-pay patient",
        ).not.toBeVisible({ timeout: 3000 });
      });

      await test.step("assert navigation away from add page (successful submit)", async () => {
        // Success is evidenced by the router.push("/dashboard/patients") call in handleSubmit.
        await expect(
          page,
          "Page must navigate away from /patients/add after a successful self-pay submission",
        ).not.toHaveURL(/\/patients\/add/, { timeout: 10000 });
      });

      await test.step("verify patient persisted in backend database (not just frontend navigation)", async () => {
        // Navigation away proves the frontend received a 2xx response, but we also
        // verify the record is retrievable — ensuring the DB write actually committed
        // and was not rolled back or silently discarded.
        const res = await page.request.get(`${API_BASE}/patients`);
        expect(res.ok(), `GET /patients returned ${res.status()} — cannot verify DB persistence`).toBeTruthy();
        const json = await res.json();
        const found = (json.data ?? []).some((p: any) => p.full_name === selfPayName);
        expect(found, `Patient "${selfPayName}" must be retrievable from GET /patients after successful submission`).toBe(true);
      });
    });

    // ── Name field adversarial tests ─────────────────────────────────────────
    //
    // STRUCTURAL BUG: The form renders a single "Full Name" input (full_name).
    // CMS-1500 — the standard health-insurance claim form — requires first name
    // and last name in separate boxes (Box 2 for subscriber, Box 12/13 for
    // patient). Claim-generation code that splits full_name on whitespace is
    // fragile: "Mary Jo Smith" produces wrong first/last, and suffixes like
    // "Jr." or "III" further corrupt the split. The tests below are written
    // against the CORRECT interface (separate first_name / last_name labels).
    // They will fail until the form is refactored to use separate fields.
    //
    // GitHub Issue: [Patient Form] replace full_name with separate first_name /
    //   last_name fields — CMS-1500 compliance for claim generation
    //   File: frontend/app/dashboard/patients/add/page.tsx
    //   Expected: getByLabel(/^first.?name/i) and getByLabel(/^last.?name/i)
    //             inputs exist and are validated independently
    //   Actual: form has a single getByLabel(/full name/i) input

    // BUG: first_name missing minimum length validation (and field doesn't exist
    //   as a separate input — see structural bug above)
    // Expected: submitting a 1-character first_name blocks the form and renders
    //   an inline minimum-length error (e.g. "must be at least 2 characters")
    // GitHub Issue: [Patient Form] first_name minimum length not enforced
    test("Patient Form | first_name | 1-character value blocks submission and shows minimum length error", async ({
      page,
    }) => {
      test.info().annotations.push({ type: "feature", description: "Patient Validation" });
      test.info().annotations.push({ type: "severity", description: "critical" });
      // Structural bug: the form uses a single full_name input, not separate
      // first_name / last_name fields. The getByLabel(/^first.?name/i) locator
      // finds nothing, so this test passes for the wrong reason (other missing
      // required fields also block submission). Mark fail until the form is
      // refactored to use separate first_name / last_name inputs.
      test.fail(true, "first_name field does not exist — form uses full_name; test passes for wrong reason");

      await test.step("fill all required non-name fields", async () => {
        // Omit full_name: the correct implementation has separate first_name /
        // last_name fields. Filling the current full_name field would accommodate
        // the broken implementation and hide the structural bug.
        await fillPatientFormExcept(page, "full_name");
      });

      await test.step("fill first_name with a single character", async () => {
        await page.getByLabel(/^first.?name/i).fill("J");
      });

      await test.step("submit form", async () => {
        await page.getByRole("button", { name: /save patient/i }).click();
      });

      await test.step("assert URL has not changed (form was not submitted)", async () => {
        await expect(
          page,
          "Page must remain on /patients/add — a 1-character first name must halt submission",
        ).toHaveURL(/\/patients\/add/);
      });

      await test.step("assert first_name minimum length error is visible", async () => {
        const nameError = page
          .locator("p.text-xs.text-red-600")
          .filter({ hasText: /first.?name|at least|minimum|2 character/i });
        await expect(
          nameError,
          "A minimum length error must appear after submitting a 1-character first name",
        ).toBeVisible({ timeout: 3000 });
      });
    });

    // BUG: last_name field is missing entirely — form uses a single full_name
    //   input instead of separate first_name / last_name (see structural bug above)
    // Expected: a separate last_name input exists; submitting a 1-character
    //   last_name blocks the form and renders a minimum-length inline error
    // GitHub Issue: [Patient Form] last_name field missing — CMS-1500 compliance
    test("Patient Form | last_name | 1-character value blocks submission and shows minimum length error", async ({
      page,
    }) => {
      test.info().annotations.push({ type: "feature", description: "Patient Validation" });
      test.info().annotations.push({ type: "severity", description: "critical" });
      test.fail(true, "last_name field does not exist — form uses full_name; test passes for wrong reason");

      await test.step("fill all required non-name fields and provide a valid first_name", async () => {
        await fillPatientFormExcept(page, "full_name");
        // Fill first_name with a valid value so only last_name is the problematic field.
        // Silently skipped if the first_name locator doesn't exist (structural bug).
        await page.getByLabel(/^first.?name/i).fill("John").catch(() => {
          // Field not found — the structural bug above is present
        });
      });

      await test.step("fill last_name with a single character", async () => {
        await page.getByLabel(/^last.?name/i).fill("D");
      });

      await test.step("submit form", async () => {
        await page.getByRole("button", { name: /save patient/i }).click();
      });

      await test.step("assert URL has not changed (form was not submitted)", async () => {
        await expect(
          page,
          "Page must remain on /patients/add — a 1-character last name must halt submission",
        ).toHaveURL(/\/patients\/add/);
      });

      await test.step("assert last_name minimum length error is visible", async () => {
        const nameError = page
          .locator("p.text-xs.text-red-600")
          .filter({ hasText: /last.?name|at least|minimum|2 character/i });
        await expect(
          nameError,
          "A minimum length error must appear after submitting a 1-character last name",
        ).toBeVisible({ timeout: 3000 });
      });
    });

    // BUG: first_name missing maximum length validation (and field doesn't exist
    //   as a separate input — see structural bug above)
    // Expected: submitting a 500-character first_name blocks the form and renders
    //   an inline maximum-length error (e.g. "cannot exceed 100 characters")
    // GitHub Issue: [Patient Form] first_name maximum length not enforced
    test("Patient Form | first_name | 500-character value blocks submission and shows maximum length error", async ({
      page,
    }) => {
      test.info().annotations.push({ type: "feature", description: "Patient Validation" });
      test.info().annotations.push({ type: "severity", description: "critical" });
      test.fail(true, "first_name field does not exist — form uses full_name; test passes for wrong reason");

      const fiveHundredAs = "A".repeat(500);

      await test.step("fill all required non-name fields", async () => {
        await fillPatientFormExcept(page, "full_name");
      });

      await test.step("fill first_name with 500 characters", async () => {
        await page.getByLabel(/^first.?name/i).fill(fiveHundredAs);
      });

      await test.step("submit form", async () => {
        await page.getByRole("button", { name: /save patient/i }).click();
      });

      await test.step("assert URL has not changed (form was not submitted)", async () => {
        await expect(
          page,
          "Page must remain on /patients/add — a 500-character first name must halt submission",
        ).toHaveURL(/\/patients\/add/);
      });

      await test.step("assert first_name maximum length error is visible", async () => {
        const nameError = page
          .locator("p.text-xs.text-red-600")
          .filter({ hasText: /first.?name|too long|maximum|cannot exceed/i });
        await expect(
          nameError,
          "A maximum length error must appear after submitting a 500-character first name",
        ).toBeVisible({ timeout: 3000 });
      });
    });

    // BUG: first_name missing letters-only format validation — numeric characters
    //   are not rejected (and field doesn't exist as a separate input — see
    //   structural bug above)
    // Expected: submitting "J0hn123" blocks the form and renders a letters-only
    //   inline error (e.g. "Name must contain letters only")
    // GitHub Issue: [Patient Form] first_name accepts numeric characters
    test("Patient Form | first_name | numeric value 'J0hn123' blocks submission and shows letters-only error", async ({
      page,
    }) => {
      test.info().annotations.push({ type: "feature", description: "Patient Validation" });
      test.info().annotations.push({ type: "severity", description: "critical" });
      test.fail(true, "first_name field does not exist — form uses full_name; test passes for wrong reason");

      await test.step("fill all required non-name fields", async () => {
        await fillPatientFormExcept(page, "full_name");
      });

      await test.step("fill first_name with a value containing numbers", async () => {
        await page.getByLabel(/^first.?name/i).fill("J0hn123");
      });

      await test.step("submit form", async () => {
        await page.getByRole("button", { name: /save patient/i }).click();
      });

      await test.step("assert URL has not changed (form was not submitted)", async () => {
        await expect(
          page,
          "Page must remain on /patients/add — a first name containing numbers must halt submission",
        ).toHaveURL(/\/patients\/add/);
      });

      await test.step("assert letters-only format error is visible", async () => {
        const nameError = page
          .locator("p.text-xs.text-red-600")
          .filter({ hasText: /letters only|letters|format|invalid|first.?name/i });
        await expect(
          nameError,
          "A letters-only format error must appear after submitting a first name with numeric characters",
        ).toBeVisible({ timeout: 3000 });
      });
    });

    // BUG: first_name missing letters-only format validation — special characters
    //   are not rejected (and field doesn't exist as a separate input — see
    //   structural bug above)
    // Expected: submitting "J@hn!" blocks the form and renders a letters-only
    //   inline error (e.g. "Name must contain letters only")
    // GitHub Issue: [Patient Form] first_name accepts special characters
    test("Patient Form | first_name | symbols 'J@hn!' block submission and show letters-only error", async ({
      page,
    }) => {
      test.info().annotations.push({ type: "feature", description: "Patient Validation" });
      test.info().annotations.push({ type: "severity", description: "critical" });
      test.fail(true, "first_name field does not exist — form uses full_name; test passes for wrong reason");

      await test.step("fill all required non-name fields", async () => {
        await fillPatientFormExcept(page, "full_name");
      });

      await test.step("fill first_name with a value containing symbols", async () => {
        await page.getByLabel(/^first.?name/i).fill("J@hn!");
      });

      await test.step("submit form", async () => {
        await page.getByRole("button", { name: /save patient/i }).click();
      });

      await test.step("assert URL has not changed (form was not submitted)", async () => {
        await expect(
          page,
          "Page must remain on /patients/add — a first name containing symbols must halt submission",
        ).toHaveURL(/\/patients\/add/);
      });

      await test.step("assert letters-only format error is visible", async () => {
        const nameError = page
          .locator("p.text-xs.text-red-600")
          .filter({ hasText: /letters only|letters|format|invalid|first.?name/i });
        await expect(
          nameError,
          "A letters-only format error must appear after submitting a first name with symbol characters",
        ).toBeVisible({ timeout: 3000 });
      });
    });

    // ── Insurance cross-field and length adversarial tests ────────────────────

    // BUG: member_id required validation may not fire when insurance_provider is
    //   set and policy_number has a value — partial-fill scenario not covered
    // Expected: provider filled + policy filled + member_id empty must block
    //   submission and show a member ID required inline error
    // GitHub Issue: [Patient Form] member_id required error missing when only
    //   member_id is absent (provider + policy filled)
    test("Patient Form | insurance | provider and policy filled but member_id empty blocks submission and shows member ID required error", async ({
      page,
    }) => {
      test.info().annotations.push({ type: "feature", description: "Patient Validation" });
      test.info().annotations.push({ type: "severity", description: "critical" });

      const tracker = trackPatientPost(page);

      await test.step("fill all required fields including provider and policy, omit member_id", async () => {
        // fillPatientFormExcept("insurance_member_id") fills every field defined
        // in the helper — including insurance_provider ("Aetna") and
        // insurance_policy_number ("POL123456") — while leaving member_id blank.
        await fillPatientFormExcept(page, "insurance_member_id");
      });

      await test.step("submit form", async () => {
        await page.getByRole("button", { name: /save patient/i }).click();
        tracker.stop();
      });

      await test.step("assert URL has not changed (form was not submitted)", async () => {
        await expect(
          page,
          "Page must remain on /patients/add — provider + policy filled but member_id absent must halt submission",
        ).toHaveURL(/\/patients\/add/);
      });

      await test.step("assert member ID required error is visible", async () => {
        const memberError = page
          .locator("p.text-xs.text-red-600")
          .filter({ hasText: /member.*id|member.*required|required.*member/i });
        await expect(
          memberError,
          "Member ID required error must appear when provider and policy are filled but member_id is absent",
        ).toBeVisible({ timeout: 3000 });
      });

      await test.step("assert POST /patients was not fired (frontend validation must block HTTP request)", async () => {
        expect(
          tracker.wasCalled(),
          "POST /patients must not be fired — frontend Zod validation must block the HTTP call before it reaches the backend",
        ).toBe(false);
      });
    });

    // BUG: policy_number required validation may not fire when insurance_provider
    //   is set and member_id has a value — partial-fill scenario not covered
    // Expected: provider filled + member_id filled + policy_number empty must
    //   block submission and show a policy number required inline error
    // GitHub Issue: [Patient Form] policy_number required error missing when only
    //   policy_number is absent (provider + member_id filled)
    test("Patient Form | insurance | provider and member_id filled but policy_number empty blocks submission and shows policy number required error", async ({
      page,
    }) => {
      test.info().annotations.push({ type: "feature", description: "Patient Validation" });
      test.info().annotations.push({ type: "severity", description: "critical" });

      const tracker = trackPatientPost(page);

      await test.step("fill all required fields including provider and member_id, omit policy_number", async () => {
        // fillPatientFormExcept("insurance_policy_number") fills every field
        // including insurance_provider ("Aetna") and insurance_member_id
        // ("MEM45678") while leaving policy_number blank.
        await fillPatientFormExcept(page, "insurance_policy_number");
      });

      await test.step("submit form", async () => {
        await page.getByRole("button", { name: /save patient/i }).click();
        tracker.stop();
      });

      await test.step("assert URL has not changed (form was not submitted)", async () => {
        await expect(
          page,
          "Page must remain on /patients/add — provider + member_id filled but policy_number absent must halt submission",
        ).toHaveURL(/\/patients\/add/);
      });

      await test.step("assert policy number required error is visible", async () => {
        const policyError = page
          .locator("p.text-xs.text-red-600")
          .filter({ hasText: /policy.*number|policy.*required|required.*policy/i });
        await expect(
          policyError,
          "Policy number required error must appear when provider and member_id are filled but policy_number is absent",
        ).toBeVisible({ timeout: 3000 });
      });

      await test.step("assert POST /patients was not fired (frontend validation must block HTTP request)", async () => {
        expect(
          tracker.wasCalled(),
          "POST /patients must not be fired — frontend Zod validation must block the HTTP call before it reaches the backend",
        ).toBe(false);
      });
    });

    // BUG: member_id minimum length validation not enforced — a 1-character
    //   value is accepted without a length error
    // Expected: submitting member_id "A" (1 char) blocks the form and renders
    //   an inline minimum-length error (e.g. "must be at least 8 characters")
    // GitHub Issue: [Patient Form] member_id minimum length not enforced
    test("Patient Form | insurance | member_id with 1 character blocks submission and shows minimum length error", async ({
      page,
    }) => {
      test.info().annotations.push({ type: "feature", description: "Patient Validation" });
      test.info().annotations.push({ type: "severity", description: "critical" });

      const tracker = trackPatientPost(page);

      await test.step("fill all required fields, then override member_id with a single character", async () => {
        // Fill everything including a valid member_id first, then replace it
        // with a 1-char value so every other field is valid.
        await fillPatientFormExcept(page, "insurance_member_id");
        await page.getByLabel(/^member id/i).fill("A");
      });

      await test.step("submit form", async () => {
        await page.getByRole("button", { name: /save patient/i }).click();
        tracker.stop();
      });

      await test.step("assert URL has not changed (form was not submitted)", async () => {
        await expect(
          page,
          "Page must remain on /patients/add — a 1-character member ID must halt submission",
        ).toHaveURL(/\/patients\/add/);
      });

      await test.step("assert member_id minimum length error is visible", async () => {
        const memberError = page
          .locator("p.text-xs.text-red-600")
          .filter({ hasText: /member.*id|at least|minimum|character/i });
        await expect(
          memberError,
          "A minimum length error must appear after submitting a 1-character member ID",
        ).toBeVisible({ timeout: 3000 });
      });

      await test.step("assert POST /patients was not fired (frontend validation must block HTTP request)", async () => {
        expect(
          tracker.wasCalled(),
          "POST /patients must not be fired — frontend Zod validation must block the HTTP call before it reaches the backend",
        ).toBe(false);
      });
    });

    // BUG: policy_number minimum length validation not enforced — a 1-character
    //   value is accepted without a length error
    // Expected: submitting policy_number "A" (1 char) blocks the form and renders
    //   an inline minimum-length error (e.g. "must be at least 6 characters")
    // GitHub Issue: [Patient Form] policy_number minimum length not enforced
    test("Patient Form | insurance | policy_number with 1 character blocks submission and shows minimum length error", async ({
      page,
    }) => {
      test.info().annotations.push({ type: "feature", description: "Patient Validation" });
      test.info().annotations.push({ type: "severity", description: "critical" });

      const tracker = trackPatientPost(page);

      await test.step("fill all required fields, then override policy_number with a single character", async () => {
        // Fill everything including a valid policy_number first, then replace it
        // with a 1-char value so every other field is valid.
        await fillPatientFormExcept(page, "insurance_policy_number");
        await page.getByLabel(/policy number/i).fill("A");
      });

      await test.step("submit form", async () => {
        await page.getByRole("button", { name: /save patient/i }).click();
        tracker.stop();
      });

      await test.step("assert URL has not changed (form was not submitted)", async () => {
        await expect(
          page,
          "Page must remain on /patients/add — a 1-character policy number must halt submission",
        ).toHaveURL(/\/patients\/add/);
      });

      await test.step("assert policy_number minimum length error is visible", async () => {
        const policyError = page
          .locator("p.text-xs.text-red-600")
          .filter({ hasText: /policy|at least|minimum|character/i });
        await expect(
          policyError,
          "A minimum length error must appear after submitting a 1-character policy number",
        ).toBeVisible({ timeout: 3000 });
      });

      await test.step("assert POST /patients was not fired (frontend validation must block HTTP request)", async () => {
        expect(
          tracker.wasCalled(),
          "POST /patients must not be fired — frontend Zod validation must block the HTTP call before it reaches the backend",
        ).toBe(false);
      });
    });

    // ── Format / regex field adversarial tests ────────────────────────────────

    test("Patient Form | dob | future date blocks submission and shows future-date error", async ({
      page,
    }) => {
      test.info().annotations.push({ type: "feature", description: "Patient Validation" });
      test.info().annotations.push({ type: "severity", description: "critical" });

      const tracker = trackPatientPost(page);

      await test.step("fill all required fields with a future DOB", async () => {
        // fill() writes directly to the input value, bypassing the browser's
        // max={today} date-picker UI constraint. Zod's .refine() fires:
        //   "Date of birth cannot be in the future"
        await fillPatientFormExcept(page, "dob");
        await page.getByLabel(/date of birth/i).fill("2099-01-01");
      });

      await test.step("submit form", async () => {
        await page.getByRole("button", { name: /save patient/i }).click();
        tracker.stop();
      });

      await test.step("assert URL has not changed (form was not submitted)", async () => {
        await expect(
          page,
          "Page must remain on /patients/add — a future DOB must halt submission",
        ).toHaveURL(/\/patients\/add/);
      });

      await test.step("assert future-date inline error is visible", async () => {
        const dobError = page
          .locator("p.text-xs.text-red-600")
          .filter({ hasText: /future/i });
        await expect(
          dobError,
          "DOB inline error must mention 'future' after submitting a date of 2099-01-01",
        ).toBeVisible({ timeout: 3000 });
      });

      await test.step("assert POST /patients was not fired", async () => {
        expect(
          tracker.wasCalled(),
          "POST /patients must not be fired — Zod refine must block the HTTP call",
        ).toBe(false);
      });
    });

    test("Patient Form | phone | invalid format blocks submission and shows format error", async ({
      page,
    }) => {
      test.info().annotations.push({ type: "feature", description: "Patient Validation" });
      test.info().annotations.push({ type: "severity", description: "critical" });

      const tracker = trackPatientPost(page);

      await test.step("fill all required fields with an invalid phone number", async () => {
        // "not-a-phone" passes the fast-path !phone.trim() check (non-empty)
        // but fails Zod: /^\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/
        // error: "Please enter a valid 10-digit phone number (e.g. (555) 123-4567)"
        await fillPatientFormExcept(page, "phone");
        await page.getByLabel(/^phone/i).fill("not-a-phone");
      });

      await test.step("submit form", async () => {
        await page.getByRole("button", { name: /save patient/i }).click();
        tracker.stop();
      });

      await test.step("assert URL has not changed (form was not submitted)", async () => {
        await expect(
          page,
          "Page must remain on /patients/add — an invalid phone format must halt submission",
        ).toHaveURL(/\/patients\/add/);
      });

      await test.step("assert phone format inline error is visible", async () => {
        const phoneError = page
          .locator("p.text-xs.text-red-600")
          .filter({ hasText: /valid.*10.?digit|10.?digit|valid phone/i });
        await expect(
          phoneError,
          "Phone inline error must mention valid 10-digit format after submitting 'not-a-phone'",
        ).toBeVisible({ timeout: 3000 });
      });

      await test.step("assert POST /patients was not fired", async () => {
        expect(
          tracker.wasCalled(),
          "POST /patients must not be fired — Zod regex must block the HTTP call",
        ).toBe(false);
      });
    });

    test("Patient Form | full_name | value with numbers is accepted", async ({
      page,
    }) => {
      test.info().annotations.push({ type: "feature", description: "Patient Validation" });
      test.info().annotations.push({ type: "severity", description: "normal" });

      const tracker = trackPatientPost(page);

      await test.step("fill all required fields with a name containing digits", async () => {
        // Names like "John123" or "E2E Patient 1776027919159" are valid — the
        // regex /^[A-Za-z0-9\s'\-\.]+$/ allows alphanumeric characters.
        await fillPatientFormExcept(page, "full_name");
        await page.getByLabel(/full name/i).fill("John123");
      });

      await test.step("submit form", async () => {
        await page.getByRole("button", { name: /save patient/i }).click();
        tracker.stop();
      });

      await test.step("assert no letters-only error is shown", async () => {
        const nameError = page
          .locator("p.text-xs.text-red-600")
          .filter({ hasText: /letters only/i });
        await expect(
          nameError,
          "No 'letters only' error should appear — alphanumeric names are allowed",
        ).toBeHidden({ timeout: 3000 });
      });
    });

    test("Patient Form | insurance_provider | value with special chars blocks submission and shows letters-only error", async ({
      page,
    }) => {
      test.info().annotations.push({ type: "feature", description: "Patient Validation" });
      test.info().annotations.push({ type: "severity", description: "critical" });

      const tracker = trackPatientPost(page);

      await test.step("fill all required fields with an invalid insurance provider", async () => {
        // "Aetna@123" is non-empty so it passes the fast-path required check,
        // but fails the Zod refine:
        //   v === "SELF_PAY" || /^[A-Za-z\s&'\-\.]+$/.test(v)
        //   → "Insurance provider must contain letters only"
        await fillPatientFormExcept(page, "insurance_provider");
        await page.getByLabel(/insurance provider/i).fill("Aetna@123");
      });

      await test.step("submit form", async () => {
        await page.getByRole("button", { name: /save patient/i }).click();
        tracker.stop();
      });

      await test.step("assert URL has not changed (form was not submitted)", async () => {
        await expect(
          page,
          "Page must remain on /patients/add — an insurance provider with symbols must halt submission",
        ).toHaveURL(/\/patients\/add/);
      });

      await test.step("assert insurance provider letters-only error is visible", async () => {
        const providerError = page
          .locator("p.text-xs.text-red-600")
          .filter({ hasText: /letters only/i });
        await expect(
          providerError,
          "Insurance provider inline error must mention 'letters only' after submitting 'Aetna@123'",
        ).toBeVisible({ timeout: 3000 });
      });

      await test.step("assert POST /patients was not fired", async () => {
        expect(
          tracker.wasCalled(),
          "POST /patients must not be fired — Zod refine must block the HTTP call",
        ).toBe(false);
      });
    });

    /**
     * Happy path: insured (non-self-pay) patient with all fields valid must submit
     * successfully and navigate away. Complements the self-pay happy path above.
     * Verifies that the insurance-required cross-field validation does NOT fire
     * when all insurance fields are properly filled.
     */
    test("Patient Form | submit | insured patient with all fields valid navigates away and persists to DB", async ({
      page,
    }) => {
      test.info().annotations.push({ type: "feature", description: "Patient Validation" });
      test.info().annotations.push({ type: "severity", description: "critical" });

      // Unique name so the DB assertion cannot match a record from a previous run.
      const insuredName = `Ins E2E ${Date.now()}`;

      await test.step("fill all personal, address, and insurance fields", async () => {
        await page.getByLabel(/full name/i).fill(insuredName);
        await page.getByLabel(/date of birth/i).fill("1985-07-04");
        await page.getByLabel(/^phone/i).fill("5550003333");
        await page.getByLabel(/street address/i).fill("77 Insurance Blvd");
        await page.getByLabel(/^city/i).fill("Chicago");
        await page.getByLabel(/^state/i).selectOption("IL");
        await page.getByLabel(/zip code/i).fill("60601");
        await page.getByLabel(/insurance provider/i).fill("Blue Cross Blue Shield");
        await page.getByLabel(/policy number/i).fill("POL999888");
        await page.getByLabel(/^member id/i).fill("MEM77665");
      });

      await test.step("submit form", async () => {
        await page.getByRole("button", { name: /save patient/i }).click();
      });

      await test.step("assert no validation errors are shown", async () => {
        await expect(
          page.locator("p.text-xs.text-red-600"),
          "No inline validation errors must appear after submitting a fully valid insured patient",
        ).not.toBeVisible({ timeout: 3000 });
      });

      await test.step("assert navigation away from add page (successful submit)", async () => {
        await expect(
          page,
          "Page must navigate away from /patients/add after a successful insured patient submission",
        ).not.toHaveURL(/\/patients\/add/, { timeout: 10000 });
      });

      await test.step("verify patient persisted in backend database", async () => {
        const res = await page.request.get(`${API_BASE}/patients`);
        expect(res.ok(), `GET /patients returned ${res.status()} — cannot verify DB persistence`).toBeTruthy();
        const json = await res.json();
        const found = (json.data ?? []).some((p: any) => p.full_name === insuredName);
        expect(
          found,
          `Insured patient "${insuredName}" must be retrievable from GET /patients after successful submission`,
        ).toBe(true);
      });
    });
  });
});
