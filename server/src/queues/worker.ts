import "dotenv/config";
import { Worker } from "bullmq";
import { exec, query, queryOne } from "../db.js";
import { runAlertCycle, escalateRadius } from "../services/alerts.js";
import { verifyDocument, verifyRequest } from "../services/verification.js";
import { analyzeMessage } from "../services/fraud.js";
import { bullConnection, connection, operationalQueue, queueEnabled, NotificationJob, DocumentVerificationJob, AiJob, OperationalJob } from "./index.js";

const MIN_DOCUMENT_VERIFY_SCORE = 70;

if (!queueEnabled || !connection) {
  console.warn("[worker] REDIS_URL is not configured. BullMQ workers are disabled.");
  process.exit(0);
}

const notificationWorker = new Worker<NotificationJob>(
  "notifications",
  async (job) => {
    if (job.data.type === "alert-cycle") return runAlertCycle(job.data.requestId);
    if (job.data.type === "escalate-radius") return { radiusKm: await escalateRadius(job.data.requestId) };
  },
  { connection: bullConnection, concurrency: Number(process.env.NOTIFICATION_WORKER_CONCURRENCY || 3) }
);

const documentWorker = new Worker<DocumentVerificationJob>(
  "document-verification",
  async (job) => {
    const ai = await verifyDocument(job.data.base64, job.data.mimeType, job.data.documentType, job.data.patientName);
    await exec(
      'UPDATE "RequestDocument" SET "aiVerified"=$1,"aiScore"=$2,"aiNotes"=$3 WHERE "id"=$4',
      [ai.verified, ai.score, ai.notes, job.data.documentId]
    );
    return ai;
  },
  { connection: bullConnection, concurrency: Number(process.env.DOCUMENT_WORKER_CONCURRENCY || 2) }
);

const aiWorker = new Worker<AiJob>(
  "ai-tasks",
  async (job) => {
    if (job.data.type === "fraud-check") return analyzeMessage(job.data.text);

    const request = await queryOne<any>('SELECT * FROM "BloodRequest" WHERE "id" = $1 LIMIT 1', [job.data.requestId]);
    if (!request) throw new Error(`Request not found: ${job.data.requestId}`);

    const documents = await query<any>('SELECT * FROM "RequestDocument" WHERE "requestId" = $1 ORDER BY "uploadedAt" DESC', [job.data.requestId]);
    const latestDocument = documents.length ? documents[0] : null;
    if (!latestDocument) throw new Error("Please upload a hospital document before verification.");

    const documentAiUnavailable = Number(latestDocument.aiScore || 0) === 0 && String(latestDocument.aiNotes || "").includes("Automatic document verification could not run");
    const aiFailed = !latestDocument.aiVerified || latestDocument.aiScore < MIN_DOCUMENT_VERIFY_SCORE;
    const baseResult = await verifyRequest(request, documents.length > 0);

    const result = documentAiUnavailable || aiFailed
      ? {
          ...baseResult,
          verified: false,
          notes: `${baseResult.notes} ${documentAiUnavailable ? "Automatic document AI verification is unavailable" : `AI verification failed (score: ${latestDocument.aiScore}%)`}, so this request requires NGO/manual review before alerts are sent.`,
          checks: { ...baseResult.checks, documentAutoVerificationUnavailable: documentAiUnavailable, aiVerificationFailed: aiFailed },
        }
      : baseResult;

    const status = result.verified ? "verified" : "pending_verification";
    await exec('UPDATE "BloodRequest" SET "verificationScore"=$1, "verificationNotes"=$2, "status"=$3 WHERE "id"=$4', [result.score, result.notes, status, request.id]);
    return result;
  },
  { connection: bullConnection, concurrency: Number(process.env.AI_WORKER_CONCURRENCY || 2) }
);

const operationalWorker = new Worker<OperationalJob>(
  "operational-tasks",
  async (job) => {
    if (job.data.type === "expire-request") {
      await exec(
        'UPDATE "BloodRequest" SET "status" = $1, "closedAt" = NOW() WHERE "id" = $2 AND "status" IN ($3,$4,$5)',
        ["expired", job.data.requestId, "pending_verification", "verified", "alert_sent"]
      );
      return { expiredRequestId: job.data.requestId };
    }

    const result = await exec(
      'UPDATE "BloodRequest" SET "status" = $1, "closedAt" = NOW() WHERE "expiresAt" IS NOT NULL AND "expiresAt" <= NOW() AND "status" IN ($2,$3,$4)',
      ["expired", "pending_verification", "verified", "alert_sent"]
    );
    return { expired: result.rowCount || 0 };
  },
  { connection: bullConnection, concurrency: 1 }
);

for (const worker of [notificationWorker, documentWorker, aiWorker, operationalWorker]) {
  worker.on("completed", (job) => console.log(`[worker] ${job.queueName}:${job.id} completed`));
  worker.on("failed", (job, err) => console.error(`[worker] ${job?.queueName}:${job?.id} failed`, err));
}

await operationalQueue?.add("expire-stale-requests", { type: "expire-stale-requests" }, { jobId: "expire-stale-requests:repeat", repeat: { pattern: "*/15 * * * *" } });

console.log("[worker] BullMQ workers started");
