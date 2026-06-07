import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { authRouter } from "./routes/auth.js";
import { usersRouter } from "./routes/users.js";
import { requestsRouter } from "./routes/requests.js";
import { responsesRouter } from "./routes/responses.js";
import { aiRouter } from "./routes/ai.js";
import { impactRouter } from "./routes/impact.js";
import { streamRouter } from "./routes/stream.js";
import { adminRouter } from "./routes/admin.js";
import { TN_DISTRICT_NAMES } from "./lib/districts.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "30mb" }));

app.get("/", (_req: Request, res: any) => res.json({ service: "UYIR API", message: "Backend API server. Frontend is hosted on Netlify." }));
app.get("/api/health", (_req: Request, res: any) => res.json({ ok: true, service: "uyir-api" }));
app.get("/api/districts", (_req: Request, res: any) => res.json(TN_DISTRICT_NAMES));

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/requests", requestsRouter);
app.use("/api/responses", responsesRouter);
app.use("/api/ai", aiRouter);
app.use("/api/impact", impactRouter);
app.use("/api/stream", streamRouter);
app.use("/api/admin", adminRouter);

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[error]", err);
  res.status(500).json({ error: err?.message || "Internal error" });
});

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => console.log(`[uyir] API listening on http://localhost:${port}`));
