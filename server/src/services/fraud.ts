import { completeJSON } from "../lib/ai.js";

const PAYMENT_PATTERNS = [
  /\brs\.?\b/i, /\u20b9/, /\bmoney\b/i, /\bpayment\b/i, /\bpay\b/i, /\bcash\b/i,
  /\bgoogle ?pay\b/i, /\bgpay\b/i, /\bphonepe\b/i, /\bpaytm\b/i, /\bupi\b/i,
  /\btransfer\b/i, /\bcharge\b/i, /\bfees?\b/i, /\bamount\b/i, /\bprice\b/i,
  /\u0baa\u0ba3\u0bae\u0bcd/, // பணம் (money in Tamil)
];

export interface FraudResult {
  flagged: boolean;
  confidence: number; // 0-100
  category: string;
  reason: string;
}

// Fast deterministic scan for payment solicitation in donor/requester messages.
export function quickScan(text: string): FraudResult {
  const hits = PAYMENT_PATTERNS.filter((p) => p.test(text));
  if (hits.length === 0) return { flagged: false, confidence: 0, category: "none", reason: "No payment language" };
  return {
    flagged: true,
    confidence: Math.min(50 + hits.length * 15, 95),
    category: "payment_solicitation",
    reason: `Detected payment-related terms (${hits.length} match).`,
  };
}

// Deeper AI analysis: detects coercion, payment demands, fake-donor behaviour.
export async function analyzeMessage(text: string): Promise<FraudResult> {
  const quick = quickScan(text);
  const prompt = `You are a fraud-detection agent for a FREE, voluntary blood donation network in Tamil Nadu.
Selling/buying blood or demanding payment is forbidden. Analyze this message:
"${text}"
Return ONLY JSON: {"flagged":true/false,"confidence":0-100,"category":"payment_solicitation|coercion|spam|impersonation|none","reason":"short"}`;
  const ai = await completeJSON(prompt);
  if (ai && typeof ai.flagged === "boolean") {
    return {
      flagged: ai.flagged || quick.flagged,
      confidence: Math.max(ai.confidence ?? 0, quick.flagged ? quick.confidence : 0),
      category: ai.category || quick.category,
      reason: ai.reason || quick.reason,
    };
  }
  return quick;
}

// Behavioural fraud signals for a donor/requester (duplicate accounts, repeated complaints).
export interface BehaviourSignals {
  complaints: number;
  duplicateContacts: number;
  cancelledDonations: number;
  accountAgeDays: number;
}

export function scoreBehaviour(s: BehaviourSignals): FraudResult {
  let score = 0;
  if (s.complaints >= 3) score += 60;
  else if (s.complaints > 0) score += s.complaints * 20;
  if (s.duplicateContacts > 0) score += 25;
  if (s.cancelledDonations >= 3) score += 20;
  if (s.accountAgeDays < 1) score += 10;
  score = Math.min(score, 100);
  return {
    flagged: score >= 50,
    confidence: score,
    category: s.complaints >= 3 ? "repeated_complaints" : s.duplicateContacts > 0 ? "duplicate_accounts" : "low_risk",
    reason: `complaints=${s.complaints}, duplicates=${s.duplicateContacts}, cancellations=${s.cancelledDonations}`,
  };
}
