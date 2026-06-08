import { haversineKm, TN_DISTRICTS } from "../lib/districts.js";

// Blood compatibility: which donor groups can give to a recipient group (whole blood).
const COMPATIBLE_DONORS: Record<string, string[]> = {
  "O-": ["O-"],
  "O+": ["O-", "O+"],
  "A-": ["O-", "A-"],
  "A+": ["O-", "O+", "A-", "A+"],
  "B-": ["O-", "B-"],
  "B+": ["O-", "O+", "B-", "B+"],
  "AB-": ["O-", "A-", "B-", "AB-"],
  "AB+": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
};

export interface DonorCandidate {
  id: string;
  bloodGroup: string | null;
  district: string | null;
  taluk: string | null;
  lat: number | null;
  lng: number | null;
  lastDonationDate: Date | null;
  donationCount: number;
  isPlateletDonor: boolean;
  reputationScore: number;
  recentDeclines?: number;
}

export interface ScoredDonor {
  donorId: string;
  score: number;
  distanceKm: number | null;
  etaMinutes: number | null;
  reasons: string[];
}

function daysSince(d: Date | null): number {
  if (!d) return 9999;
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
}

// Implements the UYIR ranking formula with hierarchical location priority (taluk → city → district).
export function scoreDonor(
  donor: DonorCandidate,
  req: { bloodGroup: string; componentType: string; district: string; taluk?: string | null; lat?: number | null; lng?: number | null }
): ScoredDonor {
  const reasons: string[] = [];
  let score = 0;

  // Blood match (+50) — uses compatibility, exact group preferred.
  const compatible = COMPATIBLE_DONORS[req.bloodGroup] || [req.bloodGroup];
  if (donor.bloodGroup === req.bloodGroup) {
    score += 50;
    reasons.push("Exact blood match +50");
  } else if (donor.bloodGroup && compatible.includes(donor.bloodGroup)) {
    score += 35;
    reasons.push("Compatible donor +35");
  } else {
    return { donorId: donor.id, score: 0, distanceKm: null, etaMinutes: null, reasons: ["Incompatible"] };
  }

  // Distance (+30 if <5km, graded otherwise).
  let distanceKm: number | null = null;
  const reqLat = req.lat ?? TN_DISTRICTS[req.district]?.lat;
  const reqLng = req.lng ?? TN_DISTRICTS[req.district]?.lng;
  if (donor.lat != null && donor.lng != null && reqLat != null && reqLng != null) {
    distanceKm = haversineKm(donor.lat, donor.lng, reqLat, reqLng);
  } else if (donor.district && TN_DISTRICTS[donor.district] && reqLat != null) {
    distanceKm = haversineKm(TN_DISTRICTS[donor.district].lat, TN_DISTRICTS[donor.district].lng, reqLat, reqLng);
  }

  // Hierarchical location priority: taluk/area first (+40), then district
  if (req.taluk && donor.taluk && req.taluk.trim().toLowerCase() === donor.taluk.trim().toLowerCase()) {
    score += 40;
    reasons.push("Same taluk/area +40");
  } else if (donor.district === req.district) {
    score += 15;
    reasons.push("Same district +15");
  }

  if (distanceKm != null) {
    if (distanceKm < 5) { score += 30; reasons.push("Within 5km +30"); }
    else if (distanceKm < 15) { score += 20; reasons.push("Within 15km +20"); }
    else if (distanceKm < 40) { score += 10; reasons.push("Within 40km +10"); }
  }

  // Eligibility: last donation > 90 days (+20).
  const since = daysSince(donor.lastDonationDate);
  if (since >= 90) { score += 20; reasons.push("Eligible (>90 days) +20"); }
  else { score -= 30; reasons.push(`Recently donated (${since}d) -30`); }

  // Previous donations (+10).
  if (donor.donationCount > 0) { score += 10; reasons.push("Has donated before +10"); }

  // Platelet specialist (+20 when platelets needed).
  if (req.componentType === "platelets" && donor.isPlateletDonor) {
    score += 20; reasons.push("Platelet specialist +20");
  }

  // Recent declines (-10 each, capped).
  if (donor.recentDeclines) {
    const penalty = Math.min(donor.recentDeclines * 10, 30);
    score -= penalty; reasons.push(`Recent declines -${penalty}`);
  }

  // Reputation tie-break (small).
  score += Math.min(donor.reputationScore / 50, 10);

  const etaMinutes = distanceKm != null ? Math.max(5, Math.round((distanceKm / 30) * 60) + 8) : null;
  return { donorId: donor.id, score: Math.round(score), distanceKm, etaMinutes, reasons };
}

export function rankDonors(
  donors: DonorCandidate[],
  req: { bloodGroup: string; componentType: string; district: string; taluk?: string | null; lat?: number | null; lng?: number | null }
): ScoredDonor[] {
  return donors
    .map((d) => scoreDonor(d, req))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
}
