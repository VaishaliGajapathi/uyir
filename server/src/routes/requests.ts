import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth, optionalAuth, AuthedRequest } from "../middleware/auth.js";
import { verifyRequest, verifyDocument } from "../services/verification.js";
import { runAlertCycle, escalateRadius, emitRequestUpdate } from "../services/alerts.js";
import { evaluateEscalation, executeEscalation, checkEscalationForAllRequests } from "../services/escalation.js";

export const requestsRouter = Router();

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

// Create a new blood request (status starts pending_verification).
requestsRouter.post("/", requireAuth, async (req: AuthedRequest, res: any) => {
  const parse = createSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  const d = parse.data;

  const request = await prisma.bloodRequest.create({
    data: { ...d, createdById: req.userId!, status: "pending_verification" },
  });
  res.status(201).json(request);
});

// List requests with filters (public-ish; auth optional for personalization).
requestsRouter.get("/", optionalAuth, async (req: Request, res: any) => {
  const { district, bloodGroup, status, componentType } = req.query as Record<string, string>;
  const where: any = {};
  if (district) where.district = district;
  if (bloodGroup) where.bloodGroup = bloodGroup;
  if (componentType) where.componentType = componentType;
  if (status) where.status = status;
  else where.status = { in: ["verified", "alert_sent", "donor_accepted"] };

  const requests = await prisma.bloodRequest.findMany({
    where,
    orderBy: [{ emergencyLevel: "asc" }, { createdAt: "desc" }],
    take: 100,
    include: { _count: { select: { responses: true } } },
  });
  res.json(requests);
});

requestsRouter.get("/:id", optionalAuth, async (req: Request, res: any) => {
  const request = await prisma.bloodRequest.findUnique({
    where: { id: req.params.id },
    include: {
      documents: true,
      responses: { include: { donor: { select: { id: true, name: true, bloodGroup: true, district: true } } } },
      alerts: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!request) return res.status(404).json({ error: "Not found" });
  res.json(request);
});

// Upload a document (base64) and run AI vision verification on it.
requestsRouter.post("/:id/documents", requireAuth, async (req: AuthedRequest, res: any) => {
  const { base64, mimeType, documentType } = req.body as { base64: string; mimeType: string; documentType: string };
  if (!base64 || !mimeType) return res.status(400).json({ error: "base64 + mimeType required" });

  const request = await prisma.bloodRequest.findUnique({ where: { id: req.params.id } });
  if (!request) return res.status(404).json({ error: "Request not found" });

  const ai = await verifyDocument(base64, mimeType, documentType || "requirement_slip", request.patientName);
  const doc = await prisma.requestDocument.create({
    data: {
      requestId: req.params.id,
      fileUrl: `inline:${mimeType}`,
      documentType: documentType || "requirement_slip",
      aiVerified: ai.verified,
      aiScore: ai.score,
      aiNotes: ai.notes,
    },
  });
  res.status(201).json({ document: doc, ai });
});

// Run AI verification on the request -> sets verificationScore + status.
requestsRouter.post("/:id/verify", requireAuth, async (req: AuthedRequest, res: any) => {
  const request = await prisma.bloodRequest.findUnique({
    where: { id: req.params.id },
    include: { documents: true },
  });
  if (!request) return res.status(404).json({ error: "Not found" });

  const result = await verifyRequest(request, request.documents.length > 0);
  const status = result.verified ? "verified" : "pending_verification";
  const updated = await prisma.bloodRequest.update({
    where: { id: request.id },
    data: { verificationScore: result.score, verificationNotes: result.notes, status },
  });
  emitRequestUpdate(request.id, { status, verificationScore: result.score });
  res.json({ request: updated, verification: result });
});

// Manual approve by verifier/admin (human-in-the-loop).
requestsRouter.post("/:id/approve", requireAuth, async (req: AuthedRequest, res: any) => {
  if (!["verifier", "admin"].includes(req.role || "")) return res.status(403).json({ error: "Verifier only" });
  const updated = await prisma.bloodRequest.update({ where: { id: req.params.id }, data: { status: "verified" } });
  emitRequestUpdate(updated.id, { status: "verified" });
  res.json(updated);
});

// Trigger the alert cycle for the current radius.
requestsRouter.post("/:id/alert", requireAuth, async (req: AuthedRequest, res: any) => {
  const result = await runAlertCycle(req.params.id);
  res.json(result);
});

// Escalate to next radius tier (manual).
requestsRouter.post("/:id/escalate", requireAuth, async (req: AuthedRequest, res: any) => {
  const radiusKm = await escalateRadius(req.params.id);
  res.json({ radiusKm });
});

// AI-powered escalation check for a specific request.
requestsRouter.post("/:id/check-escalation", requireAuth, async (req: AuthedRequest, res: any) => {
  const decision = await evaluateEscalation(req.params.id);
  if (!decision) return res.json({ shouldEscalate: false, reason: "Request not eligible for escalation" });
  
  if (decision.shouldEscalate) {
    await executeEscalation(req.params.id, decision);
  }
  
  res.json(decision);
});

// Automated escalation check for all active requests (called by cron job).
requestsRouter.post("/check-escalation-all", async (req: Request, res: any) => {
  const result = await checkEscalationForAllRequests();
  res.json(result);
});

requestsRouter.post("/:id/close", requireAuth, async (req: AuthedRequest, res: any) => {
  const updated = await prisma.bloodRequest.update({
    where: { id: req.params.id },
    data: { status: "closed", closedAt: new Date() },
  });
  emitRequestUpdate(updated.id, { status: "closed" });
  res.json(updated);
});
