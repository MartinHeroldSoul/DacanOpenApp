import 'dotenv/config'
import { Client } from 'pg'
import type { QueryResultRow } from 'pg'

export async function query<T extends QueryResultRow = any>(
  sql: string,
  params: any[] = [],
) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, // <- důležité pro Vercel + Supabase
  })
  await client.connect()
  try {
    const res = await client.query<T>(sql, params)
    return res.rows
  } finally {
    await client.end()
  }
}