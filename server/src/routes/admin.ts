import { Router, Request, Response, NextFunction } from "express";
import { query, queryOne, exec } from "../db.js";
import { requireAuth, requireAdminOrVerifier, requireAdminOrNgo, requireSuperAdmin } from "../middleware/auth.js";

export const adminRouter = Router();
adminRouter.use(requireAuth);

const ADMIN_ROLES = ["admin", "verifier", "ngo_admin", "super_admin"] as const;

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      console.error("[admin] route error:", err.message || err);
      res.status(500).json({ error: err.message || "Internal server error" });
    });
  };
}

// Stats for dashboard overview
adminRouter.get("/stats", requireAdminOrNgo, asyncHandler(async (_req: Request, res: Response) => {
  const users = await queryOne<any>('SELECT COUNT(*)::int as cnt FROM "User"');
  const donors = await queryOne<any>('SELECT COUNT(*)::int as cnt FROM "User" WHERE "role" = $1', ["donor"]);
  const requests = await queryOne<any>('SELECT COUNT(*)::int as cnt FROM "BloodRequest"');
  const pending = await queryOne<any>('SELECT COUNT(*)::int as cnt FROM "BloodRequest" WHERE "status" = $1', ["pending_verification"]);
  const active = await queryOne<any>('SELECT COUNT(*)::int as cnt FROM "BloodRequest" WHERE "status" NOT IN ($1,$2,$3)', ["closed", "rejected", "completed"]);
  const completed = await queryOne<any>('SELECT COUNT(*)::int as cnt FROM "DonorResponse" WHERE "status" = $1', ["completed"]);
  const reports = await queryOne<any>('SELECT COUNT(*)::int as cnt FROM "FraudReport"');
  const hospitals = await queryOne<any>('SELECT COUNT(*)::int as cnt FROM "Hospital"');
  const ngoUsers = await queryOne<any>('SELECT COUNT(*)::int as cnt FROM "User" WHERE "role" = $1', ["ngo_admin"]);
  res.json({
    totalUsers: users?.cnt || 0,
    totalDonors: donors?.cnt || 0,
    totalRequests: requests?.cnt || 0,
    pendingVerifications: pending?.cnt || 0,
    activeRequests: active?.cnt || 0,
    completedDonations: completed?.cnt || 0,
    livesSaved: completed?.cnt || 0,
    fraudReports: reports?.cnt || 0,
    totalHospitals: hospitals?.cnt || 0,
    totalNgoAdmins: ngoUsers?.cnt || 0,
  });
}));

// Donors list
adminRouter.get("/donors", requireAdminOrVerifier, asyncHandler(async (_req: Request, res: Response) => {
  const donors = await query<any>('SELECT * FROM "User" WHERE "role" = $1 ORDER BY "createdAt" DESC', ["donor"]);
  res.json(donors);
}));

// All requests
adminRouter.get("/requests", requireAdminOrVerifier, asyncHandler(async (_req: Request, res: Response) => {
  const requests = await query<any>('SELECT * FROM "BloodRequest" ORDER BY "createdAt" DESC', []);
  res.json(requests);
}));

// Pending verification requests
adminRouter.get("/pending-verification", requireAdminOrVerifier, asyncHandler(async (_req: Request, res: Response) => {
  const requests = await query<any>('SELECT * FROM "BloodRequest" WHERE "status" = $1 ORDER BY "createdAt" DESC', ["pending_verification"]);
  res.json(requests);
}));

// Hospitals list
adminRouter.get("/hospitals", requireAdminOrVerifier, asyncHandler(async (_req: Request, res: Response) => {
  const hospitals = await query<any>('SELECT * FROM "Hospital" ORDER BY "createdAt" DESC', []);
  res.json(hospitals);
}));

// Verify a hospital
adminRouter.post("/hospitals/:id/verify", requireAdminOrVerifier, asyncHandler(async (req: Request, res: Response) => {
  await exec('UPDATE "Hospital" SET "verified" = true WHERE "id" = $1', [req.params.id]);
  res.json({ ok: true });
}));

