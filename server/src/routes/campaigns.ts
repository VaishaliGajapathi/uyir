import { Router, Request, Response, NextFunction } from "express";
import { query, queryOne, exec } from "../db.js";
import { requireAuth, requireAdminOrVolunteer, AuthedRequest } from "../middleware/auth.js";

export const campaignsRouter = Router();

function asyncHandler(fn: (req: AuthedRequest, res: Response, next: NextFunction) => Promise<any>) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      console.error("[campaigns] route error:", err.message || err);
      res.status(500).json({ error: err.message || "Internal server error" });
    });
  };
}

// GET /campaigns - public list with filters
campaignsRouter.get("/", asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { status, district, type } = req.query;
  const conditions: string[] = [];
  const params: any[] = [];
  let idx = 1;

  if (status) {
    conditions.push(`"status" = $${idx++}`);
    params.push(status);
  }
  if (district) {
    conditions.push(`"district" = $${idx++}`);
    params.push(district);
  }
  if (type) {
    conditions.push(`"partnerType" = $${idx++}`);
    params.push(type);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const campaigns = await query<any>(
    `SELECT * FROM "Campaign" ${where} ORDER BY "startDate" DESC`,
    params
  );
  res.json(campaigns);
}));

// GET /campaigns/upcoming - public upcoming campaigns
campaignsRouter.get("/upcoming", asyncHandler(async (_req: AuthedRequest, res: Response) => {
  const campaigns = await query<any>(
    `SELECT * FROM "Campaign" WHERE "status" = 'active' AND "endDate" >= (NOW() AT TIME ZONE 'Asia/Kolkata') ORDER BY "startDate" ASC`
  );
  res.json(campaigns);
}));

// GET /campaigns/past - public past campaigns
campaignsRouter.get("/past", asyncHandler(async (_req: AuthedRequest, res: Response) => {
  const campaigns = await query<any>(
    `SELECT * FROM "Campaign" WHERE "endDate" < (NOW() AT TIME ZONE 'Asia/Kolkata') ORDER BY "endDate" DESC`
  );
  res.json(campaigns);
}));

// GET /campaigns/district/:district - campaigns in a district
campaignsRouter.get("/district/:district", asyncHandler(async (req: AuthedRequest, res: Response) => {
  const campaigns = await query<any>(
    `SELECT * FROM "Campaign" WHERE "district" = $1 AND "status" = 'active' ORDER BY "startDate" ASC`,
    [req.params.district]
  );
  res.json(campaigns);
}));

// GET /campaigns/:id - single campaign
campaignsRouter.get("/:id", asyncHandler(async (req: AuthedRequest, res: Response) => {
  const campaign = await queryOne<any>(
    `SELECT * FROM "Campaign" WHERE "id" = $1 LIMIT 1`,
    [req.params.id]
  );
  if (!campaign) return res.status(404).json({ error: "Campaign not found" });
  res.json(campaign);
}));

