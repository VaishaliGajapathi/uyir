import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { authRouter } from "./routes/auth.js";
import { usersRouter } from "./routes/users.js";
import { requestsRouter } from "./routes/requests.js";
import { responsesRouter } from "./routes/responses.js";
import { aiRouter } from "./routes/ai.js";
import { impactRouter } from "./routes/impact.js";
import { streamRouter } from "./routes/stream.js";
import { adminRouter } from "./routes/admin.js";
import { TN_DISTRICT_NAMES } from "./lib/districts.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProd = process.env.NODE_ENV === "production";

const app = express();

const allowedOrigins = [
  "https://uyirngo.in",
  "http://uyirngo.in",
  "https://www.uyirngo.in",
  "https://uyirproduction.onrender.com",
  "http://localhost:5000",
  "http://localhost:3000",
  "http://localhost:5173",
];

app.use(cors({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`), false);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 200,
}));

// Explicitly handle OPTIONS preflight for all routes
app.options("*", cors());
app.use(express.json({ limit: "30mb" }));

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

// Serve static frontend in production
if (isProd) {
  const possiblePaths = [
    path.resolve(__dirname, "../public"),
    path.resolve(__dirname, "../../client/dist"),
    path.resolve(__dirname, "../../dist"),
    path.resolve(__dirname, "../../../client/dist"),
    "/opt/render/project/src/client/dist",
    "/opt/render/project/src/server/public",
    "/opt/render/project/src/server/dist/public",
  ];
  const staticDir = possiblePaths.find((p) => {
    const exists = fs.existsSync(path.join(p, "index.html"));
    if (exists) console.log(`[static] Found frontend at: ${p}`);
    return exists;
  });
  if (staticDir) {
    app.use(express.static(staticDir));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(staticDir, "index.html"));
    });
  } else {
    console.error("[static] No frontend build found. Checked:", possiblePaths);
    app.get("*", (_req: Request, res: Response) => {
      res.status(503).json({ error: "Frontend not built. Please rebuild and deploy." });
    });
  }
} else {
  app.get("/", (_req: Request, res: any) => res.json({ service: "UYIR API", message: "Backend API server." }));
}

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[error]", err);
  res.status(500).json({ error: err?.message || "Internal error" });
});

const port = Number(process.env.PORT) || 3000;
const host = "0.0.0.0";
app.listen(port, host, () => console.log(`[uyir] API listening on http://${host}:${port}`));
