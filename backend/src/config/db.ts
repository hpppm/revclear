import { Pool, PoolConfig, QueryResult, QueryResultRow } from "pg";

const {
  DB_HOST,
  DB_PORT,
  DB_USERNAME,
  DB_PASSWORD,
  DB_DATABASE,
  DB_SSL,
  DB_POOL_MAX,
  DB_IDLE_TIMEOUT_MS,
  DB_CONN_TIMEOUT_MS,
} = process.env;

if (!DB_HOST || !DB_USERNAME || !DB_PASSWORD || !DB_DATABASE) {
  throw new Error("Database configuration is incomplete. Please check DB_* environment variables.");
}

const poolConfig: PoolConfig = {
  host: DB_HOST,
  port: DB_PORT ? Number(DB_PORT) : 5432,
  user: DB_USERNAME,
  password: DB_PASSWORD,
  database: DB_DATABASE,
  max: DB_POOL_MAX ? Number(DB_POOL_MAX) : 10,
  idleTimeoutMillis: DB_IDLE_TIMEOUT_MS ? Number(DB_IDLE_TIMEOUT_MS) : 30000,
  connectionTimeoutMillis: DB_CONN_TIMEOUT_MS ? Number(DB_CONN_TIMEOUT_MS) : 5000,
};

const sslEnabled = DB_SSL ? DB_SSL.toLowerCase() === "true" : true;
if (sslEnabled) {
  poolConfig.ssl = { rejectUnauthorized: false };
}

const pool = new Pool(poolConfig);

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL pool error", err);
});

export const query = <T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> => pool.query<T>(text, params);

export const getClient = () => pool.connect();

export const closePool = () => pool.end();

export default pool;