// GET /campaigns/analytics/summary - admin analytics
campaignsRouter.get("/analytics/summary", requireAdminOrVolunteer, asyncHandler(async (_req: AuthedRequest, res: Response) => {
  const total = await queryOne<any>(`SELECT COUNT(*)::int as cnt FROM "Campaign"`);
  const active = await queryOne<any>(`SELECT COUNT(*)::int as cnt FROM "Campaign" WHERE "status" = 'active'`);
  const paused = await queryOne<any>(`SELECT COUNT(*)::int as cnt FROM "Campaign" WHERE "status" = 'paused'`);
  const cancelled = await queryOne<any>(`SELECT COUNT(*)::int as cnt FROM "Campaign" WHERE "status" = 'cancelled'`);
  const completed = await queryOne<any>(`SELECT COUNT(*)::int as cnt FROM "Campaign" WHERE "status" = 'completed'`);

  const byDistrict = await query<any>(
    `SELECT "district", COUNT(*)::int as cnt,
            SUM("expectedDonors")::int as "expectedDonors",
            SUM("collectedUnits")::int as "collectedUnits",
            SUM("registeredDonors")::int as "registeredDonors"
     FROM "Campaign" GROUP BY "district" ORDER BY cnt DESC`
  );

  const byPartnerType = await query<any>(
    `SELECT "partnerType", COUNT(*)::int as cnt,
            SUM("expectedDonors")::int as "expectedDonors",
            SUM("collectedUnits")::int as "collectedUnits"
     FROM "Campaign" GROUP BY "partnerType" ORDER BY cnt DESC`
  );

  const totalExpected = await queryOne<any>(`SELECT COALESCE(SUM("expectedDonors"),0)::int as cnt FROM "Campaign"`);
  const totalCollected = await queryOne<any>(`SELECT COALESCE(SUM("collectedUnits"),0)::int as cnt FROM "Campaign"`);
  const totalRegistered = await queryOne<any>(`SELECT COALESCE(SUM("registeredDonors"),0)::int as cnt FROM "Campaign"`);

  const upcomingCount = await queryOne<any>(
    `SELECT COUNT(*)::int as cnt FROM "Campaign" WHERE "status" = 'active' AND "endDate" >= (NOW() AT TIME ZONE 'Asia/Kolkata')`
  );

  const monthlyTrend = await query<any>(
    `SELECT TO_CHAR("startDate", 'YYYY-MM') as month, COUNT(*)::int as cnt,
            SUM("collectedUnits")::int as "collectedUnits"
     FROM "Campaign" GROUP BY TO_CHAR("startDate", 'YYYY-MM') ORDER BY month DESC LIMIT 12`
  );

  res.json({
    total: total?.cnt || 0,
    active: active?.cnt || 0,
    paused: paused?.cnt || 0,
    cancelled: cancelled?.cnt || 0,
    completed: completed?.cnt || 0,
    upcoming: upcomingCount?.cnt || 0,
    totalExpectedDonors: totalExpected?.cnt || 0,
    totalCollectedUnits: totalCollected?.cnt || 0,
    totalRegisteredDonors: totalRegistered?.cnt || 0,
    byDistrict,
    byPartnerType,
    monthlyTrend,
  });
}));

// POST /campaigns - create (admin only)
campaignsRouter.post("/", requireAdminOrVolunteer, asyncHandler(async (req: AuthedRequest, res: Response) => {
  const {
    title, description, venue, district, address,
    startDate, endDate, startTime, endTime,
    partnerType, hospitalId, hospitalName, ngoId, ngoName, bloodBankId, bloodBankName,
    contactPerson, contactPhone, expectedDonors, imageUrl, hostLogoUrl,
  } = req.body;

  if (!title || !venue || !district || !startDate || !endDate) {
    return res.status(400).json({ error: "Title, venue, district, start date and end date are required" });
  }

  const campaign = await queryOne<any>(
    `INSERT INTO "Campaign" ("title","description","venue","district","address","startDate","endDate","startTime","endTime","partnerType","hospitalId","hospitalName","ngoId","ngoName","bloodBankId","bloodBankName","contactPerson","contactPhone","expectedDonors","imageUrl","hostLogoUrl","status","createdById","createdAt","updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,'active',$22,NOW(),NOW()) RETURNING *`,
    [
      title, description || null, venue, district, address || null,
      startDate, endDate, startTime || null, endTime || null,
      partnerType || "hospital", hospitalId || null, hospitalName || null,
      ngoId || null, ngoName || null, bloodBankId || null, bloodBankName || null,
      contactPerson || null, contactPhone || null, expectedDonors || 0, imageUrl || null, hostLogoUrl || null,
      req.userId,
    ]
  );
  res.status(201).json(campaign);
}));

