import dotenv from "dotenv";
import path from "path";

const envPath = path.resolve(__dirname, "../.env");
console.log("📁 Loading .env from:", envPath);

dotenv.config({ path: envPath });

// Debug: Log what was loaded
console.log("🔍 Environment variables loaded:");
console.log("  - AWS_USER_POOL_ID:", process.env.AWS_USER_POOL_ID ? "✅ Set" : "❌ Missing");
console.log("  - AWS_CLIENT_ID:", process.env.AWS_CLIENT_ID ? "✅ Set" : "❌ Missing");
console.log("  - API_ANALYTICS_KEY:", process.env.API_ANALYTICS_KEY ? "✅ Set" : "❌ Missing");

if (!process.env.AWS_USER_POOL_ID || !process.env.AWS_CLIENT_ID) {
  console.warn("⚠️  dotenv: missing Cognito values, please check RevClear/backend/.env");
}

if (!process.env.API_ANALYTICS_KEY) {
  console.warn("⚠️  dotenv: missing API_ANALYTICS_KEY, analytics will not work");
}