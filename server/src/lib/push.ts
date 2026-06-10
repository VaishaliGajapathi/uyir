import webpush from "web-push";

// Configure VAPID keys
webpush.setVapidDetails(
  "mailto:contact@uyir.org",
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export async function sendPushNotification(subscription: PushSubscription, title: string, body: string, data?: any) {
  try {
    const payload = JSON.stringify({ title, body, data });
    await webpush.sendNotification(subscription, payload);
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
