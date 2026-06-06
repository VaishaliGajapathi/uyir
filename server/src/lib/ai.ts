import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Replicate from "replicate";

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN;

export const hasOpenAI = !!OPENAI_KEY;
export const hasGemini = !!GEMINI_KEY;
export const hasReplicate = !!REPLICATE_TOKEN;

export const openai = OPENAI_KEY ? new OpenAI({ apiKey: OPENAI_KEY }) : null;
export const gemini = GEMINI_KEY ? new GoogleGenerativeAI(GEMINI_KEY) : null;
export const replicate = REPLICATE_TOKEN ? new Replicate({ auth: REPLICATE_TOKEN }) : null;

export const MODELS = {
  stt: process.env.OPENAI_STT_MODEL || "whisper-1",
  text: process.env.OPENAI_TEXT_MODEL || "gpt-4o-mini",
  gemini: process.env.GEMINI_MODEL || "gemini-1.5-flash",
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

// Generic text-completion that prefers Gemini, falls back to OpenAI.
export async function completeJSON(prompt: string): Promise<any | null> {
  if (gemini) {
    try {
      const model = gemini.getGenerativeModel({ model: MODELS.gemini });
      const res = await model.generateContent(prompt);
      const out = extractJson(res.response.text());
      if (out) return out;
    } catch (e) {
      console.warn("[ai] gemini failed, trying openai:", (e as Error).message);
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
