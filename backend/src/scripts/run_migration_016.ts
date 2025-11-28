import "../setupEnv";
import { query, closePool } from "../config/db";

async function run() {
  try {
    console.log("Running migration 016: Adding phone and license_state to users...");
    
    // Add phone column if not exists
    await query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='phone') THEN
          ALTER TABLE users ADD COLUMN phone text;
        END IF;
      END
      $$;
    `);

    // Add license_state column if not exists
    await query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='license_state') THEN
          ALTER TABLE users ADD COLUMN license_state text;
        END IF;
      END
      $$;
    `);

    console.log("Migration 016 completed successfully.");
  } catch (error) {
    console.error("Migration 016 failed:", error);
    process.exit(1);
  } finally {
    await closePool();
  }
}

run();
