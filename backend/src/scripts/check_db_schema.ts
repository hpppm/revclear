import "../setupEnv";
import { query, closePool } from "../config/db";

const checkSchema = async () => {
    try {
        console.log("Checking claims table columns...");
        const result = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'claims';
    `);
        console.table(result.rows);
    } catch (err) {
        console.error("Schema check failed:", err);
    } finally {
        await closePool();
    }
};

checkSchema();
