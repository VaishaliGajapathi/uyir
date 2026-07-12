import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { logger, logRequest } from "./lib/logger.js";
import * as Sentry from "@sentry/node";

import { authRouter } from "./routes/auth.js";
import { usersRouter } from "./routes/users.js";
import { requestsRouter } from "./routes/requests.js";
import { responsesRouter } from "./routes/responses.js";
import { aiRouter } from "./routes/ai.js";
import { impactRouter } from "./routes/impact.js";
import { streamRouter } from "./routes/stream.js";
import { adminRouter } from "./routes/admin.js";
import { ngoRouter } from "./routes/ngo.js";
import { bloodBanksRouter } from "./routes/bloodbanks.js";
import { analyticsRouter } from "./routes/analytics.js";
import { disasterRouter } from "./routes/disaster.js";
import { campaignsRouter } from "./routes/campaigns.js";
import { exec, healthCheck as dbHealthCheck } from "./db.js";
import { TN_DISTRICT_NAMES } from "./lib/districts.js";
import { cacheMiddleware } from "./middleware/cache.js";
import { apiRateLimit, authRateLimit } from "./middleware/rateLimit.js";
import { redisEnabled } from "./lib/redis.js";

process.on("uncaughtException", (err) => logger.fatal({ err }, "uncaughtException"));
process.on("unhandledRejection", (reason) => logger.fatal({ reason }, "unhandledRejection"));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProd = process.env.NODE_ENV === "production";

