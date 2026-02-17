import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3005),
  DISABLE_LISTEN: z.string().optional(),

  DB_HOST: z.string().min(1, "DB_HOST is required"),
  DB_PORT: z.coerce.number().int().positive().default(5432),
  DB_USERNAME: z.string().min(1, "DB_USERNAME is required"),
  DB_PASSWORD: z.string().min(1, "DB_PASSWORD is required"),
  DB_DATABASE: z.string().min(1, "DB_DATABASE is required"),
  DB_SSL: z.string().optional(),
  DB_POOL_MAX: z.coerce.number().int().positive().optional(),
  DB_IDLE_TIMEOUT_MS: z.coerce.number().int().positive().optional(),
  DB_CONN_TIMEOUT_MS: z.coerce.number().int().positive().optional(),

  AWS_REGION: z.string().min(1).default("us-east-1"),
  AWS_S3_BUCKET: z.string().min(1).optional(),
  AWS_USER_POOL_ID: z.string().min(1).optional(),
  AWS_CLIENT_ID: z.string().min(1).optional(),

  TEST_EMAIL_DOMAIN: z.string().optional(),
  AUTO_CONFIRM_SIGNUP: z.string().optional(),
  AUTO_LOGIN_AFTER_SIGNUP: z.string().optional(),

});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  const message = parsed.error.errors
    .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
    .join("\n");
  throw new Error(`Invalid environment configuration:\n${message}`);
}

const env = parsed.data;

export const appConfig = {
  env: env.NODE_ENV,
  port: env.PORT,
  disableListen: env.DISABLE_LISTEN === "true",
  db: {
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    database: env.DB_DATABASE,
    ssl: env.DB_SSL ? env.DB_SSL.toLowerCase() === "true" : true,
    max: env.DB_POOL_MAX ?? 10,
    idleTimeoutMillis: env.DB_IDLE_TIMEOUT_MS ?? 30000,
    connectionTimeoutMillis: env.DB_CONN_TIMEOUT_MS ?? 5000,
  },
  aws: {
    region: env.AWS_REGION,
    s3Bucket: env.AWS_S3_BUCKET,
  },
  cognito: {
    userPoolId: env.AWS_USER_POOL_ID,
    clientId: env.AWS_CLIENT_ID,
  },
  auth: {
    testEmailDomain: env.TEST_EMAIL_DOMAIN || "@localhost.dev",
    autoConfirmSignup: (env.AUTO_CONFIRM_SIGNUP ?? "true").toLowerCase() !== "false",
    autoLoginAfterSignup: (env.AUTO_LOGIN_AFTER_SIGNUP ?? "true").toLowerCase() !== "false",
  },
};

export type AppConfig = typeof appConfig;
