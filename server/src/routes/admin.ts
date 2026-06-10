import { Router, Request } from "express";
import { query, queryOne, exec } from "../db.js";
import { requireAuth, requireAdminOrHospitalApprover, requireAdminOrVerifier } from "../middleware/auth.js";

export const adminRouter = Router();
adminRouter.use(requireAuth);

// Stats for dashboard overview
adminRouter.get("/stats", requireAdminOrVerifier, async (req: Request, res: any) => {
  const totalDonors = await queryOne<any>('SELECT COUNT(*)::int as cnt FROM "User" WHERE "role" = $1', ["donor"]);
  const totalRequests = await queryOne<any>('SELECT COUNT(*)::int as cnt FROM "BloodRequest"');
  const pendingVerifications = await queryOne<any>('SELECT COUNT(*)::int as cnt FROM "BloodRequest" WHERE "status" = $1', ["pending_verification"]);
  const activeRequests = await queryOne<any>('SELECT COUNT(*)::int as cnt FROM "BloodRequest" WHERE "status" IN ($1,$2,$3)', ["verified", "alert_sent", "donor_accepted"]);
  const fraudReports = await queryOne<any>('SELECT COUNT(*)::int as cnt FROM "FraudReport"');
  const livesSaved = await queryOne<any>('SELECT COUNT(*)::int as cnt FROM "DonorResponse" WHERE "status" = $1', ["completed"]);
  res.json({
    totalDonors: totalDonors?.cnt || 0,
    totalRequests: totalRequests?.cnt || 0,
    pendingVerifications: pendingVerifications?.cnt || 0,
    activeRequests: activeRequests?.cnt || 0,
    fraudReports: fraudReports?.cnt || 0,
    livesSaved: livesSaved?.cnt || 0,
  });
});

// Donors list
adminRouter.get("/donors", requireAdminOrVerifier, async (req: Request, res: any) => {
  const donors = await query<any>('SELECT * FROM "User" WHERE "role" = $1 ORDER BY "createdAt" DESC', ["donor"]);
  res.json(donors);
});

// All requests
adminRouter.get("/requests", requireAdminOrVerifier, async (req: Request, res: any) => {
  const requests = await query<any>('SELECT * FROM "BloodRequest" ORDER BY "createdAt" DESC', []);
  res.json(requests);
});

// Pending verification requests
adminRouter.get("/pending-verification", requireAdminOrVerifier, async (req: Request, res: any) => {
  const requests = await query<any>('SELECT * FROM "BloodRequest" WHERE "status" = $1 ORDER BY "createdAt" DESC', ["pending_verification"]);
  res.json(requests);
});

// Hospitals list
adminRouter.get("/hospitals", requireAdminOrVerifier, async (req: Request, res: any) => {
  const hospitals = await query<any>('SELECT * FROM "Hospital" ORDER BY "createdAt" DESC', []);
  res.json(hospitals);
});

// Verify a hospital
adminRouter.post("/hospitals/:id/verify", requireAdminOrVerifier, async (req: Request, res: any) => {
  await exec('UPDATE "Hospital" SET "verified" = true WHERE "id" = $1', [req.params.id]);
  res.json({ ok: true });
});

// Fraud reports
adminRouter.get("/fraud-reports", requireAdminOrVerifier, async (req: Request, res: any) => {
  const reports = await query<any>('SELECT * FROM "FraudReport" ORDER BY "createdAt" DESC', []);
  res.json(reports);
});

// Action a fraud report
adminRouter.post("/reports/:id/action", requireAdminOrVerifier, async (req: Request, res: any) => {
  await exec('UPDATE "FraudReport" SET "status" = $1 WHERE "id" = $2', ["actioned", req.params.id]);
  res.json({ ok: true });
});

