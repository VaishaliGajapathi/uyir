// MSG91 OTP Widget - server-side access token verification
// OTP send/verify happens on the client via the MSG91 OTP Widget.
// The widget returns a signed access token, which we validate here.

export interface AccessTokenResult {
  ok: boolean;
  mobile?: string;
}

// Cache of recently verified tokens to avoid re-calling MSG91 on retry.
// MSG91 access tokens are single-use — a second verifyAccessToken call fails.
const verifiedTokenCache = new Map<string, { mobile?: string; expires: number }>();
const TOKEN_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function verifyAccessToken(accessToken: string): Promise<AccessTokenResult> {
  const authKey = process.env.MSG91_AUTH_KEY;

  if (!authKey) {
    console.error("MSG91_AUTH_KEY not configured");
    return { ok: false };
  }

  if (!accessToken) {
    return { ok: false };
  }

  // Check cache first — if we already verified this token, skip MSG91 API call
  const cached = verifiedTokenCache.get(accessToken);
  if (cached && cached.expires > Date.now()) {
    console.log("[msg91/server] Token found in cache (already verified), mobile:", cached.mobile);
    return { ok: true, mobile: cached.mobile };
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
      // Cache the verified token so retries don't hit MSG91 again
      verifiedTokenCache.set(accessToken, { mobile, expires: Date.now() + TOKEN_CACHE_TTL_MS });
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
