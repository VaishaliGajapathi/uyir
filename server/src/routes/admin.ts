import { Router, Request } from "express";
import { query, queryOne, exec } from "../db.js";
import { requireAuth, requireAdminOrHospitalApprover, requireAdminOrVerifier } from "../middleware/auth.js";

export const adminRouter = Router();
adminRouter.use(requireAuth);

adminRouter.get("/donors", requireAdminOrVerifier, async (req: Request, res: any) => {
  const donors = await query<any>('SELECT * FROM "User" WHERE "role" = $1 ORDER BY "createdAt" DESC', ["donor"]);
  res.json(donors);
});

adminRouter.get("/requests", requireAdminOrVerifier, async (req: Request, res: any) => {
  const requests = await query<any>('SELECT * FROM "BloodRequest" ORDER BY "createdAt" DESC', []);
  res.json(requests);
});

adminRouter.get("/hospitals", requireAdminOrVerifier, async (req: Request, res: any) => {
  const hospitals = await query<any>('SELECT * FROM "Hospital" ORDER BY "createdAt" DESC', []);
  res.json(hospitals);
});

adminRouter.post("/hospitals/:id/verify", requireAdminOrVerifier, async (req: Request, res: any) => {
  await exec('UPDATE "Hospital" SET "verified" = true WHERE "id" = $1', [req.params.id]);
  res.json({ ok: true });
});

adminRouter.get("/reports", requireAdminOrVerifier, async (req: Request, res: any) => {
  const reports = await query<any>('SELECT * FROM "FraudReport" ORDER BY "createdAt" DESC', []);
  res.json(reports);
});

adminRouter.post("/reports/:id/action", requireAdminOrVerifier, async (req: Request, res: any) => {
  await exec('UPDATE "FraudReport" SET "status" = $1 WHERE "id" = $2', ["actioned", req.params.id]);
  res.json({ ok: true });
});

adminRouter.get("/dashboard", requireAdminOrHospitalApprover, async (req: Request, res: any) => {
  const users = await queryOne<any>('SELECT COUNT(*)::int as cnt FROM "User"');
  const requests = await queryOne<any>('SELECT COUNT(*)::int as cnt FROM "BloodRequest"');
  const completed = await queryOne<any>('SELECT COUNT(*)::int as cnt FROM "DonorResponse" WHERE "status" = $1', ["completed"]);
  res.json({ totalUsers: users?.cnt || 0, totalRequests: requests?.cnt || 0, completedDonations: completed?.cnt || 0 });
});
