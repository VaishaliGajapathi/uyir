import { Router } from "express";
import { z } from "zod";
import { queryOne, exec } from "../db.js";
import { signToken } from "../middleware/auth.js";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { logAudit, AuditActions } from "../lib/audit.js";

import { verifyAccessToken } from "../lib/msg91.js";

export const authRouter = Router();

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many OTP requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "Too many login attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

function asyncHandler(fn: (req: any, res: any) => Promise<any>) {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res)).catch(next);
  };
}

// Verifies an OTP for a given mobile. OTP send/verify is handled client-side by
// the production MSG91 OTP Widget, which returns a signed access token. We
// validate that token here against MSG91 — there is no demo/test bypass.
async function verifyOtpForMobile(mobile: string, accessToken?: string): Promise<boolean> {
  if (!accessToken) return false;
  const result = await verifyAccessToken(accessToken);
  if (!result.ok) return false;
  // If MSG91 returns the verified identifier, ensure it matches the mobile.
  if (result.mobile && result.mobile !== mobile) {
    console.warn(`[otp] access token mobile mismatch: token=${result.mobile} req=${mobile}`);
    return false;
  }
  return true;
}

authRouter.post("/otp/request", otpLimiter, asyncHandler(async (req: any, res: any) => {
  const schema = z.object({ mobile: z.string().min(10).max(15), name: z.string().optional() });
  const parse = schema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Invalid mobile" });
  const mobile = parse.data.mobile.replace(/\D/g, "").slice(-10);

  const existingUser = await queryOne<any>('SELECT * FROM "User" WHERE "mobile" = $1 LIMIT 1', [mobile]);
  if (existingUser && existingUser.password) {
    return res.json({ ok: true, exists: true, hasPassword: true, message: "User already exists with password" });
  }
  if (existingUser && !existingUser.password) {
    return res.json({ ok: true, exists: true, hasPassword: false, user: existingUser, message: "User exists, set password" });
  }

  // OTP is sent client-side via the MSG91 OTP Widget. Nothing to do here
  // except confirm the number is available for signup.
  res.json({ ok: true, exists: false, user: null });
}));

authRouter.post("/login", loginLimiter, asyncHandler(async (req: any, res: any) => {
  const schema = z.object({ mobile: z.string().min(10).max(15), password: z.string().min(4) });
  const parse = schema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Invalid input" });
  const mobile = parse.data.mobile.replace(/\D/g, "").slice(-10);
  const password = parse.data.password;

  const user = await queryOne<any>('SELECT * FROM "User" WHERE "mobile" = $1 LIMIT 1', [mobile]);
  if (!user) return res.status(404).json({ error: "User not found. Please sign up first." });
  if (!user.password) return res.status(400).json({ error: "Please set up your password first using OTP verification." });

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) return res.status(401).json({ error: "Invalid password. Use 'Forgot password' to reset." });

  const token = signToken(user.id, user.role);
  await logAudit({
    userId: user.id,
    action: AuditActions.USER_LOGIN,
    entityType: "User",
    entityId: user.id,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });
  res.json({ token, user });
}));

authRouter.post("/forgot-password", otpLimiter, asyncHandler(async (req: any, res: any) => {
  const schema = z.object({ mobile: z.string().min(10).max(15) });
  const parse = schema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Invalid mobile" });
  const mobile = parse.data.mobile.replace(/\D/g, "").slice(-10);

  const user = await queryOne<any>('SELECT * FROM "User" WHERE "mobile" = $1 LIMIT 1', [mobile]);
  if (!user) return res.status(404).json({ error: "User not found. Please sign up first." });

  // OTP is sent client-side via the MSG91 OTP Widget. We only confirm the
  // user exists so the client can proceed with widget verification.
  res.json({ ok: true, message: "Proceed with OTP verification" });
}));

authRouter.post("/reset-password", otpLimiter, asyncHandler(async (req: any, res: any) => {
  const schema = z.object({ mobile: z.string().min(10), accessToken: z.string(), password: z.string().min(4) });
  const parse = schema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Invalid input" });
  const { accessToken, password } = parse.data;
  const mobile = parse.data.mobile.replace(/\D/g, "").slice(-10);

  const verified = await verifyOtpForMobile(mobile, accessToken);
  if (!verified) return res.status(400).json({ error: "Invalid or expired OTP" });

  const user = await queryOne<any>('SELECT * FROM "User" WHERE "mobile" = $1 LIMIT 1', [mobile]);
  if (!user) return res.status(404).json({ error: "User not found" });

  const hashedPassword = await bcrypt.hash(password, 10);
  await exec('UPDATE "User" SET "password" = $1 WHERE "mobile" = $2', [hashedPassword, mobile]);
  await logAudit({
    userId: user.id,
    action: AuditActions.PASSWORD_RESET,
    entityType: "User",
    entityId: user.id,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });
  res.json({ ok: true, message: "Password reset successfully" });
}));

