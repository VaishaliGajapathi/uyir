import { Pool, PoolClient } from "pg";

const isProd = process.env.NODE_ENV === "production";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("neon.tech") ? { rejectUnauthorized: false } : false,
  max: isProd ? 20 : 10,
  min: isProd ? 5 : 2,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

export async function query<T = any>(sql: string, params?: any[]): Promise<T[]> {
  let client: PoolClient | undefined;
  try {
    client = await pool.connect();
    const result = await client.query(sql, params);
    return result.rows as T[];
  } catch (e: any) {
    console.error("[db] query error:", e.message, "SQL:", sql.slice(0, 200));
    throw e;
  } finally {
    if (client) client.release();
  }
}

export async function queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] || null;
}

export async function exec(sql: string, params?: any[]): Promise<{ rowCount: number }> {
  let client: PoolClient | undefined;
  try {
    client = await pool.connect();
    const result = await client.query(sql, params);
    return { rowCount: result.rowCount || 0 };
  } catch (e: any) {
    console.error("[db] exec error:", e.message, "SQL:", sql.slice(0, 200));
    throw e;
  } finally {
    if (client) client.release();
  }
}

export { pool };
