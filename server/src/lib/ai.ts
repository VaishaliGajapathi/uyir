import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { fal } from "@fal-ai/client";

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const FAL_KEY = process.env.FAL_KEY || process.env.FAL_API_KEY; // Accept both variable names

console.log("[ai] Environment variables loaded:", {
  hasOpenAI: !!OPENAI_KEY,
  hasGemini: !!GEMINI_KEY,
  hasFalKey: !!process.env.FAL_KEY,
  hasFalApiKey: !!process.env.FAL_API_KEY,
  finalFalKey: !!FAL_KEY,
});

export const hasOpenAI = !!OPENAI_KEY;
export const hasGemini = !!GEMINI_KEY;
export const hasFal = !!FAL_KEY;

export const openai = OPENAI_KEY ? new OpenAI({ apiKey: OPENAI_KEY }) : null;
export const gemini = GEMINI_KEY ? new GoogleGenerativeAI(GEMINI_KEY) : null;

// fal.ai OpenRouter vision client (OpenAI-compatible)
export const falOpenRouter = FAL_KEY
  ? new OpenAI({
      baseURL: "https://fal.run/openrouter/router/openai/v1",
      apiKey: "not-needed",
      defaultHeaders: { Authorization: `Key ${FAL_KEY}` },
    })
  : null;
export const hasFalOpenRouter = !!FAL_KEY;

// Configure fal.ai client
if (FAL_KEY) {
  console.log("[ai] Configuring fal.ai client with key length:", FAL_KEY.length);
  fal.config({
    credentials: FAL_KEY,
  });
} else {
  console.warn("[ai] FAL_KEY not configured - STT will not work");
}

// Helper function to call fal.ai API using the official client
export async function callFalAI(modelId: string, input: any): Promise<any> {
  if (!FAL_KEY) throw new Error("FAL_KEY not configured");
  
  const result = await fal.subscribe(modelId, {
    input,
  });
  
  return result.data;
}

 const GEMINI_TEXT_MODELS = Array.from(new Set([
   process.env.GEMINI_MODEL,
   "gemini-1.5-pro-latest",
   "gemini-1.5-pro",
   "gemini-1.5-flash-latest",
   "gemini-1.5-flash",
 ].filter(Boolean) as string[]));

 export const GEMINI_VISION_MODELS = Array.from(new Set([
   process.env.GEMINI_VISION_MODEL,
   process.env.GEMINI_MODEL,
   "gemini-1.5-pro-latest",
   "gemini-1.5-pro",
   "gemini-1.5-flash-latest",
   "gemini-1.5-flash",
 ].filter(Boolean) as string[]));

export const MODELS = {
  stt: "fal-ai/elevenlabs/speech-to-text/scribe-v2",
  text: process.env.OPENAI_TEXT_MODEL || "gpt-4o-mini",
  vision: process.env.OPENAI_VISION_MODEL || "gpt-4o",
  gemini: GEMINI_TEXT_MODELS[0] || "gemini-1.5-pro",
  geminiVision: GEMINI_VISION_MODELS[0] || "gemini-1.5-pro",
  falText: process.env.FAL_TEXT_MODEL || "fal-ai/llama-3-8b-instruct",
};

// Extract first JSON object from an LLM text response.
export function extractJson<T = any>(text: string): T | null {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

// Text LLM models available via fal.ai OpenRouter (single FAL_KEY).
const FAL_TEXT_MODELS = Array.from(new Set([
  process.env.FAL_TEXT_MODEL,
  "google/gemini-2.5-flash",
  "openai/gpt-4o-mini",
  "meta-llama/llama-3.3-70b-instruct",
].filter(Boolean) as string[]));

// Generic text-completion that prefers fal.ai OpenRouter, then Gemini, then OpenAI.
export async function completeJSON(prompt: string): Promise<any | null> {
  if (falOpenRouter && hasFalOpenRouter) {
    for (const modelName of FAL_TEXT_MODELS) {
      try {
        const res = await falOpenRouter.chat.completions.create({
          model: modelName,
          messages: [
            { role: "system", content: "Only return valid JSON. Do not wrap in markdown." },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0.2,
        });
        const out = extractJson(res.choices[0]?.message?.content || "");
        if (out) return out;
        console.warn(`[ai] fal.ai text model ${modelName} returned non-JSON output`);
      } catch (e) {
        console.warn(`[ai] fal.ai text model ${modelName} failed, trying next:`, (e as Error).message);
      }
    }
  }
  if (gemini) {
    let lastGeminiError = "";
    for (const modelName of GEMINI_TEXT_MODELS) {
      try {
        const model = gemini.getGenerativeModel({ model: modelName });
        const res = await model.generateContent(prompt);
        const out = extractJson(res.response.text());
        if (out) return out;
        console.warn(`[ai] gemini model ${modelName} returned non-JSON output`);
      } catch (e) {
        lastGeminiError = (e as Error).message;
        console.warn(`[ai] gemini model ${modelName} failed, trying next:`, lastGeminiError);
      }
    }
    if (lastGeminiError) {
      console.warn("[ai] gemini failed, trying openai:", lastGeminiError);
    }
  }
  if (openai) {
    try {
      const res = await openai.chat.completions.create({
        model: MODELS.text,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.2,
      });
      return extractJson(res.choices[0]?.message?.content || "");
    } catch (e) {
      console.warn("[ai] openai failed:", (e as Error).message);
    }
  }
  return null;
}
