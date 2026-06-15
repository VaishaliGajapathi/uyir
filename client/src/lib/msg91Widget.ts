// MSG91 OTP Widget integration helpers
// Widget script is loaded in index.html

declare global {
  interface Window {
    initSendOTP?: (config: Record<string, unknown>) => void;
    sendOTP?: (identifier: string) => void;
    resendOTP?: () => void;
    verifyOTP?: (otp: string) => void;
    msg91Config?: Record<string, unknown>;
  }
}

export interface Msg91OtpResult {
  accessToken: string;
  mobile?: string;
}

export function initMsg91Widget(mobile: string, onSuccess: (data: Msg91OtpResult) => void, onFailure: (error: string) => void) {
  if (typeof window.initSendOTP !== "function") {
    onFailure("OTP widget not loaded yet. Please try again in a moment.");
    return;
  }

  const cleanMobile = `91${mobile.replace(/\D/g, "").slice(-10)}`;

  window.msg91Config = {
    widgetId: "3666676e5631333434353239",
    tokenAuth: "",
    identifier: cleanMobile,
    exposeMethods: true,
    success: (data: any) => {
      const token = data?.accessToken || data?.["access-token"] || data?.token || "";
      if (token) {
        onSuccess({ accessToken: token, mobile: cleanMobile });
      } else {
        onFailure("OTP verified but no access token received.");
      }
    },
    failure: (error: any) => {
      onFailure(error?.message || "OTP verification failed. Please try again.");
    },
  };

  window.initSendOTP(window.msg91Config);

  // Trigger OTP sending immediately after init
  if (typeof window.sendOTP === "function") {
    window.sendOTP(cleanMobile);
  }
}
