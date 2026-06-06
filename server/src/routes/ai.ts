import { Router } from "express";
import multer from "multer";
import { requireAuth, AuthedRequest } from "../middleware/auth.js";
import { transcribeAudio, parseRequestFromText, parseProfileFromText } from "../services/stt.js";
import { analyzeMessage } from "../services/fraud.js";
import { generateHealthTips } from "../services/verification.js";
import { hasOpenAI, hasGemini, hasReplicate } from "../lib/ai.js";
import { prisma } from "../db.js";

export const aiRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

// Report which AI providers are configured (drives UI affordances).
aiRouter.get("/status", (_req, res) => {
  res.json({ openai: hasOpenAI, gemini: hasGemini, replicate: hasReplicate });
});

// Voice -> text (Whisper). Optionally parse into a request or profile.
aiRouter.post("/transcribe", requireAuth, upload.single("audio"), async (req: AuthedRequest, res) => {
  if (!req.file) return res.status(400).json({ error: "audio file required" });
  const mode = (req.query.mode as string) || "raw";
  const language = (req.query.language as string) || "ta";
  try {
    const text = await transcribeAudio(req.file.buffer, req.file.originalname || "audio.webm", language);
    let parsed: any = null;
    if (mode === "request") parsed = await parseRequestFromText(text);
    else if (mode === "profile") parsed = await parseProfileFromText(text);
    res.json({ text, parsed });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// Parse already-typed text into structured request (no audio).
aiRouter.post("/parse-request", requireAuth, async (req, res) => {
  const text = (req.body?.text as string) || "";
  if (!text) return res.status(400).json({ error: "text required" });
  res.json(await parseRequestFromText(text));
});

// On-demand fraud check for a message (used before revealing contact / posting).
aiRouter.post("/fraud-check", requireAuth, async (req, res) => {
  const text = (req.body?.text as string) || "";
  if (!text) return res.status(400).json({ error: "text required" });
  res.json(await analyzeMessage(text));
});

// Generate AI health tips and eligibility check for donors
aiRouter.post("/health-tips", requireAuth, async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) return res.status(404).json({ error: "User not found" });
  const tips = await generateHealthTips(user);
  res.json(tips);
});
