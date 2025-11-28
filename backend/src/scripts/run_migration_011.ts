import "../setupEnv";
import { query, closePool } from "../config/db";
import fs from "fs";
import path from "path";

const runMigration = async () => {
    try {
        const migrationPath = path.join(__dirname, "../../docs/db/011_add_claim_provider_details.sql");
        const sql = fs.readFileSync(migrationPath, "utf-8");

        console.log("Running migration 011...");
        await query(sql);
        console.log("Migration 011 completed successfully.");
    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        await closePool();
    }
};

runMigration();
