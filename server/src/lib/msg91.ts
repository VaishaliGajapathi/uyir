// MSG91 SMS Integration for OTP
// Much cheaper than Twilio for India (₹0.12/SMS vs ₹6.25/SMS)

export async function sendOTP(mobile: string, otp: string, name?: string): Promise<boolean> {
  const authKey = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_OTP_TEMPLATE_ID;

  if (!authKey) {
    console.error("MSG91_AUTH_KEY not configured");
    return false;
  }

  try {
    // Format mobile number (remove +91 or 91 prefix if present)
    const cleanMobile = mobile.replace(/^(\+91|91)/, "");

    // Build URL with optional name parameter for personalized OTP
    let url = `https://control.msg91.com/api/v5/otp?authkey=${authKey}&template_id=${templateId}&mobile=${cleanMobile}&otp=${otp}`;
    
    // Add name as var1 if provided (for personalized OTP templates)
    if (name) {
      url += `&var1=${encodeURIComponent(name)}`;
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (data.type === "success") {
      console.log("OTP sent successfully via MSG91:", data);
      return true;
    } else {
      console.error("MSG91 OTP failed:", data);
      return false;
    }
  } catch (error) {
    console.error("Error sending OTP via MSG91:", error);
    return false;
  }
}

export async function verifyOTP(mobile: string, otp: string): Promise<boolean> {
  const authKey = process.env.MSG91_AUTH_KEY;

  if (!authKey) {
    console.error("MSG91_AUTH_KEY not configured");
    return false;
  }

  try {
    // Format mobile number
    const cleanMobile = mobile.replace(/^(\+91|91)/, "");

    const response = await fetch(
      `https://control.msg91.com/api/v5/otp/verify?authkey=${authKey}&mobile=${cleanMobile}&otp=${otp}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();
    
    if (data.type === "success") {
      console.log("OTP verified successfully via MSG91:", data);
      return true;
    } else {
      console.error("MSG91 OTP verification failed:", data);
      return false;
    }
  } catch (error) {
    console.error("Error verifying OTP via MSG91:", error);
    return false;
  }
}