// Verify (approve/reject) a blood request
adminRouter.post("/verify-request/:id", requireAdminOrVerifier, async (req: Request, res: any) => {
  const { approved, notes } = req.body;
  const status = approved ? "verified" : "rejected";
  await exec('UPDATE "BloodRequest" SET "status" = $1, "verificationNotes" = $2, "verifiedAt" = NOW() WHERE "id" = $3', [status, notes || "", req.params.id]);
  const updated = await queryOne<any>('SELECT * FROM "BloodRequest" WHERE "id" = $1 LIMIT 1', [req.params.id]);
  res.json(updated);
});

// Admin users list
adminRouter.get("/admins", requireAdminOrVerifier, async (req: Request, res: any) => {
  const admins = await query<any>('SELECT * FROM "User" WHERE "role" IN ($1,$2) ORDER BY "createdAt" DESC', ["admin", "verifier"]);
  res.json(admins);
});

// Create admin user
adminRouter.post("/admins", requireAdminOrVerifier, async (req: Request, res: any) => {
  const { name, mobile, role, password } = req.body;
  const bcrypt = await import("bcryptjs");
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await queryOne<any>(
    'INSERT INTO "User" ("id","name","mobile","password","role","language","verified","createdAt") VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,true,NOW()) RETURNING *',
    [name, mobile.replace(/\D/g, "").slice(-10), hashedPassword, role || "admin", "ta"]
  );
  res.status(201).json(user);
});

// Close a request
adminRouter.post("/requests/:id/close", requireAdminOrVerifier, async (req: Request, res: any) => {
  await exec('UPDATE "BloodRequest" SET "status" = $1, "closedAt" = NOW() WHERE "id" = $2', ["closed", req.params.id]);
  const updated = await queryOne<any>('SELECT * FROM "BloodRequest" WHERE "id" = $1 LIMIT 1', [req.params.id]);
  res.json(updated);
});

// Reject a request
adminRouter.post("/requests/:id/reject", requireAdminOrVerifier, async (req: Request, res: any) => {
  const { notes } = req.body;
  await exec('UPDATE "BloodRequest" SET "status" = $1, "verificationNotes" = $2, "verifiedAt" = NOW() WHERE "id" = $3', ["rejected", notes || "", req.params.id]);
  const updated = await queryOne<any>('SELECT * FROM "BloodRequest" WHERE "id" = $1 LIMIT 1', [req.params.id]);
  res.json(updated);
});

// Ban a user
adminRouter.post("/ban-user/:id", requireAdminOrVerifier, async (req: Request, res: any) => {
  await exec('UPDATE "User" SET "reputationScore" = -1000, "isAvailable" = false WHERE "id" = $1', [req.params.id]);
  const updated = await queryOne<any>('SELECT * FROM "User" WHERE "id" = $1 LIMIT 1', [req.params.id]);
  res.json(updated);
});

// Reject a hospital
adminRouter.post("/hospitals/:id/reject", requireAdminOrVerifier, async (req: Request, res: any) => {
  await exec('UPDATE "Hospital" SET "verified" = false WHERE "id" = $1', [req.params.id]);
  res.json({ ok: true });
});

// Dismiss a fraud report
adminRouter.post("/reports/:id/dismiss", requireAdminOrVerifier, async (req: Request, res: any) => {
  await exec('UPDATE "FraudReport" SET "status" = $1 WHERE "id" = $2', ["dismissed", req.params.id]);
  res.json({ ok: true });
});

// Legacy dashboard endpoint (kept for compatibility)
adminRouter.get("/dashboard", requireAdminOrHospitalApprover, async (req: Request, res: any) => {
  const users = await queryOne<any>('SELECT COUNT(*)::int as cnt FROM "User"');
  const requests = await queryOne<any>('SELECT COUNT(*)::int as cnt FROM "BloodRequest"');
  const completed = await queryOne<any>('SELECT COUNT(*)::int as cnt FROM "DonorResponse" WHERE "status" = $1', ["completed"]);
  res.json({ totalUsers: users?.cnt || 0, totalRequests: requests?.cnt || 0, completedDonations: completed?.cnt || 0 });
});