// PATCH /campaigns/:id - update (admin only)
campaignsRouter.patch("/:id", requireAdminOrVolunteer, asyncHandler(async (req: AuthedRequest, res: Response) => {
  const {
    title, description, venue, district, address,
    startDate, endDate, startTime, endTime,
    partnerType, hospitalId, hospitalName, ngoId, ngoName, bloodBankId, bloodBankName,
    contactPerson, contactPhone, expectedDonors, collectedUnits, registeredDonors, imageUrl, hostLogoUrl,
  } = req.body;

  const updates: string[] = [];
  const params: any[] = [];

  const addUpdate = (col: string, val: any) => {
    if (val !== undefined) {
      updates.push(`"${col}" = $${params.length + 1}`);
      params.push(val);
    }
  };

  addUpdate("title", title);
  addUpdate("description", description);
  addUpdate("venue", venue);
  addUpdate("district", district);
  addUpdate("address", address);
  addUpdate("startDate", startDate);
  addUpdate("endDate", endDate);
  addUpdate("startTime", startTime);
  addUpdate("endTime", endTime);
  addUpdate("partnerType", partnerType);
  addUpdate("hospitalId", hospitalId);
  addUpdate("hospitalName", hospitalName);
  addUpdate("ngoId", ngoId);
  addUpdate("ngoName", ngoName);
  addUpdate("bloodBankId", bloodBankId);
  addUpdate("bloodBankName", bloodBankName);
  addUpdate("contactPerson", contactPerson);
  addUpdate("contactPhone", contactPhone);
  addUpdate("expectedDonors", expectedDonors);
  addUpdate("collectedUnits", collectedUnits);
  addUpdate("registeredDonors", registeredDonors);
  addUpdate("imageUrl", imageUrl);
  addUpdate("hostLogoUrl", hostLogoUrl);

  if (updates.length === 0) return res.status(400).json({ error: "No fields to update" });

  updates.push(`"updatedAt" = NOW()`);
  params.push(req.params.id);

  await exec(`UPDATE "Campaign" SET ${updates.join(", ")} WHERE "id" = $${params.length}`, params);
  const updated = await queryOne<any>(`SELECT * FROM "Campaign" WHERE "id" = $1 LIMIT 1`, [req.params.id]);
  res.json(updated);
}));

// POST /campaigns/:id/pause - pause campaign
campaignsRouter.post("/:id/pause", requireAdminOrVolunteer, asyncHandler(async (req: AuthedRequest, res: Response) => {
  await exec(`UPDATE "Campaign" SET "status" = 'paused', "updatedAt" = NOW() WHERE "id" = $1`, [req.params.id]);
  const updated = await queryOne<any>(`SELECT * FROM "Campaign" WHERE "id" = $1 LIMIT 1`, [req.params.id]);
  res.json(updated);
}));

// POST /campaigns/:id/resume - resume paused campaign
campaignsRouter.post("/:id/resume", requireAdminOrVolunteer, asyncHandler(async (req: AuthedRequest, res: Response) => {
  await exec(`UPDATE "Campaign" SET "status" = 'active', "updatedAt" = NOW() WHERE "id" = $1`, [req.params.id]);
  const updated = await queryOne<any>(`SELECT * FROM "Campaign" WHERE "id" = $1 LIMIT 1`, [req.params.id]);
  res.json(updated);
}));

// POST /campaigns/:id/cancel - cancel campaign
campaignsRouter.post("/:id/cancel", requireAdminOrVolunteer, asyncHandler(async (req: AuthedRequest, res: Response) => {
  await exec(`UPDATE "Campaign" SET "status" = 'cancelled', "updatedAt" = NOW() WHERE "id" = $1`, [req.params.id]);
  const updated = await queryOne<any>(`SELECT * FROM "Campaign" WHERE "id" = $1 LIMIT 1`, [req.params.id]);
  res.json(updated);
}));

// POST /campaigns/:id/complete - mark campaign completed
campaignsRouter.post("/:id/complete", requireAdminOrVolunteer, asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { collectedUnits, registeredDonors } = req.body;
  await exec(
    `UPDATE "Campaign" SET "status" = 'completed', "collectedUnits" = $2, "registeredDonors" = $3, "updatedAt" = NOW() WHERE "id" = $1`,
    [req.params.id, collectedUnits || 0, registeredDonors || 0]
  );
  const updated = await queryOne<any>(`SELECT * FROM "Campaign" WHERE "id" = $1 LIMIT 1`, [req.params.id]);
  res.json(updated);
}));

// DELETE /campaigns/:id - delete campaign
campaignsRouter.delete("/:id", requireAdminOrVolunteer, asyncHandler(async (req: AuthedRequest, res: Response) => {
  await exec(`DELETE FROM "Campaign" WHERE "id" = $1`, [req.params.id]);
  res.json({ ok: true });
}));
