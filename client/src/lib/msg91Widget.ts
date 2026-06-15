// MSG91 OTP Widget integration helpers
// Script is loaded dynamically when needed

const SCRIPT_URLS = [
  "https://verify.msg91.com/otp-provider.js",
  "https://verify.phone91.com/otp-provider.js",
];

function loadScript(urls: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    let i = 0;
    function attempt() {
      const s = document.createElement("script");
      s.src = urls[i];
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => {
        i++;
        if (i < urls.length) attempt();
        else reject(new Error("Failed to load OTP widget script"));
      };
      document.head.appendChild(s);
    }
    attempt();
  });
}

export interface Msg91OtpResult {
  accessToken: string;
  mobile?: string;
}

export async function initMsg91Widget(
  mobile: string,
  onSuccess: (data: Msg91OtpResult) => void,
  onFailure: (error: string) => void,
  context: "signup" | "forgot" = "signup"
) {
  const win = window as any;

  if (context !== "signup" && context !== "forgot") {
    onFailure("OTP widget is only available during signup or forgot password.");
    return;
  }

  if (typeof win.initSendOTP !== "function") {
    try {
      await loadScript(SCRIPT_URLS);
    } catch {
      onFailure("Unable to load OTP widget. Please check your connection and try again.");
      return;
    }
  }

  if (typeof win.initSendOTP !== "function") {
    onFailure("OTP widget failed to initialize.");
    return;
  }

  const cleanMobile = `91${mobile.replace(/\D/g, "").slice(-10)}`;

  win.msg91Config = {
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

  win.initSendOTP(win.msg91Config);

  if (typeof win.sendOTP === "function") {
    win.sendOTP(cleanMobile);
  }
}
