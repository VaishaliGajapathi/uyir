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
app.use(cors({
  origin: [
    "https://uyirorg.netlify.app",
    "https://uyirblooddonation.netlify.app",
    "http://localhost:5173",
    "http://localhost:3000",
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.options("*", cors());
app.use(express.json({ limit: "30mb" }));

app.get("/", (_req: Request, res: any) => res.json({ service: "UYIR API", message: "Backend API server. Frontend is hosted on Netlify." }));
app.get("/api/health", (_req: Request, res: any) => res.json({ ok: true, service: "uyir-api" }));
app.get("/api/districts", (_req: Request, res: any) => res.json(TN_DISTRICT_NAMES));
app.get("/api/outbound-ip", async (_req: Request, res: Response) => {
  const ip = await fetch("https://api.ipify.org?format=json").then((r) => r.json());
  res.json(ip);
});

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/requests", requestsRouter);
app.use("/api/responses", responsesRouter);
app.use("/api/ai", aiRouter);
app.use("/api/impact", impactRouter);
app.use("/api/stream", streamRouter);
app.use("/api/admin", adminRouter);
app.use("/auth", authRouter);
app.use("/users", usersRouter);
app.use("/requests", requestsRouter);
app.use("/responses", responsesRouter);
app.use("/ai", aiRouter);
app.use("/impact", impactRouter);
app.use("/stream", streamRouter);
app.use("/admin", adminRouter);

app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  console.error("[error]", err);
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.status(500).json({ error: err?.message || "Internal error" });
});

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => console.log(`[uyir] API listening on http://localhost:${port}`));
