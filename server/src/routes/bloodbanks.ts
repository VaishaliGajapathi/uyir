import { Router, Response, NextFunction } from "express";
import { z } from "zod";
import { query, queryOne, exec } from "../db.js";
import { requireAuth, requireAdminOrVolunteer, AuthedRequest } from "../middleware/auth.js";
import { logAudit, AuditActions } from "../lib/audit.js";

export const bloodBanksRouter = Router();
bloodBanksRouter.use(requireAuth);

function asyncHandler(fn: (req: AuthedRequest, res: Response, next: NextFunction) => Promise<any>) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      console.error("[bloodbanks] route error:", err.message || err);
      res.status(500).json({ error: err.message || "Internal server error" });
    });
  };
}

// List blood banks
bloodBanksRouter.get("/", asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { district, bloodGroup } = req.query as Record<string, string>;
  const conditions: string[] = [];
  const params: any[] = [];
  
  if (district) {
    conditions.push(`"district" = $${params.length + 1}`);
    params.push(district);
  }
  
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const bloodBanks = await query<any>(`SELECT * FROM "BloodBank" ${where} ORDER BY "verified" DESC, "createdAt" DESC`, params);
  
  // Filter by available blood groups if requested
  if (bloodGroup) {
    const filtered = bloodBanks.filter((bb: any) => {
      if (!bb.availableBloodGroups) return false;
      return bb.availableBloodGroups.includes(bloodGroup);
    });
    return res.json(filtered);
  }
  
  res.json(bloodBanks);
}));

// Get single blood bank
bloodBanksRouter.get("/:id", asyncHandler(async (req: AuthedRequest, res: Response) => {
  const bloodBank = await queryOne<any>('SELECT * FROM "BloodBank" WHERE "id" = $1 LIMIT 1', [req.params.id]);
  if (!bloodBank) return res.status(404).json({ error: "Blood bank not found" });
  res.json(bloodBank);
}));

// Create blood bank (admin only)
bloodBanksRouter.post("/", requireAdminOrVolunteer, asyncHandler(async (req: AuthedRequest, res: Response) => {
  const schema = z.object({
    name: z.string().min(2),
    district: z.string().min(2),
    address: z.string().optional(),
    phone: z.string().min(10),
    lat: z.number().optional(),
    lng: z.number().optional(),
    availableBloodGroups: z.string().optional(),
  });
  const parse = schema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  const d = parse.data;
  
  const bloodBank = await queryOne<any>(
    'INSERT INTO "BloodBank" ("id","name","district","address","phone","lat","lng","availableBloodGroups","createdAt") VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,NOW()) RETURNING *',
    [d.name, d.district, d.address || null, d.phone, d.lat || null, d.lng || null, d.availableBloodGroups || null]
  );
  
  await logAudit({
    userId: req.userId!,
    action: "bloodbank.create",
    entityType: "BloodBank",
    entityId: bloodBank.id,
    details: JSON.stringify({ name: d.name, district: d.district }),
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });
  
  res.status(201).json(bloodBank);
}));

// Update blood bank (admin only)
bloodBanksRouter.put("/:id", requireAdminOrVolunteer, asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { name, district, address, phone, lat, lng, availableBloodGroups, verified } = req.body;
  const updates: string[] = [];
  const params: any[] = [];
  
  if (name !== undefined) { updates.push(`"name" = $${params.length + 1}`); params.push(name); }
  if (district !== undefined) { updates.push(`"district" = $${params.length + 1}`); params.push(district); }
  if (address !== undefined) { updates.push(`"address" = $${params.length + 1}`); params.push(address); }
  if (phone !== undefined) { updates.push(`"phone" = $${params.length + 1}`); params.push(phone); }
  if (lat !== undefined) { updates.push(`"lat" = $${params.length + 1}`); params.push(lat); }
  if (lng !== undefined) { updates.push(`"lng" = $${params.length + 1}`); params.push(lng); }
  if (availableBloodGroups !== undefined) { updates.push(`"availableBloodGroups" = $${params.length + 1}`); params.push(availableBloodGroups); }
  if (verified !== undefined) { updates.push(`"verified" = $${params.length + 1}`); params.push(verified); }
  
  if (updates.length === 0) return res.status(400).json({ error: "No fields to update" });
  
  params.push(req.params.id);
  await exec(`UPDATE "BloodBank" SET ${updates.join(", ")} WHERE "id" = $${params.length}`, params);
  
  const updated = await queryOne<any>('SELECT * FROM "BloodBank" WHERE "id" = $1 LIMIT 1', [req.params.id]);
  res.json(updated);
}));

// Verify blood bank (admin only)
bloodBanksRouter.post("/:id/verify", requireAdminOrVolunteer, asyncHandler(async (req: AuthedRequest, res: Response) => {
  await exec('UPDATE "BloodBank" SET "verified" = true WHERE "id" = $1', [req.params.id]);
  await logAudit({
    userId: req.userId!,
    action: "bloodbank.verify",
    entityType: "BloodBank",
    entityId: req.params.id,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });
  res.json({ ok: true });
}));

// Delete blood bank (admin only)
bloodBanksRouter.delete("/:id", requireAdminOrVolunteer, asyncHandler(async (req: AuthedRequest, res: Response) => {
  await exec('DELETE FROM "BloodBank" WHERE "id" = $1', [req.params.id]);
  await logAudit({
    userId: req.userId!,
    action: "bloodbank.delete",
    entityType: "BloodBank",
    entityId: req.params.id,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });
  res.json({ ok: true });
}));
