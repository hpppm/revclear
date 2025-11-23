import { Pool, PoolConfig, QueryResult, QueryResultRow } from "pg";
import { appConfig } from "./appConfig";

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

// Force SSL for debugging 'no encryption' error
poolConfig.ssl = { rejectUnauthorized: false };
// if (appConfig.db.ssl) {
//   poolConfig.ssl = { rejectUnauthorized: false };
// }

console.log("DB Config:", {
  host: poolConfig.host,
  user: poolConfig.user,
  database: poolConfig.database,
  ssl: poolConfig.ssl,
});

const pool = new Pool(poolConfig);

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL pool error", err);
});

export const query = <T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> => pool.query<T>(text, params);

export const findUserByCognitoId = async (cognitoId: string) => {
  const result = await query('SELECT id, cognito_id, email, full_name, role, practitioner_type, license_id, created_at FROM users WHERE cognito_id = $1', [cognitoId]);
  return result.rows[0];
};

export const findUserByEmail = async (email: string) => {
  const result = await query('SELECT id, cognito_id, email, full_name, role, practitioner_type, license_id, created_at FROM users WHERE email = $1', [email]);
  return result.rows[0];
};

export const updateUserCognitoId = async (email: string, cognitoId: string) => {
  const result = await query(
    'UPDATE users SET cognito_id = $1 WHERE email = $2 RETURNING id, cognito_id, email, full_name, role, practitioner_type, license_id, created_at',
    [cognitoId, email]
  );
  return result.rows[0];
};

export const createUser = async (
  cognitoId: string,
  email: string,
  fullName: string,
  practitionerType?: string,
  licenseId?: string
) => {
  const result = await query(
    'INSERT INTO users (cognito_id, email, full_name, practitioner_type, license_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, cognito_id, email, full_name, role, practitioner_type, license_id, created_at',
    [cognitoId, email, fullName, practitionerType || null, licenseId || null]
  );
  return result.rows[0];
};

export const updateUserPractitionerInfo = async (
  email: string,
  practitionerType?: string,
  licenseId?: string
) => {
  const result = await query(
    'UPDATE users SET practitioner_type = $1, license_id = $2 WHERE email = $3 RETURNING id, cognito_id, email, full_name, role, practitioner_type, license_id, created_at',
    [practitionerType || null, licenseId || null, email]
  );
  return result.rows[0];
};

export const getClient = () => pool.connect();

export const closePool = () => pool.end();

export default pool;
