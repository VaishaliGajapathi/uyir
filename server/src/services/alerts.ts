import { EventEmitter } from "node:events";
import { query, queryOne, exec } from "../db.js";
import { haversineKm, districtsForRadius, RADIUS_LADDER, TN_DISTRICTS } from "../lib/districts.js";
import { sendPushNotification as sendFirebasePush } from "../lib/firebase.js";
import { sendPushToUser as sendWebPush } from "../lib/push.js";

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

export async function runAlertCycle(requestId: string): Promise<{ alerted: number; radiusKm: number }> {
  const request = await queryOne<any>(
    'SELECT * FROM "BloodRequest" WHERE "id" = $1 LIMIT 1',
    [requestId]
  );
  if (!request) {
    console.error(`[alerts] Request not found: ${requestId}`);
    return { alerted: 0, radiusKm: 0 };
  }

  const radiusKm = request.alertRadiusKm || 25;
  const districtsToSearch = districtsForRadius(request.district, radiusKm);

  const requestLat = request.lat ?? TN_DISTRICTS[request.district]?.lat ?? null;
  const requestLng = request.lng ?? TN_DISTRICTS[request.district]?.lng ?? null;

  const donors = await query<any>(
    `SELECT * FROM "User"
     WHERE "role" = 'donor'
       AND "bloodGroup" = $1
       AND "district" = ANY($2)
       AND "notificationsEnabled" = true
       AND "isAvailable" = true
       AND "banned" = false
       AND "id" != $3`,
    [request.bloodGroup, districtsToSearch, request.createdById]
  );

  let alertedCount = 0;
  const alertedDonorIds: string[] = [];

  for (const donor of donors) {
    const donorLat = donor.lat ?? TN_DISTRICTS[donor.district]?.lat ?? null;
    const donorLng = donor.lng ?? TN_DISTRICTS[donor.district]?.lng ?? null;

    let distanceKm: number | null = null;
    if (requestLat != null && requestLng != null && donorLat != null && donorLng != null) {
      distanceKm = haversineKm(requestLat, requestLng, donorLat, donorLng);
      if (distanceKm > radiusKm) continue;
    }

    const existing = await queryOne<any>(
      'SELECT * FROM "DonorResponse" WHERE "requestId" = $1 AND "donorId" = $2 LIMIT 1',
      [requestId, donor.id]
    );
    if (existing) continue;

    await exec(
      'INSERT INTO "DonorResponse" ("id","requestId","donorId","status","matchScore","distanceKm","createdAt") VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,NOW())',
      [requestId, donor.id, "alerted", 100, distanceKm]
    );

    const pushData = {
      requestId: request.id,
      bloodGroup: request.bloodGroup,
      componentType: request.componentType,
      unitsRequired: request.unitsRequired,
      hospitalName: request.hospitalName,
      district: request.district,
      emergencyLevel: request.emergencyLevel,
      distanceKm: distanceKm ?? undefined,
    };

    if (donor.fcmToken) {
      try {
        await sendFirebasePush(donor.fcmToken, pushData);
        console.log(`[alerts] FCM push sent to donor ${donor.id}`);
      } catch (e: any) {
        console.error(`[alerts] FCM push failed for donor ${donor.id}:`, e.message);
      }
    }

    if (donor.pushSubscription) {
      try {
        await sendWebPush(donor.id, `UYIR · ${request.bloodGroup} needed`, `${request.unitsRequired} unit${request.unitsRequired > 1 ? "s" : ""} at ${request.hospitalName}, ${request.district}`, pushData);
        console.log(`[alerts] Web push sent to donor ${donor.id}`);
      } catch (e: any) {
        console.error(`[alerts] Web push failed for donor ${donor.id}:`, e.message);
      }
    }

    emitToDonor(donor.id, { type: "alert", requestId, donorId: donor.id, payload: pushData });
    alertedDonorIds.push(donor.id);
    alertedCount++;
  }

  await exec(
    'INSERT INTO "AlertLog" ("id","requestId","radiusKm","donorCount","channel","createdAt") VALUES (gen_random_uuid(),$1,$2,$3,$4,NOW())',
    [requestId, radiusKm, alertedCount, "push"]
  );

  emitRequestUpdate(requestId, { type: "alert_sent", alertedCount, radiusKm });

  console.log(`[alerts] Alert cycle complete for request ${requestId}: ${alertedCount} donors alerted at ${radiusKm}km radius`);
  return { alerted: alertedCount, radiusKm };
}

export async function escalateRadius(requestId: string): Promise<number> {
  const request = await queryOne<any>(
    'SELECT * FROM "BloodRequest" WHERE "id" = $1 LIMIT 1',
    [requestId]
  );
  if (!request) {
    console.error(`[alerts] Request not found for escalation: ${requestId}`);
    return 0;
  }

  const currentTier = RADIUS_LADDER.findIndex(r => r === (request.alertRadiusKm || 25));
  const nextTier = currentTier + 1;

  if (nextTier >= RADIUS_LADDER.length) {
    console.log(`[alerts] Request ${requestId} already at max radius, cannot escalate further`);
    return request.alertRadiusKm || 25;
  }

  const newRadius = RADIUS_LADDER[nextTier];
  await exec(
    'UPDATE "BloodRequest" SET "alertRadiusKm" = $1, "escalationLevel" = $2, "escalatedAt" = NOW() WHERE "id" = $3',
    [newRadius, nextTier, requestId]
  );

  console.log(`[alerts] Escalated request ${requestId} to ${newRadius}km radius (tier ${nextTier})`);

  const result = await runAlertCycle(requestId);
  return result.radiusKm;
}