// Reject a hospital
adminRouter.post("/hospitals/:id/reject", requireAdminOrVerifier, asyncHandler(async (req: Request, res: Response) => {
  await exec('UPDATE "Hospital" SET "verified" = false WHERE "id" = $1', [req.params.id]);
  res.json({ ok: true });
}));

// Fraud reports
adminRouter.get("/fraud-reports", requireAdminOrVerifier, asyncHandler(async (_req: Request, res: Response) => {
  const reports = await query<any>('SELECT * FROM "FraudReport" ORDER BY "createdAt" DESC', []);
  res.json(reports);
}));

// Action a fraud report
adminRouter.post("/reports/:id/action", requireAdminOrVerifier, asyncHandler(async (req: Request, res: Response) => {
  await exec('UPDATE "FraudReport" SET "status" = $1 WHERE "id" = $2', ["actioned", req.params.id]);
  res.json({ ok: true });
}));

// Dismiss a fraud report
adminRouter.post("/reports/:id/dismiss", requireAdminOrVerifier, asyncHandler(async (req: Request, res: Response) => {
  await exec('UPDATE "FraudReport" SET "status" = $1 WHERE "id" = $2', ["dismissed", req.params.id]);
  res.json({ ok: true });
}));

// Verify (approve/reject) a blood request
adminRouter.post("/verify-request/:id", requireAdminOrNgo, asyncHandler(async (req: Request, res: Response) => {
  const { approved, notes } = req.body;
  const status = approved ? "verified" : "rejected";
  await exec('UPDATE "BloodRequest" SET "status" = $1, "verificationNotes" = $2, "verifiedAt" = NOW() WHERE "id" = $3', [status, notes || "", req.params.id]);
  const updated = await queryOne<any>('SELECT * FROM "BloodRequest" WHERE "id" = $1 LIMIT 1', [req.params.id]);
  res.json(updated);
}));

// Admin users list
adminRouter.get("/admins", requireAdminOrVerifier, asyncHandler(async (_req: Request, res: Response) => {
  const admins = await query<any>('SELECT * FROM "User" WHERE "role" IN ($1,$2,$3,$4) ORDER BY "createdAt" DESC', ["admin", "verifier", "ngo_admin", "super_admin"]);
  res.json(admins);
}));

// Create admin user
adminRouter.post("/admins", requireAdminOrVerifier, asyncHandler(async (req: Request, res: Response) => {
  const { name, mobile, email, role, password, district, ngoName, designation } = req.body;
  if (!name || !mobile || !role) return res.status(400).json({ error: "Missing fields" });
  if (!ADMIN_ROLES.includes(role)) return res.status(400).json({ error: "Invalid role" });
  if (role === "ngo_admin" && (!district || !ngoName)) {
    return res.status(400).json({ error: "district and ngoName are required for NGO admins" });
  }
  const bcrypt = await import("bcryptjs");
  const hashedPassword = password ? await bcrypt.hash(password, 10) : null;
  const sanitizedMobile = mobile.replace(/\D/g, "").slice(-10);
  const existingUser = await queryOne<any>('SELECT * FROM "User" WHERE "mobile" = $1 LIMIT 1', [sanitizedMobile]);
  if (existingUser) return res.status(400).json({ error: "User with this mobile already exists" });
  const user = await queryOne<any>(
    'INSERT INTO "User" ("id","name","mobile","email","password","role","language","verified","district","ngoName","designation","createdAt") VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,true,$7,$8,$9,NOW()) RETURNING *',
    [name, sanitizedMobile, email || null, hashedPassword, role, "ta", role === "ngo_admin" ? district : null, role === "ngo_admin" ? ngoName : null, designation || null]
  );
  res.status(201).json(user);
}));

