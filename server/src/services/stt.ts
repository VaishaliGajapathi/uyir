import { hasFal, completeJSON, callFalAI, MODELS } from "../lib/ai.js";

// Speech-to-text via fal.ai (OpenAI Whisper). Accepts an audio buffer.
export async function transcribeAudio(buffer: Buffer, filename = "audio.webm", language?: string): Promise<string> {
  if (!hasFal) {
    console.error("[STT] FAL_KEY not configured");
    throw new Error("STT not configured: FAL_KEY is missing. Please add it to your .env file.");
  }
  
  // Convert buffer to base64 for fal.ai
  const base64 = buffer.toString("base64");
  const dataUri = `data:audio/webm;base64,${base64}`;
  
  try {
    console.log("[STT] Using fal.ai ElevenLabs Scribe V2 with model:", MODELS.stt, "language:", language);
    const result = await callFalAI(MODELS.stt, {
      audio_url: dataUri,
      language_code: language === "ta" ? "tam" : "eng",
      tag_audio_events: true,
      diarize: false,
    });
    
    console.log("[STT] fal.ai output received:", typeof result);
    // ElevenLabs Scribe V2 returns text directly in result.text
    const textResult = result.text || (typeof result === 'string' ? result : JSON.stringify(result));
    console.log("[STT] Transcription successful, length:", textResult.length);
    return textResult;
  } catch (e) {
    console.error("[STT] fal.ai ElevenLabs Scribe V2 failed:", (e as Error).message);
    console.error("[STT] Full error:", JSON.stringify(e, null, 2));
    throw new Error("Speech-to-text failed: " + (e as Error).message);
  }
}

