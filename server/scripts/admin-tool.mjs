// Admin user utility for UYIR.
// Loads DATABASE_URL from server/.env (run with: node --env-file=.env scripts/admin-tool.mjs)
//
// List existing admins (default):
//   node --env-file=.env scripts/admin-tool.mjs
//
// Create or reset an admin (sets role=admin + password):
//   CREATE=1 MOBILE=9XXXXXXXXX NAME="Admin" PASSWORD="secret" node --env-file=.env scripts/admin-tool.mjs
//
// Upgrade a user to a specific role (e.g., super_admin):
//   node --env-file=.env scripts/admin-tool.mjs upgrade <mobile> <role>

import pg from "pg";
import bcrypt from "bcryptjs";

const { Pool } = pg;
const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set. Run with: node --env-file=.env scripts/admin-tool.mjs"); process.exit(1); }

const pool = new Pool({
  connectionString: url,
  ssl: url.includes("neon.tech") ? { rejectUnauthorized: false } : false,
});

async function listAdmins() {
  const { rows } = await pool.query(
    `SELECT "mobile","name","role", ("password" IS NOT NULL) AS "hasPassword"
     FROM "User" WHERE "role" IN ('admin','verifier','ngo_admin','super_admin') ORDER BY "role"`
  );
  if (!rows.length) { console.log("No admin/verifier/ngo_admin/super_admin users found."); return; }
  console.log("Existing privileged users:");
  for (const r of rows) console.log(`  [${r.role}] ${r.name} — ${r.mobile} (password set: ${r.hasPassword})`);
}

async function createAdmin() {
  const mobile = String(process.env.MOBILE || "").replace(/\D/g, "").slice(-10);
  const name = process.env.NAME || "UYIR Admin";
  const password = process.env.PASSWORD;
  if (!mobile || mobile.length !== 10 || !password) {
    console.error("CREATE requires MOBILE (10 digits) and PASSWORD."); process.exit(1);
  }
  const hash = bcrypt.hashSync(password, 10);
  const existing = await pool.query('SELECT "id" FROM "User" WHERE "mobile" = $1 LIMIT 1', [mobile]);
  if (existing.rows.length) {
    await pool.query('UPDATE "User" SET "role"=\'admin\', "password"=$1, "name"=$2 WHERE "mobile"=$3', [hash, name, mobile]);
    console.log(`Updated existing user ${mobile} → role=admin, password reset.`);
  } else {
    await pool.query(
      'INSERT INTO "User" ("id","mobile","name","role","password","createdAt") VALUES (gen_random_uuid(),$1,$2,\'admin\',$3,NOW())',
      [mobile, name, hash]
    );
    console.log(`Created new admin: ${name} — ${mobile}`);
  }
  console.log(`Login: mobile=${mobile} password=${password}`);
}

async function upgradeRole() {
  const args = process.argv.slice(2);
  if (args.length < 3 || args[0] !== "upgrade") {
    console.error("Usage: node --env-file=.env scripts/admin-tool.mjs upgrade <mobile> <role>");
    process.exit(1);
  }
  const mobile = String(args[1]).replace(/\D/g, "").slice(-10);
  const newRole = args[2];
  if (mobile.length !== 10) {
    console.error("Mobile must be 10 digits");
    process.exit(1);
  }
  const validRoles = ["admin", "verifier", "ngo_admin", "super_admin", "donor"];
  if (!validRoles.includes(newRole)) {
    console.error(`Invalid role. Valid roles: ${validRoles.join(", ")}`);
    process.exit(1);
  }
  const existing = await pool.query('SELECT "id","name","role" FROM "User" WHERE "mobile" = $1 LIMIT 1', [mobile]);
  if (!existing.rows.length) {
    console.error(`User with mobile ${mobile} not found`);
    process.exit(1);
  }
  const user = existing.rows[0];
  await pool.query('UPDATE "User" SET "role"=$1 WHERE "mobile"=$2', [newRole, mobile]);
  console.log(`Updated user ${mobile} (${user.name}): role ${user.role} → ${newRole}`);
}

(async () => {
  try {
    const args = process.argv.slice(2);
    if (args[0] === "upgrade") await upgradeRole();
    else if (process.env.CREATE === "1") await createAdmin();
    else await listAdmins();
  } catch (e) {
    console.error("Error:", e.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
