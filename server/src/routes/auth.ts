import { Router } from "express";
import { z } from "zod";
import { query, queryOne, exec } from "../db.js";
import { signToken } from "../middleware/auth.js";
import bcrypt from "bcryptjs";

export const authRouter = Router();

authRouter.post("/otp/request", async (req: any, res: any) => {
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

  const code = "123456";
  await exec('INSERT INTO "OtpCode" ("id","mobile","code","expiresAt","createdAt") VALUES (gen_random_uuid(),$1,$2,$3,NOW())', [mobile, code, new Date(Date.now() + 5 * 60 * 1000)]);
  console.log(`[otp] Signup OTP for ${mobile}: ${code}`);
  res.json({ ok: true, devOtp: code, exists: false, user: null });
});

authRouter.post("/login", async (req: any, res: any) => {
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
  res.json({ token, user });
});

authRouter.post("/forgot-password", async (req: any, res: any) => {
  const schema = z.object({ mobile: z.string().min(10).max(15) });
  const parse = schema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Invalid mobile" });
  const mobile = parse.data.mobile.replace(/\D/g, "").slice(-10);

  const user = await queryOne<any>('SELECT * FROM "User" WHERE "mobile" = $1 LIMIT 1', [mobile]);
  if (!user) return res.status(404).json({ error: "User not found. Please sign up first." });

  const code = "123456";
  await exec('INSERT INTO "OtpCode" ("id","mobile","code","expiresAt","createdAt") VALUES (gen_random_uuid(),$1,$2,$3,NOW())', [mobile, code, new Date(Date.now() + 5 * 60 * 1000)]);
  console.log(`[otp] Forgot password OTP for ${mobile}: ${code}`);
  res.json({ ok: true, devOtp: code, message: "OTP sent for password reset" });
});

authRouter.post("/reset-password", async (req: any, res: any) => {
  const schema = z.object({ mobile: z.string().min(10), code: z.string().length(6), password: z.string().min(4) });
  const parse = schema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Invalid input" });
  const { code, password } = parse.data;
  const mobile = parse.data.mobile.replace(/\D/g, "").slice(-10);

  const otp = await queryOne<any>('SELECT * FROM "OtpCode" WHERE "mobile" = $1 AND "code" = $2 AND "expiresAt" > NOW() ORDER BY "createdAt" DESC LIMIT 1', [mobile, code]);
  if (!otp) return res.status(400).json({ error: "Invalid or expired OTP" });

  const user = await queryOne<any>('SELECT * FROM "User" WHERE "mobile" = $1 LIMIT 1', [mobile]);
  if (!user) return res.status(404).json({ error: "User not found" });

  const hashedPassword = await bcrypt.hash(password, 10);
  await exec('UPDATE "User" SET "password" = $1 WHERE "mobile" = $2', [hashedPassword, mobile]);
  await exec('DELETE FROM "OtpCode" WHERE "mobile" = $1', [mobile]);
  res.json({ ok: true, message: "Password reset successfully" });
});

authRouter.post("/otp/verify", async (req: any, res: any) => {
  const schema = z.object({
    mobile: z.string().min(10), code: z.string().length(6),
    name: z.string().optional(), role: z.enum(["donor","requester","verifier","admin"]).optional(),
    language: z.enum(["ta","en"]).optional(), password: z.string().min(4).optional(),
  });
  const parse = schema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Invalid input" });
  const { code, name, role, language, password } = parse.data;
  const mobile = parse.data.mobile.replace(/\D/g, "").slice(-10);

  const otp = await queryOne<any>('SELECT * FROM "OtpCode" WHERE "mobile" = $1 AND "code" = $2 AND "expiresAt" > NOW() ORDER BY "createdAt" DESC LIMIT 1', [mobile, code]);
  if (!otp) return res.status(400).json({ error: "Invalid or expired OTP" });

  let user = await queryOne<any>('SELECT * FROM "User" WHERE "mobile" = $1 LIMIT 1', [mobile]);
  const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

  if (!user) {
    user = await queryOne<any>(
      'INSERT INTO "User" ("id","mobile","name","role","language","password","createdAt") VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,NOW()) RETURNING *',
      [mobile, name || "UYIR User", role || "donor", language || "ta", hashedPassword]
    );
  } else if (!user.password && hashedPassword) {
    await exec('UPDATE "User" SET "password" = $1 WHERE "mobile" = $2', [hashedPassword, mobile]);
    user = await queryOne<any>('SELECT * FROM "User" WHERE "mobile" = $1 LIMIT 1', [mobile]);
  }
  await exec('DELETE FROM "OtpCode" WHERE "mobile" = $1', [mobile]);

  const token = signToken(user!.id, user!.role);
  res.json({ token, user });
});

authRouter.post("/hospital/register", async (req: any, res: any) => {
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

  const existingApprover = await queryOne<any>('SELECT * FROM "User" WHERE "hospitalRegistrationId" = $1 AND "role" = $2 LIMIT 1', [hospitalRegistrationId, "hospital_approver"]);
  if (existingApprover) return res.status(400).json({ error: "Hospital approver with this registration ID already exists" });

  const { TN_DISTRICTS } = await import("../lib/districts.js");
  const districtCoords = (TN_DISTRICTS as any)[district];

  const hospital = await queryOne<any>(
    'INSERT INTO "Hospital" ("id","name","district","address","phone","lat","lng","verified","createdAt") VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,false,NOW()) RETURNING *',
    [hospitalName, district, address || null, phone || null, districtCoords?.lat || null, districtCoords?.lng || null]
  );

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await queryOne<any>(
    'INSERT INTO "User" ("id","name","mobile","role","hospitalName","hospitalRegistrationId","hospitalId","password","verified","createdAt") VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,true,NOW()) RETURNING *',
    [contactPerson, contactMobile.replace(/\D/g, "").slice(-10), "hospital_approver", hospitalName, hospitalRegistrationId, hospital!.id, hashedPassword]
  );

  const token = signToken(user!.id, user!.role);
  res.json({ token, user: { ...user, hospital }, hospital });
});

authRouter.post("/hospital/login", async (req: any, res: any) => {
  const schema = z.object({ hospitalName: z.string().min(2), hospitalRegistrationId: z.string().min(2), mobile: z.string().min(10).optional() });
  const parse = schema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Invalid input" });
  const { hospitalName, hospitalRegistrationId, mobile } = parse.data;

  const hospital = await queryOne<any>('SELECT * FROM "Hospital" WHERE LOWER("name") = LOWER($1) LIMIT 1', [hospitalName]);
  if (!hospital) return res.status(404).json({ error: "Hospital not found. Please contact UYIR admin to register your hospital." });

  let user = await queryOne<any>('SELECT * FROM "User" WHERE "hospitalRegistrationId" = $1 AND "role" = $2 LIMIT 1', [hospitalRegistrationId, "hospital_approver"]);

  if (!user) {
    user = await queryOne<any>(
      'INSERT INTO "User" ("id","name","mobile","role","hospitalName","hospitalRegistrationId","hospitalId","verified","createdAt") VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,true,NOW()) RETURNING *',
      [`${hospitalName} Approver`, mobile || "0000000000", "hospital_approver", hospitalName, hospitalRegistrationId, hospital.id]
    );
  } else if (user.hospitalId !== hospital.id) {
    await exec('UPDATE "User" SET "hospitalId" = $1 WHERE "id" = $2', [hospital.id, user.id]);
    user = await queryOne<any>('SELECT * FROM "User" WHERE "id" = $1 LIMIT 1', [user.id]);
  }

  const token = signToken(user!.id, user!.role);
  res.json({ token, user: { ...user, hospital } });
});
