// src/lib/db.ts
import { Client, type QueryResultRow } from 'pg';

export async function query<T extends QueryResultRow = any>(
  sql: string,
  params: any[] = []
) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    // V produkci (Vercel) povol SSL, ale nevyžaduj validní CA řetězec
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  });

  await client.connect();
  try {
    const res = await client.query<T>(sql, params);
    return res.rows;
  } finally {
    await client.end();
  }
}