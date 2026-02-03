import { Pool, PoolConfig, QueryResult, QueryResultRow } from "pg";
import { appConfig } from "./appConfig";

const userColumns = [
  "id",
  "cognito_id",
  "email",
  "full_name",
  "role",
  "phone",
  "practitioner_type",
  "license_id",
  "license_state",
  "npi",
  "tax_id",
  "taxonomy_code",
  "provider_role",
  "created_at",
].join(", ");

const poolConfig: PoolConfig = {
  host: appConfig.db.host,
  port: appConfig.db.port,
  user: appConfig.db.user,
  password: appConfig.db.password,
  database: appConfig.db.database,
  max: appConfig.db.max,
  idleTimeoutMillis: appConfig.db.idleTimeoutMillis,
  connectionTimeoutMillis: appConfig.db.connectionTimeoutMillis,
};

// SSL configuration: strict verification in production, relaxed in development
poolConfig.ssl = process.env.NODE_ENV === 'production'
  ? { rejectUnauthorized: true, ...(process.env.DB_SSL_CA ? { ca: process.env.DB_SSL_CA } : {}) }
  : { rejectUnauthorized: false };

// SECURITY: Only log DB connection info in development (no credentials)
if (process.env.NODE_ENV === "development") {
  console.log("DB Config: connected to", poolConfig.database);
}

const pool = new Pool(poolConfig);

pool.on("error", (err: Error) => {
  console.error("Unexpected PostgreSQL pool error", err);
});

export const query = <T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> => pool.query<T>(text, params);

// ------------------------------------------------------------
// Users
// ------------------------------------------------------------

export const findUserByCognitoId = async (cognitoId: string) => {
  const result = await query(
    `SELECT ${userColumns} FROM users WHERE cognito_id = $1`,
    [cognitoId]
  );
  return result.rows[0];
};

export const findUserByEmail = async (email?: string) => {
  if (!email) return null; // NEW: Avoid invalid query when email missing
  const result = await query(
    `SELECT ${userColumns} FROM users WHERE email = $1`,
    [email]
  );
  return result.rows[0];
};

export const updateUserCognitoId = async (email: string, cognitoId: string) => {
  const result = await query(
    `UPDATE users SET cognito_id = $1 WHERE email = $2 RETURNING ${userColumns}`,
    [cognitoId, email]
  );
  return result.rows[0];
};

// NEW: safer user creation that handles missing email
export const createUser = async (
  cognitoId: string,
  email?: string,
  fullName?: string,
  practitionerType?: string,
  licenseId?: string
) => {
  const safeEmail = email || `${cognitoId}@auto.local`;
  const safeName = fullName || "Unknown User";

  const result = await query(
    `INSERT INTO users (cognito_id, email, full_name, practitioner_type, license_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${userColumns}`,
    [
      cognitoId,
      safeEmail,
      safeName,
      practitionerType || null,
      licenseId || null,
    ]
  );
  return result.rows[0];
};

// No change needed, but safe
export const updateUserPractitionerInfo = async (
  email: string,
  practitionerType?: string,
  licenseId?: string
) => {
  const result = await query(
    `UPDATE users SET practitioner_type = $1, license_id = $2 WHERE email = $3 RETURNING ${userColumns}`,
    [practitionerType || null, licenseId || null, email]
  );
  return result.rows[0];
};

export const getClient = () => pool.connect();

export const closePool = () => pool.end();

export default pool;
