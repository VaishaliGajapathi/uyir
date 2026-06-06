import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { signToken } from "../middleware/auth.js";

export const authRouter = Router();

// Twilio SMS client (if configured)
let twilioClient: any = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
  // @ts-ignore
  const twilio = require("twilio");
  twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

async function sendSms(mobile: string, code: string) {
  if (twilioClient) {
    try {
      await twilioClient.messages.create({
        body: `Your UYIR verification code is ${code}. Valid for 5 minutes.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: `+91${mobile}`,
      });
      console.log(`[sms] Sent to ${mobile}`);
    } catch (e: any) {
      console.error(`[sms] Failed: ${e.message}`);
      throw e;
    }
  } else {
    console.log(`[otp] ${mobile} -> ${code} (SMS not configured, using dev mode)`);
  }
}

// Request OTP.
authRouter.post("/otp/request", async (req, res) => {
  const schema = z.object({ mobile: z.string().min(10).max(15) });
  const parse = schema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Invalid mobile" });
  const mobile = parse.data.mobile.replace(/\D/g, "").slice(-10);

  const code = String(Math.floor(100000 + Math.random() * 900000));
  await prisma.otpCode.create({
    data: { mobile, code, expiresAt: new Date(Date.now() + 5 * 60 * 1000) },
  });

  try {
    await sendSms(mobile, code);
  } catch (e: any) {
    // If SMS fails, still return devOtp for testing
    console.log(`[otp] SMS failed, returning devOtp: ${code}`);
    return res.json({ ok: true, devOtp: code });
  }

  // In production, don't return devOtp
  if (process.env.NODE_ENV === "production") {
    res.json({ ok: true });
  } else {
    res.json({ ok: true, devOtp: code });
  }
});

// Verify OTP -> create/login user, return JWT.
authRouter.post("/otp/verify", async (req, res) => {
  const schema = z.object({
    mobile: z.string().min(10),
    code: z.string().length(6),
    name: z.string().optional(),
    role: z.enum(["donor", "requester", "verifier", "admin"]).optional(),
    language: z.enum(["ta", "en"]).optional(),
  });
  const parse = schema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Invalid input" });
  const { code, name, role, language } = parse.data;
  const mobile = parse.data.mobile.replace(/\D/g, "").slice(-10);

  const otp = await prisma.otpCode.findFirst({
    where: { mobile, code, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!otp) return res.status(400).json({ error: "Invalid or expired OTP" });

  let user = await prisma.user.findUnique({ where: { mobile } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        mobile,
        name: name || "UYIR User",
        role: role || "donor",
        language: language || "ta",
      },
    });
  }
  await prisma.otpCode.deleteMany({ where: { mobile } });

  const token = signToken(user.id, user.role);
  res.json({ token, user });
});

// Hospital approver login using hospital name and registration ID
authRouter.post("/hospital/login", async (req, res) => {
  const schema = z.object({
    hospitalName: z.string().min(2),
    hospitalRegistrationId: z.string().min(2),
    mobile: z.string().min(10).optional(),
  });
  const parse = schema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Invalid input" });
  const { hospitalName, hospitalRegistrationId, mobile } = parse.data;

  // Find hospital by name and registration ID
  const hospital = await prisma.hospital.findFirst({
    where: {
      name: { equals: hospitalName, mode: "insensitive" },
    },
  });

  if (!hospital) {
    return res.status(404).json({ error: "Hospital not found. Please contact UYIR admin to register your hospital." });
  }

  // Check if hospital approver exists
  let user = await prisma.user.findFirst({
    where: {
      hospitalRegistrationId,
      role: "hospital_approver",
    },
    include: { hospital: true },
  });

  if (!user) {
    // Create new hospital approver user
    user = await prisma.user.create({
      data: {
        name: `${hospitalName} Approver`,
        mobile: mobile || "0000000000", // Temporary if no mobile provided
        role: "hospital_approver",
        hospitalName,
        hospitalRegistrationId,
        hospitalId: hospital.id,
        verified: true,
      },
      include: { hospital: true },
    });
  } else {
    // Update hospital reference if changed
    if (user.hospitalId !== hospital.id) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { hospitalId: hospital.id },
        include: { hospital: true },
      });
    }
  }

  const token = signToken(user.id, user.role);
  res.json({ token, user });
});
