import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth, AuthedRequest } from "../middleware/auth.js";
import { emitRequestUpdate } from "../services/alerts.js";
import { analyzeMessage } from "../services/fraud.js";
import { scheduleHealthReminders } from "../services/healthFollowup.js";

export const responsesRouter = Router();

// Alerts/responses addressed to the logged-in donor.
responsesRouter.get("/mine", requireAuth, async (req: AuthedRequest, res) => {
  const responses = await prisma.donorResponse.findMany({
    where: { donorId: req.userId },
    orderBy: { createdAt: "desc" },
    include: {
      request: {
        select: {
          id: true, patientName: true, bloodGroup: true, componentType: true,
          unitsRequired: true, hospitalName: true, district: true, emergencyLevel: true,
          status: true, contactPerson: true, contactNumber: true,
        },
      },
    },
  });
  res.json(responses);
});

async function setStatus(req: AuthedRequest, res: any, status: string, stamp: string) {
  const resp = await prisma.donorResponse.findUnique({ where: { id: req.params.id } });
  if (!resp) return res.status(404).json({ error: "Not found" });
  if (resp.donorId !== req.userId) return res.status(403).json({ error: "Not your alert" });

  const data: any = { status };
  data[stamp] = new Date();
  const updated = await prisma.donorResponse.update({ where: { id: resp.id }, data });

  if (status === "accepted") {
    await prisma.bloodRequest.update({ where: { id: resp.requestId }, data: { status: "donor_accepted" } });
  }
  emitRequestUpdate(resp.requestId, { responseId: resp.id, donorStatus: status });
  res.json(updated);
}

responsesRouter.post("/:id/accept", requireAuth, (req: AuthedRequest, res) => setStatus(req, res, "accepted", "acceptedAt"));
responsesRouter.post("/:id/decline", requireAuth, (req: AuthedRequest, res) => setStatus(req, res, "declined", "createdAt"));
responsesRouter.post("/:id/arrive", requireAuth, (req: AuthedRequest, res) => setStatus(req, res, "arrived", "arrivedAt"));

// Donation tracking endpoints
responsesRouter.post("/:id/start-navigation", requireAuth, async (req: AuthedRequest, res) => {
  const resp = await prisma.donorResponse.findUnique({ where: { id: req.params.id } });
  if (!resp) return res.status(404).json({ error: "Not found" });
  if (resp.donorId !== req.userId) return res.status(403).json({ error: "Not your response" });
  const updated = await prisma.donorResponse.update({ where: { id: resp.id }, data: { navigationStarted: new Date() } });
  res.json(updated);
});

// Update donor location for real-time ETA tracking
responsesRouter.post("/:id/update-location", requireAuth, async (req: AuthedRequest, res) => {
  const { lat, lng } = req.body as { lat: number; lng: number };
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return res.status(400).json({ error: "lat and lng required" });
  }

  const resp = await prisma.donorResponse.findUnique({ 
    where: { id: req.params.id },
    include: { request: true }
  });
  if (!resp) return res.status(404).json({ error: "Not found" });
  if (resp.donorId !== req.userId) return res.status(403).json({ error: "Not your response" });

  // Calculate distance to hospital using Haversine formula
  const hospitalLat = resp.request.lat || 0;
  const hospitalLng = resp.request.lng || 0;
  const R = 6371; // Earth's radius in km
  const dLat = (hospitalLat - lat) * Math.PI / 180;
  const dLng = (hospitalLng - lng) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat * Math.PI / 180) * Math.cos(hospitalLat * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const distanceKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  // Estimate ETA based on average speed of 30 km/h in urban areas
  const avgSpeedKmh = 30;
  const etaMinutes = Math.round((distanceKm / avgSpeedKmh) * 60);
  const estimatedArrival = new Date(Date.now() + etaMinutes * 60000);

  const updated = await prisma.donorResponse.update({
    where: { id: resp.id },
    data: {
      currentLat: lat,
      currentLng: lng,
      lastLocationUpdate: new Date(),
      estimatedArrival,
      etaMinutes,
      distanceKm: Math.round(distanceKm * 10) / 10
    }
  });

  emitRequestUpdate(resp.requestId, { 
    donorLocation: { lat, lng },
    etaMinutes,
    distanceKm: Math.round(distanceKm * 10) / 10
  });

  res.json(updated);
});

responsesRouter.post("/:id/meet-person", requireAuth, async (req: AuthedRequest, res) => {
  const resp = await prisma.donorResponse.findUnique({ where: { id: req.params.id } });
  if (!resp) return res.status(404).json({ error: "Not found" });
  if (resp.donorId !== req.userId) return res.status(403).json({ error: "Not your response" });
  const updated = await prisma.donorResponse.update({ where: { id: resp.id }, data: { personMet: new Date() } });
  res.json(updated);
});

responsesRouter.post("/:id/start-donation", requireAuth, async (req: AuthedRequest, res) => {
  const resp = await prisma.donorResponse.findUnique({ where: { id: req.params.id } });
  if (!resp) return res.status(404).json({ error: "Not found" });
  if (resp.donorId !== req.userId) return res.status(403).json({ error: "Not your response" });
  const updated = await prisma.donorResponse.update({ where: { id: resp.id }, data: { donationStarted: new Date() } });
  res.json(updated);
});

