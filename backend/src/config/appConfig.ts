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
  AWS_IDENTITY_POOL_ID: z.string().min(1).optional(),
  ALLOWED_ORIGINS: z.string().optional(),

  CLEARINGHOUSE_URL: z.string().url().optional(),
  CLEARINGHOUSE_API_KEY: z.string().optional(),

  SOAP_API_URL: z.string().url().optional(),
  CODES_API_URL: z.string().url().optional(),
  AI_TRANSCRIBE_URL: z.string().url().optional(),
  TRANSCRIBE_API_URL: z.string().url().optional(),
  TRANSCRIBE_URL: z.string().url().optional(),
  AI_SERVER_API_KEY: z.string().min(1).optional(),
  AI_SERVER_HEALTH_URL: z.string().url().optional(),
  GEMINI_API_KEY: z.string().min(1).optional(),
  GEMINI_MODEL: z.string().min(1).optional(),
  PINECONE_API_KEY: z.string().min(1).optional(),
  PINECONE_INDEX_HOST: z.string().min(1).optional(),
  PINECONE_NAMESPACE: z.string().min(1).optional(),
  PINECONE_API_VERSION: z.string().min(1).optional(),

  TEST_EMAIL_DOMAIN: z.string().optional(),
  AUTO_CONFIRM_SIGNUP: z.string().optional(),
  AUTO_LOGIN_AFTER_SIGNUP: z.string().optional(),

}).superRefine((env, ctx) => {
  if (env.NODE_ENV !== "production") {
    return;
  }

  const requiredInProd: Array<[keyof typeof env, string | undefined]> = [
    ["AWS_S3_BUCKET", env.AWS_S3_BUCKET],
    ["AWS_USER_POOL_ID", env.AWS_USER_POOL_ID],
    ["AWS_CLIENT_ID", env.AWS_CLIENT_ID],
    ["ALLOWED_ORIGINS", env.ALLOWED_ORIGINS],
    ["AI_SERVER_API_KEY", env.AI_SERVER_API_KEY],
    ["GEMINI_API_KEY", env.GEMINI_API_KEY],
    ["PINECONE_API_KEY", env.PINECONE_API_KEY],
    ["PINECONE_INDEX_HOST", env.PINECONE_INDEX_HOST],
  ];

  for (const [key, value] of requiredInProd) {
    if (!value) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [key],
        message: `${key} is required in production`,
      });
    }
  }

  const transcribeUrl =
    env.AI_TRANSCRIBE_URL || env.TRANSCRIBE_API_URL || env.TRANSCRIBE_URL;
  if (!transcribeUrl) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["AI_TRANSCRIBE_URL"],
      message:
        "One of AI_TRANSCRIBE_URL, TRANSCRIBE_API_URL, or TRANSCRIBE_URL is required in production",
    });
  }
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
  allowedOrigins: env.ALLOWED_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) ?? [],
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
    identityPoolId: env.AWS_IDENTITY_POOL_ID,
  },
  cognito: {
    userPoolId: env.AWS_USER_POOL_ID,
    clientId: env.AWS_CLIENT_ID,
  },
  ai: {
    soapApiUrl: env.SOAP_API_URL,
    codesApiUrl: env.CODES_API_URL,
    transcribeUrl:
      env.AI_TRANSCRIBE_URL || env.TRANSCRIBE_API_URL || env.TRANSCRIBE_URL,
    serverApiKey: env.AI_SERVER_API_KEY,
    serverHealthUrl: env.AI_SERVER_HEALTH_URL,
    geminiApiKey: env.GEMINI_API_KEY,
    geminiModel: env.GEMINI_MODEL ?? "gemini-2.5-flash",
    pinecone: {
      apiKey: env.PINECONE_API_KEY,
      indexHost: env.PINECONE_INDEX_HOST,
      namespace: env.PINECONE_NAMESPACE ?? "medical-codes",
      apiVersion: env.PINECONE_API_VERSION ?? "2026-04",
    },
  },
  clearinghouse: {
    url: env.CLEARINGHOUSE_URL,
    apiKey: env.CLEARINGHOUSE_API_KEY,
  },
  auth: {
    // In development, keep auth flows limited to local test accounts unless overridden.
    // In production, allow any email unless TEST_EMAIL_DOMAIN is explicitly set.
    testEmailDomain:
      env.TEST_EMAIL_DOMAIN ||
      (env.NODE_ENV === "development" ? "@localhost.dev" : ""),
    autoConfirmSignup: (env.AUTO_CONFIRM_SIGNUP ?? "true").toLowerCase() !== "false",
    autoLoginAfterSignup: (env.AUTO_LOGIN_AFTER_SIGNUP ?? "true").toLowerCase() !== "false",
  },
};

export type AppConfig = typeof appConfig;
