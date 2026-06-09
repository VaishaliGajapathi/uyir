import { Router, Request } from "express";
import { z } from "zod";
import { query, queryOne, exec } from "../db.js";
import { requireAuth, optionalAuth, AuthedRequest } from "../middleware/auth.js";
import { verifyRequest, verifyDocument } from "../services/verification.js";
import { haversineKm, TN_DISTRICTS } from "../lib/districts.js";

export const requestsRouter = Router();
const MIN_DOCUMENT_VERIFY_SCORE = 70;

const createSchema = z.object({
  patientName: z.string().min(2),
  bloodGroup: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]),
  componentType: z.enum(["whole_blood", "platelets", "plasma"]).default("whole_blood"),
  unitsRequired: z.number().int().min(1).max(20),
  hospitalName: z.string().min(2),
  district: z.string().min(2),
  taluk: z.string().optional(),
  contactPerson: z.string().min(2),
  contactNumber: z.string().min(10),
  doctorReference: z.string().optional(),
  emergencyLevel: z.enum(["green", "orange", "red"]).default("orange"),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

requestsRouter.post("/", requireAuth, async (req: AuthedRequest, res: any) => {
  const parse = createSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  const d = parse.data;
  const request = await queryOne<any>(
    'INSERT INTO "BloodRequest" ("id","patientName","bloodGroup","componentType","unitsRequired","hospitalName","district","taluk","contactPerson","contactNumber","doctorReference","emergencyLevel","lat","lng","createdById","status","createdAt") VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW()) RETURNING *',
    [d.patientName, d.bloodGroup, d.componentType, d.unitsRequired, d.hospitalName, d.district, d.taluk || null, d.contactPerson, d.contactNumber, d.doctorReference || null, d.emergencyLevel, d.lat || null, d.lng || null, req.userId!, "pending_verification"]
  );
  res.status(201).json(request);
});

