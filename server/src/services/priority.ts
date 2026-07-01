import { TN_DISTRICTS } from "../lib/districts.js";

export interface PriorityScoreFactors {
  unitsRequired: number;
  bloodGroup: string;
  componentType: string;
  patientAge?: number;
  emergencyLevel: "green" | "orange" | "red";
  hospitalType?: "government" | "private" | "trust";
  isChild?: boolean;
  isPlatelet?: boolean;
}

export function calculatePriorityScore(factors: PriorityScoreFactors): number {
  let score = 50; // Base score

  // Units required (more units = higher priority)
  score += Math.min(factors.unitsRequired * 5, 20);

  // Emergency level
  if (factors.emergencyLevel === "red") score += 30;
  else if (factors.emergencyLevel === "orange") score += 15;

  // Rare blood groups
  const rareGroups = ["O-", "AB-", "B-"];
  if (rareGroups.includes(factors.bloodGroup)) score += 15;

  // Component type (platelets are urgent)
  if (factors.componentType === "platelets") score += 10;

  // Child patient
  if (factors.isChild || (factors.patientAge && factors.patientAge < 12)) score += 10;

  // Hospital type (government hospitals often serve critical cases)
  if (factors.hospitalType === "government") score += 5;

  return Math.min(score, 100);
}

export function getPriorityLabel(score: number): string {
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 40) return "medium";
  return "low";
}
