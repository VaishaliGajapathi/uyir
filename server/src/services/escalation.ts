import { prisma } from "../db.js";
import { completeJSON } from "../lib/ai.js";
import { emitRequestUpdate } from "./alerts.js";

interface EscalationDecision {
  shouldEscalate: boolean;
  newRadiusKm: number;
  newLevel: number;
  reason: string;
  targetDistricts?: string[];
}

// AI-powered escalation decision making
export async function evaluateEscalation(requestId: string): Promise<EscalationDecision | null> {
  const request = await prisma.bloodRequest.findUnique({
    where: { id: requestId },
    include: {
      responses: true,
      createdBy: true,
    },
  });

  if (!request) return null;
  if (["completed", "closed", "rejected", "life_saved"].includes(request.status)) return null;
  if (request.escalationLevel >= 2) return null; // Already at district-wide

  const now = new Date();
  const minutesSinceCreation = (now.getTime() - new Date(request.createdAt).getTime()) / 60000;
  const hasAcceptedDonor = request.responses.some(r => r.status === "accepted");

  if (hasAcceptedDonor) {
    return { shouldEscalate: false, newRadiusKm: request.alertRadiusKm, newLevel: request.escalationLevel, reason: "Donor already accepted" };
  }

  // AI-based escalation logic
  const prompt = `Analyze this blood donation request and decide if the search radius should be escalated.

Request Details:
- Blood Group: ${request.bloodGroup}
- Component: ${request.componentType}
- Emergency Level: ${request.emergencyLevel}
- Current Radius: ${request.alertRadiusKm} km
- Current Escalation Level: ${request.escalationLevel} (0=initial, 1=expanded, 2=district-wide)
- Time Since Creation: ${Math.round(minutesSinceCreation)} minutes
- District: ${request.district}
- Hospital: ${request.hospitalName}
- Units Required: ${request.unitsRequired}
- Patient Age: ${request.patientAge || "Not specified"}
- Patient Gender: ${request.patientGender || "Not specified"}
- Number of Responses: ${request.responses.length}

Escalation Rules:
- Initial radius should be 5-10 km
- If 30 minutes pass without donor acceptance, expand radius
- If 1 hour passes without donor acceptance, expand to district-wide
- Consider emergency level (red = faster escalation)
- Consider blood group rarity (AB- needs faster escalation)
- Consider time of day (night = faster escalation)

Return JSON with:
{
  "shouldEscalate": boolean,
  "newRadiusKm": number,
  "newLevel": number (0, 1, or 2),
  "reason": string explaining the decision,
  "targetDistricts": string[] (if expanding to district-wide, list nearby districts)
}`;

  try {
    const result = await completeJSON(prompt);
    return result as EscalationDecision;
  } catch (e: any) {
    console.error("[escalation] AI decision failed, using fallback logic:", e);
    return fallbackEscalationLogic(request, minutesSinceCreation);
  }
}

// Fallback escalation logic without AI
function fallbackEscalationLogic(request: any, minutesSinceCreation: number): EscalationDecision {
  const isRedEmergency = request.emergencyLevel === "red";
  const isRareBlood = ["AB-", "AB+", "B-"].includes(request.bloodGroup);
  const isNight = new Date().getHours() >= 20 || new Date().getHours() < 6;

  // Level 0 -> Level 1: Expand radius (after 30 min, or 20 min for red/rare/night)
  if (request.escalationLevel === 0) {
    const threshold = (isRedEmergency || isRareBlood || isNight) ? 20 : 30;
    if (minutesSinceCreation >= threshold) {
      return {
        shouldEscalate: true,
        newRadiusKm: 15,
        newLevel: 1,
        reason: `${threshold} min elapsed without donor acceptance. Expanding search radius.`,
      };
    }
  }

  // Level 1 -> Level 2: District-wide (after 60 min, or 45 min for red/rare/night)
  if (request.escalationLevel === 1) {
    const threshold = (isRedEmergency || isRareBlood || isNight) ? 45 : 60;
    if (minutesSinceCreation >= threshold) {
      return {
        shouldEscalate: true,
        newRadiusKm: 9999,
        newLevel: 2,
        reason: `${threshold} min elapsed without donor acceptance. Expanding to district-wide search.`,
        targetDistricts: getNearbyDistricts(request.district),
      };
    }
  }

  return {
    shouldEscalate: false,
    newRadiusKm: request.alertRadiusKm,
    newLevel: request.escalationLevel,
    reason: "Escalation threshold not yet reached",
  };
}

// Get nearby districts for district-wide expansion
function getNearbyDistricts(district: string): string[] {
  const districtMap: Record<string, string[]> = {
    "Chennai": ["Chennai", "Kanchipuram", "Tiruvallur", "Chengalpattu"],
    "Coimbatore": ["Coimbatore", "Tiruppur", "Erode", "Nilgiris"],
    "Madurai": ["Madurai", "Dindigul", "Theni", "Sivaganga", "Ramanathapuram"],
    "Salem": ["Salem", "Namakkal", "Dharmapuri", "Krishnagiri"],
    "Tiruchy": ["Tiruchirappalli", "Karur", "Perambalur", "Ariyalur", "Pudukkottai"],
    "Erode": ["Erode", "Coimbatore", "Tiruppur", "Namakkal", "Salem"],
    "Tiruppur": ["Tiruppur", "Coimbatore", "Erode"],
    "Vellore": ["Vellore", "Tiruvannamalai", "Ranipet", "Kanchipuram"],
    "Thanjavur": ["Thanjavur", "Tiruchirappalli", "Nagapattinam", "Pudukkottai"],
    "Kanyakumari": ["Kanyakumari", "Tirunelveli"],
  };

  return districtMap[district] || [district];
}

// Execute escalation
export async function executeEscalation(requestId: string, decision: EscalationDecision) {
  await prisma.bloodRequest.update({
    where: { id: requestId },
    data: {
      alertRadiusKm: decision.newRadiusKm,
      escalationLevel: decision.newLevel,
      escalatedAt: new Date(),
    },
  });

  // If district-wide, also update district to include nearby districts
  if (decision.newLevel === 2 && decision.targetDistricts) {
    // This could be expanded to actually search across multiple districts
    console.log(`[escalation] Request ${requestId} now searching across districts:`, decision.targetDistricts);
  }

  // Re-send alerts with expanded radius
  await emitRequestUpdate(requestId, {
    type: "escalation",
    newRadius: decision.newRadiusKm,
    newLevel: decision.newLevel,
    reason: decision.reason,
  });

  console.log(`[escalation] Request ${requestId} escalated to level ${decision.newLevel}, radius ${decision.newRadiusKm} km: ${decision.reason}`);
}

// Check all active requests for escalation (called by cron job)
export async function checkEscalationForAllRequests() {
  const activeRequests = await prisma.bloodRequest.findMany({
    where: {
      status: { in: ["verified", "alert_sent"] },
      escalationLevel: { lt: 2 },
    },
    include: {
      responses: true,
    },
  });

  let escalatedCount = 0;

  for (const request of activeRequests) {
    const decision = await evaluateEscalation(request.id);
    if (decision && decision.shouldEscalate) {
      await executeEscalation(request.id, decision);
      escalatedCount++;
    }
  }

  console.log(`[escalation] Checked ${activeRequests.length} requests, escalated ${escalatedCount}`);
  return { checked: activeRequests.length, escalated: escalatedCount };
}
