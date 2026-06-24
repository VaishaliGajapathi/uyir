import { Router } from "express";
import { query, queryOne, exec } from "../db.js";
import { requireAuth, AuthedRequest } from "../middleware/auth.js";
import { analyzeMessage } from "../services/fraud.js";

export const responsesRouter = Router();

responsesRouter.get("/mine", requireAuth, async (req: AuthedRequest, res: any) => {
  const responses = await query<any>(
    'SELECT r.*, req."id" as "requestId2", req."patientName", req."bloodGroup", req."componentType", req."unitsRequired", req."hospitalName", req."district", req."emergencyLevel", req."status" as "requestStatus", req."contactPerson", req."contactNumber" FROM "DonorResponse" r LEFT JOIN "BloodRequest" req ON r."requestId" = req."id" WHERE r."donorId" = $1 ORDER BY r."createdAt" DESC',
    [req.userId]
  );
  res.json(responses);
});

responsesRouter.post("/for-request/:requestId/accept", requireAuth, async (req: AuthedRequest, res: any) => {
  if (req.role !== "donor") return res.status(403).json({ error: "Only donors can accept requests" });
  const request = await queryOne<any>('SELECT * FROM "BloodRequest" WHERE "id" = $1 LIMIT 1', [req.params.requestId]);
  if (!request) return res.status(404).json({ error: "Request not found" });
  if (request.createdById === req.userId) return res.status(400).json({ error: "You cannot accept your own request" });
  if (["completed", "closed"].includes(request.status)) return res.status(400).json({ error: "Request is already closed or completed" });
  if (!["verified", "alert_sent", "donor_accepted"].includes(String(request.status || ""))) {
    return res.status(400).json({ error: "This request is not yet verified for donor acceptance" });
  }

  let resp = await queryOne<any>('SELECT * FROM "DonorResponse" WHERE "requestId" = $1 AND "donorId" = $2 LIMIT 1', [req.params.requestId, req.userId]);
  if (resp) {
    if (resp.status !== "accepted") {
      await exec('UPDATE "DonorResponse" SET "status"=$1, "acceptedAt"=NOW() WHERE "id"=$2', ["accepted", resp.id]);
      resp = await queryOne<any>('SELECT * FROM "DonorResponse" WHERE "id" = $1 LIMIT 1', [resp.id]);
    }
  } else {
    resp = await queryOne<any>(
      'INSERT INTO "DonorResponse" ("id","requestId","donorId","status","acceptedAt","matchScore","createdAt") VALUES (gen_random_uuid(),$1,$2,$3,NOW(),$4,NOW()) RETURNING *',
      [req.params.requestId, req.userId, "accepted", 100]
    );
  }
  await exec('UPDATE "BloodRequest" SET "status" = $1 WHERE "id" = $2', ["donor_accepted", request.id]);
  res.json(resp);
});

async function setStatus(req: AuthedRequest, res: any, status: string, stamp: string) {
  const resp = await queryOne<any>('SELECT * FROM "DonorResponse" WHERE "id" = $1 LIMIT 1', [req.params.id]);
  if (!resp) return res.status(404).json({ error: "Not found" });
  if (resp.donorId !== req.userId) return res.status(403).json({ error: "Not your alert" });
  await exec(`UPDATE "DonorResponse" SET "status"=$1, "${stamp}"=NOW() WHERE "id"=$2`, [status, resp.id]);
  const updated = await queryOne<any>('SELECT * FROM "DonorResponse" WHERE "id" = $1 LIMIT 1', [resp.id]);
  if (status === "accepted") {
    await exec('UPDATE "BloodRequest" SET "status" = $1 WHERE "id" = $2', ["donor_accepted", resp.requestId]);
  }
  res.json(updated);
}

responsesRouter.post("/:id/accept", requireAuth, (req: AuthedRequest, res: any) => setStatus(req, res, "accepted", "acceptedAt"));
responsesRouter.post("/:id/decline", requireAuth, (req: AuthedRequest, res: any) => setStatus(req, res, "declined", "createdAt"));
responsesRouter.post("/:id/arrive", requireAuth, (req: AuthedRequest, res: any) => setStatus(req, res, "arrived", "arrivedAt"));

