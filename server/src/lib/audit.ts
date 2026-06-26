import { exec } from "../db.js";
import { logger } from "./logger.js";

export async function logAudit({
  userId,
  action,
  entityType,
  entityId,
  details,
  ipAddress,
  userAgent,
}: {
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  try {
    await exec(
      'INSERT INTO "AuditLog" ("id","userId","action","entityType","entityId","details","ipAddress","userAgent","createdAt") VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,NOW())',
      [userId, action, entityType, entityId, details, ipAddress, userAgent]
    );
    logger.debug({ userId, action, entityType, entityId }, "Audit log recorded");
  } catch (error) {
    logger.error({ error, userId, action }, "Failed to write audit log");
  }
}

export const AuditActions = {
  // Auth actions
  USER_LOGIN: "user.login",
  USER_LOGOUT: "user.logout",
  PASSWORD_RESET: "user.password_reset",
  
  // Request actions
  REQUEST_CREATE: "request.create",
  REQUEST_VERIFY: "request.verify",
  REQUEST_ALERT: "request.alert",
  REQUEST_ESCALATE: "request.escalate",
  REQUEST_CLOSE: "request.close",
  
  // Response actions
  RESPONSE_ACCEPT: "response.accept",
  RESPONSE_COMPLETE: "response.complete",
  RESPONSE_CANCEL: "response.cancel",
  
  // Document actions
  DOCUMENT_UPLOAD: "document.upload",
  DOCUMENT_VERIFY: "document.verify",
  
  // Admin actions
  USER_BAN: "user.ban",
  USER_UNBAN: "user.unban",
  ROLE_CHANGE: "role.change",
} as const;
