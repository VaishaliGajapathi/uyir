import { Queue } from "bullmq";
import IORedis from "ioredis";

const redisUrl = process.env.REDIS_URL;

export const queueEnabled = !!redisUrl;

export const connection = redisUrl
  ? new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    })
  : null;

export const bullConnection = connection as any;

const defaultJobOptions = {
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 5_000 },
  removeOnComplete: { age: 60 * 60 * 24, count: 500 },
  removeOnFail: { age: 60 * 60 * 24 * 7, count: 1_000 },
};

function createQueue<T>(name: string) {
  return connection ? new Queue<T>(name, { connection: bullConnection, defaultJobOptions }) : null;
}

export type NotificationJob =
  | { type: "alert-cycle"; requestId: string }
  | { type: "escalate-radius"; requestId: string };

export type DocumentVerificationJob = {
  requestId: string;
  documentId: string;
  base64: string;
  mimeType: string;
  documentType: string;
  patientName?: string;
};

export type AiJob =
  | { type: "request-verification"; requestId: string }
  | { type: "fraud-check"; text: string };

export const notificationQueue = createQueue<NotificationJob>("notifications");
export const documentVerificationQueue = createQueue<DocumentVerificationJob>("document-verification");
export const aiQueue = createQueue<AiJob>("ai-tasks");

export async function addNotificationJob(data: NotificationJob) {
  if (!notificationQueue) return false;
  await notificationQueue.add(data.type, data, { jobId: `${data.type}:${data.requestId}` });
  return true;
}

export async function addDocumentVerificationJob(data: DocumentVerificationJob) {
  if (!documentVerificationQueue) return false;
  await documentVerificationQueue.add("verify-document", data, { jobId: `document:${data.documentId}` });
  return true;
}

export async function addAiJob(data: AiJob) {
  if (!aiQueue) return false;
  const key = data.type === "request-verification" ? data.requestId : Buffer.from(data.text).toString("base64url").slice(0, 64);
  await aiQueue.add(data.type, data, { jobId: `${data.type}:${key}` });
  return true;
}
