import { Pool, PoolClient } from "pg";

const isProd = process.env.NODE_ENV === "production";
const isNeon = process.env.DATABASE_URL?.includes("neon.tech");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isNeon ? { rejectUnauthorized: false } : false,
  max: isProd ? (isNeon ? 20 : 10) : 5,
  min: 0,
  idleTimeoutMillis: isNeon ? 20000 : 10000,
  connectionTimeoutMillis: 10000,
  statement_timeout: 30000,
  query_timeout: 30000,
});

pool.on("error", (err) => {
  console.error("[db] Pool error (idle client):", err.message);
});

pool.on("connect", (client) => {
  client.on("error", (err) => {
    console.error("[db] Client error:", err.message);
  });
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

export async function transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function healthCheck(): Promise<boolean> {
  try {
    const result = await pool.query("SELECT 1");
    return result.rowCount === 1;
  } catch {
    return false;
  }
}

export { pool };