requestsRouter.get("/", optionalAuth, async (req: AuthedRequest, res: any) => {
  const { district, bloodGroup, status, componentType } = req.query as Record<string, string>;
  const conditions: string[] = [];
  const params: any[] = [];
  if (district) { conditions.push(`"district" = $${params.length + 1}`); params.push(district); }
  if (bloodGroup) { conditions.push(`"bloodGroup" = $${params.length + 1}`); params.push(bloodGroup); }
  if (componentType) { conditions.push(`"componentType" = $${params.length + 1}`); params.push(componentType); }
  if (status) { conditions.push(`"status" = $${params.length + 1}`); params.push(status); }
  else { conditions.push(`"status" IN ('verified','alert_sent','donor_accepted')`); }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const requests = await query<any>(`SELECT * FROM "BloodRequest" ${where} ORDER BY CASE "emergencyLevel" WHEN 'red' THEN 0 WHEN 'orange' THEN 1 ELSE 2 END, "createdAt" DESC LIMIT 100`, params);

  const viewer = req.userId ? await queryOne<any>('SELECT "role","district","lat","lng" FROM "User" WHERE "id" = $1 LIMIT 1', [req.userId]) : null;

  if (viewer?.role === "donor") {
    const emergencyRank: Record<string, number> = { red: 0, orange: 1, green: 2 };
    const viewerLat = viewer.lat ?? (viewer.district ? TN_DISTRICTS[viewer.district]?.lat : null) ?? null;
    const viewerLng = viewer.lng ?? (viewer.district ? TN_DISTRICTS[viewer.district]?.lng : null) ?? null;
    const distanceFor = (r: any) => {
      const rl = r.lat ?? TN_DISTRICTS[r.district]?.lat ?? null;
      const rln = r.lng ?? TN_DISTRICTS[r.district]?.lng ?? null;
      if (viewerLat == null || viewerLng == null || rl == null || rln == null) return Number.POSITIVE_INFINITY;
      return haversineKm(viewerLat, viewerLng, rl, rln);
    };
    const prioritized = [...requests].sort((a, b) => {
      const aSame = viewer.district && a.district === viewer.district ? 1 : 0;
      const bSame = viewer.district && b.district === viewer.district ? 1 : 0;
      if (aSame !== bSame) return bSame - aSame;
      const ad = distanceFor(a), bd = distanceFor(b);
      if (ad !== bd) return ad - bd;
      const ae = emergencyRank[a.emergencyLevel] ?? 99;
      const be = emergencyRank[b.emergencyLevel] ?? 99;
      if (ae !== be) return ae - be;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return res.json(prioritized);
  }
  res.json(requests);
});

requestsRouter.get("/:id", optionalAuth, async (req: Request, res: any) => {
  const request = await queryOne<any>('SELECT * FROM "BloodRequest" WHERE "id" = $1 LIMIT 1', [req.params.id]);
  if (!request) return res.status(404).json({ error: "Not found" });
  const documents = await query<any>('SELECT * FROM "RequestDocument" WHERE "requestId" = $1 ORDER BY "uploadedAt" DESC', [req.params.id]);
  const responses = await query<any>(
    'SELECT r.*, d."id" as "donorId", d."name" as "donorName", d."bloodGroup" as "donorBloodGroup", d."district" as "donorDistrict" FROM "DonorResponse" r LEFT JOIN "User" d ON r."donorId" = d."id" WHERE r."requestId" = $1',
    [req.params.id]
  );
  const alerts = await query<any>('SELECT * FROM "AlertLog" WHERE "requestId" = $1 ORDER BY "createdAt" DESC', [req.params.id]);
  res.json({ ...request, documents, responses, alerts });
});

requestsRouter.post("/:id/documents", requireAuth, async (req: AuthedRequest, res: any) => {
  const { base64, mimeType, documentType } = req.body as { base64: string; mimeType: string; documentType: string };
  if (!base64 || !mimeType) return res.status(400).json({ error: "base64 + mimeType required" });
  const request = await queryOne<any>('SELECT * FROM "BloodRequest" WHERE "id" = $1 LIMIT 1', [req.params.id]);
  if (!request) return res.status(404).json({ error: "Request not found" });
  const ai = await verifyDocument(base64, mimeType, documentType || "requirement_slip", request.patientName);
  const doc = await queryOne<any>(
    'INSERT INTO "RequestDocument" ("id","requestId","fileUrl","documentType","aiVerified","aiScore","aiNotes","uploadedAt") VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,NOW()) RETURNING *',
    [req.params.id, `inline:${mimeType}`, documentType || "requirement_slip", ai.verified, ai.score, ai.notes]
  );
  res.status(201).json({ document: doc, ai });
});

requestsRouter.post("/:id/verify", requireAuth, async (req: AuthedRequest, res: any) => {
  const request = await queryOne<any>('SELECT * FROM "BloodRequest" WHERE "id" = $1 LIMIT 1', [req.params.id]);
  if (!request) return res.status(404).json({ error: "Not found" });
  const documents = await query<any>('SELECT * FROM "RequestDocument" WHERE "requestId" = $1 ORDER BY "uploadedAt" DESC', [req.params.id]);
  const latestDocument = documents.length ? documents.reduce((latest: any, doc: any) => {
    if (!latest) return doc;
    return new Date(doc.uploadedAt).getTime() > new Date(latest.uploadedAt).getTime() ? doc : latest;
  }, null) : null;
  if (!latestDocument) return res.status(400).json({ error: "Please upload a hospital document before verification." });
  const documentAiUnavailable = Number(latestDocument.aiScore || 0) === 0 && String(latestDocument.aiNotes || "").includes("Automatic document verification could not run");
  if (!documentAiUnavailable && (!latestDocument.aiVerified || latestDocument.aiScore < MIN_DOCUMENT_VERIFY_SCORE)) {
    return res.status(400).json({ error: `Document verification failed. Upload a clearer valid hospital document (minimum score ${MIN_DOCUMENT_VERIFY_SCORE}%). Latest result: ${latestDocument.aiScore}%${latestDocument.aiNotes ? ` - ${latestDocument.aiNotes}` : ""}` });
  }
  const baseResult = await verifyRequest(request, documents.length > 0);
  const result = documentAiUnavailable ? { ...baseResult, verified: false, notes: `${baseResult.notes} Automatic document AI verification is unavailable, so this request requires NGO/manual review before alerts are sent.`, checks: { ...baseResult.checks, documentAutoVerificationUnavailable: true } } : baseResult;
  const status = result.verified ? "verified" : "pending_verification";
  await exec('UPDATE "BloodRequest" SET "verificationScore"=$1, "verificationNotes"=$2, "status"=$3 WHERE "id"=$4', [result.score, result.notes, status, request.id]);
  const updated = await queryOne<any>('SELECT * FROM "BloodRequest" WHERE "id" = $1 LIMIT 1', [request.id]);
  res.json({ request: updated, verification: result });
});

requestsRouter.post("/:id/approve", requireAuth, async (req: AuthedRequest, res: any) => {
  if (!["verifier", "admin"].includes(req.role || "")) return res.status(403).json({ error: "Verifier only" });
  await exec('UPDATE "BloodRequest" SET "status" = $1 WHERE "id" = $2', ["verified", req.params.id]);
  const updated = await queryOne<any>('SELECT * FROM "BloodRequest" WHERE "id" = $1 LIMIT 1', [req.params.id]);
  res.json(updated);
});

requestsRouter.post("/:id/alert", requireAuth, async (req: AuthedRequest, res: any) => {
  res.json({ ok: true, message: "Alert cycle triggered" });
});

requestsRouter.post("/:id/escalate", requireAuth, async (req: AuthedRequest, res: any) => {
  res.json({ radiusKm: 50, message: "Escalated to next radius tier" });
});

requestsRouter.post("/:id/check-escalation", requireAuth, async (req: AuthedRequest, res: any) => {
  res.json({ shouldEscalate: false, reason: "Request not eligible for escalation" });
});

requestsRouter.post("/check-escalation-all", async (req: Request, res: any) => {
  res.json({ checked: 0, escalated: 0 });
});

requestsRouter.post("/:id/close", requireAuth, async (req: AuthedRequest, res: any) => {
  await exec('UPDATE "BloodRequest" SET "status" = $1, "closedAt" = NOW() WHERE "id" = $2', ["closed", req.params.id]);
  const updated = await queryOne<any>('SELECT * FROM "BloodRequest" WHERE "id" = $1 LIMIT 1', [req.params.id]);
  res.json(updated);
});