// Complete donation -> award reputation, badges, update donation count.
responsesRouter.post("/:id/complete", requireAuth, async (req: AuthedRequest, res) => {
  const resp = await prisma.donorResponse.findUnique({ where: { id: req.params.id } });
  if (!resp) return res.status(404).json({ error: "Not found" });

  await prisma.donorResponse.update({ where: { id: resp.id }, data: { status: "completed", completedAt: new Date() } });
  const donor = await prisma.user.update({
    where: { id: resp.donorId },
    data: { donationCount: { increment: 1 }, reputationScore: { increment: 50 }, lastDonationDate: new Date() },
  });

  // Award badges by milestone.
  const milestones: Record<number, string> = {
    1: "Life Saver", 5: "Silver Hero", 10: "Gold Hero", 25: "UYIR Champion", 50: "Tamil Nadu Life Saver",
  };
  const badge = milestones[donor.donationCount];
  if (badge) {
    const exists = await prisma.donorBadge.findFirst({ where: { donorId: donor.id, badgeName: badge } });
    if (!exists) await prisma.donorBadge.create({ data: { donorId: donor.id, badgeName: badge } });
  }

  await prisma.bloodRequest.update({ where: { id: resp.requestId }, data: { status: "completed", closedAt: new Date() } });
  emitRequestUpdate(resp.requestId, { status: "completed" });

  // Schedule AI-powered health follow-up reminders
  try {
    await scheduleHealthReminders(resp.donorId, new Date());
  } catch (e: any) {
    console.error("[complete] Failed to schedule health reminders:", e);
  }

  res.json({ ok: true, donationCount: donor.donationCount, newBadge: badge || null });
});

// Mark request as "life_saved" after successful donation (requester confirms)
responsesRouter.post("/:id/life-saved", requireAuth, async (req: AuthedRequest, res) => {
  const resp = await prisma.donorResponse.findUnique({ 
    where: { id: req.params.id },
    include: { request: true, donor: true }
  });
  if (!resp) return res.status(404).json({ error: "Not found" });
  if (resp.request.createdById !== req.userId) return res.status(403).json({ error: "Only requester can mark as life saved" });
  if (resp.status !== "completed") return res.status(400).json({ error: "Donation must be completed first" });

  await prisma.bloodRequest.update({ 
    where: { id: resp.requestId }, 
    data: { status: "life_saved" } 
  });

  // Send appreciation SMS to donor
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
    try {
      // @ts-ignore
      const twilio = require("twilio");
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      await client.messages.create({
        body: `🩸 Thank you ${resp.donor.name}! You saved a life today. Your blood donation at ${resp.request.hospitalName} has successfully helped ${resp.request.patientName}. You are a true hero! - UYIR Team`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: `+91${resp.donor.mobile}`,
      });
      console.log(`[appreciation] SMS sent to donor ${resp.donor.mobile}`);
    } catch (e: any) {
      console.error(`[appreciation] SMS failed: ${e.message}`);
    }
  }

  res.json({ ok: true });
});

// Submit rating and testimonial for donor
responsesRouter.post("/:id/rate", requireAuth, async (req: AuthedRequest, res: any) => {
  const resp = await prisma.donorResponse.findUnique({
    where: { id: req.params.id },
    include: { request: true }
  });
  if (!resp) return res.status(404).json({ error: "Not found" });
  if (resp.request.createdById !== req.userId) return res.status(403).json({ error: "Only requester can rate" });
  if (resp.status !== "completed") return res.status(400).json({ error: "Donation must be completed first" });

  const { rating, testimonial } = req.body as { rating: number; testimonial?: string };
  if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: "Rating must be 1-5" });

  // Check if already rated
  const existing = await prisma.donationRating.findFirst({
    where: { responseId: resp.id }
  });
  if (existing) return res.status(400).json({ error: "Already rated" });

  const ratingRecord = await prisma.donationRating.create({
    data: {
      requestId: resp.requestId,
      donorId: resp.donorId,
      requesterId: req.userId,
      rating,
      testimonial,
      responseId: resp.id,
    },
  });

  // Update donor reputation based on rating
  const reputationBonus = rating >= 4 ? 25 : rating >= 3 ? 10 : 0;
  await prisma.user.update({
    where: { id: resp.donorId },
    data: { reputationScore: { increment: reputationBonus } },
  });

  res.json(ratingRecord);
});

// Report abuse on a request/donor; AI screens the report text.
responsesRouter.post("/report", requireAuth, async (req: AuthedRequest, res: any) => {
  const { againstUserId, requestId, reason } = req.body as { againstUserId: string; requestId?: string; reason: string };
  if (!againstUserId || !reason) return res.status(400).json({ error: "againstUserId + reason required" });

  const ai = await analyzeMessage(reason);
  const report = await prisma.fraudReport.create({
    data: {
      againstUserId,
      reportedById: req.userId,
      requestId,
      reason,
      aiFlag: ai.category,
      aiConfidence: ai.confidence,
      status: ai.confidence >= 80 ? "reviewing" : "open",
    },
  });

  // Escalate: count open reports; auto-suspend on threshold.
  const count = await prisma.fraudReport.count({ where: { againstUserId, status: { in: ["open", "reviewing", "actioned"] } } });
  if (count >= 3) {
    await prisma.user.update({ where: { id: againstUserId }, data: { banned: true } });
  }
  res.status(201).json({ report, ai, totalReports: count, banned: count >= 3 });
});
