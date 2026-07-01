import { Router, Request, Response, NextFunction } from "express";
import { exec, query, queryOne } from "../db.js";
import { AuthedRequest, requireNgoAdmin } from "../middleware/auth.js";

export const ngoRouter = Router();
ngoRouter.use(requireNgoAdmin);

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      console.error("[ngo] route error:", err.message || err);
      res.status(500).json({ error: err.message || "Internal server error" });
    });
  };
}

async function getNgoScope(userId: string) {
  const user = await queryOne<any>('SELECT "id", "district", "ngoName" FROM "User" WHERE "id" = $1 LIMIT 1', [userId]);
  if (!user) {
    throw new Error("NGO admin not found");
  }
  if (!user.district) {
    const err = new Error("NGO admin district is not configured");
    (err as any).statusCode = 400;
    throw err;
  }
  return user;
}

ngoRouter.get("/stats", asyncHandler(async (req: AuthedRequest, res: Response) => {
  const scope = await getNgoScope(req.userId!);
  const district = scope.district;

  const [users, donors, requests, pending, active, completed, hospitals] = await Promise.all([
    queryOne<any>('SELECT COUNT(*)::int as cnt FROM "User" WHERE "district" = $1', [district]),
    queryOne<any>('SELECT COUNT(*)::int as cnt FROM "User" WHERE "district" = $1 AND "role" = $2', [district, "donor"]),
    queryOne<any>('SELECT COUNT(*)::int as cnt FROM "BloodRequest" WHERE "district" = $1', [district]),
    queryOne<any>('SELECT COUNT(*)::int as cnt FROM "BloodRequest" WHERE "district" = $1 AND "status" = $2', [district, "pending_verification"]),
    queryOne<any>('SELECT COUNT(*)::int as cnt FROM "BloodRequest" WHERE "district" = $1 AND "status" NOT IN ($2,$3,$4)', [district, "closed", "rejected", "completed"]),
    queryOne<any>('SELECT COUNT(*)::int as cnt FROM "DonorResponse" dr INNER JOIN "BloodRequest" br ON br."id" = dr."requestId" WHERE br."district" = $1 AND dr."status" = $2', [district, "completed"]),
    queryOne<any>('SELECT COUNT(*)::int as cnt FROM "Hospital" WHERE "district" = $1', [district]),
  ]);

  res.json({
    district,
    ngoName: scope.ngoName || null,
    totalUsers: users?.cnt || 0,
    totalDonors: donors?.cnt || 0,
    totalRequests: requests?.cnt || 0,
    pendingVerifications: pending?.cnt || 0,
    activeRequests: active?.cnt || 0,
    completedDonations: completed?.cnt || 0,
    livesSaved: completed?.cnt || 0,
    totalHospitals: hospitals?.cnt || 0,
  });
}));

ngoRouter.get("/requests", asyncHandler(async (req: AuthedRequest, res: Response) => {
  const scope = await getNgoScope(req.userId!);
  const requests = await query<any>('SELECT * FROM "BloodRequest" WHERE "district" = $1 ORDER BY "createdAt" DESC', [scope.district]);
  res.json(requests);
}));

ngoRouter.get("/pending-verification", asyncHandler(async (req: AuthedRequest, res: Response) => {
  const scope = await getNgoScope(req.userId!);
  const requests = await query<any>('SELECT * FROM "BloodRequest" WHERE "district" = $1 AND "status" = $2 ORDER BY "createdAt" DESC', [scope.district, "pending_verification"]);
  res.json(requests);
}));

ngoRouter.get("/hospitals", asyncHandler(async (req: AuthedRequest, res: Response) => {
  const scope = await getNgoScope(req.userId!);
  const hospitals = await query<any>('SELECT * FROM "Hospital" WHERE "district" = $1 ORDER BY "createdAt" DESC', [scope.district]);
  res.json(hospitals);
}));

ngoRouter.post("/verify-request/:id", asyncHandler(async (req: AuthedRequest, res: Response) => {
  const scope = await getNgoScope(req.userId!);
  const request = await queryOne<any>('SELECT * FROM "BloodRequest" WHERE "id" = $1 AND "district" = $2 LIMIT 1', [req.params.id, scope.district]);
  if (!request) return res.status(404).json({ error: "Request not found in your district" });

  const approved = Boolean(req.body?.approved);
  const notes = typeof req.body?.notes === "string" ? req.body.notes : "";
  const status = approved ? "verified" : "rejected";

  const updated = await queryOne<any>(
    'UPDATE "BloodRequest" SET "status" = $1, "verificationNotes" = $2, "verifiedAt" = NOW(), "verifiedBy" = $3, "verifiedByType" = $4 WHERE "id" = $5 RETURNING *',
    [status, notes, req.userId!, "ngo", req.params.id]
  );
  res.json(updated);
}));

ngoRouter.post("/hospitals/:id/verify", asyncHandler(async (req: AuthedRequest, res: Response) => {
  const scope = await getNgoScope(req.userId!);
  const hospital = await queryOne<any>('SELECT * FROM "Hospital" WHERE "id" = $1 AND "district" = $2 LIMIT 1', [req.params.id, scope.district]);
  if (!hospital) return res.status(404).json({ error: "Hospital not found in your district" });
  await exec('UPDATE "Hospital" SET "verified" = true WHERE "id" = $1', [req.params.id]);
  res.json({ ok: true });
}));

ngoRouter.post("/hospitals/:id/reject", asyncHandler(async (req: AuthedRequest, res: Response) => {
  const scope = await getNgoScope(req.userId!);
  const hospital = await queryOne<any>('SELECT * FROM "Hospital" WHERE "id" = $1 AND "district" = $2 LIMIT 1', [req.params.id, scope.district]);
  if (!hospital) return res.status(404).json({ error: "Hospital not found in your district" });
  await exec('UPDATE "Hospital" SET "verified" = false WHERE "id" = $1', [req.params.id]);
  res.json({ ok: true });
}));
