import { Pool, PoolClient, QueryResult } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err: Error) => {
  console.error('Unexpected database pool error:', err.message);
});

async function query(text: string, params?: unknown[]): Promise<QueryResult> {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  if (duration > 1000) {
    console.warn(`Slow query (${duration}ms): ${text.substring(0, 100)}`);
  }
  return result;
}

async function getClient(): Promise<PoolClient> {
  return pool.connect();
}

export { pool, query, getClient };
