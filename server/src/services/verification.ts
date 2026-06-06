import { gemini, MODELS, completeJSON, extractJson } from "../lib/ai.js";

export interface VerificationResult {
  score: number; // 0-100
  verified: boolean;
  notes: string;
  checks: Record<string, boolean>;
}

export interface HealthTipsResult {
  eligible: boolean;
  eligibilityReason: string;
  eligibilityScore: number; // 0-100
  tips: string[];
  predictions: string[];
  postDonationTips: string[];
  bmi?: number;
  bmiCategory?: string;
}

const VALID_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

// Rule-based completeness checks (deterministic, always runs).
function baseChecks(req: any) {
  const checks: Record<string, boolean> = {
    bloodGroupValid: VALID_GROUPS.includes(req.bloodGroup),
    unitsValid: Number(req.unitsRequired) > 0 && Number(req.unitsRequired) <= 20,
    hospitalProvided: !!req.hospitalName && req.hospitalName.length > 2,
    districtProvided: !!req.district,
    contactValid: /^[6-9]\d{9}$/.test(String(req.contactNumber || "").replace(/\D/g, "").slice(-10)),
    patientNamed: !!req.patientName && req.patientName.length > 1,
  };
  return checks;
}

// AI-assisted authenticity scoring of the request text + (optional) document analysis.
export async function verifyRequest(req: any, hasDocument: boolean): Promise<VerificationResult> {
  const checks = baseChecks(req);
  checks.documentUploaded = hasDocument;

  const passed = Object.values(checks).filter(Boolean).length;
  let score = Math.round((passed / Object.keys(checks).length) * 100);
  let notes = "Automated completeness checks.";

  const prompt = `You are a verification agent for a blood-donation emergency platform in Tamil Nadu.
Assess if this request looks authentic (not spam/fake). Request:
${JSON.stringify({
    patientName: req.patientName,
    bloodGroup: req.bloodGroup,
    component: req.componentType,
    units: req.unitsRequired,
    hospital: req.hospitalName,
    district: req.district,
    doctorReference: req.doctorReference,
    documentUploaded: hasDocument,
  })}
Return ONLY JSON: {"authenticityScore": 0-100, "notes": "short reason", "looksReal": true/false}`;

  const ai = await completeJSON(prompt);
  if (ai && typeof ai.authenticityScore === "number") {
    score = Math.round(score * 0.5 + ai.authenticityScore * 0.5);
    notes = ai.notes || notes;
  }

  return {
    score,
    verified: score >= 70 && checks.bloodGroupValid && checks.hospitalProvided,
    notes,
    checks,
  };
}

// Vision-based document verification (hospital slip / prescription) via Gemini.
export async function verifyDocument(base64: string, mimeType: string, documentType: string, patientName?: string): Promise<{ score: number; verified: boolean; notes: string; nameMatch?: boolean }> {
  if (!gemini) return { score: 0, verified: false, notes: "Gemini not configured" };
  try {
    const model = gemini.getGenerativeModel({ model: MODELS.gemini });
    const nameCheck = patientName ? `Verify that the patient name in the document matches "${patientName}".` : "";
    const prompt = `This image should be a hospital ${documentType.replace("_", " ")} for a blood/platelet requirement.
Verify it looks like a genuine medical document (hospital name, patient, blood group, doctor, stamp/letterhead).
${nameCheck}
Return ONLY JSON: {"score":0-100,"verified":true/false,"notes":"what you see, any red flags","nameMatch":true/false}`;
    const res = await model.generateContent([
      { inlineData: { data: base64, mimeType } },
      { text: prompt },
    ]);
    const out = extractJson<{ score: number; verified: boolean; notes: string; nameMatch?: boolean }>(res.response.text());
    return out || { score: 0, verified: false, notes: "Could not parse document" };
  } catch (e) {
    return { score: 0, verified: false, notes: "Vision check failed: " + (e as Error).message };
  }
}

