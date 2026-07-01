// Social sharing utilities for UYIR.
// Provides a canonical public app URL (never localhost) and correct
// per-platform share behavior, preferring the native Web Share API
// (which works inside the mobile APK / WebView and shows Instagram, etc.).

const apiBase = (import.meta.env.VITE_API_URL as string) || "";

// Canonical public web URL of the app. We derive it from the configured API
// URL (stripping a trailing /api). This avoids "localhost" appearing in share
// text when running inside the Capacitor WebView, where window.location.origin
// is http://localhost.
function deriveAppUrl(): string {
  const fromApi = apiBase.replace(/\/api\/?$/, "").replace(/\/$/, "");
  if (fromApi.startsWith("http") && !fromApi.includes("localhost")) return fromApi;
  if (typeof window !== "undefined" && window.location?.origin && !window.location.origin.includes("localhost")) {
    return window.location.origin;
  }
  return "https://uyirproduction.onrender.com";
}

export const APP_URL = deriveAppUrl();

export const requestUrl = (id: string, action?: string) =>
  `${APP_URL}/request/${id}${action ? `?action=${action}` : ""}`;

// Attempt to share via the native Web Share API. Returns true if the share
// sheet was shown (or the user dismissed it), false if unavailable.
export async function nativeShare(opts: { title?: string; text: string; url?: string }): Promise<boolean> {
  if (typeof navigator !== "undefined" && typeof (navigator as any).share === "function") {
    try {
      await (navigator as any).share({ title: opts.title, text: opts.text, url: opts.url });
      return true;
    } catch (e: any) {
      // AbortError = user cancelled; treat as handled so we don't double-open.
      if (e?.name === "AbortError") return true;
    }
  }
  return false;
}

export function shareWhatsApp(text: string) {
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
}

// Facebook's sharer reliably uses the `u` (URL) parameter — it scrapes Open
// Graph tags from that page. The `quote` parameter is best-effort only.
export function shareFacebook(url: string, quote?: string) {
  const target = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}${
    quote ? `&quote=${encodeURIComponent(quote)}` : ""
  }`;
  window.open(target, "_blank");
}

// Instagram has no web share URL. Prefer the native share sheet (mobile APK),
// otherwise copy the caption so the user can paste it into a story/post.
export async function shareInstagram(text: string) {
  const shared = await nativeShare({ text });
  if (!shared) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* clipboard may be unavailable */
    }
    alert("Caption copied! Open Instagram and paste it into your story or post.");
  }
}

export function shareTwitter(text: string, url?: string) {
  const target = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}${
    url ? `&url=${encodeURIComponent(url)}` : ""
  }`;
  window.open(target, "_blank");
}
