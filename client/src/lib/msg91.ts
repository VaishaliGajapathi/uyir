// MSG91 OTP Widget integration (client-side).
// Loads the MSG91 OTP provider script, initialises the widget with
// exposeMethods=true, and wraps the callback-based window methods
// (sendOtp / verifyOtp / retryOtp) in promises.
//
// On successful verifyOtp, MSG91 returns a signed access token which we
// forward to our backend (/auth/otp/verify or /auth/reset-password) where it
// is validated via the MSG91 verifyAccessToken API.

// Production MSG91 OTP Widget — intentionally hardcoded so every environment
// (dev, prod, all branches) uses the same live widget, never a test/demo one.
const WIDGET_ID = "3666676e5631333434353239";
const TOKEN_AUTH = "523489TNvwBf77VKz6a258520P1";

declare global {
  interface Window {
    initSendOTP?: (config: any) => void;
    sendOtp?: (identifier: string, success?: (data: any) => void, failure?: (error: any) => void) => void;
    verifyOtp?: (otp: string | number, success?: (data: any) => void, failure?: (error: any) => void, reqId?: string) => void;
    retryOtp?: (channel: string | null, success?: (data: any) => void, failure?: (error: any) => void, reqId?: string) => void;
  }
}

let initPromise: Promise<void> | null = null;

function initWidget(): Promise<void> {
  if (typeof window.sendOtp === "function") return Promise.resolve();
  if (initPromise) return initPromise;

  initPromise = new Promise<void>((resolve, reject) => {
    const configuration = {
      widgetId: WIDGET_ID,
      tokenAuth: TOKEN_AUTH,
      exposeMethods: true,
      success: () => {},
      failure: () => {},
    };

    const existing = document.getElementById("msg91-otp-provider") as HTMLScriptElement | null;
    if (existing) {
      const start = Date.now();
      const poll = setInterval(() => {
        if (typeof window.initSendOTP === "function") {
          clearInterval(poll);
          window.initSendOTP(configuration);
          resolve();
        } else if (Date.now() - start > 10000) {
          clearInterval(poll);
          reject(new Error("MSG91 widget failed to initialise"));
        }
      }, 100);
      return;
    }

    const script = document.createElement("script");
    script.id = "msg91-otp-provider";
    script.type = "text/javascript";
    script.src = "https://verify.msg91.com/otp-provider.js";
    script.onload = () => {
      try {
        if (typeof window.initSendOTP === "function") {
          window.initSendOTP(configuration);
          resolve();
        } else {
          reject(new Error("MSG91 widget script loaded but initSendOTP is missing"));
        }
      } catch (e) {
        reject(e as Error);
      }
    };
    script.onerror = () => reject(new Error("Failed to load MSG91 OTP widget"));
    document.body.appendChild(script);
  });

  return initPromise;
}

function formatIdentifier(mobile: string): string {
  return `91${mobile.replace(/\D/g, "").slice(-10)}`;
}

export async function sendWidgetOtp(mobile: string): Promise<void> {
  await initWidget();
  return new Promise<void>((resolve, reject) => {
    if (typeof window.sendOtp !== "function") return reject(new Error("OTP widget not ready"));
    window.sendOtp(
      formatIdentifier(mobile),
      () => resolve(),
      (error: any) => reject(new Error(error?.message || "Failed to send OTP"))
    );
  });
}

export async function verifyWidgetOtp(otp: string): Promise<string> {
  await initWidget();
  return new Promise<string>((resolve, reject) => {
    if (typeof window.verifyOtp !== "function") return reject(new Error("OTP widget not ready"));
    window.verifyOtp(
      otp,
      (data: any) => {
        const accessToken = typeof data === "string" ? data : data?.message || data?.accessToken;
        if (accessToken) resolve(accessToken);
        else reject(new Error("OTP verified but no access token returned"));
      },
      (error: any) => reject(new Error(error?.message || "Invalid OTP"))
    );
  });
}

export async function retryWidgetOtp(): Promise<void> {
  await initWidget();
  return new Promise<void>((resolve, reject) => {
    if (typeof window.retryOtp !== "function") return reject(new Error("OTP widget not ready"));
    window.retryOtp(
      null,
      () => resolve(),
      (error: any) => reject(new Error(error?.message || "Failed to resend OTP"))
    );
  });
}
