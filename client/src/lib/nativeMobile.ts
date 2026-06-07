import { Capacitor } from "@capacitor/core";
import { PushNotifications, type ActionPerformed, type Token } from "@capacitor/push-notifications";
import { api, getToken, type User } from "./api";

let listenersReady = false;
let registeredForPush = false;
let latestPushToken: string | null = null;

export function isNativeMobile() {
  return Capacitor.isNativePlatform();
}

async function persistToken(value: string) {
  latestPushToken = value;
  if (!getToken()) return;
  try {
    await api.registerFcmToken(value);
  } catch (error) {
    console.error("[native-push] Failed to persist FCM token", error);
  }
}

function handlePushOpen(event: ActionPerformed) {
  const requestId = String(
    event.notification.data?.requestId ||
    event.notification.data?.request_id ||
    ""
  );
  if (!requestId) return;
  window.location.assign(`/request/${requestId}`);
}

async function bindPushListeners() {
  if (listenersReady || !isNativeMobile()) return;

  await PushNotifications.createChannel({
    id: "emergency_blood",
    name: "Emergency Blood Requests",
    description: "Urgent blood request alerts",
    importance: 5,
    visibility: 1,
  }).catch(() => undefined);

  PushNotifications.addListener("registration", (token: Token) => {
    void persistToken(token.value);
  });
  PushNotifications.addListener("registrationError", (error) => {
    console.error("[native-push] Registration error", error);
  });
  PushNotifications.addListener("pushNotificationActionPerformed", handlePushOpen);

  listenersReady = true;
}

export async function bootstrapNativeMobile() {
  if (!isNativeMobile()) return;
  await bindPushListeners();
}

export async function syncNativePush(user: User | null) {
  if (!isNativeMobile() || !user || user.role !== "donor") return;

  await bindPushListeners();

  const currentToken = getToken();
  if (!currentToken) return;

  if (latestPushToken) {
    await persistToken(latestPushToken);
    return;
  }

  const existingPermissions = await PushNotifications.checkPermissions();
  let receivePermission = existingPermissions.receive;

  if (receivePermission === "prompt") {
    const requestedPermissions = await PushNotifications.requestPermissions();
    receivePermission = requestedPermissions.receive;
  }

  if (receivePermission !== "granted") return;

  if (!registeredForPush) {
    registeredForPush = true;
    await PushNotifications.register();
  }
}
