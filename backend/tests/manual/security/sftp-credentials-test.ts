/**
 * Security Test: Verify SFTP credentials are not leaked via API
 *
 * This test verifies that the security fix in getUserOrganization()
 * properly excludes edi_sftp_password and edi_sftp_private_key from responses.
 *
 * Run with: npx ts-node tests/manual/security/sftp-credentials-test.ts
 */

import { query } from "../../src/config/db";

// The safe columns that SHOULD be returned (from organization.ts)
const EXPECTED_SAFE_SFTP_FIELDS = [
  "edi_sftp_host",
  "edi_sftp_username",
  "edi_sftp_port",
];

// The sensitive fields that should NEVER be returned
const SENSITIVE_FIELDS = ["edi_sftp_password", "edi_sftp_private_key"];

async function testSftpCredentialsNotLeaked() {
  console.log("\n========================================");
  console.log("  SFTP CREDENTIALS SECURITY TEST");
  console.log("========================================\n");

  try {
    // Import the function we're testing
    const { getUserOrganization } =
      await import("../../src/utils/organization");

    // Get a test user ID from the database
    const usersResult = await query(
      "SELECT id FROM users WHERE organization_id IS NOT NULL LIMIT 1",
    );

    if (usersResult.rows.length === 0) {
      console.log(
        "⚠️  No users with organizations found - creating test scenario...",
      );
      console.log("   Skipping live test, verifying code instead.\n");

      // Verify by checking the source code
      const fs = await import("fs");
      const path = await import("path");
      const orgUtilPath = path.join(
        __dirname,
        "../../src/utils/organization.ts",
      );
      const content = fs.readFileSync(orgUtilPath, "utf-8");

      // Check that ORG_SAFE_COLUMNS exists and excludes sensitive fields
      const hasOrgSafeColumns = content.includes("ORG_SAFE_COLUMNS");
      const excludesPassword = !content.match(/o\.edi_sftp_password[^_]/);
      const excludesPrivateKey = !content.match(/o\.edi_sftp_private_key[^_]/);
      const noSelectStar = !content.includes("SELECT o.*");

      console.log("CODE VERIFICATION:");
      console.log(
        `  ORG_SAFE_COLUMNS defined: ${hasOrgSafeColumns ? "✅ YES" : "❌ NO"}`,
      );
      console.log(`  SELECT o.* removed: ${noSelectStar ? "✅ YES" : "❌ NO"}`);
      console.log(
        `  edi_sftp_password excluded: ${excludesPassword ? "✅ YES" : "❌ NO"}`,
      );
      console.log(
        `  edi_sftp_private_key excluded: ${excludesPrivateKey ? "✅ YES" : "❌ NO"}`,
      );

      const allPassed =
        hasOrgSafeColumns &&
        excludesPassword &&
        excludesPrivateKey &&
        noSelectStar;
      console.log(`\nRESULT: ${allPassed ? "✅ PASS" : "❌ FAIL"}`);

      process.exit(allPassed ? 0 : 1);
    }

    const testUserId = usersResult.rows[0].id;
    console.log(`Testing with user ID: ${testUserId}\n`);

    // Call the function
    const organization = await getUserOrganization(testUserId);

    if (!organization) {
      console.log("⚠️  User has no organization - test inconclusive");
      process.exit(0);
    }

    console.log("ORGANIZATION DATA RETURNED:");
    console.log("----------------------------");

    // Check for sensitive fields
    let hasLeak = false;
    for (const field of SENSITIVE_FIELDS) {
      if (field in organization) {
        console.log(`  ❌ LEAK DETECTED: ${field} is present!`);
        hasLeak = true;
      } else {
        console.log(`  ✅ ${field}: NOT present (safe)`);
      }
    }

    // Check that safe fields ARE present
    console.log("\nNON-SENSITIVE SFTP FIELDS:");
    for (const field of EXPECTED_SAFE_SFTP_FIELDS) {
      if (field in organization) {
        console.log(`  ✅ ${field}: present`);
      } else {
        console.log(`  ⚠️  ${field}: not present (may be NULL)`);
      }
    }

    console.log("\n========================================");
    if (hasLeak) {
      console.log("  ❌ SECURITY TEST FAILED - CREDENTIALS LEAKED!");
      process.exit(1);
    } else {
      console.log("  ✅ SECURITY TEST PASSED");
    }
    console.log("========================================\n");

    process.exit(0);
  } catch (error) {
    console.error("Test error:", error);
    process.exit(1);
  }
}

// Run the test
testSftpCredentialsNotLeaked();
