import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { signToken } from "../middleware/auth.js";
import { sendOTP as sendMsg91OTP } from "../lib/msg91.js";
import bcrypt from "bcryptjs";

export const authRouter = Router();

async function sendSms(mobile: string, code: string, name?: string) {
  // Demo OTP mode: MSG91 is under verification, so we always log OTP locally.
  // The frontend displays devOtp for users to enter manually.
  console.log(`[otp] ${mobile} -> ${code} (Demo OTP mode - MSG91 under verification)`);
}

// Request OTP - only for new users (signup)
authRouter.post("/otp/request", async (req: any, res: any) => {
  const schema = z.object({
    mobile: z.string().min(10).max(15),
    name: z.string().optional(),
  });
  const parse = schema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Invalid mobile" });
  const mobile = parse.data.mobile.replace(/\D/g, "").slice(-10);
  const name = parse.data.name;

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({ where: { mobile } });

  // If user exists with password, they should use password login
  if (existingUser && existingUser.password) {
    return res.json({ ok: true, exists: true, hasPassword: true, message: "User already exists with password" });
  }

  // If user exists without password, allow OTP for first-time setup
  if (existingUser && !existingUser.password) {
    return res.json({ ok: true, exists: true, hasPassword: false, user: existingUser, message: "User exists, set password" });
  }

  // New user - send OTP for signup
  const code = String(Math.floor(100000 + Math.random() * 900000));
  await prisma.otpCode.create({
    data: { mobile, code, expiresAt: new Date(Date.now() + 5 * 60 * 1000) },
  });

  // Always return devOtp for testing (SMS gateway not connected)
  console.log(`[otp] Signup OTP for ${mobile}: ${code}`);
  res.json({ ok: true, devOtp: code, exists: false, user: null });
});

// Direct login for existing users with password
authRouter.post("/login", async (req: any, res: any) => {
  const schema = z.object({
    mobile: z.string().min(10).max(15),
    password: z.string().min(4),
  });
  const parse = schema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Invalid input" });
  const mobile = parse.data.mobile.replace(/\D/g, "").slice(-10);
  const password = parse.data.password;

  const user = await prisma.user.findUnique({ where: { mobile } });
  if (!user) {
    return res.status(404).json({ error: "User not found. Please sign up first." });
  }

  if (!user.password) {
    return res.status(400).json({ error: "Please set up your password first using OTP verification." });
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    return res.status(401).json({ error: "Invalid password. Use 'Forgot password' to reset." });
  }

  const token = signToken(user.id, user.role);
  res.json({ token, user });
});

// Forgot password - send OTP to reset password
authRouter.post("/forgot-password", async (req: any, res: any) => {
  const schema = z.object({
    mobile: z.string().min(10).max(15),
  });
  const parse = schema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Invalid mobile" });
  const mobile = parse.data.mobile.replace(/\D/g, "").slice(-10);

  const user = await prisma.user.findUnique({ where: { mobile } });
  if (!user) {
    return res.status(404).json({ error: "User not found. Please sign up first." });
  }

  // Send OTP for password reset
  const code = String(Math.floor(100000 + Math.random() * 900000));
  await prisma.otpCode.create({
    data: { mobile, code, expiresAt: new Date(Date.now() + 5 * 60 * 1000) },
  });

  // Always return devOtp for testing (SMS gateway not connected)
  console.log(`[otp] Forgot password OTP for ${mobile}: ${code}`);
  res.json({ ok: true, devOtp: code, message: "OTP sent for password reset" });
});

