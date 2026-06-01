import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

function buildPoolConfig(): PoolConfig {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    const useSsl =
      process.env.DB_SSL === 'true' ||
      process.env.NODE_ENV === 'production' ||
      databaseUrl.includes('sslmode=require');

    return {
      connectionString: databaseUrl,
      max: parseInt(process.env.DB_POOL_MAX || '20', 10),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    };
  }

  const poolConfig: PoolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'usemap_restore',
    max: parseInt(process.env.DB_POOL_MAX || '20', 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  };

  if (process.env.DB_SSL === 'true') {
    poolConfig.ssl = { rejectUnauthorized: false };
  }

  return poolConfig;
}

export const pool = new Pool(buildPoolConfig());

let dbReady = false;

export function isDbReady(): boolean {
  return dbReady;
}

export async function testConnection(): Promise<boolean> {
  let client;
  try {
    client = await pool.connect();
    const res = await client.query('SELECT NOW()');
    console.log(`[DB] Database connection established successfully at ${res.rows[0].now}`);
    dbReady = true;
    return true;
  } catch (err) {
    console.error('[DB] Database connection failed:', err);
    dbReady = false;
    return false;
  } finally {
    if (client) client.release();
  }
}
