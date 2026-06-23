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
    const response = await fetch("https://control.msg91.com/api/v5/widget/verifyAccessToken", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ authkey: authKey, "access-token": accessToken }),
    });

    const data = await response.json();

    if (data.type === "success") {
      // data.message typically contains the verified identifier (mobile/email)
      const mobile =
        typeof data.message === "string" ? data.message.replace(/\D/g, "").slice(-10) : undefined;
      return { ok: true, mobile };
    }

    console.error("MSG91 verifyAccessToken failed:", data);
    return { ok: false };
  } catch (error) {
    console.error("Error verifying MSG91 access token:", error);
    return { ok: false };
  }
}
