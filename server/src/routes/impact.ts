import { Router, Request, Response } from "express";
import { query, queryOne } from "../db.js";

export const impactRouter = Router();

impactRouter.get("/stats", async (_req: Request, res: Response) => {
  const activeReq = await queryOne<any>('SELECT COUNT(*)::int as cnt FROM "BloodRequest" WHERE "status" IN ($1,$2,$3)', ["verified", "alert_sent", "donor_accepted"]);
  const livesSaved = await queryOne<any>('SELECT COUNT(*)::int as cnt FROM "DonorResponse" WHERE "status" = $1', ["completed"]);
  const donors = await queryOne<any>('SELECT COUNT(*)::int as cnt FROM "User" WHERE "role" = $1', ["donor"]);
  const today = await queryOne<any>('SELECT COUNT(*)::int as cnt FROM "BloodRequest" WHERE "createdAt" >= DATE_TRUNC(\'day\', NOW())');
  res.json({ activeRequests: activeReq?.cnt || 0, livesSaved: livesSaved?.cnt || 0, donors: donors?.cnt || 0, requestsToday: today?.cnt || 0 });
});

impactRouter.get("/heatmap", async (_req: Request, res: Response) => {
  const rows = await query<any>('SELECT "district", COUNT(*)::int as active FROM "BloodRequest" WHERE "status" IN ($1,$2,$3) GROUP BY "district"', ["verified", "alert_sent", "donor_accepted"]);
  res.json(rows.map((r: any) => ({ district: r.district, active: r.active })));
});

impactRouter.get("/leaderboard", async (_req: Request, res: Response) => {
  const donors = await query<any>('SELECT "id", "name", "district", "bloodGroup", "donationCount", "reputationScore" FROM "User" WHERE "role" = $1 AND "donationCount" > 0 ORDER BY "donationCount" DESC, "reputationScore" DESC LIMIT 20', ["donor"]);
  res.json(donors);
});
