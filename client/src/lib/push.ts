import { useEffect, useState } from "react";
import { api } from "./api";

const VAPID_PUBLIC_KEY = "BN2qX9pwoJchmWAKnVNfea2ZmyIjCon4cIEuXKnk6CxfrbG14nwoOGp2VJWlj5AgwAVikn8FRmlmFRynZZXHLvA";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) {
    console.warn("[push] This browser does not support notifications");
    return "denied";
  }
  return await Notification.requestPermission();
}

export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    console.warn("[push] Push notifications not supported");
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    // Send subscription to backend
    await api.savePushSubscription(subscription);
    console.log("[push] Subscription saved to backend");
    return subscription;
  } catch (error: any) {
    console.error("[push] Failed to subscribe:", error);
    if (error.name === "NotAllowedError") {
      console.warn("[push] Notification permission denied by user");
    } else if (error.name === "AbortError") {
      console.warn("[push] Subscription aborted");
    }
    return null;
  }
}

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    // Check if already subscribed
    async function checkSubscription() {
      if (!("serviceWorker" in navigator)) return;
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setSubscribed(!!subscription);
      } catch (error) {
        console.error("[push] Error checking subscription:", error);
      }
    }
    checkSubscription();
  }, []);

  async function enableNotifications() {
    const result = await requestNotificationPermission();
    setPermission(result);
    if (result === "granted") {
      const subscription = await subscribeToPush();
      setSubscribed(!!subscription);
      return !!subscription;
    }
    return false;
  }

  return { permission, subscribed, enableNotifications };
}
