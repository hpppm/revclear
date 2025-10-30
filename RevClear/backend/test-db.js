const { Pool } = require("pg");
require("dotenv").config({ path: ".env" });

console.log(
  "Connecting to:",
  process.env.DATABASE_URL.replace(/:[^:@]+@/, ":*****@")
);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

(async () => {
  try {
    const res = await pool.query("SELECT NOW()");
    console.log("✅ Connected to DB at:", res.rows[0].now);
    await pool.end();
  } catch (err) {
    console.error("❌ Database connection failed:", err.message);
  }
})();
