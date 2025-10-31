import 'server-only';
import { Pool, type QueryResultRow } from 'pg';

const connectionString = process.env.DATABASE_URL as string;
if (!connectionString) throw new Error('DATABASE_URL is missing');

export const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

export async function query<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params: any[] = []
): Promise<T[]> {
  const client = await pool.connect();
  try {
    const res = await client.query<T>(sql, params);
    return res.rows as T[];
  } finally {
    client.release();
  }
}