import { test as setup, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

const authFile = path.join(__dirname, "../../playwright/.auth/user.json");
const API_BASE = process.env.API_URL ?? "http://localhost:3005/api";

setup("authenticate", async ({ page }) => {
  const email = process.env.TEST_EMAIL;
  const password = process.env.TEST_PASSWORD;

  if (!email || !password) {
    // Write an empty but valid storage state so dependent projects can load it
    const dir = path.dirname(authFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(authFile, JSON.stringify({ cookies: [], origins: [] }));
    // Fail loudly so the problem is obvious in CI
    throw new Error(
      "TEST_EMAIL and TEST_PASSWORD must be set to run E2E tests.\n" +
        "Example: TEST_EMAIL=user@example.com TEST_PASSWORD=Secret123! npx playwright test"
    );
  }

  // Go directly to the login page
  await page.goto("/login");
  await page.waitForLoadState("networkidle");

  // AuthField renders <label> without htmlFor, so target inputs by name attribute
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);

  // Submit — button text is "Sign In" (see login/page.tsx)
  await page.getByRole("button", { name: "Sign In" }).click();

  // Wait for successful redirect to dashboard (may go through org setup first)
  await page.waitForURL(/\/(dashboard|organization|onboarding)/, {
    timeout: 30000,
  });

  await expect(page).not.toHaveURL(/\/login/);

  await page.context().storageState({ path: authFile });

  // Verify the saved cookies are accepted by the backend — not just that the
  // browser ended up on a non-login URL. A redirect to /organization can happen
  // even with an expired or malformed JWT; this request proves the token is valid.
  const meRes = await page.request.get(`${API_BASE}/me`);
  expect(
    meRes.status(),
    `GET /me returned ${meRes.status()} — saved auth cookies are not accepted by the backend; downstream tests will fail as unauthenticated`,
  ).toBe(200);
});