const app = express();
app.set("trust proxy", 1);

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",
    tracesSampleRate: isProd ? 0.1 : 1.0,
  });
  logger.info("Sentry initialized");
}

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://verify.msg91.com", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://verify.msg91.com", "https://verify.phone91.com", "https://control.msg91.com", "https://api.msg91.com"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "https:", "data:"],
      connectSrc: ["'self'", "https://api.msg91.com", "https://control.msg91.com", "https://verify.msg91.com", "https://fcm.googleapis.com", "wss://verify.msg91.com"],
      frameSrc: ["'self'", "https://verify.msg91.com", "https://verify.phone91.com"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

async function ensureRuntimeSchema() {
  await exec('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "ngoName" TEXT');
  await exec('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "ngoId" TEXT');
  await exec('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "ngoStatus" TEXT');
  await exec('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "ngoAddress" TEXT');
  await exec('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "ngoRegistrationNumber" TEXT');
  await exec('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "ngoPhone" TEXT');
  await exec('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "ngoEmail" TEXT');
  await exec('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "designation" TEXT');
  await exec('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "plainPassword" TEXT');
  await exec('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "email" TEXT');
  await exec('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "hospitalId" TEXT');
  await exec('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "hospitalName" TEXT');
  await exec('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "hospitalRegistrationId" TEXT');
  await exec('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bloodBankId" TEXT');
  await exec('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bloodBankName" TEXT');
  await exec('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "facilityLogo" TEXT');
  await exec('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "fcmToken" TEXT');
  await exec('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "fcmPlatform" TEXT');
  await exec('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "fcmTokenUpdatedAt" TIMESTAMP(3)');
  await exec('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "whatsappEnabled" BOOLEAN DEFAULT true');
  await exec('ALTER TABLE "BloodRequest" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3)');
  await exec('ALTER TABLE "BloodRequest" ADD COLUMN IF NOT EXISTS "hospitalType" TEXT');
  await exec('CREATE INDEX IF NOT EXISTS idx_donor_match ON "User" ("bloodGroup", "district", "isAvailable") WHERE "isAvailable" = true');
  await exec('CREATE INDEX IF NOT EXISTS idx_user_mobile ON "User" ("mobile")');
  await exec('CREATE INDEX IF NOT EXISTS idx_user_role_created ON "User" ("role", "createdAt" DESC)');
  await exec('CREATE INDEX IF NOT EXISTS idx_blood_request_expiry ON "BloodRequest" ("expiresAt", "status") WHERE "expiresAt" IS NOT NULL');
  await exec('CREATE INDEX IF NOT EXISTS idx_blood_request_status_created ON "BloodRequest" ("status", "createdAt" DESC)');
  await exec('CREATE INDEX IF NOT EXISTS idx_blood_request_district_status ON "BloodRequest" ("district", "status")');
  await exec('CREATE INDEX IF NOT EXISTS idx_donor_response_status ON "DonorResponse" ("status")');
  await exec(`
    CREATE TABLE IF NOT EXISTS "AuditLog" (
      "id" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "action" TEXT NOT NULL,
      "entityType" TEXT NOT NULL,
      "entityId" TEXT,
      "details" TEXT,
      "ipAddress" TEXT,
      "userAgent" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
    )
  `);
  await exec(`
    CREATE TABLE IF NOT EXISTS "BloodBank" (
      "id" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "district" TEXT NOT NULL,
      "address" TEXT,
      "phone" TEXT,
      "email" TEXT,
      "contactName" TEXT,
      "registrationNumber" TEXT,
      "website" TEXT,
      "description" TEXT,
      "lat" DOUBLE PRECISION,
      "lng" DOUBLE PRECISION,
      "availableBloodGroups" TEXT,
      "verified" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "BloodBank_pkey" PRIMARY KEY ("id")
    )
  `);
  await exec('ALTER TABLE "BloodBank" ADD COLUMN IF NOT EXISTS "email" TEXT');
  await exec('ALTER TABLE "BloodBank" ADD COLUMN IF NOT EXISTS "contactName" TEXT');
  await exec('ALTER TABLE "BloodBank" ADD COLUMN IF NOT EXISTS "registrationNumber" TEXT');
  await exec('ALTER TABLE "BloodBank" ADD COLUMN IF NOT EXISTS "website" TEXT');
  await exec('ALTER TABLE "BloodBank" ADD COLUMN IF NOT EXISTS "description" TEXT');
  await exec('ALTER TABLE "BloodBank" ADD COLUMN IF NOT EXISTS "logo" TEXT');
  await exec('ALTER TABLE "Hospital" ADD COLUMN IF NOT EXISTS "logo" TEXT');
  await exec('ALTER TABLE "Hospital" ADD COLUMN IF NOT EXISTS "hospitalRegistrationId" TEXT');
  await exec('ALTER TABLE "Hospital" ADD COLUMN IF NOT EXISTS "verifiedById" TEXT');
  await exec('ALTER TABLE "Hospital" ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP(3)');
  await exec('ALTER TABLE "Hospital" ADD COLUMN IF NOT EXISTS "active" BOOLEAN DEFAULT true');
  await exec(`
    CREATE TABLE IF NOT EXISTS "VerificationHistory" (
      "id" TEXT NOT NULL,
      "requestId" TEXT NOT NULL,
      "verifierId" TEXT,
      "decision" TEXT NOT NULL,
      "score" INTEGER,
      "notes" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "VerificationHistory_pkey" PRIMARY KEY ("id")
    )
  `);
  await exec(`
    CREATE TABLE IF NOT EXISTS "Ngo" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "name" TEXT NOT NULL,
      "address" TEXT,
      "registrationNumber" TEXT,
      "registrationYear" TEXT,
      "phone" TEXT,
      "email" TEXT,
      "district" TEXT,
      "contactName" TEXT,
      "description" TEXT,
      "website" TEXT,
      "status" TEXT NOT NULL DEFAULT 'pending',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Ngo_pkey" PRIMARY KEY ("id")
    )
  `);
  await exec('ALTER TABLE "Ngo" ADD COLUMN IF NOT EXISTS "contactName" TEXT');
  await exec('ALTER TABLE "Ngo" ADD COLUMN IF NOT EXISTS "registrationYear" TEXT');
  await exec('ALTER TABLE "Ngo" ADD COLUMN IF NOT EXISTS "description" TEXT');
  await exec('ALTER TABLE "Ngo" ADD COLUMN IF NOT EXISTS "website" TEXT');
  await exec('ALTER TABLE "Ngo" ADD COLUMN IF NOT EXISTS "logo" TEXT');
  await exec('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "ngoId" TEXT');
  await exec('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "ngoStatus" TEXT');
  await exec(`
    CREATE TABLE IF NOT EXISTS "DisasterBroadcast" (
      "id" TEXT NOT NULL,
      "district" TEXT,
      "message" TEXT NOT NULL,
      "priority" TEXT NOT NULL DEFAULT 'high',
      "active" BOOLEAN NOT NULL DEFAULT true,
      "createdById" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "DisasterBroadcast_pkey" PRIMARY KEY ("id")
    )
  `);
  await exec(`
    CREATE TABLE IF NOT EXISTS "Campaign" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "title" TEXT NOT NULL,
      "description" TEXT,
      "venue" TEXT NOT NULL,
      "district" TEXT NOT NULL,
      "address" TEXT,
      "startDate" TIMESTAMP(3) NOT NULL,
      "endDate" TIMESTAMP(3) NOT NULL,
      "startTime" TEXT,
      "endTime" TEXT,
      "partnerType" TEXT NOT NULL DEFAULT 'hospital',
      "hospitalId" TEXT,
      "hospitalName" TEXT,
      "ngoId" TEXT,
      "ngoName" TEXT,
      "bloodBankId" TEXT,
      "bloodBankName" TEXT,
      "contactPerson" TEXT,
      "contactPhone" TEXT,
      "expectedDonors" INTEGER DEFAULT 0,
      "collectedUnits" INTEGER DEFAULT 0,
      "registeredDonors" INTEGER DEFAULT 0,
      "status" TEXT NOT NULL DEFAULT 'active',
      "imageUrl" TEXT,
      "hostLogoUrl" TEXT,
      "createdById" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
    )
  `);
  await exec('ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "hostLogoUrl" TEXT');
  await exec('CREATE INDEX IF NOT EXISTS idx_campaign_status_enddate ON "Campaign" ("status", "endDate")');
  await exec('CREATE INDEX IF NOT EXISTS idx_campaign_district_status ON "Campaign" ("district", "status")');
}

const allowedOrigins = [
  "https://uyirngo.in",
  "http://uyirngo.in",
  "https://www.uyirngo.in",
  "https://uyirngo.netlify.app",
  "https://uyirproduction.onrender.com",
  "https://uyir.pages.dev",
  "https://c9597aab.uyir.pages.dev",
  "http://localhost:5000",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost",
  "capacitor://localhost",
  "http://10.0.2.2",
];

app.use(cors({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith(".uyir.pages.dev") || origin.endsWith(".pages.dev")) {
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
app.use(logRequest);

if (redisEnabled) {
  logger.info("Redis caching & rate limiting enabled");
  app.use("/api/", apiRateLimit);
  app.use("/auth/", apiRateLimit);
}

app.get("/api/health", async (_req: Request, res: any) => {
  const dbHealthy = await dbHealthCheck();
  res.json({
    ok: true,
    service: "uyir-api",
    database: dbHealthy ? "connected" : "error",
    redis: redisEnabled ? "connected" : "disabled",
    timestamp: new Date().toISOString(),
  });
});
app.get("/api/districts", cacheMiddleware(3600), (_req: Request, res: any) => res.json(TN_DISTRICT_NAMES));
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
app.use("/api/ngo", ngoRouter);
app.use("/api/bloodbanks", bloodBanksRouter);
app.use("/api/analytics", cacheMiddleware(30), analyticsRouter);
app.use("/api/disaster", disasterRouter);
app.use("/api/campaigns", campaignsRouter);
app.use("/auth", authRouter);
app.use("/users", usersRouter);
app.use("/requests", requestsRouter);
app.use("/responses", responsesRouter);
app.use("/ai", aiRouter);
app.use("/impact", impactRouter);
app.use("/stream", streamRouter);
app.use("/admin", adminRouter);
app.use("/ngo", ngoRouter);

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
    if (exists) logger.info({ path: p }, "Found frontend build");
    return exists;
  });
  if (staticDir) {
    app.use(express.static(staticDir));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(staticDir, "index.html"));
    });
  } else {
    logger.error({ possiblePaths }, "No frontend build found");
    app.get("*", (_req: Request, res: Response) => {
      res.status(503).json({ error: "Frontend not built. Please rebuild and deploy." });
    });
  }
} else {
  app.get("/", (_req: Request, res: any) => res.json({ service: "UYIR API", message: "Backend API server." }));
}

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, "Unhandled error");
  res.status(500).json({ error: err?.message || "Internal error" });
});

const port = Number(process.env.PORT) || 3000;
const host = "0.0.0.0";

ensureRuntimeSchema()
  .then(() => {
    app.listen(port, host, () => console.log(`[uyir] API listening on http://${host}:${port}`));
  })
  .catch((err) => {
    console.error("[startup] failed to ensure runtime schema", err);
    process.exit(1);
  });
