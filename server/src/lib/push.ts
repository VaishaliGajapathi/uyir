import webpush from "web-push";

import type { PushSubscription as WebPushSubscription } from "web-push";

// Configure VAPID keys only if both are set
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
let pushEnabled = false;

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    "mailto:support@uyirngo.in",
    vapidPublicKey,
    vapidPrivateKey
  );
  pushEnabled = true;
} else {
  console.warn("[push] VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY not set — web push notifications disabled");
}

export interface PushSubscription {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

function toWebPushSubscription(subscription: PushSubscription): WebPushSubscription {
  return {
    endpoint: subscription.endpoint,
    expirationTime: subscription.expirationTime ?? null,
    keys: subscription.keys,
  };
}

export async function sendPushNotification(subscription: PushSubscription, title: string, body: string, data?: any) {
  if (!pushEnabled) return { success: false, reason: "push_disabled" };
  try {
    const payload = JSON.stringify({ title, body, data });
    await webpush.sendNotification(toWebPushSubscription(subscription), payload);
    return { success: true };
  } catch (error: any) {
    console.error("[push] Failed to send notification:", error.message);
    // If subscription is invalid/expired, we should remove it from the database
    if (error.statusCode === 410 || error.statusCode === 404) {
      return { success: false, expired: true };
    }
    return { success: false, error: error.message };
  }
}

export async function sendPushToUser(userId: string, title: string, body: string, data?: any) {
  const { queryOne, exec } = await import("../db.js");
  const user = await queryOne<any>('SELECT "pushSubscription" FROM "User" WHERE "id" = $1 LIMIT 1', [userId]);
  if (!user?.pushSubscription) return { success: false, reason: "no_subscription" };
  
  try {
    const subscription: PushSubscription = JSON.parse(user.pushSubscription);
    return await sendPushNotification(subscription, title, body, data);
  } catch (error: any) {
    console.error("[push] Invalid subscription format for user:", userId);
    // Remove invalid subscription
    await exec('UPDATE "User" SET "pushSubscription" = NULL WHERE "id" = $1', [userId]);
    return { success: false, reason: "invalid_subscription" };
  }
}

export async function sendPushToMultipleUsers(userIds: string[], title: string, body: string, data?: any) {
  const results = await Promise.allSettled(
    userIds.map(id => sendPushToUser(id, title, body, data))
  );
  const success = results.filter(r => r.status === "fulfilled" && r.value.success).length;
  const failed = results.length - success;
  return { success, failed, total: results.length };
}
