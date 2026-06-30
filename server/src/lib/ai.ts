import OpenAI from "openai";
import { fal } from "@fal-ai/client";

const FAL_KEY = process.env.FAL_KEY || process.env.FAL_API_KEY; // Accept both variable names

console.log("[ai] Environment variables loaded:", {
  hasFalKey: !!process.env.FAL_KEY,
  hasFalApiKey: !!process.env.FAL_API_KEY,
  finalFalKey: !!FAL_KEY,
});

export const hasFal = !!FAL_KEY;

// fal.ai OpenRouter client (OpenAI-compatible HTTP client pointed at fal.ai).
// This is the single LLM provider for all text + vision tasks.
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

// Vision-capable models available via fal.ai OpenRouter (single FAL_KEY).
export const FAL_VISION_MODELS = Array.from(new Set([
  process.env.FAL_VISION_MODEL,
  "google/gemini-2.5-flash",
  "openai/gpt-4o",
  "anthropic/claude-3.5-sonnet",
  "meta-llama/llama-3.2-90b-vision-instruct",
].filter(Boolean) as string[]));

export const MODELS = {
  stt: "fal-ai/elevenlabs/speech-to-text/scribe-v2",
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

// Generic JSON text-completion via fal.ai OpenRouter (single provider).
export async function completeJSON(prompt: string): Promise<any | null> {
  if (!falOpenRouter || !hasFalOpenRouter) {
    console.warn("[ai] FAL_KEY not configured - completeJSON unavailable");
    return null;
  }
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
  return null;
}