// Close a request
adminRouter.post("/requests/:id/close", requireAdminOrNgo, asyncHandler(async (req: Request, res: Response) => {
  await exec('UPDATE "BloodRequest" SET "status" = $1, "closedAt" = NOW() WHERE "id" = $2', ["closed", req.params.id]);
  const updated = await queryOne<any>('SELECT * FROM "BloodRequest" WHERE "id" = $1 LIMIT 1', [req.params.id]);
  res.json(updated);
}));

// Reject a request
adminRouter.post("/requests/:id/reject", requireAdminOrNgo, asyncHandler(async (req: Request, res: Response) => {
  const { notes } = req.body;
  await exec('UPDATE "BloodRequest" SET "status" = $1, "verificationNotes" = $2, "verifiedAt" = NOW() WHERE "id" = $3', ["rejected", notes || "", req.params.id]);
  const updated = await queryOne<any>('SELECT * FROM "BloodRequest" WHERE "id" = $1 LIMIT 1', [req.params.id]);
  res.json(updated);
}));

// Ban a user
adminRouter.post("/ban-user/:id", requireAdminOrVerifier, asyncHandler(async (req: Request, res: Response) => {
  await exec('UPDATE "User" SET "reputationScore" = -1000, "banned" = true WHERE "id" = $1', [req.params.id]);
  const updated = await queryOne<any>('SELECT * FROM "User" WHERE "id" = $1 LIMIT 1', [req.params.id]);
  res.json(updated);
}));

// Legacy dashboard endpoint (kept for compatibility)
adminRouter.get("/dashboard", requireAdminOrNgo, asyncHandler(async (_req: Request, res: Response) => {
  const users = await queryOne<any>('SELECT COUNT(*)::int as cnt FROM "User"');
  const requests = await queryOne<any>('SELECT COUNT(*)::int as cnt FROM "BloodRequest"');
  const completed = await queryOne<any>('SELECT COUNT(*)::int as cnt FROM "DonorResponse" WHERE "status" = $1', ["completed"]);
  res.json({ totalUsers: users?.cnt || 0, totalRequests: requests?.cnt || 0, completedDonations: completed?.cnt || 0 });
}));

// SUPER ADMIN ONLY: Delete a user
adminRouter.delete("/users/:id", requireSuperAdmin, asyncHandler(async (req: Request, res: Response) => {
  const user = await queryOne<any>('SELECT * FROM "User" WHERE "id" = $1 LIMIT 1', [req.params.id]);
  if (!user) return res.status(404).json({ error: "User not found" });
  await exec('DELETE FROM "User" WHERE "id" = $1', [req.params.id]);
  res.json({ ok: true, deletedId: req.params.id });
}));

// SUPER ADMIN ONLY: Deactivate a user
adminRouter.post("/users/:id/deactivate", requireSuperAdmin, asyncHandler(async (req: Request, res: Response) => {
  const user = await queryOne<any>('SELECT * FROM "User" WHERE "id" = $1 LIMIT 1', [req.params.id]);
  if (!user) return res.status(404).json({ error: "User not found" });
  await exec('UPDATE "User" SET "verified" = false WHERE "id" = $1', [req.params.id]);
  const updated = await queryOne<any>('SELECT * FROM "User" WHERE "id" = $1 LIMIT 1', [req.params.id]);
  res.json(updated);
}));

// SUPER ADMIN ONLY: Freeze a user (set banned = true)
adminRouter.post("/users/:id/freeze", requireSuperAdmin, asyncHandler(async (req: Request, res: Response) => {
  const user = await queryOne<any>('SELECT * FROM "User" WHERE "id" = $1 LIMIT 1', [req.params.id]);
  if (!user) return res.status(404).json({ error: "User not found" });
  await exec('UPDATE "User" SET "banned" = true WHERE "id" = $1', [req.params.id]);
  const updated = await queryOne<any>('SELECT * FROM "User" WHERE "id" = $1 LIMIT 1', [req.params.id]);
  res.json(updated);
}));

