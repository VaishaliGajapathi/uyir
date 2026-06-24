import { gemini, openai, falOpenRouter, MODELS, completeJSON, extractJson, hasGemini, hasFalOpenRouter, hasOpenAI, GEMINI_VISION_MODELS } from "../lib/ai.js";

import { hasFal, callFalAI } from "../lib/ai.js";

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
const ALLOW_MOCK_DOCUMENTS = process.env.ALLOW_MOCK_DOCUMENTS === "true";

type DocumentVerificationResult = {
  score: number;
  verified: boolean;
  notes: string;
  nameMatch?: boolean;
  hospitalNameFound?: boolean;
  dateRecent?: boolean;
  documentKind?: string;
  documentDate?: string;
  doctorRegistrationFound?: boolean;
  hospitalRegistrationFound?: boolean;
  gstNumberFound?: boolean;
};

function normalizeDocumentResult(out: DocumentVerificationResult): DocumentVerificationResult {
  const normalized: DocumentVerificationResult = {
    ...out,
    score: Number.isFinite(Number(out.score)) ? Math.max(0, Math.min(100, Math.round(Number(out.score)))) : 0,
    verified: !!out.verified,
    notes: String(out.notes || "").trim() || "Document analyzed.",
  };

  if (normalized.nameMatch === false) normalized.score = Math.min(normalized.score, 35);
  if (normalized.hospitalNameFound === false) normalized.score = Math.min(normalized.score, 45);
  if (normalized.dateRecent === false) normalized.score = Math.min(normalized.score, 55);

  if (["prescription", "referral_letter"].includes(String(normalized.documentKind || "")) && normalized.doctorRegistrationFound === false) {
    normalized.score = Math.min(normalized.score, 60);
  }

  if (["bill", "receipt"].includes(String(normalized.documentKind || "")) && normalized.gstNumberFound === false && normalized.hospitalRegistrationFound === false) {
    normalized.score = Math.min(normalized.score, 55);
  }

  normalized.verified =
    normalized.score >= 70 &&
    normalized.nameMatch !== false &&
    normalized.hospitalNameFound !== false &&
    normalized.dateRecent !== false;

  const noteParts = [normalized.notes];
  if (normalized.nameMatch === false && !normalized.notes.toLowerCase().includes("name")) noteParts.push("Patient name does not match the request.");
  if (normalized.hospitalNameFound === false && !normalized.notes.toLowerCase().includes("hospital")) noteParts.push("Hospital identity is missing or unclear.");
  if (normalized.dateRecent === false && !normalized.notes.toLowerCase().includes("date")) noteParts.push("Document date is missing or not recent.");
  if (["prescription", "referral_letter"].includes(String(normalized.documentKind || "")) && normalized.doctorRegistrationFound === false && !normalized.notes.toLowerCase().includes("registration")) {
    noteParts.push("Doctor registration ID is missing or unclear.");
  }
  if (["bill", "receipt"].includes(String(normalized.documentKind || "")) && normalized.gstNumberFound === false && normalized.hospitalRegistrationFound === false && !normalized.notes.toLowerCase().includes("gst")) {
    noteParts.push("GST number or hospital registration number is missing or unclear.");
  }
  normalized.notes = noteParts.join(" ").trim();

  return normalized;
}

