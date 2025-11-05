// AWS Configuration for RevClear Backend
import { RDSDataService } from '@aws-sdk/client-rds-data';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { Pool } from 'pg';

const region = process.env.AWS_REGION || 'us-east-1';

// Secrets Manager Client
const secretsClient = new SecretsManagerClient({ region });

/**
 * Get database credentials from AWS Secrets Manager
 */
export async function getDatabaseCredentials() {
  try {
    const command = new GetSecretValueCommand({
      SecretId: process.env.AWS_SECRET_NAME || 'revclear/database/credentials',
    });
    
    const response = await secretsClient.send(command);
    const secret = JSON.parse(response.SecretString || '{}');
    
    return {
      host: secret.host,
      port: secret.port,
      database: secret.dbname,
      user: secret.username,
      password: secret.password,
    };
  } catch (error) {
    console.error('Error fetching database credentials:', error);
    throw error;
  }
}

/**
 * Create PostgreSQL connection pool using RDS
 */
export async function createDatabasePool(): Promise<Pool> {
  const credentials = await getDatabaseCredentials();
  
  return new Pool({
    host: credentials.host,
    port: credentials.port,
    database: credentials.database,
    user: credentials.user,
    password: credentials.password,
    ssl: {
      rejectUnauthorized: true,
    },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
}

/**
 * Test database connection
 */
export async function testDatabaseConnection(pool: Pool): Promise<boolean> {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('✓ Database connection successful:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('✗ Database connection failed:', error);
    return false;
  }
}

// Export database pool instance
let dbPool: Pool | null = null;

export async function getDbPool(): Promise<Pool> {
  if (!dbPool) {
    dbPool = await createDatabasePool();
  }
  return dbPool;
}

export async function closeDbPool(): Promise<void> {
  if (dbPool) {
    await dbPool.end();
    dbPool = null;
  }
}
