import { replicate, MODELS, completeJSON } from "../lib/ai.js";

// Speech-to-text via Replicate (OpenAI Whisper hosted). Accepts an audio buffer.
export async function transcribeAudio(buffer: Buffer, filename = "audio.webm", language?: string): Promise<string> {
  if (!replicate) throw new Error("REPLICATE_API_TOKEN not configured for Whisper STT");
  
  // Convert buffer to base64 for Replicate
  const base64 = buffer.toString("base64");
  const dataUri = `data:audio/webm;base64,${base64}`;
  
  try {
    // Use OpenAI Whisper Large v3 hosted on Replicate (best accuracy for Tamil)
    const output = await replicate.run(
      "openai/whisper-large-v3:434f6958e324d427d4f5e3f73f4bb0eb88d856f2b2682d8e5c0c0d1f8c5e0f8",
      {
        input: {
          audio: dataUri,
          language: language === "ta" ? "tamil" : "english",
          task: "transcribe",
          timestamp_granularities: ["segment"],
        }
      }
    );
    
    // Replicate returns an object with text field
    const result = typeof output === 'string' ? output : (output as any).text || output;
    return typeof result === 'string' ? result : JSON.stringify(result);
  } catch (e) {
    console.error("[STT] Replicate Whisper failed:", (e as Error).message);
    throw new Error("Speech-to-text failed. Please try again.");
  }
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