authRouter.post("/otp/verify", otpLimiter, asyncHandler(async (req: any, res: any) => {
  const schema = z.object({
    mobile: z.string().min(10), accessToken: z.string(),
    name: z.string().optional(), role: z.enum(["donor","requester"]).optional(),
    language: z.enum(["ta","en"]).optional(), password: z.string().min(4).optional(),
    age: z.number().optional(), bloodGroup: z.string().optional(), district: z.string().optional(),
    gender: z.enum(["male","female"]).optional(), isPlateletDonor: z.boolean().optional(),
    lat: z.number().optional(), lng: z.number().optional(),
  });
  const parse = schema.safeParse(req.body);
  if (!parse.success) {
    console.log("[otp/verify] validation failed:", parse.error.flatten());
    return res.status(400).json({ error: "Invalid input", details: parse.error.flatten() });
  }
  const { accessToken, name, role, language, password, age, bloodGroup, district, gender, isPlateletDonor, lat, lng } = parse.data;
  const mobile = parse.data.mobile.replace(/\D/g, "").slice(-10);

  const verified = await verifyOtpForMobile(mobile, accessToken);
  if (!verified) {
    console.log(`[otp/verify] verification failed for ${mobile}`);
    return res.status(400).json({ error: "Invalid or expired OTP" });
  }

  let user = await queryOne<any>('SELECT * FROM "User" WHERE "mobile" = $1 LIMIT 1', [mobile]);
  const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

  if (!user) {
    const insertFields = ['"id"','"mobile"','"name"','"role"','"language"','"password"','"createdAt"'];
    const insertParams: any[] = [mobile, name || "UYIR User", role || "donor", language || "ta", hashedPassword];
    
    // Add donor details if provided
    if (age !== undefined) { insertFields.push('"age"'); insertParams.push(age); }
    if (bloodGroup) { insertFields.push('"bloodGroup"'); insertParams.push(bloodGroup); }
    if (district) { insertFields.push('"district"'); insertParams.push(district); }
    if (gender) { insertFields.push('"gender"'); insertParams.push(gender); }
    if (isPlateletDonor !== undefined) { insertFields.push('"isPlateletDonor"'); insertParams.push(isPlateletDonor); }
    if (lat !== undefined) { insertFields.push('"lat"'); insertParams.push(lat); }
    if (lng !== undefined) { insertFields.push('"lng"'); insertParams.push(lng); }
    
    const placeholders = insertParams.map((_, i) => '$' + (i + 1)).join(',');
    const sql = `INSERT INTO "User" (${insertFields.join(',')}) VALUES (gen_random_uuid(),${placeholders},NOW()) RETURNING *`;
    
    user = await queryOne<any>(sql, insertParams);
  } else if (!user.password && hashedPassword) {
    await exec('UPDATE "User" SET "password" = $1 WHERE "mobile" = $2', [hashedPassword, mobile]);
    user = await queryOne<any>('SELECT * FROM "User" WHERE "mobile" = $1 LIMIT 1', [mobile]);
  }

  const token = signToken(user!.id, user!.role);
  res.json({ token, user });
}));

authRouter.post("/hospital/register", asyncHandler(async (req: any, res: any) => {
  const schema = z.object({
    hospitalName: z.string().min(2), hospitalRegistrationId: z.string().min(2), district: z.string().min(2),
    address: z.string().optional(), phone: z.string().min(10).optional(),
    contactPerson: z.string().min(2), contactMobile: z.string().min(10), password: z.string().min(4),
  });
  const parse = schema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Invalid input" });
  const { hospitalName, hospitalRegistrationId, district, address, phone, contactPerson, contactMobile, password } = parse.data;

  const existingHospital = await queryOne<any>('SELECT * FROM "Hospital" WHERE LOWER("name") = LOWER($1) LIMIT 1', [hospitalName]);
  if (existingHospital) return res.status(400).json({ error: "Hospital with this name already exists" });

  const existingApprover = await queryOne<any>('SELECT * FROM "User" WHERE "hospitalRegistrationId" = $1 AND "role" = $2 LIMIT 1', [hospitalRegistrationId, "hospital"]);
  if (existingApprover) return res.status(400).json({ error: "Hospital approver with this registration ID already exists" });

  const { TN_DISTRICTS } = await import("../lib/districts.js");
  const districtData = Object.values(TN_DISTRICTS).find((d: any) => d.name === district);
  const lat = districtData?.lat ?? 11.0;
  const lng = districtData?.lng ?? 78.0;

  const hospital = await queryOne<any>(
    'INSERT INTO "Hospital" ("id","name","district","address","phone","lat","lng","verified","createdAt") VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,false,NOW()) RETURNING *',
    [hospitalName, district, address || null, phone || null, lat, lng]
  );

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await queryOne<any>(
    'INSERT INTO "User" ("id","name","mobile","password","role","district","hospitalName","hospitalRegistrationId","hospitalId","createdAt") VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,$8,NOW()) RETURNING *',
    [contactPerson, contactMobile.replace(/\D/g, "").slice(-10), hashedPassword, "hospital", district, hospitalName, hospitalRegistrationId, hospital.id]
  );

  const token = signToken(user.id, user.role);
  res.json({ token, user });
}));