// AI-powered health tips and eligibility check for blood donors
export async function generateHealthTips(user: any): Promise<HealthTipsResult> {
  const { age, gender, hemoglobinLevel, drinkingHabits, smokingHabits, sleepHours, lastDonationDate, weight, height } = user;

  // Calculate BMI if weight and height are provided
  let bmi: number | undefined;
  let bmiCategory: string | undefined;
  if (weight && height && height > 0) {
    const heightInMeters = height / 100;
    bmi = weight / (heightInMeters * heightInMeters);
    if (bmi < 18.5) bmiCategory = "Underweight";
    else if (bmi < 25) bmiCategory = "Normal weight";
    else if (bmi < 30) bmiCategory = "Overweight";
    else bmiCategory = "Obese";
  }

  // Rule-based eligibility check
  const hbEligible = hemoglobinLevel ? hemoglobinLevel >= 12.5 : true;
  const ageEligible = age ? age >= 18 && age <= 65 : true;
  const donationGap = lastDonationDate ? (Date.now() - new Date(lastDonationDate).getTime()) / (1000 * 60 * 60 * 24) : 999;
  const gapEligible = donationGap >= 90;

  const eligible = hbEligible && ageEligible && gapEligible;
  const eligibilityReason = !hbEligible ? "Hemoglobin level too low (must be ≥12.5 g/dL)" :
                           !ageEligible ? "Age must be between 18-65 years" :
                           !gapEligible ? "Must wait 90 days between donations" :
                           "Eligible for blood donation";

  // Calculate eligibility score (0-100)
  let score = 100;
  if (!hbEligible) score -= 40;
  if (!ageEligible) score -= 30;
  if (!gapEligible) score -= 30;
  if (drinkingHabits === "regular") score -= 10;
  if (smokingHabits === "regular") score -= 10;
  if (sleepHours && sleepHours < 6) score -= 10;
  if (bmi && (bmi < 18.5 || bmi >= 30)) score -= 5; // Slight penalty for extreme BMI
  score = Math.max(0, Math.min(100, score));

  if (!gemini) {
    const predictions = bmi 
      ? [`BMI: ${bmi.toFixed(1)} (${bmiCategory})`, "Good health status"]
      : ["Good health status"];
    
    return {
      eligible,
      eligibilityReason,
      eligibilityScore: score,
      tips: ["Drink plenty of water", "Eat iron-rich foods", "Get adequate sleep"],
      predictions,
      postDonationTips: ["Rest for 15-20 minutes", "Drink extra fluids", "Avoid heavy lifting for 24 hours"],
      bmi,
      bmiCategory,
    };
  }

  try {
    const donorName = user.name || "Donor";
    const bmiInfo = bmi ? `\nBMI: ${bmi.toFixed(1)} (${bmiCategory})` : "";
    const prompt = `You are a health advisor for blood donors. Provide personalized health tips for ${donorName}.

Donor's health data:
Age: ${age || "Not provided"}
Gender: ${gender || "Not provided"}
Hemoglobin: ${hemoglobinLevel || "Not provided"} g/dL
Weight: ${weight || "Not provided"} kg
Height: ${height || "Not provided"} cm${bmiInfo}
Drinking: ${drinkingHabits || "Not provided"}
Smoking: ${smokingHabits || "Not provided"}
Sleep: ${sleepHours || "Not provided"} hours/day
Last donation: ${lastDonationDate || "Never"}

Provide:
1. 3-5 personalized health tips for blood donation - do NOT repeat ${donorName}'s name in each tip, just give the advice
2. 2-3 real-time health predictions based on their specific habits, BMI, and overall health profile - do NOT repeat ${donorName}'s name
3. 3-4 post-donation recovery tips for the next 3 days (food, juice, rest) - do NOT repeat ${donorName}'s name

Return ONLY JSON: {"tips":["tip1","tip2"],"predictions":["pred1","pred2"],"postDonationTips":["tip1","tip2","tip3"]}`;

    const model = gemini.getGenerativeModel({ model: MODELS.gemini });
    const res = await model.generateContent([{ text: prompt }]);
    const out = extractJson<{ tips: string[]; predictions: string[]; postDonationTips: string[] }>(res.response.text());

    const predictions = out?.predictions || (bmi ? [`BMI: ${bmi.toFixed(1)} (${bmiCategory})`, "Good health status"] : ["Good health status"]);

    return {
      eligible,
      eligibilityReason,
      eligibilityScore: score,
      tips: out?.tips || ["Drink plenty of water", "Eat iron-rich foods", "Get adequate sleep"],
      predictions,
      postDonationTips: out?.postDonationTips || ["Rest for 15-20 minutes", "Drink extra fluids", "Avoid heavy lifting for 24 hours"],
      bmi,
      bmiCategory,
    };
  } catch (e) {
    const predictions = bmi 
      ? [`BMI: ${bmi.toFixed(1)} (${bmiCategory})`, "Good health status"]
      : ["Good health status"];
    
    return {
      eligible,
      eligibilityReason,
      eligibilityScore: score,
      tips: ["Drink plenty of water", "Eat iron-rich foods", "Get adequate sleep"],
      predictions,
      postDonationTips: ["Rest for 15-20 minutes", "Drink extra fluids", "Avoid heavy lifting for 24 hours"],
      bmi,
      bmiCategory,
    };
  }
}