responsesRouter.post("/:id/start-navigation", requireAuth, async (req: AuthedRequest, res: any) => {
  const resp = await queryOne<any>('SELECT * FROM "DonorResponse" WHERE "id" = $1 LIMIT 1', [req.params.id]);
  if (!resp) return res.status(404).json({ error: "Not found" });
  if (resp.donorId !== req.userId) return res.status(403).json({ error: "Not your response" });
  await exec('UPDATE "DonorResponse" SET "navigationStarted"=NOW() WHERE "id"=$1', [resp.id]);
  const updated = await queryOne<any>('SELECT * FROM "DonorResponse" WHERE "id" = $1 LIMIT 1', [resp.id]);
  res.json(updated);
});

responsesRouter.post("/:id/update-location", requireAuth, async (req: AuthedRequest, res: any) => {
  const { lat, lng } = req.body as { lat: number; lng: number };
  if (typeof lat !== "number" || typeof lng !== "number") return res.status(400).json({ error: "lat and lng required" });
  const resp = await queryOne<any>('SELECT * FROM "DonorResponse" WHERE "id" = $1 LIMIT 1', [req.params.id]);
  if (!resp) return res.status(404).json({ error: "Not found" });
  if (resp.donorId !== req.userId) return res.status(403).json({ error: "Not your response" });
  const request = await queryOne<any>('SELECT * FROM "BloodRequest" WHERE "id" = $1 LIMIT 1', [resp.requestId]);
  const hospitalLat = request?.lat || 0;
  const hospitalLng = request?.lng || 0;
  const R = 6371;
  const dLat = (hospitalLat - lat) * Math.PI / 180;
  const dLng = (hospitalLng - lng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat * Math.PI / 180) * Math.cos(hospitalLat * Math.PI / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const distanceKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const avgSpeedKmh = 30;
  const etaMinutes = Math.round((distanceKm / avgSpeedKmh) * 60);
  const estimatedArrival = new Date(Date.now() + etaMinutes * 60000);
  await exec('UPDATE "DonorResponse" SET "currentLat"=$1, "currentLng"=$2, "lastLocationUpdate"=NOW(), "estimatedArrival"=$3, "etaMinutes"=$4, "distanceKm"=$5 WHERE "id"=$6',
    [lat, lng, estimatedArrival, etaMinutes, Math.round(distanceKm * 10) / 10, resp.id]);
  const updated = await queryOne<any>('SELECT * FROM "DonorResponse" WHERE "id" = $1 LIMIT 1', [resp.id]);
  res.json(updated);
});

responsesRouter.post("/:id/meet-person", requireAuth, async (req: AuthedRequest, res: any) => {
  const resp = await queryOne<any>('SELECT * FROM "DonorResponse" WHERE "id" = $1 LIMIT 1', [req.params.id]);
  if (!resp) return res.status(404).json({ error: "Not found" });
  if (resp.donorId !== req.userId) return res.status(403).json({ error: "Not your response" });
  await exec('UPDATE "DonorResponse" SET "personMet"=NOW() WHERE "id"=$1', [resp.id]);
  const updated = await queryOne<any>('SELECT * FROM "DonorResponse" WHERE "id" = $1 LIMIT 1', [resp.id]);
  res.json(updated);
});

responsesRouter.post("/:id/start-donation", requireAuth, async (req: AuthedRequest, res: any) => {
  const resp = await queryOne<any>('SELECT * FROM "DonorResponse" WHERE "id" = $1 LIMIT 1', [req.params.id]);
  if (!resp) return res.status(404).json({ error: "Not found" });
  if (resp.donorId !== req.userId) return res.status(403).json({ error: "Not your response" });
  await exec('UPDATE "DonorResponse" SET "donationStarted"=NOW() WHERE "id"=$1', [resp.id]);
  const updated = await queryOne<any>('SELECT * FROM "DonorResponse" WHERE "id" = $1 LIMIT 1', [resp.id]);
  res.json(updated);
});

responsesRouter.post("/:id/complete", requireAuth, async (req: AuthedRequest, res: any) => {
  const resp = await queryOne<any>('SELECT * FROM "DonorResponse" WHERE "id" = $1 LIMIT 1', [req.params.id]);
  if (!resp) return res.status(404).json({ error: "Not found" });
  await exec('UPDATE "DonorResponse" SET "status"=$1, "completedAt"=NOW() WHERE "id"=$2', ["completed", resp.id]);
  await exec('UPDATE "User" SET "donationCount" = "donationCount" + 1, "reputationScore" = "reputationScore" + 50, "lastDonationDate" = NOW() WHERE "id" = $1', [resp.donorId]);
  const donor = await queryOne<any>('SELECT * FROM "User" WHERE "id" = $1 LIMIT 1', [resp.donorId]);
  const milestones: Record<number, string> = { 1: "Life Saver", 5: "Silver Hero", 10: "Gold Hero", 25: "UYIR Champion", 50: "Tamil Nadu Life Saver" };
  const badge = milestones[donor!.donationCount];
  if (badge) {
    const exists = await queryOne<any>('SELECT * FROM "DonorBadge" WHERE "donorId" = $1 AND "badgeName" = $2 LIMIT 1', [donor!.id, badge]);
    if (!exists) {
      await exec('INSERT INTO "DonorBadge" ("id","donorId","badgeName","awardedDate") VALUES (gen_random_uuid(),$1,$2,NOW())', [donor!.id, badge]);
    }
  }
  await exec('UPDATE "BloodRequest" SET "status"=$1, "closedAt"=NOW() WHERE "id"=$2', ["completed", resp.requestId]);
  res.json({ ok: true, donationCount: donor!.donationCount, newBadge: badge || null });
});

responsesRouter.post("/:id/life-saved", requireAuth, async (req: AuthedRequest, res: any) => {
  const resp = await queryOne<any>('SELECT r.*, req."createdById", req."hospitalName", req."patientName" FROM "DonorResponse" r JOIN "BloodRequest" req ON r."requestId" = req."id" WHERE r."id" = $1 LIMIT 1', [req.params.id]);
  if (!resp) return res.status(404).json({ error: "Not found" });
  if (resp.createdById !== req.userId) return res.status(403).json({ error: "Only requester can mark as life saved" });
  if (resp.status !== "completed") return res.status(400).json({ error: "Donation must be completed first" });
  await exec('UPDATE "BloodRequest" SET "status" = $1 WHERE "id" = $2', ["life_saved", resp.requestId]);
  res.json({ ok: true });
});

responsesRouter.post("/:id/rate", requireAuth, async (req: AuthedRequest, res: any) => {
  const resp = await queryOne<any>('SELECT r.*, req."createdById" FROM "DonorResponse" r JOIN "BloodRequest" req ON r."requestId" = req."id" WHERE r."id" = $1 LIMIT 1', [req.params.id]);
  if (!resp) return res.status(404).json({ error: "Not found" });
  if (resp.createdById !== req.userId) return res.status(403).json({ error: "Only requester can rate" });
  if (resp.status !== "completed") return res.status(400).json({ error: "Donation must be completed first" });
  const { rating, testimonial } = req.body as { rating: number; testimonial?: string };
  if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: "Rating must be 1-5" });
  const existing = await queryOne<any>('SELECT * FROM "DonationRating" WHERE "responseId" = $1 LIMIT 1', [resp.id]);
  if (existing) return res.status(400).json({ error: "Already rated" });
  const ratingRecord = await queryOne<any>(
    'INSERT INTO "DonationRating" ("id","requestId","donorId","requesterId","rating","testimonial","responseId","createdAt") VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,NOW()) RETURNING *',
    [resp.requestId, resp.donorId, req.userId, rating, testimonial || null, resp.id]
  );
  const reputationBonus = rating >= 4 ? 25 : rating >= 3 ? 10 : 0;
  await exec('UPDATE "User" SET "reputationScore" = "reputationScore" + $1 WHERE "id" = $2', [reputationBonus, resp.donorId]);
  res.json(ratingRecord);
});

responsesRouter.post("/report", requireAuth, async (req: AuthedRequest, res: any) => {
  const { againstUserId, requestId, reason } = req.body as { againstUserId: string; requestId?: string; reason: string };
  if (!againstUserId || !reason) return res.status(400).json({ error: "againstUserId + reason required" });
  const ai = await analyzeMessage(reason);
  const report = await queryOne<any>(
    'INSERT INTO "FraudReport" ("id","againstUserId","reportedById","requestId","reason","aiFlag","aiConfidence","status","createdAt") VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,NOW()) RETURNING *',
    [againstUserId, req.userId, requestId || null, reason, ai.category, ai.confidence, ai.confidence >= 80 ? "reviewing" : "open"]
  );
  const countResult = await queryOne<any>('SELECT COUNT(*)::int as cnt FROM "FraudReport" WHERE "againstUserId" = $1 AND "status" IN ($2,$3,$4)', [againstUserId, "open", "reviewing", "actioned"]);
  const count = countResult?.cnt || 0;
  if (count >= 3) {
    await exec('UPDATE "User" SET "banned" = true WHERE "id" = $1', [againstUserId]);
  }
  res.status(201).json({ report, ai, totalReports: count, banned: count >= 3 });
});
