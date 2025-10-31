import 'server-only';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL as string;
if (!connectionString) throw new Error('DATABASE_URL is missing');

export const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

export async function query<T = any>(sql: string, params: any[] = []) {
  const client = await pool.connect();
  try {
    const res = await client.query<T>(sql, params);
    return res.rows as unknown as T[];
  } finally {
    client.release();
  }
}