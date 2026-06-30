// MSG91 OTP Widget - Custom UI integration
// Uses exposeMethods=true to get sendOtp, verifyOtp, retryOtp on window
// On successful verifyOtp, MSG91 returns a signed access token which we
// forward to our backend (/auth/otp/verify or /auth/reset-password) for validation

// Production MSG91 OTP Widget credentials
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
let currentReqId: string | null = null;
let lastOtpSentAt = 0;
const OTP_COOLDOWN_MS = 60000; // 60 second cooldown between OTP sends

function initWidget(): Promise<void> {
  if (initPromise) return initPromise;

  initPromise = new Promise<void>((resolve, reject) => {
    const configuration = {
      widgetId: WIDGET_ID,
      tokenAuth: TOKEN_AUTH,
      exposeMethods: true,
      success: () => {},
      failure: () => {},
    };

    // Load script with fallback URLs
    const urls = [
      "https://verify.msg91.com/otp-provider.js",
      "https://verify.phone91.com/otp-provider.js"
    ];

    let i = 0;
    function attempt() {
      const s = document.createElement("script");
      s.src = urls[i];
      s.async = true;
      s.onload = () => {
        console.log("[msg91] Script loaded from:", urls[i]);
        // Give the script time to define initSendOTP
        let tries = 0;
        const checkReady = () => {
          if (typeof window.initSendOTP === "function") {
            console.log("[msg91] initSendOTP found, calling with config");
            window.initSendOTP(configuration);
            // Wait for methods to be exposed
            let methodTries = 0;
            const checkMethods = () => {
              if (typeof window.sendOtp === "function") {
                console.log("[msg91] Widget methods exposed successfully");
                resolve();
              } else if (methodTries < 20) {
                methodTries++;
                setTimeout(checkMethods, 200);
              } else {
                console.error("[msg91] initSendOTP called but sendOtp not exposed after 4s");
                initPromise = null;
                reject(new Error("MSG91 widget initialized but methods not exposed"));
              }
            };
            setTimeout(checkMethods, 100);
          } else if (tries < 10) {
            tries++;
            setTimeout(checkReady, 200);
          } else {
            console.error("[msg91] Script loaded but initSendOTP not found after 2s");
            i++;
            if (i < urls.length) {
              attempt();
            } else {
              initPromise = null;
              reject(new Error("MSG91 script loaded but initSendOTP not found"));
            }
          }
        };
        checkReady();
      };
      s.onerror = () => {
        console.error("[msg91] Failed to load script from:", urls[i]);
        i++;
        if (i < urls.length) {
          attempt();
        } else {
          initPromise = null;
          reject(new Error("Failed to load MSG91 OTP widget from all URLs"));
        }
      };
      document.head.appendChild(s);
    }
    attempt();
  });

  return initPromise;
}

function formatIdentifier(mobile: string): string {
  return `91${mobile.replace(/\D/g, "").slice(-10)}`;
}

// Initialize widget on module load
void initWidget();

// Send OTP using MSG91 custom UI
export async function sendWidgetOtp(mobile: string): Promise<string> {
  const now = Date.now();
  if (now - lastOtpSentAt < OTP_COOLDOWN_MS) {
    const waitSec = Math.ceil((OTP_COOLDOWN_MS - (now - lastOtpSentAt)) / 1000);
    throw new Error(`Please wait ${waitSec}s before requesting another OTP`);
  }
  console.log("[msg91] sendWidgetOtp called for mobile:", mobile);
  try {
    await initWidget();
  } catch (e: any) {
    console.error("[msg91] Widget init failed:", e.message);
    throw new Error(`OTP service unavailable: ${e.message}`);
  }
  return new Promise<string>((resolve, reject) => {
    if (typeof window.sendOtp !== "function") {
      console.error("[msg91] sendOtp function not available on window");
      return reject(new Error("OTP widget not ready. Please refresh the page and try again."));
    }
    console.log("[msg91] Calling window.sendOtp with identifier:", formatIdentifier(mobile));
    window.sendOtp(
      formatIdentifier(mobile),
      (data: any) => {
        console.log("[msg91] sendOtp success:", data);
        lastOtpSentAt = Date.now();
        // Store reqId for verify/retry
        currentReqId = typeof data === "string" ? data : data?.reqId || data?.requestId;
        resolve(currentReqId || "sent");
      },
      (error: any) => {
        console.error("[msg91] sendOtp error:", error);
        reject(new Error(error?.message || "Failed to send OTP. Check your network and try again."));
      }
    );
  });
}

// Verify OTP using MSG91 custom UI
export async function verifyWidgetOtp(otp: string): Promise<string> {
  await initWidget();
  return new Promise<string>((resolve, reject) => {
    if (typeof window.verifyOtp !== "function") {
      return reject(new Error("OTP widget not ready"));
    }
    console.log("[msg91] Calling verifyOtp with:", otp, "reqId:", currentReqId);
    window.verifyOtp(
      otp,
      (data: any) => {
        console.log("[msg91] verifyOtp success callback:", data);
        const accessToken = typeof data === "string" ? data : data?.message || data?.accessToken || data?.token;
        if (accessToken) {
          currentReqId = null;
          console.log("[msg91] Access token extracted:", accessToken);
          resolve(accessToken);
        } else {
          console.error("[msg91] No access token in response:", data);
          reject(new Error("OTP verified but no access token returned"));
        }
      },
      (error: any) => {
        console.error("[msg91] verifyOtp error callback:", error);
        reject(new Error(error?.message || "Invalid OTP"));
      },
      currentReqId || undefined
    );
  });
}

// Retry OTP using MSG91 custom UI
export async function retryWidgetOtp(): Promise<void> {
  const now = Date.now();
  if (now - lastOtpSentAt < OTP_COOLDOWN_MS) {
    const waitSec = Math.ceil((OTP_COOLDOWN_MS - (now - lastOtpSentAt)) / 1000);
    throw new Error(`Please wait ${waitSec}s before resending OTP`);
  }
  await initWidget();
  return new Promise<void>((resolve, reject) => {
    if (typeof window.retryOtp !== "function") {
      return reject(new Error("OTP widget not ready"));
    }
    window.retryOtp(
      null, // channel value (null for default configuration)
      () => { lastOtpSentAt = Date.now(); resolve(); },
      (error: any) => reject(new Error(error?.message || "Failed to resend OTP")),
      currentReqId || undefined
    );
  });
}
