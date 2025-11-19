import dotenv from "dotenv";
import path from "path";

const envPath = path.resolve(__dirname, "../.env");
dotenv.config({ path: envPath });

if (!process.env.AWS_USER_POOL_ID || !process.env.AWS_CLIENT_ID) {
  console.warn("dotenv: missing Cognito values, please check RevClear/backend/.env");
}
