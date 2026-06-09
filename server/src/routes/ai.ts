import { Router, Request } from "express";
import multer from "multer";
import { requireAuth, AuthedRequest } from "../middleware/auth.js";
import { transcribeAudio, parseRequestFromText, parseProfileFromText } from "../services/stt.js";
import { analyzeMessage } from "../services/fraud.js";
import { generateHealthTips } from "../services/verification.js";
import { hasOpenAI, hasGemini, hasFal } from "../lib/ai.js";
import { queryOne } from "../db.js";

export const aiRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

aiRouter.get("/status", (_req: Request, res: any) => {
  res.json({ openai: hasOpenAI, gemini: hasGemini, fal: hasFal });
});

aiRouter.post("/transcribe", requireAuth, upload.single("audio"), async (req: any, res: any) => {
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

aiRouter.post("/parse-request", requireAuth, async (req: Request, res: any) => {
  const text = (req.body?.text as string) || "";
  if (!text) return res.status(400).json({ error: "text required" });
  res.json(await parseRequestFromText(text));
});

aiRouter.post("/fraud-check", requireAuth, async (req: Request, res: any) => {
  const text = (req.body?.text as string) || "";
  if (!text) return res.status(400).json({ error: "text required" });
  res.json(await analyzeMessage(text));
});

aiRouter.post("/health-tips", requireAuth, async (req: AuthedRequest, res: any) => {
  const user = await queryOne<any>('SELECT * FROM "User" WHERE "id" = $1 LIMIT 1', [req.userId]);
  if (!user) return res.status(404).json({ error: "User not found" });
  const tips = await generateHealthTips(user);
  res.json(tips);
});
