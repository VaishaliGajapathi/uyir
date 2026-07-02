import admin from "firebase-admin";
import "dotenv/config";

let app: admin.app.App | null = null;

export function getFirebaseApp(): admin.app.App {
  if (app) return app;

  const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!base64) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_BASE64 is not set");
  }

  try {
    const serviceAccount = JSON.parse(Buffer.from(base64, "base64").toString("utf-8"));
    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    });
    return app;
  } catch (error) {
    console.error("[firebase] Failed to initialize Firebase:", error);
    throw new Error("Invalid FIREBASE_SERVICE_ACCOUNT_BASE64");
  }
}

export async function sendPushNotification(
  token: string,
  data: {
    requestId: string;
    bloodGroup: string;
    componentType: string;
    unitsRequired: number;
    hospitalName: string;
    district: string;
    emergencyLevel: string;
    distanceKm?: number;
    etaMinutes?: number;
  }
): Promise<void> {
  const firebase = getFirebaseApp();

  const message: admin.messaging.Message = {
    token,
    notification: {
      title: `UYIR · ${data.bloodGroup} needed`,
      body: `${data.unitsRequired} unit${data.unitsRequired > 1 ? "s" : ""} at ${data.hospitalName}, ${data.district}`,
    },
    data: {
      type: "blood_request",
      requestId: data.requestId,
      bloodGroup: data.bloodGroup,
      componentType: data.componentType,
      unitsRequired: String(data.unitsRequired),
      hospitalName: data.hospitalName,
      district: data.district,
      emergencyLevel: data.emergencyLevel,
      distanceKm: data.distanceKm ? String(data.distanceKm) : "",
      etaMinutes: data.etaMinutes ? String(data.etaMinutes) : "",
    },
    android: {
      priority: "high",
      notification: {
        channelId: "emergency_blood",
        sound: "blood_alert",
        priority: "max",
      },
    },
    apns: {
      payload: {
        aps: {
          alert: {
            title: `UYIR · ${data.bloodGroup} needed`,
            body: `${data.unitsRequired} unit${data.unitsRequired > 1 ? "s" : ""} at ${data.hospitalName}, ${data.district}`,
          },
          sound: "blood_alert.wav",
          badge: 1,
          "interruption-level": "time-sensitive",
        },
      },
    },
  };

  try {
    await firebase.messaging().send(message);
    console.log(`[firebase] Push sent to token ending in ...${token.slice(-8)}`);
  } catch (error: any) {
    if (error.code === "messaging/registration-token-not-registered") {
      console.warn(`[firebase] Token not registered, will be cleaned up: ...${token.slice(-8)}`);
    } else {
      console.error(`[firebase] Failed to send push:`, error);
    }
    throw error;
  }
}

export async function sendMulticastPush(
  tokens: string[],
  data: {
    requestId: string;
    bloodGroup: string;
    componentType: string;
    unitsRequired: number;
    hospitalName: string;
    district: string;
    emergencyLevel: string;
    distanceKm?: number;
    etaMinutes?: number;
  }
): Promise<{ success: number; failure: number; invalidTokens: string[] }> {
  if (tokens.length === 0) return { success: 0, failure: 0, invalidTokens: [] };

  const firebase = getFirebaseApp();
  const invalidTokens: string[] = [];

  const message: admin.messaging.MulticastMessage = {
    tokens,
    notification: {
      title: `UYIR · ${data.bloodGroup} needed`,
      body: `${data.unitsRequired} unit${data.unitsRequired > 1 ? "s" : ""} at ${data.hospitalName}, ${data.district}`,
    },
    data: {
      type: "blood_request",
      requestId: data.requestId,
      bloodGroup: data.bloodGroup,
      componentType: data.componentType,
      unitsRequired: String(data.unitsRequired),
      hospitalName: data.hospitalName,
      district: data.district,
      emergencyLevel: data.emergencyLevel,
      distanceKm: data.distanceKm ? String(data.distanceKm) : "",
      etaMinutes: data.etaMinutes ? String(data.etaMinutes) : "",
    },
    android: {
      priority: "high",
      notification: {
        channelId: "emergency_blood",
        sound: "blood_alert",
        priority: "max",
      },
    },
    apns: {
      payload: {
        aps: {
          alert: {
            title: `UYIR · ${data.bloodGroup} needed`,
            body: `${data.unitsRequired} unit${data.unitsRequired > 1 ? "s" : ""} at ${data.hospitalName}, ${data.district}`,
          },
          sound: "blood_alert.wav",
          badge: 1,
          "interruption-level": "time-sensitive",
        },
      },
    },
  };

  try {
    const batchId = await firebase.messaging().sendEachForMulticast(message);
    const failureCount = batchId.failureCount;
    const successCount = batchId.successCount;

    batchId.responses.forEach((resp, idx) => {
      if (resp.error && resp.error.code === "messaging/registration-token-not-registered") {
        invalidTokens.push(tokens[idx]);
      }
    });

    console.log(`[firebase] Multicast: ${successCount} success, ${failureCount} failure`);
    return { success: successCount, failure: failureCount, invalidTokens };
  } catch (error: any) {
    console.error(`[firebase] Multicast failed:`, error);
    return { success: 0, failure: tokens.length, invalidTokens: [] };
  }
}

export async function subscribeToTopic(tokens: string[], topic: string): Promise<number> {
  const firebase = getFirebaseApp();
  try {
    const result = await firebase.messaging().subscribeToTopic(tokens, topic);
    console.log(`[firebase] Subscribed ${result.successCount} tokens to topic: ${topic}`);
    return result.successCount;
  } catch (error: any) {
    console.error(`[firebase] Subscribe to topic failed:`, error);
    return 0;
  }
}

export async function unsubscribeFromTopic(tokens: string[], topic: string): Promise<number> {
  const firebase = getFirebaseApp();
  try {
    const result = await firebase.messaging().unsubscribeFromTopic(tokens, topic);
    console.log(`[firebase] Unsubscribed ${result.successCount} tokens from topic: ${topic}`);
    return result.successCount;
  } catch (error: any) {
    console.error(`[firebase] Unsubscribe from topic failed:`, error);
    return 0;
  }
}

export async function sendTopicNotification(
  topic: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<string | null> {
  const firebase = getFirebaseApp();
  const message: admin.messaging.Message = {
    topic,
    notification: { title, body },
    data: data || {},
    android: {
      priority: "high",
      notification: {
        channelId: "emergency_blood",
        sound: "blood_alert",
        priority: "max",
      },
    },
    apns: {
      payload: {
        aps: {
          alert: { title, body },
          sound: "blood_alert.wav",
          badge: 1,
          "interruption-level": "time-sensitive",
        },
      },
    },
  };

  try {
    const messageId = await firebase.messaging().send(message);
    console.log(`[firebase] Topic notification sent to ${topic}: ${messageId}`);
    return messageId;
  } catch (error: any) {
    console.error(`[firebase] Topic notification failed:`, error);
    return null;
  }
}
