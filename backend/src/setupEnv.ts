import dotenv from "dotenv";
import fs from "fs";
import path from "path";

const envFile = process.env.ENV_FILE;
const isProduction = process.env.NODE_ENV === "production";

const candidateEnvPaths = [
  envFile,
  path.resolve(process.cwd(), ".env"),
  path.resolve(__dirname, "../.env"),
  path.resolve(__dirname, "../../.env"),
].filter((value): value is string => Boolean(value));

const loadEnvFile = () => {
  if (isProduction && !envFile) {
    return;
  }

  const envPath = candidateEnvPaths.find((candidate) => fs.existsSync(candidate));
  if (envPath) {
    dotenv.config({ path: envPath, quiet: true });
  }
};

loadEnvFile();

if (!process.env.AWS_USER_POOL_ID || !process.env.AWS_CLIENT_ID) {
  process.stderr.write("warn: missing Cognito env vars (AWS_USER_POOL_ID, AWS_CLIENT_ID)\n");
}

if (!process.env.API_ANALYTICS_KEY) {
  process.stderr.write("warn: missing API_ANALYTICS_KEY, analytics disabled\n");
}
