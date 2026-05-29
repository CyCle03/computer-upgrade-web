import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// PostgreSQL 연결 정보 설정
const poolConfig: PoolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'usemap_restore',
  max: parseInt(process.env.DB_POOL_MAX || '20', 10), // 커넥션 풀 크기 제한
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// SSL 설정 추가 (Supabase 등 클라우드 DB 연결 대응)
if (process.env.DB_SSL === 'true') {
  poolConfig.ssl = {
    rejectUnauthorized: false,
  };
}

export const pool = new Pool(poolConfig);

// 연결 테스트용 헬퍼 함수
export async function testConnection(): Promise<boolean> {
  let client;
  try {
    client = await pool.connect();
    const res = await client.query('SELECT NOW()');
    console.log(`[DB] Database connection established successfully at ${res.rows[0].now}`);
    return true;
  } catch (err) {
    console.error('[DB] Database connection failed:', err);
    return false;
  } finally {
    if (client) client.release();
  }
}
