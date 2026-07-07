// MSG91 OTP Widget - server-side access token verification
// OTP send/verify happens on the client via the MSG91 OTP Widget.
// The widget returns a signed access token, which we validate here.

export interface AccessTokenResult {
  ok: boolean;
  mobile?: string;
}

export async function verifyAccessToken(accessToken: string): Promise<AccessTokenResult> {
  const authKey = process.env.MSG91_AUTH_KEY;

  if (!authKey) {
    console.error("MSG91_AUTH_KEY not configured");
    return { ok: false };
  }

  if (!accessToken) {
    return { ok: false };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch("https://control.msg91.com/api/v5/widget/verifyAccessToken", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ authkey: authKey, "access-token": accessToken }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json();
    console.log("[msg91/server] verifyAccessToken response:", JSON.stringify(data));

    // MSG91 may return success in different formats
    const isSuccess = data.type === "success" || data.status === "success" || data.success === true;
    if (isSuccess) {
      // data.message typically contains the verified identifier (mobile/email)
      const mobile =
        typeof data.message === "string" ? data.message.replace(/\D/g, "").slice(-10) : undefined;
      console.log("[msg91/server] Token verified, mobile:", mobile);
      return { ok: true, mobile };
    }

    console.error("MSG91 verifyAccessToken failed:", data);
    return { ok: false };
  } catch (error: any) {
    if (error.name === "AbortError") {
      console.error("MSG91 verifyAccessToken timed out after 10s");
    } else {
      console.error("Error verifying MSG91 access token:", error);
    }
    return { ok: false };
  }
}
