import dotenv from "dotenv";
import path from "path";

const envPath = path.resolve(__dirname, "../.env");
dotenv.config({ path: envPath, quiet: true });

if (!process.env.AWS_USER_POOL_ID || !process.env.AWS_CLIENT_ID) {
  process.stderr.write("warn: missing Cognito env vars (AWS_USER_POOL_ID, AWS_CLIENT_ID)\n");
}

if (!process.env.API_ANALYTICS_KEY) {
  process.stderr.write("warn: missing API_ANALYTICS_KEY, analytics disabled\n");
}
