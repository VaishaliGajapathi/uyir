import pg from "pg";
import bcrypt from "bcryptjs";
const { Pool } = pg;
const url = process.env.DATABASE_URL;
const pool = new Pool({ connectionString: url, ssl: url.includes("neon.tech") ? { rejectUnauthorized: false } : false });
const host = (url.match(/@([^/]+)\//) || [])[1] || "unknown";
console.log("DB host:", host);
const { rows } = await pool.query('SELECT "mobile","name","role","password" FROM "User" WHERE "mobile" = ANY($1)', [["9384208281", "9000000001"]]);
for (const r of rows) {
  const demoMatch = r.password ? bcrypt.compareSync("demouser", r.password) : null;
  console.log(`  ${r.mobile} [${r.role}] ${r.name} — hasPassword=${!!r.password} demouserMatches=${demoMatch}`);
}
const { rows: cnt } = await pool.query('SELECT COUNT(*)::int AS c FROM "User"');
console.log("Total users in this DB:", cnt[0].c);
await pool.end();
