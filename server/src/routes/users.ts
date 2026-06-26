import { Router } from "express";
import { z } from "zod";
import { query, queryOne, exec } from "../db.js";
import { requireAuth, AuthedRequest } from "../middleware/auth.js";

export const usersRouter = Router();

usersRouter.get("/me", requireAuth, async (req: AuthedRequest, res: any) => {
  const user = await queryOne<any>('SELECT * FROM "User" WHERE "id" = $1 LIMIT 1', [req.userId]);
  if (!user) return res.status(404).json({ error: "Not found" });
  const badges = await query<any>('SELECT * FROM "DonorBadge" WHERE "donorId" = $1 ORDER BY "awardedDate" DESC', [req.userId]);
  res.json({ ...user, badges });
});

usersRouter.patch("/me", requireAuth, async (req: AuthedRequest, res: any) => {
  const schema = z.object({
    name: z.string().min(2).optional(),
    language: z.enum(["ta", "en"]).optional(),
    district: z.string().min(2).optional(),
    taluk: z.string().optional(),
    bloodGroup: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]).optional(),
    gender: z.enum(["male", "female"]).optional(),
    age: z.number().int().min(18).max(100).optional(),
    isPlateletDonor: z.boolean().optional(),
    shareLocation: z.boolean().optional(),
    notificationsEnabled: z.boolean().optional(),
    voiceEnabled: z.boolean().optional(),
    locationEnabled: z.boolean().optional(),
    pincode: z.string().optional(),
    weight: z.number().positive().optional(),
    height: z.number().positive().optional(),
    hemoglobinLevel: z.number().positive().optional(),
    sleepHours: z.number().int().min(0).max(24).optional(),
    drinkingHabits: z.string().optional(),
    smokingHabits: z.string().optional(),
    lastDonationDate: z.string().optional(),
    dob: z.string().optional(),
  });
  const parse = schema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Invalid input", details: parse.error.flatten() });
  
  const allowed = ["name","language","district","taluk","bloodGroup","gender","age","isPlateletDonor","shareLocation","notificationsEnabled","voiceEnabled","locationEnabled","pincode","weight","height","hemoglobinLevel","sleepHours","drinkingHabits","smokingHabits"];
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
  const schema = z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    district: z.string().optional(),
    taluk: z.string().optional(),
    pincode: z.string().optional(),
  });
  const parse = schema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Invalid input", details: parse.error.flatten() });
  
  const { lat, lng, district, taluk, pincode } = parse.data;
  const user = await queryOne<any>(
    'UPDATE "User" SET "lat"=$1, "lng"=$2, "shareLocation"=true, "locationEnabled"=true, "district"=COALESCE($3,"district"), "taluk"=COALESCE($4,"taluk"), "pincode"=COALESCE($5,"pincode") WHERE "id"=$6 RETURNING *',
    [lat, lng, district?.trim() || null, taluk?.trim() || null, pincode?.trim() || null, req.userId]
  );
  res.json({ ok: true, lat: user!.lat, lng: user!.lng, district: user!.district, taluk: user!.taluk, pincode: user!.pincode });
});

usersRouter.post("/me/fcm-token", requireAuth, async (req: AuthedRequest, res: any) => {
  const schema = z.object({ token: z.string().min(10) });
  const parse = schema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Invalid input", details: parse.error.flatten() });
  await exec('UPDATE "User" SET "fcmToken" = $1 WHERE "id" = $2', [parse.data.token, req.userId]);
  res.json({ ok: true });
});

usersRouter.post("/me/push-subscription", requireAuth, async (req: AuthedRequest, res: any) => {
  const schema = z.object({
    subscription: z.object({
      endpoint: z.string().url(),
      keys: z.object({
        p256dh: z.string(),
        auth: z.string(),
      }),
    }),
  });
  const parse = schema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Invalid input", details: parse.error.flatten() });
  await exec('UPDATE "User" SET "pushSubscription" = $1 WHERE "id" = $2', [JSON.stringify(parse.data.subscription), req.userId]);
  res.json({ ok: true });
});

// Test endpoint to send a push notification to the current user
usersRouter.post("/me/test-push", requireAuth, async (req: AuthedRequest, res: any) => {
  const { sendPushToUser } = await import("../lib/push.js");
  const result = await sendPushToUser(req.userId!, "Test Notification", "This is a test notification from UYIR", { type: "test" });
  res.json(result);
});

usersRouter.get("/me/documents", requireAuth, async (req: AuthedRequest, res: any) => {
  const documents = await query<any>('SELECT * FROM "DonorDocument" WHERE "donorId" = $1 ORDER BY "uploadedAt" DESC', [req.userId]);
  res.json(documents);
});

usersRouter.post("/me/documents", requireAuth, async (req: AuthedRequest, res: any) => {
  const schema = z.object({
    documentType: z.enum(["aadhar", "driving_license", "passport"]),
    fileUrl: z.string().url(),
    documentNumber: z.string().optional(),
  });
  const parse = schema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Invalid input", details: parse.error.flatten() });
  
  const { documentType, fileUrl, documentNumber } = parse.data;
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
