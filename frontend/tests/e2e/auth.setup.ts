import { test as setup, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

const authFile = path.join(__dirname, "../../playwright/.auth/user.json");

setup("authenticate", async ({ page }) => {
  const email = process.env.TEST_EMAIL;
  const password = process.env.TEST_PASSWORD;

  if (!email || !password) {
    // Write empty auth state so tests can still be discovered
    const dir = path.dirname(authFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(authFile, JSON.stringify({ cookies: [], origins: [] }));
    setup.skip(true, "TEST_EMAIL and TEST_PASSWORD env vars required for E2E auth");
    return;
  }

  await page.goto("/");

  // Wait for redirect to login
  await page.waitForURL(/\/(login|auth|signin)/, { timeout: 10000 }).catch(() => {});

  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in|log in/i }).click();

  // Wait for successful login — dashboard or org setup
  await page.waitForURL(/\/(dashboard|organization|onboarding)/, { timeout: 20000 });

  await expect(page).not.toHaveURL(/login/);

  await page.context().storageState({ path: authFile });
});