// Reset password using OTP
authRouter.post("/reset-password", async (req: any, res: any) => {
  const schema = z.object({
    mobile: z.string().min(10),
    code: z.string().length(6),
    password: z.string().min(4),
  });
  const parse = schema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Invalid input" });
  const { code, password } = parse.data;
  const mobile = parse.data.mobile.replace(/\D/g, "").slice(-10);

  const otp = await prisma.otpCode.findFirst({
    where: { mobile, code, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!otp) return res.status(400).json({ error: "Invalid or expired OTP" });

  const user = await prisma.user.findUnique({ where: { mobile } });
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  await prisma.user.update({
    where: { mobile },
    data: { password: hashedPassword },
  });
  await prisma.otpCode.deleteMany({ where: { mobile } });

  res.json({ ok: true, message: "Password reset successfully" });
});

// Verify OTP -> create/login user, set password if provided, return JWT.
authRouter.post("/otp/verify", async (req: any, res: any) => {
  const schema = z.object({
    mobile: z.string().min(10),
    code: z.string().length(6),
    name: z.string().optional(),
    role: z.enum(["donor", "requester", "verifier", "admin"]).optional(),
    language: z.enum(["ta", "en"]).optional(),
    password: z.string().min(4).optional(),
  });
  const parse = schema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Invalid input" });
  const { code, name, role, language, password } = parse.data;
  const mobile = parse.data.mobile.replace(/\D/g, "").slice(-10);

  const otp = await prisma.otpCode.findFirst({
    where: { mobile, code, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!otp) return res.status(400).json({ error: "Invalid or expired OTP" });

  let user = await prisma.user.findUnique({ where: { mobile } });
  const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

  if (!user) {
    user = await prisma.user.create({
      data: {
        mobile,
        name: name || "UYIR User",
        role: role || "donor",
        language: language || "ta",
        password: hashedPassword,
      },
    });
  } else if (!user.password && hashedPassword) {
    user = await prisma.user.update({
      where: { mobile },
      data: { password: hashedPassword },
    });
  }
  await prisma.otpCode.deleteMany({ where: { mobile } });

  const token = signToken(user.id, user.role);
  res.json({ token, user });
});

// Hospital self-registration
authRouter.post("/hospital/register", async (req: any, res: any) => {
  const schema = z.object({
    hospitalName: z.string().min(2),
    hospitalRegistrationId: z.string().min(2),
    district: z.string().min(2),
    address: z.string().optional(),
    phone: z.string().min(10).optional(),
    contactPerson: z.string().min(2),
    contactMobile: z.string().min(10),
    password: z.string().min(4),
  });
  const parse = schema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Invalid input" });
  const { hospitalName, hospitalRegistrationId, district, address, phone, contactPerson, contactMobile, password } = parse.data;

  // Check if hospital already exists
  const existingHospital = await prisma.hospital.findFirst({
    where: {
      OR: [
        { name: { equals: hospitalName, mode: "insensitive" } },
      ],
    },
  });

  if (existingHospital) {
    return res.status(400).json({ error: "Hospital with this name already exists" });
  }

  // Check if hospital approver already exists with this registration ID
  const existingApprover = await prisma.user.findFirst({
    where: {
      hospitalRegistrationId,
      role: "hospital_approver",
    },
  });

  if (existingApprover) {
    return res.status(400).json({ error: "Hospital approver with this registration ID already exists" });
  }

  // Get district coordinates
  const { TN_DISTRICTS } = await import("../lib/districts.js");
  const districtCoords = TN_DISTRICTS[district];

  // Create hospital
  const hospital = await prisma.hospital.create({
    data: {
      name: hospitalName,
      district,
      address,
      phone,
      lat: districtCoords?.lat,
      lng: districtCoords?.lng,
      verified: false, // Requires admin verification
    },
  });

  // Create hospital approver user
  const bcrypt = (await import("bcryptjs")).default;
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name: contactPerson,
      mobile: contactMobile.replace(/\D/g, "").slice(-10),
      role: "hospital_approver",
      hospitalName,
      hospitalRegistrationId,
      hospitalId: hospital.id,
      password: hashedPassword,
      verified: true,
    },
    include: { hospital: true },
  });

  const token = signToken(user.id, user.role);
  res.json({ token, user, hospital });
});

// Hospital approver login using hospital name and registration ID
authRouter.post("/hospital/login", async (req: any, res: any) => {
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