function extractPdfText(base64: string): string {
  try {
    const raw = Buffer.from(base64, "base64").toString("latin1");
    const decoded = raw
      .replace(/\r/g, "\n")
      .replace(/\(([^()]*)\)/g, " $1 ")
      .replace(/\\n/g, " ")
      .replace(/\\r/g, " ")
      .replace(/\\t/g, " ")
      .replace(/\\\(/g, "(")
      .replace(/\\\)/g, ")");

    const printable = decoded
      .replace(/[^\x20-\x7E\n]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return printable;
  } catch {
    return "";
  }
}

async function verifyPdfDocument(text: string, documentType: string, patientName?: string): Promise<DocumentVerificationResult | null> {
  if (!text || text.length < 20) return null;

  const nameCheck = patientName
    ? `Check carefully if the PATIENT NAME in the document text matches "${patientName}" and set nameMatch accordingly.`
    : "";

  const prompt = `You are verifying extracted text from a hospital ${documentType.replace("_", " ")} for a blood/platelet requirement in Tamil Nadu.
Read the extracted PDF text and determine whether it appears to be a real medical document.

Check these signals:
- patient name match with the request
- whether a hospital/clinic name is visible
- whether the document date is visible and recent enough for an active admission/request
- if it is a prescription, referral, or doctor note: check for doctor registration / medical council number
- if it is a bill, receipt, or invoice: check for GST number and/or hospital registration/license number

${nameCheck}

Extracted document text:
"""
${text.slice(0, 12000)}
"""

Return ONLY JSON with this exact shape:
{"score":0-100,
 "verified":true/false,
 "notes":"short reason mentioning the strongest positive/negative checks",
 "documentKind":"prescription|referral_letter|bill|receipt|admission_slip|discharge_summary|unknown",
 "nameMatch":true/false,
 "hospitalNameFound":true/false,
 "documentDate":"string or empty",
 "dateRecent":true/false,
 "doctorRegistrationFound":true/false,
 "hospitalRegistrationFound":true/false,
 "gstNumberFound":true/false}`;

  const out = await completeJSON(prompt);
  if (!out) return null;
  return normalizeDocumentResult(out as DocumentVerificationResult);
}

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

// Vision-based document verification (hospital slip / prescription) via Gemini or Replicate.
// Returns a score + notes explaining WHY verification passed/failed (e.g. name mismatch, low clarity).
export async function verifyDocument(
  base64: string,
  mimeType: string,
  documentType: string,
  patientName?: string
): Promise<DocumentVerificationResult> {
  if (ALLOW_MOCK_DOCUMENTS) {
    console.warn("[verification] Using testing-only mock document bypass");
    return {
      score: 85,
      verified: true,
      notes: "Testing mode: mock document accepted for local verification.",
      nameMatch: true,
      hospitalNameFound: true,
      dateRecent: true,
      documentKind: "admission_slip",
      documentDate: "testing-mode",
      doctorRegistrationFound: true,
      hospitalRegistrationFound: true,
      gstNumberFound: true,
    };
  }

  if (/pdf/i.test(mimeType)) {
    console.log("[verification] Attempting PDF text verification");
    const pdfText = extractPdfText(base64);
    const pdfResult = await verifyPdfDocument(pdfText, documentType, patientName);
    if (pdfResult) {
      console.log("[verification] PDF text verification success:", pdfResult);
      return pdfResult;
    }
    console.warn("[verification] PDF text verification could not extract sufficient text");
  }

  const nameCheck = patientName
    ? `CRITICAL: Patient name must be "${patientName}". Read the document carefully and set nameMatch to true ONLY if you can clearly see this exact name (or a very close spelling variant) printed on the document. Do NOT guess.`
    : "CRITICAL: Read and report the patient name found in the document. Set nameMatch to true if any patient name is clearly visible.";

  const prompt = `You are a strict medical document verifier for a blood donation platform in Tamil Nadu, India.
Your job is to verify if this uploaded document is a GENUINE, VALID hospital document for an active blood/platelet request.

Document type being uploaded: ${documentType.replace("_", " ")}

STRICT VERIFICATION CRITERIA (all must pass for high score):
1. PATIENT NAME: ${nameCheck}
2. HOSPITAL/CLINIC NAME: Must find a clearly printed hospital or clinic name. Set hospitalNameFound=true ONLY if readable.
3. DOCUMENT DATE: Must find a date on the document. The date should be within the last 7 days for an active request. Set dateRecent=true if within 7 days.
4. DOCUMENT AUTHENTICITY: Check for:
   - Hospital letterhead/logo
   - Doctor signature or stamp
   - Registration numbers (hospital reg, doctor reg, GST)
   - Official formatting (not handwritten on plain paper)
   - Whether the image looks like a real photo of a physical document (not a screenshot or digital fake)
5. DOCUMENT CLARITY: The image must be clear enough to read text. Blurry/cropped documents fail.

SCORING RULES (be strict):
- Score 90-100: All checks passed - patient name matches, hospital name clear, date recent (within 7 days), document looks authentic
- Score 70-89: Minor issues - name matches but date older than 7 days, or hospital name slightly unclear but readable
- Score 50-69: Moderate issues - blurry but readable, missing registration number, date unclear
- Score 0-49: Major issues - name mismatch, no hospital name, completely blurry, looks fake/screenshot, no date visible
- verified=true ONLY if score >= 70 AND nameMatch=true AND hospitalNameFound=true AND dateRecent=true

Return ONLY valid JSON with this exact shape:
{"score":0-100,
 "verified":true/false,
 "notes":"Detailed reason: which checks passed/failed and why. Mention patient name found, hospital name found, date found, and authenticity assessment.",
 "documentKind":"prescription|referral_letter|bill|receipt|admission_slip|discharge_summary|unknown",
 "nameMatch":true/false,
 "hospitalNameFound":true/false,
 "documentDate":"exact date string found on document or empty",
 "dateRecent":true/false,
 "doctorRegistrationFound":true/false,
 "hospitalRegistrationFound":true/false,
 "gstNumberFound":true/false}`;

  // Try fal.ai OpenRouter first (supports Gemini, GPT-4o, Claude, etc via one key)
  const FAL_VISION_MODELS = [
    "google/gemini-2.5-flash",
    "openai/gpt-4o",
    "anthropic/claude-3.5-sonnet",
    "xai/grok-2-vision",
    "meta-llama/llama-3.2-90b-vision-instruct",
    "google/gemini-2.0-flash",
  ];

  if (falOpenRouter && hasFalOpenRouter) {
    for (const modelName of FAL_VISION_MODELS) {
      try {
        console.log("[verification] Attempting fal.ai OpenRouter vision with model:", modelName);
        const res = await falOpenRouter.chat.completions.create({
          model: modelName,
          messages: [
            { role: "system", content: "Only return valid JSON. Do not wrap in markdown." },
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } },
              ],
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.1,
        });
        const text = res.choices[0]?.message?.content || "";
        console.log("[verification] fal.ai OpenRouter response:", text.substring(0, 200));
        const out = extractJson<DocumentVerificationResult>(text);
        if (out) {
          const normalized = normalizeDocumentResult(out);
          console.log("[verification] fal.ai OpenRouter success:", normalized);
          return normalized;
        }
        console.warn(`[verification] fal.ai OpenRouter model ${modelName} could not parse JSON from response`);
      } catch (e) {
        console.error(`[verification] fal.ai OpenRouter model ${modelName} failed:`, (e as Error).message);
      }
    }
  } else {
    console.warn("[verification] fal.ai OpenRouter not configured for vision");
  }

  // Fallback to Gemini directly
  if (gemini && hasGemini) {
    for (const modelName of GEMINI_VISION_MODELS) {
      try {
        console.log("[verification] Attempting Gemini vision with model:", modelName);
        const model = gemini.getGenerativeModel({ model: modelName });
        const res = await model.generateContent([
          { inlineData: { data: base64, mimeType } },
          { text: prompt },
        ]);
        const text = res.response.text();
        console.log("[verification] Gemini vision response:", text.substring(0, 200));
        const out = extractJson<DocumentVerificationResult>(text);
        if (out) {
          const normalized = normalizeDocumentResult(out);
          console.log("[verification] Gemini vision success:", normalized);
          return normalized;
        }
        console.warn(`[verification] Gemini vision model ${modelName} could not parse JSON from response`);
      } catch (e) {
        console.error(`[verification] Gemini vision model ${modelName} failed:`, (e as Error).message);
      }
    }
  }

  if (openai && hasOpenAI) {
    try {
      console.log("[verification] Attempting OpenAI vision with model:", MODELS.vision);
      const dataUri = `data:${mimeType};base64,${base64}`;
      const res = await openai.chat.completions.create({
        model: MODELS.vision,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: dataUri } },
            ],
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
      });
      const text = res.choices[0]?.message?.content || "";
      console.log("[verification] OpenAI vision response:", text.substring(0, 200));
      const out = extractJson<DocumentVerificationResult>(text);
      if (out) {
        const normalized = normalizeDocumentResult(out);
        console.log("[verification] OpenAI vision success:", normalized);
        return normalized;
      }
      console.warn("[verification] OpenAI vision could not parse JSON from response");
    } catch (e) {
      console.error("[verification] OpenAI vision failed:", (e as Error).message);
    }
  }

  // If we reach here, all vision providers either failed or are not configured.
  // This does NOT mean the document is fake – only that automatic AI checking could not run.
  return {
    score: 0,
    verified: false,
    notes:
      "Automatic document verification could not run. " +
      "This request can continue to manual review. Please confirm the patient name, date, hospital details, and supporting registration information from the uploaded document.",
  };
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

    let out: { tips: string[]; predictions: string[]; postDonationTips: string[] } | null = null;

    // Try fal.ai first
    if (hasFal) {
      try {
        const falResult = await callFalAI(MODELS.falText, {
          prompt,
          max_tokens: 1024,
          temperature: 0.3,
        });
        out = extractJson<{ tips: string[]; predictions: string[]; postDonationTips: string[] }>(
          falResult?.output || falResult?.text || falResult?.content || JSON.stringify(falResult)
        );
        if (out) console.log("[health] fal.ai generated tips successfully");
      } catch (e) {
        console.warn("[health] fal.ai failed:", (e as Error).message);
      }
    }

    // Fallback to Gemini
    if (!out && gemini) {
      try {
        const model = gemini.getGenerativeModel({ model: MODELS.gemini });
        const res = await model.generateContent([{ text: prompt }]);
        out = extractJson<{ tips: string[]; predictions: string[]; postDonationTips: string[] }>(res.response.text());
        if (out) console.log("[health] Gemini generated tips successfully");
      } catch (e) {
        console.warn("[health] Gemini failed:", (e as Error).message);
      }
    }

    // Fallback to OpenAI
    if (!out && openai) {
      try {
        const res = await openai.chat.completions.create({
          model: MODELS.text,
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          temperature: 0.3,
        });
        out = extractJson(res.choices[0]?.message?.content || "");
        if (out) console.log("[health] OpenAI generated tips successfully");
      } catch (e) {
        console.warn("[health] OpenAI failed:", (e as Error).message);
      }
    }

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
