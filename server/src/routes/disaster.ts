import { Router, Response, NextFunction } from "express";
import { z } from "zod";
import { query, queryOne, exec } from "../db.js";
import { requireAuth, requireSuperAdmin, AuthedRequest } from "../middleware/auth.js";
import { logAudit, AuditActions } from "../lib/audit.js";

export const disasterRouter = Router();
disasterRouter.use(requireAuth);

function asyncHandler(fn: (req: AuthedRequest, res: Response, next: NextFunction) => Promise<any>) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      console.error("[disaster] route error:", err.message || err);
      res.status(500).json({ error: err.message || "Internal server error" });
    });
  };
}

// List active disaster broadcasts
disasterRouter.get("/broadcasts", asyncHandler(async (_req: AuthedRequest, res: Response) => {
  const broadcasts = await query<any>(
    'SELECT * FROM "DisasterBroadcast" WHERE "active" = true ORDER BY "createdAt" DESC'
  );
  res.json(broadcasts);
}));

// Get single broadcast
disasterRouter.get("/broadcasts/:id", asyncHandler(async (req: AuthedRequest, res: Response) => {
  const broadcast = await queryOne<any>(
    'SELECT * FROM "DisasterBroadcast" WHERE "id" = $1 LIMIT 1',
    [req.params.id]
  );
  if (!broadcast) return res.status(404).json({ error: "Broadcast not found" });
  res.json(broadcast);
}));

// Create disaster broadcast (super admin only)
disasterRouter.post("/broadcasts", requireSuperAdmin, asyncHandler(async (req: AuthedRequest, res: Response) => {
  const schema = z.object({
    district: z.string().optional(),
    message: z.string().min(10),
    priority: z.enum(["low", "medium", "high", "critical"]).default("high"),
  });
  const parse = schema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  const d = parse.data;
  
  const broadcast = await queryOne<any>(
    'INSERT INTO "DisasterBroadcast" ("id","district","message","priority","active","createdById","createdAt") VALUES (gen_random_uuid(),$1,$2,$3,true,$4,NOW()) RETURNING *',
    [d.district || null, d.message, d.priority, req.userId!]
  );
  
  await logAudit({
    userId: req.userId!,
    action: "disaster.broadcast_create",
    entityType: "DisasterBroadcast",
    entityId: broadcast.id,
    details: JSON.stringify({ district: d.district, priority: d.priority }),
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });
  
  res.status(201).json(broadcast);
}));

// Deactivate broadcast (super admin only)
disasterRouter.post("/broadcasts/:id/deactivate", requireSuperAdmin, asyncHandler(async (req: AuthedRequest, res: Response) => {
  await exec('UPDATE "DisasterBroadcast" SET "active" = false WHERE "id" = $1', [req.params.id]);
  await logAudit({
    userId: req.userId!,
    action: "disaster.broadcast_deactivate",
    entityType: "DisasterBroadcast",
    entityId: req.params.id,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });
  res.json({ ok: true });
}));

// Delete broadcast (super admin only)
disasterRouter.delete("/broadcasts/:id", requireSuperAdmin, asyncHandler(async (req: AuthedRequest, res: Response) => {
  await exec('DELETE FROM "DisasterBroadcast" WHERE "id" = $1', [req.params.id]);
  await logAudit({
    userId: req.userId!,
    action: "disaster.broadcast_delete",
    entityType: "DisasterBroadcast",
    entityId: req.params.id,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });
  res.json({ ok: true });
}));

// Get disaster mode status for a district
disasterRouter.get("/status/:district", asyncHandler(async (req: AuthedRequest, res: Response) => {
  const district = req.params.district;
  const activeBroadcasts = await query<any>(
    'SELECT * FROM "DisasterBroadcast" WHERE "active" = true AND ("district" = $1 OR "district" IS NULL) ORDER BY "priority" DESC, "createdAt" DESC',
    [district]
  );
  const isDisasterMode = activeBroadcasts.length > 0;
  res.json({ isDisasterMode, broadcasts: activeBroadcasts });
}));
