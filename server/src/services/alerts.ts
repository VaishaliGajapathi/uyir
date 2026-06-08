import { EventEmitter } from "node:events";
import { prisma } from "../db.js";
import { rankDonors, DonorCandidate } from "./matching.js";
import { districtsForRadius, RADIUS_LADDER } from "../lib/districts.js";
import { evaluateEscalation, executeEscalation } from "./escalation.js";
import { sendPushNotification } from "../lib/firebase.js";

// In-memory pub/sub for real-time donor alerts (SSE). Production: FCM + Redis pub/sub.
export const bus = new EventEmitter();
bus.setMaxListeners(0);

export interface AlertEvent {
  type: "alert" | "request_update";
  requestId: string;
  donorId?: string;
  payload: any;
}

export function emitToDonor(donorId: string, event: AlertEvent) {
  bus.emit(`donor:${donorId}`, event);
}

export function emitRequestUpdate(requestId: string, payload: any) {
  bus.emit(`request:${requestId}`, { type: "request_update", requestId, payload });
}

// Core engine: rank eligible donors for the current radius tier and create alert rows.
export async function runAlertCycle(requestId: string): Promise<{ alerted: number; radiusKm: number }> {
  const req = await prisma.bloodRequest.findUnique({ where: { id: requestId } });
  if (!req) throw new Error("Request not found");
  if (["completed", "closed", "rejected"].includes(req.status)) {
    return { alerted: 0, radiusKm: req.alertRadiusKm };
  }

  const radiusKm = req.alertRadiusKm;
  const districts = districtsForRadius(req.district, radiusKm);

  const donors = await prisma.user.findMany({
    where: {
      role: "donor",
      banned: false,
      district: { in: districts },
    },
    select: {
      id: true,
      bloodGroup: true,
      district: true,
      taluk: true,
      lat: true,
      lng: true,
      lastDonationDate: true,
      donationCount: true,
      isPlateletDonor: true,
      reputationScore: true,
      fcmToken: true,
    },
  });

  const candidates: DonorCandidate[] = donors.map((d) => ({
    id: d.id,
    bloodGroup: d.bloodGroup,
    district: d.district,
    taluk: d.taluk,
    lat: d.lat,
    lng: d.lng,
    lastDonationDate: d.lastDonationDate,
    donationCount: d.donationCount,
    isPlateletDonor: d.isPlateletDonor,
    reputationScore: d.reputationScore,
  }));

  let ranked = rankDonors(candidates, {
    bloodGroup: req.bloodGroup,
    componentType: req.componentType,
    district: req.district,
    taluk: req.taluk,
    lat: req.lat,
    lng: req.lng,
  });

  // For tight radius tiers, filter by actual distance.
  if (radiusKm < 9999) {
    ranked = ranked.filter((r) => r.distanceKm != null && r.distanceKm <= radiusKm + 1);
  }

  // Skip donors already alerted for this request.
  const existing = await prisma.donorResponse.findMany({ where: { requestId }, select: { donorId: true } });
  const already = new Set(existing.map((e) => e.donorId));
  const fresh = ranked.filter((r) => !already.has(r.donorId)).slice(0, 50);

  for (const d of fresh) {
    await prisma.donorResponse.create({
      data: {
        requestId,
        donorId: d.donorId,
        status: "alerted",
        matchScore: d.score,
        distanceKm: d.distanceKm,
        etaMinutes: d.etaMinutes,
      },
    });
    emitToDonor(d.donorId, {
      type: "alert",
      requestId,
      donorId: d.donorId,
      payload: {
        bloodGroup: req.bloodGroup,
        componentType: req.componentType,
        unitsRequired: req.unitsRequired,
        hospitalName: req.hospitalName,
        district: req.district,
        emergencyLevel: req.emergencyLevel,
        distanceKm: d.distanceKm,
        etaMinutes: d.etaMinutes,
      },
    });

    const donor = donors.find((donor) => donor.id === d.donorId);
    if (donor?.fcmToken) {
      try {
        await sendPushNotification(donor.fcmToken, {
          requestId,
          bloodGroup: req.bloodGroup,
          componentType: req.componentType,
          unitsRequired: req.unitsRequired,
          hospitalName: req.hospitalName,
          district: req.district,
          emergencyLevel: req.emergencyLevel,
          distanceKm: d.distanceKm ?? undefined,
          etaMinutes: d.etaMinutes ?? undefined,
        });
      } catch (error) {
        console.error(`[alerts] Failed to send push to donor ${d.donorId}:`, error);
      }
    }
  }

  await prisma.alertLog.create({ data: { requestId, radiusKm, donorCount: fresh.length } });
  if (req.status === "verified") {
    await prisma.bloodRequest.update({ where: { id: requestId }, data: { status: "alert_sent" } });
  }

  // Check if escalation is needed after sending alerts
  const escalationDecision = await evaluateEscalation(requestId);
  if (escalationDecision && escalationDecision.shouldEscalate) {
    await executeEscalation(requestId, escalationDecision);
  }

  return { alerted: fresh.length, radiusKm };
}

// Escalate to the next radius tier (called manually or by a timer when no acceptance).
export async function escalateRadius(requestId: string): Promise<number> {
  const req = await prisma.bloodRequest.findUnique({ where: { id: requestId } });
  if (!req) throw new Error("Request not found");
  const idx = RADIUS_LADDER.indexOf(req.alertRadiusKm);
  const next = RADIUS_LADDER[Math.min(idx + 1, RADIUS_LADDER.length - 1)];
  await prisma.bloodRequest.update({ where: { id: requestId }, data: { alertRadiusKm: next } });
  await runAlertCycle(requestId);
  return next;
}