export interface ParsedRequest {
  patientName?: string;
  patientAge?: number;
  bloodGroup?: string;
  componentType?: string;
  unitsRequired?: number;
  hospitalName?: string;
  district?: string;
  emergencyLevel?: string;
}

 const NUMBER_WORDS: Record<string, number> = {
   one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
   ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
   sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
   thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
 };

 function parseWordNumber(value: string): number | undefined {
   const parts = value.toLowerCase().split(/\s+/).filter(Boolean);
   let total = 0;
   for (const part of parts) {
     if (part === "and") continue;
     const n = NUMBER_WORDS[part];
     if (!n) return undefined;
     total += n;
   }
   return total || undefined;
 }

 function normalizeBloodGroup(value?: string): string | undefined {
   const text = String(value || "").trim();
   const direct = text.match(/\b(AB|A|B|O)\s*([+-])\b/i);
   if (direct) return `${direct[1].toUpperCase()}${direct[2]}`;
   const spoken = text.match(/\b(AB|A|B|O)\s*(positive|negative|plus|minus)\b/i);
   if (spoken) return `${spoken[1].toUpperCase()}${/negative|minus/i.test(spoken[2]) ? "-" : "+"}`;
   return undefined;
 }

 function extractPatientAge(text: string): number | undefined {
   const numeric = text.match(/\bage\s*(?:is\s*)?(\d{1,3})\b/i) || text.match(/\b(\d{1,3})\s*(?:years?\s*old|years?|age)\b/i);
   if (numeric) return Number(numeric[1]);
   const words = text.match(/\b((?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|and)(?:\s+(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|and))*)\s+(?:age|years?\s*old|years?)\b/i);
   return words ? parseWordNumber(words[1]) : undefined;
 }

 function cleanHospitalName(value?: string): string | undefined {
   let text = String(value || "").replace(/["(),]/g, " ").replace(/\s+/g, " ").trim();
   if (!text) return undefined;
   text = text.replace(/^(?:க்கு|ிக்கு|for|at|in|age|blood|unit|units|need|needs|required|patient|name|is|positive|negative|plus|minus|தேவைப்படுது|தேவை|ரெண்டு|இரண்டு|ஒரு|ஒன்று|two|three|four|five|six|seven|eight|nine|ten|thirty|forty|fifty|sixty|seventy|eighty|ninety|\d+\s*)+/i, "").trim();
   if (/\bmedical\b$/i.test(text)) text = `${text} Hospital`;
   return text || undefined;
 }

 function sanitizeParsedRequest(parsed: ParsedRequest, text: string): ParsedRequest {
   return {
     ...parsed,
     patientAge: parsed.patientAge || extractPatientAge(text),
     bloodGroup: normalizeBloodGroup(parsed.bloodGroup || text) || parsed.bloodGroup,
     hospitalName: cleanHospitalName(parsed.hospitalName) || cleanHospitalName(text.match(/([^.\n,]*\b(?:medical college hospital|medical college|hospital|clinic|nursing home|medical center|medical centre|health centre|health center|health city)\b)/i)?.[1]),
   };
 }

// Parse free Tamil/English speech into a structured blood request using an LLM.
export async function parseRequestFromText(text: string): Promise<ParsedRequest> {
  const prompt = `You convert a spoken blood/platelet request (Tamil or English) into JSON.
Text: "${text}"
Return ONLY JSON with keys: patientName, patientAge, bloodGroup (one of A+,A-,B+,B-,AB+,AB-,O+,O-),
componentType (whole_blood|platelets|plasma), unitsRequired (number),
hospitalName, district (Tamil Nadu district in English), emergencyLevel (green|orange|red).
hospitalName must be only the clean hospital name without filler speech words.
Omit keys you cannot infer.`;
  console.log("[STT] Parsing request with prompt:", prompt);
  const out = await completeJSON(prompt);
  console.log("[STT] Parsed result:", out);
  
  // Fallback to regex parsing if LLM fails
  if (!out || Object.keys(out).length === 0) {
    console.log("[STT] LLM parsing failed, using regex fallback");
    return sanitizeParsedRequest(parseRequestWithRegex(text), text);
  }
  
  return sanitizeParsedRequest((out as ParsedRequest) || {}, text);
}

// Regex-based parser as fallback for Tamil/English blood requests
function parseRequestWithRegex(text: string): ParsedRequest {
  const result: ParsedRequest = {};
  const lowerText = text.toLowerCase();
  
  // Extract patient name (Tamil: name before "க்கு", English: "for" or "name is")
  const nameMatch = text.match(/([a-zA-Z\u0B80-\u0BFF]+)\s*க்கு|patient\s*([a-zA-Z\u0B80-\u0BFF]+)|name\s*is\s*([a-zA-Z\u0B80-\u0BFF]+)/i);
  if (nameMatch) result.patientName = (nameMatch[1] || nameMatch[2] || nameMatch[3]).trim();
  result.patientAge = extractPatientAge(text);
  
  // Extract blood group
  const bloodGroup = normalizeBloodGroup(text);
  if (bloodGroup) result.bloodGroup = bloodGroup;
  
  // Extract units (Tamil numbers: ஒன்று=1, இரண்டு=2, மூன்று=3, நான்கு=4, ஐந்து=5, ஆறு=6, ஏழு=7, எட்டு=8, ஒன்பது=9, பத்து=10)
  const tamilNumbers: Record<string, number> = {
    "ஒன்று": 1, "ஒன்றே": 1, "ஒரு": 1,
    "இரண்டு": 2, "ரெண்டு": 2, "இரண்டே": 2,
    "மூன்று": 3, "மூன்றே": 3,
    "நான்கு": 4, "நான்கே": 4,
    "ஐந்து": 5, "ஐந்தே": 5,
    "ஆறு": 6, "ஆறே": 6,
    "ஏழு": 7, "ஏழே": 7,
    "எட்டு": 8, "எட்டே": 8,
    "ஒன்பது": 9, "ஒன்பதே": 9,
    "பத்து": 10, "பத்தே": 10
  };
  
  // Try Tamil numbers first
  for (const [tamil, num] of Object.entries(tamilNumbers)) {
    if (text.includes(tamil)) {
      result.unitsRequired = num;
      break;
    }
  }
  
  // Fallback to English numbers
  if (!result.unitsRequired) {
    const unitsMatch = text.match(/(\d+)\s*unit/i);
    if (unitsMatch) result.unitsRequired = parseInt(unitsMatch[1]);
  }
  
  // Extract hospital (Tamil: "Hospital", English: "hospital")
  const hospitalMatch = text.match(/([^.\n,]*\b(?:medical college hospital|medical college|hospital|clinic|nursing home|medical center|medical centre|health centre|health center|health city)\b)/i);
  if (hospitalMatch) result.hospitalName = cleanHospitalName(hospitalMatch[1]);
  
  // Extract district (common Tamil Nadu districts)
  const districts = ["chennai", "coimbatore", "madurai", "trichy", "salem", "tirunelveli", "vellore", "erode", "thoothukudi", "dindigul", "kanchipuram", "cuddalore", "kanyakumari", "namakkal", "tiruppur", "thanjavur", "nagapattinam", "viluppuram", "ariyalur", "kallakurichi", "perambalur", "chengalpattu", "ranipet", "tirupathur", "dharmapuri", "krishnagiri", "sivagangai", "virudhunagar", "ramanathapuram", "theni", "karur", "nagarkoil"];
  const districtMatch = districts.find(d => lowerText.includes(d));
  if (districtMatch) {
    // Capitalize first letter
    result.district = districtMatch.charAt(0).toUpperCase() + districtMatch.slice(1);
  }
  
  // Default component type
  result.componentType = "whole_blood";
  
  console.log("[STT] Regex parsing result:", result);
  return result;
}

// Parse a profile update like "I am O positive donor in Coimbatore".
export async function parseProfileFromText(text: string): Promise<Record<string, any>> {
  const prompt = `Convert this spoken donor profile statement (Tamil/English) to JSON.
Text: "${text}"
Return ONLY JSON with optional keys: name, bloodGroup (A+,A-,B+,B-,AB+,AB-,O+,O-),
district, taluk, isPlateletDonor (boolean), nightEmergency (boolean). Omit unknowns.`;
  return (await completeJSON(prompt)) || {};
}
