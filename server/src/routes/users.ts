import { Router } from "express";
import { query, queryOne, exec } from "../db.js";
import { requireAuth, AuthedRequest } from "../middleware/auth.js";

export const usersRouter = Router();

usersRouter.get("/me", requireAuth, async (req: AuthedRequest, res: any) => {
  const user = await queryOne<any>('SELECT * FROM "User" WHERE "id" = $1 LIMIT 1', [req.userId]);
  if (!user) return res.status(404).json({ error: "Not found" });
  const badges = await query<any>('SELECT * FROM "DonorBadge" WHERE "userId" = $1 ORDER BY "awardedDate" DESC', [req.userId]);
  res.json({ ...user, badges });
});

usersRouter.patch("/me", requireAuth, async (req: AuthedRequest, res: any) => {
  const allowed = ["name","language","district","taluk","bloodGroup","gender","isPlateletDonor","shareLocation","role","notificationsEnabled","voiceEnabled","locationEnabled","pincode"];
  const sets: string[] = [];
  const vals: any[] = [];
  for (const k of allowed) {
    if (k in req.body) { sets.push(`"${k}" = $${sets.length + 1}`); vals.push(req.body[k]); }
  }
  if ("lastDonationDate" in req.body && req.body.lastDonationDate) {
    sets.push(`"lastDonationDate" = $${sets.length + 1}`); vals.push(new Date(req.body.lastDonationDate));
  }
  if ("dob" in req.body && req.body.dob) {
    sets.push(`"dob" = $${sets.length + 1}`); vals.push(new Date(req.body.dob));
  }
  if (sets.length === 0) return res.status(400).json({ error: "No fields to update" });
  vals.push(req.userId);
  const user = await queryOne<any>(`UPDATE "User" SET ${sets.join(", ")} WHERE "id" = $${vals.length} RETURNING *`, vals);
  res.json(user);
});

usersRouter.post("/me/location", requireAuth, async (req: AuthedRequest, res: any) => {
  const { lat, lng, district, taluk, pincode } = req.body;
  if (typeof lat !== "number" || typeof lng !== "number") {
    return res.status(400).json({ error: "lat/lng required" });
  }
  const user = await queryOne<any>(
    'UPDATE "User" SET "lat"=$1, "lng"=$2, "shareLocation"=true, "locationEnabled"=true, "district"=COALESCE($3,"district"), "taluk"=COALESCE($4,"taluk"), "pincode"=COALESCE($5,"pincode") WHERE "id"=$6 RETURNING *',
    [lat, lng, district?.trim() || null, taluk?.trim() || null, pincode?.trim() || null, req.userId]
  );
  res.json({ ok: true, lat: user!.lat, lng: user!.lng, district: user!.district, taluk: user!.taluk, pincode: user!.pincode });
});

usersRouter.post("/me/fcm-token", requireAuth, async (req: AuthedRequest, res: any) => {
  await exec('UPDATE "User" SET "fcmToken" = $1 WHERE "id" = $2', [req.body.token, req.userId]);
  res.json({ ok: true });
});

usersRouter.get("/me/documents", requireAuth, async (req: AuthedRequest, res: any) => {
  const documents = await query<any>('SELECT * FROM "DonorDocument" WHERE "donorId" = $1 ORDER BY "uploadedAt" DESC', [req.userId]);
  res.json(documents);
});

usersRouter.post("/me/documents", requireAuth, async (req: AuthedRequest, res: any) => {
  const { documentType, fileUrl, documentNumber } = req.body;
  if (!documentType || !fileUrl) return res.status(400).json({ error: "documentType and fileUrl required" });
  const validTypes = ["aadhar","driving_license","passport"];
  if (!validTypes.includes(documentType)) return res.status(400).json({ error: "Invalid document type" });
  const doc = await queryOne<any>(
    'INSERT INTO "DonorDocument" ("id","donorId","documentType","fileUrl","documentNumber","uploadedAt") VALUES (gen_random_uuid(),$1,$2,$3,$4,NOW()) RETURNING *',
    [req.userId, documentType, fileUrl, documentNumber || null]
  );
  res.status(201).json(doc);
});

usersRouter.delete("/me/documents/:id", requireAuth, async (req: AuthedRequest, res: any) => {
  const document = await queryOne<any>('SELECT * FROM "DonorDocument" WHERE "id" = $1 LIMIT 1', [req.params.id]);
  if (!document) return res.status(404).json({ error: "Document not found" });
  if (document.donorId !== req.userId) return res.status(403).json({ error: "Not your document" });
  await exec('DELETE FROM "DonorDocument" WHERE "id" = $1', [req.params.id]);
  res.json({ ok: true });
});