// SUPER ADMIN ONLY: Delete a hospital
adminRouter.delete("/hospitals/:id", requireSuperAdmin, asyncHandler(async (req: Request, res: Response) => {
  const hospital = await queryOne<any>('SELECT * FROM "Hospital" WHERE "id" = $1 LIMIT 1', [req.params.id]);
  if (!hospital) return res.status(404).json({ error: "Hospital not found" });
  await exec('DELETE FROM "Hospital" WHERE "id" = $1', [req.params.id]);
  res.json({ ok: true, deletedId: req.params.id });
}));

// SUPER ADMIN ONLY: Deactivate a hospital
adminRouter.post("/hospitals/:id/deactivate", requireSuperAdmin, asyncHandler(async (req: Request, res: Response) => {
  const hospital = await queryOne<any>('SELECT * FROM "Hospital" WHERE "id" = $1 LIMIT 1', [req.params.id]);
  if (!hospital) return res.status(404).json({ error: "Hospital not found" });
  await exec('UPDATE "Hospital" SET "verified" = false WHERE "id" = $1', [req.params.id]);
  const updated = await queryOne<any>('SELECT * FROM "Hospital" WHERE "id" = $1 LIMIT 1', [req.params.id]);
  res.json(updated);
}));

// SUPER ADMIN ONLY: Freeze a hospital
adminRouter.post("/hospitals/:id/freeze", requireSuperAdmin, asyncHandler(async (req: Request, res: Response) => {
  const hospital = await queryOne<any>('SELECT * FROM "Hospital" WHERE "id" = $1 LIMIT 1', [req.params.id]);
  if (!hospital) return res.status(404).json({ error: "Hospital not found" });
  await exec('UPDATE "Hospital" SET "verified" = false, "active" = false WHERE "id" = $1', [req.params.id]);
  const updated = await queryOne<any>('SELECT * FROM "Hospital" WHERE "id" = $1 LIMIT 1', [req.params.id]);
  res.json(updated);
}));

// SUPER ADMIN ONLY: Delete an admin user
adminRouter.delete("/admins/:id", requireSuperAdmin, asyncHandler(async (req: Request, res: Response) => {
  const admin = await queryOne<any>('SELECT * FROM "User" WHERE "id" = $1 AND "role" IN ($2,$3,$4,$5) LIMIT 1', [req.params.id, "admin", "verifier", "ngo_admin", "super_admin"]);
  if (!admin) return res.status(404).json({ error: "Admin user not found" });
  await exec('DELETE FROM "User" WHERE "id" = $1', [req.params.id]);
  res.json({ ok: true, deletedId: req.params.id });
}));

// SUPER ADMIN ONLY: Deactivate an admin user
adminRouter.post("/admins/:id/deactivate", requireSuperAdmin, asyncHandler(async (req: Request, res: Response) => {
  const admin = await queryOne<any>('SELECT * FROM "User" WHERE "id" = $1 AND "role" IN ($2,$3,$4,$5) LIMIT 1', [req.params.id, "admin", "verifier", "ngo_admin", "super_admin"]);
  if (!admin) return res.status(404).json({ error: "Admin user not found" });
  await exec('UPDATE "User" SET "verified" = false WHERE "id" = $1', [req.params.id]);
  const updated = await queryOne<any>('SELECT * FROM "User" WHERE "id" = $1 LIMIT 1', [req.params.id]);
  res.json(updated);
}));

// SUPER ADMIN ONLY: Freeze an admin user
adminRouter.post("/admins/:id/freeze", requireSuperAdmin, asyncHandler(async (req: Request, res: Response) => {
  const admin = await queryOne<any>('SELECT * FROM "User" WHERE "id" = $1 AND "role" IN ($2,$3,$4,$5) LIMIT 1', [req.params.id, "admin", "verifier", "ngo_admin", "super_admin"]);
  if (!admin) return res.status(404).json({ error: "Admin user not found" });
  await exec('UPDATE "User" SET "banned" = true WHERE "id" = $1', [req.params.id]);
  const updated = await queryOne<any>('SELECT * FROM "User" WHERE "id" = $1 LIMIT 1', [req.params.id]);
  res.json(updated);
}));
