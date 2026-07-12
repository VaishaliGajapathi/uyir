// MSG91 WhatsApp Business API - server-side outbound template messages.
// Used to notify matching nearby donors about new blood requests.
//
// Business-initiated WhatsApp messages MUST use a pre-approved template.
// Configure the following environment variables (all required to enable):
//   MSG91_AUTH_KEY                    - shared with OTP (already configured)
//   MSG91_WHATSAPP_INTEGRATED_NUMBER  - your WhatsApp-enabled number, e.g. 919876543210
//   MSG91_WHATSAPP_TEMPLATE_NAME      - approved template name
//   MSG91_WHATSAPP_NAMESPACE          - template namespace from MSG91/Meta
//   MSG91_WHATSAPP_LANG               - template language code (default: en)
//
// The approved template body is expected to accept ordered variables ({{1}}..{{n}}).
// This helper maps the provided `bodyParams` array to body_1..body_n components.
//
// If any required variable is missing, the helper safely no-ops (returns
// { ok:false, reason:"not_configured" }) so alerts never crash.

const MSG91_WHATSAPP_URL =
  "https://control.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/";

export interface WhatsAppResult {
  ok: boolean;
  reason?: string;
  error?: string;
}

function getConfig() {
  const authKey = process.env.MSG91_AUTH_KEY;
  const integratedNumber = process.env.MSG91_WHATSAPP_INTEGRATED_NUMBER;
  const templateName = process.env.MSG91_WHATSAPP_TEMPLATE_NAME;
  const namespace = process.env.MSG91_WHATSAPP_NAMESPACE;
  const langCode = process.env.MSG91_WHATSAPP_LANG || "en";
  const enabled = Boolean(authKey && integratedNumber && templateName && namespace);
  return { authKey, integratedNumber, templateName, namespace, langCode, enabled };
}

export function isWhatsAppEnabled(): boolean {
  return getConfig().enabled;
}

// Normalize an Indian mobile number to MSG91 format: 91XXXXXXXXXX
function formatNumber(mobile: string): string {
  const digits = mobile.replace(/\D/g, "").slice(-10);
  return `91${digits}`;
}

/**
 * Send a WhatsApp template message via MSG91.
 * @param mobile     Recipient mobile (10-digit or with country code)
 * @param bodyParams Ordered values that fill the template's {{1}}..{{n}} body variables
 */
export async function sendWhatsAppTemplate(
  mobile: string,
  bodyParams: string[]
): Promise<WhatsAppResult> {
  const cfg = getConfig();
  if (!cfg.enabled) {
    return { ok: false, reason: "not_configured" };
  }
  if (!mobile || mobile.replace(/\D/g, "").length < 10) {
    return { ok: false, reason: "invalid_mobile" };
  }

  const components: Record<string, { type: string; value: string }> = {};
  bodyParams.forEach((value, idx) => {
    components[`body_${idx + 1}`] = { type: "text", value: String(value ?? "") };
  });

  const body = {
    integrated_number: cfg.integratedNumber,
    content_type: "template",
    payload: {
      messaging_product: "whatsapp",
      type: "template",
      template: {
        name: cfg.templateName,
        language: { code: cfg.langCode, policy: "deterministic" },
        namespace: cfg.namespace,
        to_and_components: [
          {
            to: [formatNumber(mobile)],
            components,
          },
        ],
      },
    },
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(MSG91_WHATSAPP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        authkey: cfg.authKey as string,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json().catch(() => ({}));
    const isSuccess =
      response.ok &&
      (data?.type === "success" || data?.status === "success" || data?.hasError === false);

    if (isSuccess) {
      console.log(`[whatsapp] Sent to ...${mobile.slice(-4)}`);
      return { ok: true };
    }

    console.error("[whatsapp] Send failed:", JSON.stringify(data));
    return { ok: false, reason: "send_failed", error: JSON.stringify(data) };
  } catch (error: any) {
    if (error?.name === "AbortError") {
      console.error("[whatsapp] Request timed out after 10s");
      return { ok: false, reason: "timeout" };
    }
    console.error("[whatsapp] Error sending message:", error?.message || error);
    return { ok: false, reason: "error", error: error?.message };
  }
}

export interface BloodAlertWhatsApp {
  donorName: string;
  bloodGroup: string;
  componentType: string;
  unitsRequired: number;
  hospitalName: string;
  district: string;
  distanceKm?: number;
  requestUrl: string;
}

/**
 * Convenience wrapper that maps a blood-request alert to the approved
 * template's ordered body variables:
 *   {{1}} donor name
 *   {{2}} blood group + component (e.g. "O+ Whole Blood")
 *   {{3}} units required
 *   {{4}} hospital, district (+ optional distance)
 *   {{5}} link to view/respond to the request
 */
export async function sendWhatsAppBloodAlert(
  mobile: string,
  data: BloodAlertWhatsApp
): Promise<WhatsAppResult> {
  const location =
    data.distanceKm != null
      ? `${data.hospitalName}, ${data.district} (~${Math.round(data.distanceKm)} km away)`
      : `${data.hospitalName}, ${data.district}`;
  const bodyParams = [
    data.donorName || "Donor",
    `${data.bloodGroup} ${data.componentType}`.trim(),
    `${data.unitsRequired} unit${data.unitsRequired > 1 ? "s" : ""}`,
    location,
    data.requestUrl,
  ];
  return sendWhatsAppTemplate(mobile, bodyParams);
}
