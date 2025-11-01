// src/lib/db.ts
import { Client, type QueryResultRow } from 'pg';

// ✅ Pojistka pro Vercel, aby Node ignoroval self-signed certs
if (process.env.NODE_ENV === 'production') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

export async function query<T extends QueryResultRow = any>(
  sql: string,
  params: any[] = []
) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, // vždy zapnuto, ne jen podmíněně
  });

  await client.connect();
  try {
    const res = await client.query<T>(sql, params);
    return res.rows;
  } finally {
    await client.end();
  }
}