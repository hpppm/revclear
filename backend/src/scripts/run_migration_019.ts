import "../setupEnv";
import { query, closePool } from "../config/db";
import fs from "fs";
import path from "path";

const runMigration = async () => {
  try {
    const migrationPath = path.join(
      __dirname,
      "../../docs/db/019_rename_soap_flow_name.sql"
    );
    const sql = fs.readFileSync(migrationPath, "utf-8");

    console.log("Running migration 019...");
    await query(sql);
    console.log("Migration 019 completed successfully.");
  } catch (err) {
    console.error("Migration 019 failed:", err);
    process.exitCode = 1;
  } finally {
    await closePool();
  }
};

void runMigration();
