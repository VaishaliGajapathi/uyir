import { Router, Request } from "express";
import { query, queryOne, exec } from "../db.js";
import { requireAuth, requireAdminOrVerifier, requireAdminOrNgo } from "../middleware/auth.js";

export const adminRouter = Router();
adminRouter.use(requireAuth);

// ─── Stats (shared by admin, verifier, ngo_admin, hospital_approver) ───
adminRouter.get("/stats", requireAdminOrNgo, async (req: Request, res: any) => {
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
});

// ─── Donors (admin / verifier only) ───
adminRouter.get("/donors", requireAdminOrVerifier, async (req: Request, res: any) => {
  const donors = await query<any>('SELECT * FROM "User" WHERE "role" = $1 ORDER BY "createdAt" DESC', ["donor"]);
  res.json(donors);
});

// ─── Requests (shared by admin, verifier, ngo_admin) ───
adminRouter.get("/requests", requireAdminOrVerifier, async (req: Request, res: any) => {
  const requests = await query<any>(
    'SELECT * FROM "BloodRequest" ORDER BY "createdAt" DESC',
    []
  );
  res.json(requests);
});

// ─── Pending Verification (admin / verifier only) ───
adminRouter.get("/pending-verification", requireAdminOrVerifier, async (req: Request, res: any) => {
  const requests = await query<any>(
    'SELECT * FROM "BloodRequest" WHERE "status" = $1 ORDER BY "createdAt" DESC',
    ["pending_verification"]
  );
  res.json(requests);
});

// ─── Fraud Reports (admin / verifier only) ───
adminRouter.get("/fraud-reports", requireAdminOrVerifier, async (req: Request, res: any) => {
  const reports = await query<any>(
    'SELECT * FROM "FraudReport" ORDER BY "createdAt" DESC',
    []
  );
  res.json(reports);
});

// ─── Hospitals (shared by admin, verifier, ngo_admin) ───
adminRouter.get("/hospitals", requireAdminOrVerifier, async (req: Request, res: any) => {
  const hospitals = await query<any>(
    'SELECT * FROM "Hospital" ORDER BY "createdAt" DESC',
    []
  );
  res.json(hospitals);
});

// ─── Admins list (admin / verifier only) ───
adminRouter.get("/admins", requireAdminOrVerifier, async (req: Request, res: any) => {
  const admins = await query<any>(
    'SELECT * FROM "User" WHERE "role" IN ($1,$2,$3) ORDER BY "createdAt" DESC',
    ["admin", "verifier", "ngo_admin"]
  );
  res.json(admins);
});

// ─── Create Admin / NGO admin (admin / verifier only) ───
adminRouter.post("/admins", requireAdminOrVerifier, async (req: any, res: any) => {
  const { name, mobile, role, password } = req.body;
  if (!name || !mobile || !role) return res.status(400).json({ error: "Missing fields" });
  const hashed = password ? await (await import("bcryptjs")).hash(password, 10) : null;
  const user = await queryOne<any>(
    'INSERT INTO "User" ("id","name","mobile","role","password","createdAt","language") VALUES (gen_random_uuid(),$1,$2,$3,$4,NOW(),\'en\') RETURNING *',
    [name, mobile.replace(/\D/g, "").slice(-10), role, hashed]
  );
  res.json({ ok: true, user });
});

// ─── Verify / Reject Request (admin / verifier only) ───
adminRouter.post("/verify-request/:id", requireAdminOrVerifier, async (req: any, res: any) => {
  const { approved, notes } = req.body;
  const status = approved ? "verified" : "rejected";
  await exec('UPDATE "BloodRequest" SET "status" = $1, "verificationNotes" = $2 WHERE "id" = $3', [status, notes || "", req.params.id]);
  res.json({ ok: true });
});

// ─── Close Request (admin / verifier only) ───
adminRouter.post("/requests/:id/close", requireAdminOrVerifier, async (req: any, res: any) => {
  await exec('UPDATE "BloodRequest" SET "status" = $1 WHERE "id" = $2', ["closed", req.params.id]);
  res.json({ ok: true });
});

// ─── Reject Request (admin / verifier only) ───
adminRouter.post("/requests/:id/reject", requireAdminOrVerifier, async (req: any, res: any) => {
  const { notes } = req.body;
  await exec('UPDATE "BloodRequest" SET "status" = $1, "verificationNotes" = $2 WHERE "id" = $3', ["rejected", notes || "", req.params.id]);
  res.json({ ok: true });
});

// ─── Ban User (admin / verifier only) ───
adminRouter.post("/ban-user/:id", requireAdminOrVerifier, async (req: any, res: any) => {
  await exec('UPDATE "User" SET "banned" = true, "reputationScore" = -1000 WHERE "id" = $1', [req.params.id]);
  res.json({ ok: true });
});

// ─── Verify Hospital (admin / verifier only) ───
adminRouter.post("/hospitals/:id/verify", requireAdminOrVerifier, async (req: Request, res: any) => {
  await exec('UPDATE "Hospital" SET "verified" = true WHERE "id" = $1', [req.params.id]);
  res.json({ ok: true });
});

// ─── Action Fraud Report (admin / verifier only) ───
adminRouter.post("/reports/:id/action", requireAdminOrVerifier, async (req: Request, res: any) => {
  await exec('UPDATE "FraudReport" SET "status" = $1 WHERE "id" = $2', ["actioned", req.params.id]);
  res.json({ ok: true });
});

// ─── Dashboard (legacy alias for /stats) ───
adminRouter.get("/dashboard", requireAdminOrNgo, async (req: Request, res: any) => {
  const users = await queryOne<any>('SELECT COUNT(*)::int as cnt FROM "User"');
  const requests = await queryOne<any>('SELECT COUNT(*)::int as cnt FROM "BloodRequest"');
  const completed = await queryOne<any>('SELECT COUNT(*)::int as cnt FROM "DonorResponse" WHERE "status" = $1', ["completed"]);
  res.json({ totalUsers: users?.cnt || 0, totalRequests: requests?.cnt || 0, completedDonations: completed?.cnt || 0 });
});
