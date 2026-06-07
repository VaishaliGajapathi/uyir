import { openai, MODELS, completeJSON } from "../lib/ai.js";

// Speech-to-text via OpenAI Whisper. Accepts an audio buffer.
export async function transcribeAudio(buffer: Buffer, filename = "audio.webm", language?: string): Promise<string> {
  if (!openai) throw new Error("OPENAI_API_KEY not configured for Whisper STT");
  const uint8Array = new Uint8Array(buffer);
  const file = new File([uint8Array], filename, { type: "audio/webm" });
  const res = await openai.audio.transcriptions.create({
    file,
    model: MODELS.stt,
    language: language === "ta" ? "ta" : undefined,
  });
  return res.text;
}

export interface ParsedRequest {
  patientName?: string;
  bloodGroup?: string;
  componentType?: string;
  unitsRequired?: number;
  hospitalName?: string;
  district?: string;
  emergencyLevel?: string;
}

// Parse free Tamil/English speech into a structured blood request using an LLM.
export async function parseRequestFromText(text: string): Promise<ParsedRequest> {
  const prompt = `You convert a spoken blood/platelet request (Tamil or English) into JSON.
Text: "${text}"
Return ONLY JSON with keys: patientName, bloodGroup (one of A+,A-,B+,B-,AB+,AB-,O+,O-),
componentType (whole_blood|platelets|plasma), unitsRequired (number),
hospitalName, district (Tamil Nadu district in English), emergencyLevel (green|orange|red).
Omit keys you cannot infer.`;
  const out = await completeJSON(prompt);
  return (out as ParsedRequest) || {};
}

// Parse a profile update like "I am O positive donor in Coimbatore".
export async function parseProfileFromText(text: string): Promise<Record<string, any>> {
  const prompt = `Convert this spoken donor profile statement (Tamil/English) to JSON.
Text: "${text}"
Return ONLY JSON with optional keys: name, bloodGroup (A+,A-,B+,B-,AB+,AB-,O+,O-),
district, taluk, isPlateletDonor (boolean), nightEmergency (boolean). Omit unknowns.`;
  return (await completeJSON(prompt)) || {};
}
