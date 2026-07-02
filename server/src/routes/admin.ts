import { Router, Request, Response, NextFunction } from "express";
import { query, queryOne, exec } from "../db.js";
import { requireAuth, requireAdminOrVolunteer, requireAdminOrNgo, requireSuperAdmin, AuthedRequest } from "../middleware/auth.js";
import { cacheGet, cacheDel } from "../lib/redis.js";

export const adminRouter = Router();
adminRouter.use(requireAuth);

const ADMIN_ROLES = ["administrator", "volunteer", "ngo", "blood_bank", "hospital", "super_admin"] as const;

function asyncHandler(fn: (req: AuthedRequest, res: Response, next: NextFunction) => Promise<any>) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      console.error("[admin] route error:", err.message || err);
      res.status(500).json({ error: err.message || "Internal server error" });
    });
  };
}

// Stats for dashboard overview
adminRouter.get("/stats", requireAdminOrNgo, asyncHandler(async (_req: AuthedRequest, res: Response) => {
  const users = await queryOne<any>('SELECT COUNT(*)::int as cnt FROM "User"');
  const donors = await queryOne<any>('SELECT COUNT(*)::int as cnt FROM "User" WHERE "role" = $1', ["donor"]);
  const requests = await queryOne<any>('SELECT COUNT(*)::int as cnt FROM "BloodRequest"');
  const pending = await queryOne<any>('SELECT COUNT(*)::int as cnt FROM "BloodRequest" WHERE "status" = $1', ["pending_verification"]);
  const active = await queryOne<any>('SELECT COUNT(*)::int as cnt FROM "BloodRequest" WHERE "status" NOT IN ($1,$2,$3)', ["closed", "rejected", "completed"]);
  const completed = await queryOne<any>('SELECT COUNT(*)::int as cnt FROM "DonorResponse" WHERE "status" = $1', ["completed"]);
  const reports = await queryOne<any>('SELECT COUNT(*)::int as cnt FROM "FraudReport"');
  const hospitals = await queryOne<any>('SELECT COUNT(*)::int as cnt FROM "Hospital"');
  const ngoUsers = await queryOne<any>('SELECT COUNT(*)::int as cnt FROM "User" WHERE "role" = $1', ["ngo"]);
  res.json({
    totalUsers: users?.cnt || 0,
    totalDonors: donors?.cnt || 0,
    totalRequests: requests?.cnt || 0,
    pendingVerifications: pending?.cnt || 0,
    activeRequests: active?.cnt || 0,
    completedDonations: completed?.cnt || 0,
    livesSaved: completed?.cnt || 0,
    fraudReports: reports?.cnt || 0,
    totalHospitals: hospitals?.cnt || 0,
    totalNgoAdmins: ngoUsers?.cnt || 0,
  });
}));

// Donors list
adminRouter.get("/donors", requireAdminOrVolunteer, asyncHandler(async (_req: AuthedRequest, res: Response) => {
  const donors = await query<any>('SELECT * FROM "User" WHERE "role" = $1 ORDER BY "createdAt" DESC', ["donor"]);
  res.json(donors);
}));

// All requests
adminRouter.get("/requests", requireAdminOrVolunteer, asyncHandler(async (_req: AuthedRequest, res: Response) => {
  const requests = await query<any>('SELECT * FROM "BloodRequest" ORDER BY "createdAt" DESC', []);
  res.json(requests);
}));

// Pending verification requests
adminRouter.get("/pending-verification", requireAdminOrVolunteer, asyncHandler(async (_req: AuthedRequest, res: Response) => {
  const requests = await query<any>('SELECT * FROM "BloodRequest" WHERE "status" = $1 ORDER BY "createdAt" DESC', ["pending_verification"]);
  res.json(requests);
}));

// Hospitals list
adminRouter.get("/hospitals", requireAdminOrVolunteer, asyncHandler(async (_req: AuthedRequest, res: Response) => {
  const hospitals = await query<any>('SELECT * FROM "Hospital" ORDER BY "createdAt" DESC', []);
  res.json(hospitals);
}));

// Create a hospital
adminRouter.post("/hospitals", requireSuperAdmin, asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { name, district, address, phone, registrationId } = req.body;
  if (!name || !district) return res.status(400).json({ error: "Hospital name and district are required" });
  const existing = await queryOne<any>('SELECT * FROM "Hospital" WHERE LOWER("name") = LOWER($1) LIMIT 1', [name]);
  if (existing) return res.status(400).json({ error: "Hospital with this name already exists" });
  const { TN_DISTRICTS } = await import("../lib/districts.js");
  const districtData = Object.values(TN_DISTRICTS).find((d: any) => d.name === district);
  const lat = districtData?.lat ?? 11.0;
  const lng = districtData?.lng ?? 78.0;
  const hospital = await queryOne<any>(
    'INSERT INTO "Hospital" ("id","name","district","address","phone","lat","lng","verified","createdAt") VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,true,NOW()) RETURNING *',
    [name, district, address || null, phone || null, lat, lng]
  );
  res.status(201).json(hospital);
}));

// Verify a hospital
adminRouter.post("/hospitals/:id/verify", requireAdminOrVolunteer, asyncHandler(async (req: AuthedRequest, res: Response) => {
  await exec('UPDATE "Hospital" SET "verified" = true, "verifiedById" = $1, "verifiedAt" = NOW() WHERE "id" = $2', [req.userId, req.params.id]);
  res.json({ ok: true });
}));

// Reject a hospital
adminRouter.post("/hospitals/:id/reject", requireAdminOrVolunteer, asyncHandler(async (req: AuthedRequest, res: Response) => {
  await exec('UPDATE "Hospital" SET "verified" = false WHERE "id" = $1', [req.params.id]);
  res.json({ ok: true });
}));

// Edit a hospital
adminRouter.patch("/hospitals/:id", requireSuperAdmin, asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { name, district, address, phone, registrationId } = req.body;
  const updates: string[] = [];
  const params: any[] = [];
  if (name) { updates.push(`"name" = $${params.length + 1}`); params.push(name); }
  if (district) { updates.push(`"district" = $${params.length + 1}`); params.push(district); }
  if (address !== undefined) { updates.push(`"address" = $${params.length + 1}`); params.push(address || null); }
  if (phone !== undefined) { updates.push(`"phone" = $${params.length + 1}`); params.push(phone || null); }
  if (registrationId !== undefined) { updates.push(`"hospitalRegistrationId" = $${params.length + 1}`); params.push(registrationId || null); }
  if (updates.length === 0) return res.status(400).json({ error: "No fields to update" });
  params.push(req.params.id);
  await exec(`UPDATE "Hospital" SET ${updates.join(", ")} WHERE "id" = $${params.length}`, params);
  const updated = await queryOne<any>('SELECT * FROM "Hospital" WHERE "id" = $1', [req.params.id]);
  res.json(updated);
}));

// Fraud reports
adminRouter.get("/fraud-reports", requireAdminOrVolunteer, asyncHandler(async (_req: AuthedRequest, res: Response) => {
  const reports = await query<any>('SELECT * FROM "FraudReport" ORDER BY "createdAt" DESC', []);
  res.json(reports);
}));

// Action a fraud report
adminRouter.post("/reports/:id/action", requireAdminOrVolunteer, asyncHandler(async (req: AuthedRequest, res: Response) => {
  await exec('UPDATE "FraudReport" SET "status" = $1 WHERE "id" = $2', ["actioned", req.params.id]);
  res.json({ ok: true });
}));

// Dismiss a fraud report
adminRouter.post("/reports/:id/dismiss", requireAdminOrVolunteer, asyncHandler(async (req: AuthedRequest, res: Response) => {
  await exec('UPDATE "FraudReport" SET "status" = $1 WHERE "id" = $2', ["dismissed", req.params.id]);
  res.json({ ok: true });
}));

// Verify (approve/reject) a blood request
// Get documents for a request (from Redis cache — temporary storage for admin verification)
adminRouter.get("/requests/:id/documents", requireAdminOrVolunteer, asyncHandler(async (req: AuthedRequest, res: Response) => {
  const docIds = await cacheGet<string[]>(`req-docs:${req.params.id}`);
  if (!docIds || docIds.length === 0) {
    return res.json({ documents: [] });
  }
  const documents = [];
  for (const docId of docIds) {
    const doc = await cacheGet<any>(`doc:${docId}`);
    if (doc) {
      documents.push({ id: docId, ...doc });
    }
  }
  res.json({ documents });
}));

// Verify a request — also auto-deletes cached documents after verification
adminRouter.post("/verify-request/:id", requireAdminOrNgo, asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { approved, notes } = req.body;
  const status = approved ? "verified" : "rejected";
  await exec('UPDATE "BloodRequest" SET "status" = $1, "verificationNotes" = $2, "verifiedAt" = NOW(), "verifiedById" = $3 WHERE "id" = $4', [status, notes || "", req.userId, req.params.id]);
  // Auto-delete cached documents after verification (no longer needed)
  const docIds = await cacheGet<string[]>(`req-docs:${req.params.id}`);
  if (docIds) {
    for (const docId of docIds) {
      await cacheDel(`doc:${docId}`);
    }
    await cacheDel(`req-docs:${req.params.id}`);
  }
  const updated = await queryOne<any>('SELECT * FROM "BloodRequest" WHERE "id" = $1 LIMIT 1', [req.params.id]);
  res.json(updated);
}));

// Admin users list
adminRouter.get("/admins", requireAdminOrVolunteer, asyncHandler(async (_req: AuthedRequest, res: Response) => {
  const admins = await query<any>('SELECT * FROM "User" WHERE "role" IN ($1,$2,$3,$4,$5,$6) ORDER BY "createdAt" DESC', ["administrator", "volunteer", "ngo", "blood_bank", "hospital", "super_admin"]);
  
  // Add activity statistics for NGO admins
  for (const admin of admins) {
    if (admin.role === "ngo") {
      const requestsProcessed = await queryOne<any>('SELECT COUNT(*)::int as cnt FROM "BloodRequest" WHERE "verifiedById" = $1', [admin.id]);
      const hospitalsVerified = await queryOne<any>('SELECT COUNT(*)::int as cnt FROM "Hospital" WHERE "verifiedById" = $1', [admin.id]);
      const donationsFacilitated = await queryOne<any>('SELECT COUNT(*)::int as cnt FROM "DonorResponse" dr JOIN "BloodRequest" br ON dr."requestId" = br.id WHERE br."verifiedById" = $1 AND dr."status" = $2', [admin.id, "completed"]);
      
      admin.requestsProcessed = requestsProcessed?.cnt || 0;
      admin.hospitalsVerified = hospitalsVerified?.cnt || 0;
      admin.donationsFacilitated = donationsFacilitated?.cnt || 0;
    }
  }
  
  res.json(admins);
}));

// Create admin user (SUPER ADMIN ONLY)
adminRouter.post("/admins", requireSuperAdmin, asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { name, mobile, email, role, password, district, ngoName, ngoId, designation, ngoAddress, ngoRegistrationNumber, ngoPhone, ngoEmail, hospitalId, hospitalName } = req.body;
  if (!name || !mobile || !role) return res.status(400).json({ error: "Missing fields" });
  if (!ADMIN_ROLES.includes(role)) return res.status(400).json({ error: "Invalid role" });
  if (role === "ngo" && (!district || !ngoName) && !ngoId) {
    return res.status(400).json({ error: "district and ngoName (or ngoId) are required for NGO admins" });
  }
  if (role === "hospital" && !hospitalId && !hospitalName) {
    return res.status(400).json({ error: "Hospital selection is required for hospital users" });
  }
  const bcrypt = await import("bcryptjs");
  const hashedPassword = password ? await bcrypt.hash(password, 10) : null;
  const sanitizedMobile = mobile.replace(/\D/g, "").slice(-10);
  const existingUser = await queryOne<any>('SELECT * FROM "User" WHERE "mobile" = $1 LIMIT 1', [sanitizedMobile]);
  if (existingUser) return res.status(400).json({ error: "User with this mobile already exists" });

  // If NGO role and ngoId provided, link to existing NGO
  let finalNgoId = ngoId || null;
  let finalNgoName = ngoName || null;
  let finalNgoStatus = null;
  if (role === "ngo" && ngoId) {
    const ngo = await queryOne<any>('SELECT * FROM "Ngo" WHERE "id" = $1 LIMIT 1', [ngoId]);
    if (!ngo) return res.status(400).json({ error: "NGO not found" });
    finalNgoName = ngo.name;
    finalNgoStatus = ngo.status;
  } else if (role === "ngo" && ngoName && !ngoId) {
    // Create new NGO record
    const newNgo = await queryOne<any>(
      'INSERT INTO "Ngo" ("name","address","registrationNumber","phone","email","district","status","createdAt") VALUES ($1,$2,$3,$4,$5,$6,$7,NOW()) RETURNING *',
      [ngoName, ngoAddress || null, ngoRegistrationNumber || null, ngoPhone || null, ngoEmail || null, district || null, "pending"]
    );
    finalNgoId = newNgo.id;
    finalNgoStatus = "pending";
  }

  // Resolve hospital info
  let finalHospitalId = hospitalId || null;
  let finalHospitalName = hospitalName || null;
  if (role === "hospital" && hospitalId) {
    const hospital = await queryOne<any>('SELECT * FROM "Hospital" WHERE "id" = $1 LIMIT 1', [hospitalId]);
    if (!hospital) return res.status(400).json({ error: "Hospital not found" });
    finalHospitalName = hospital.name;
  }

  const user = await queryOne<any>(
    'INSERT INTO "User" ("id","name","mobile","email","password","plainPassword","role","language","verified","district","ngoId","ngoName","designation","ngoAddress","ngoRegistrationNumber","ngoPhone","ngoEmail","ngoStatus","hospitalId","hospitalName","hospitalRegistrationId","createdAt") VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,true,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,NOW()) RETURNING *',
    [name, sanitizedMobile, email || null, hashedPassword, password || null, role, "ta", role === "ngo" || role === "hospital" ? district : null, finalNgoId, role === "ngo" ? finalNgoName : null, designation || null, role === "ngo" ? ngoAddress || null : null, role === "ngo" ? ngoRegistrationNumber || null : null, role === "ngo" ? ngoPhone || null : null, role === "ngo" ? ngoEmail || null : null, role === "ngo" ? finalNgoStatus : null, finalHospitalId, role === "hospital" ? finalHospitalName : null, role === "hospital" ? finalHospitalName : null]
  );
  res.status(201).json(user);
}));

// Close a request
adminRouter.post("/requests/:id/close", requireAdminOrNgo, asyncHandler(async (req: AuthedRequest, res: Response) => {
  await exec('UPDATE "BloodRequest" SET "status" = $1, "closedAt" = NOW() WHERE "id" = $2', ["closed", req.params.id]);
  const updated = await queryOne<any>('SELECT * FROM "BloodRequest" WHERE "id" = $1 LIMIT 1', [req.params.id]);
  res.json(updated);
}));

// Reject a request
adminRouter.post("/requests/:id/reject", requireAdminOrNgo, asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { notes } = req.body;
  await exec('UPDATE "BloodRequest" SET "status" = $1, "verificationNotes" = $2, "verifiedAt" = NOW() WHERE "id" = $3', ["rejected", notes || "", req.params.id]);
  const updated = await queryOne<any>('SELECT * FROM "BloodRequest" WHERE "id" = $1 LIMIT 1', [req.params.id]);
  res.json(updated);
}));

// Approve NGO
adminRouter.post("/ngos/:id/approve", requireAdminOrVolunteer, asyncHandler(async (req: AuthedRequest, res: Response) => {
  // Approve NGO organization and all its users
  await exec('UPDATE "Ngo" SET "status" = $1 WHERE "id" = $2', ["approved", req.params.id]);
  await exec('UPDATE "User" SET "ngoStatus" = $1 WHERE "ngoId" = $2', ["approved", req.params.id]);
  const updated = await queryOne<any>('SELECT * FROM "Ngo" WHERE "id" = $1 LIMIT 1', [req.params.id]);
  res.json(updated);
}));

// Reject NGO
adminRouter.post("/ngos/:id/reject", requireAdminOrVolunteer, asyncHandler(async (req: AuthedRequest, res: Response) => {
  await exec('UPDATE "Ngo" SET "status" = $1 WHERE "id" = $2', ["rejected", req.params.id]);
  await exec('UPDATE "User" SET "ngoStatus" = $1 WHERE "ngoId" = $2', ["rejected", req.params.id]);
  const updated = await queryOne<any>('SELECT * FROM "Ngo" WHERE "id" = $1 LIMIT 1', [req.params.id]);
  res.json(updated);
}));

// Ban a user
adminRouter.post("/ban-user/:id", requireAdminOrVolunteer, asyncHandler(async (req: AuthedRequest, res: Response) => {
  await exec('UPDATE "User" SET "reputationScore" = -1000, "banned" = true WHERE "id" = $1', [req.params.id]);
  const updated = await queryOne<any>('SELECT * FROM "User" WHERE "id" = $1 LIMIT 1', [req.params.id]);
  res.json(updated);
}));

// Legacy dashboard endpoint (kept for compatibility)
adminRouter.get("/dashboard", requireAdminOrNgo, asyncHandler(async (_req: AuthedRequest, res: Response) => {
  const users = await queryOne<any>('SELECT COUNT(*)::int as cnt FROM "User"');
  const requests = await queryOne<any>('SELECT COUNT(*)::int as cnt FROM "BloodRequest"');
  const completed = await queryOne<any>('SELECT COUNT(*)::int as cnt FROM "DonorResponse" WHERE "status" = $1', ["completed"]);
  res.json({ totalUsers: users?.cnt || 0, totalRequests: requests?.cnt || 0, completedDonations: completed?.cnt || 0 });
}));

// SUPER ADMIN ONLY: Delete a user
adminRouter.delete("/users/:id", requireSuperAdmin, asyncHandler(async (req: AuthedRequest, res: Response) => {
  const user = await queryOne<any>('SELECT * FROM "User" WHERE "id" = $1 LIMIT 1', [req.params.id]);
  if (!user) return res.status(404).json({ error: "User not found" });
  await exec('DELETE FROM "User" WHERE "id" = $1', [req.params.id]);
  res.json({ ok: true, deletedId: req.params.id });
}));

// SUPER ADMIN ONLY: Deactivate a user
adminRouter.post("/users/:id/deactivate", requireSuperAdmin, asyncHandler(async (req: AuthedRequest, res: Response) => {
  const user = await queryOne<any>('SELECT * FROM "User" WHERE "id" = $1 LIMIT 1', [req.params.id]);
  if (!user) return res.status(404).json({ error: "User not found" });
  await exec('UPDATE "User" SET "verified" = false WHERE "id" = $1', [req.params.id]);
  const updated = await queryOne<any>('SELECT * FROM "User" WHERE "id" = $1 LIMIT 1', [req.params.id]);
  res.json(updated);
}));

// SUPER ADMIN ONLY: Freeze a user (set banned = true)
adminRouter.post("/users/:id/freeze", requireSuperAdmin, asyncHandler(async (req: AuthedRequest, res: Response) => {
  const user = await queryOne<any>('SELECT * FROM "User" WHERE "id" = $1 LIMIT 1', [req.params.id]);
  if (!user) return res.status(404).json({ error: "User not found" });
  await exec('UPDATE "User" SET "banned" = true WHERE "id" = $1', [req.params.id]);
  const updated = await queryOne<any>('SELECT * FROM "User" WHERE "id" = $1 LIMIT 1', [req.params.id]);
  res.json(updated);
}));

// SUPER ADMIN ONLY: Delete a hospital
adminRouter.delete("/hospitals/:id", requireSuperAdmin, asyncHandler(async (req: AuthedRequest, res: Response) => {
  const hospital = await queryOne<any>('SELECT * FROM "Hospital" WHERE "id" = $1 LIMIT 1', [req.params.id]);
  if (!hospital) return res.status(404).json({ error: "Hospital not found" });
  await exec('DELETE FROM "Hospital" WHERE "id" = $1', [req.params.id]);
  res.json({ ok: true, deletedId: req.params.id });
}));

// SUPER ADMIN ONLY: Deactivate a hospital
adminRouter.post("/hospitals/:id/deactivate", requireSuperAdmin, asyncHandler(async (req: AuthedRequest, res: Response) => {
  const hospital = await queryOne<any>('SELECT * FROM "Hospital" WHERE "id" = $1 LIMIT 1', [req.params.id]);
  if (!hospital) return res.status(404).json({ error: "Hospital not found" });
  await exec('UPDATE "Hospital" SET "verified" = false WHERE "id" = $1', [req.params.id]);
  const updated = await queryOne<any>('SELECT * FROM "Hospital" WHERE "id" = $1 LIMIT 1', [req.params.id]);
  res.json(updated);
}));

// SUPER ADMIN ONLY: Freeze a hospital
adminRouter.post("/hospitals/:id/freeze", requireSuperAdmin, asyncHandler(async (req: AuthedRequest, res: Response) => {
  const hospital = await queryOne<any>('SELECT * FROM "Hospital" WHERE "id" = $1 LIMIT 1', [req.params.id]);
  if (!hospital) return res.status(404).json({ error: "Hospital not found" });
  await exec('UPDATE "Hospital" SET "verified" = false, "active" = false WHERE "id" = $1', [req.params.id]);
  const updated = await queryOne<any>('SELECT * FROM "Hospital" WHERE "id" = $1 LIMIT 1', [req.params.id]);
  res.json(updated);
}));

// SUPER ADMIN ONLY: Delete an admin user
adminRouter.delete("/admins/:id", requireSuperAdmin, asyncHandler(async (req: AuthedRequest, res: Response) => {
  const admin = await queryOne<any>('SELECT * FROM "User" WHERE "id" = $1 AND "role" IN ($2,$3,$4,$5,$6,$7) LIMIT 1', [req.params.id, "administrator", "volunteer", "ngo", "blood_bank", "hospital", "super_admin"]);
  if (!admin) return res.status(404).json({ error: "Admin user not found" });
  await exec('DELETE FROM "User" WHERE "id" = $1', [req.params.id]);
  res.json({ ok: true, deletedId: req.params.id });
}));

// SUPER ADMIN ONLY: Update admin user profile
adminRouter.patch("/admins/:id", requireSuperAdmin, asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { name, email, designation, district } = req.body;
  const admin = await queryOne<any>('SELECT * FROM "User" WHERE "id" = $1 AND "role" IN ($2,$3,$4,$5,$6,$7) LIMIT 1', [req.params.id, "administrator", "volunteer", "ngo", "blood_bank", "hospital", "super_admin"]);
  if (!admin) return res.status(404).json({ error: "Admin user not found" });
  
  const updates: string[] = [];
  const params: any[] = [];
  
  if (name !== undefined) { updates.push(`"name" = $${params.length + 1}`); params.push(name); }
  if (email !== undefined) { updates.push(`"email" = $${params.length + 1}`); params.push(email); }
  if (designation !== undefined) { updates.push(`"designation" = $${params.length + 1}`); params.push(designation); }
  if (district !== undefined) { updates.push(`"district" = $${params.length + 1}`); params.push(district); }
  
  if (updates.length === 0) return res.status(400).json({ error: "No fields to update" });
  
  params.push(req.params.id);
  await exec(`UPDATE "User" SET ${updates.join(", ")} WHERE "id" = $${params.length}`, params);
  
  const updated = await queryOne<any>('SELECT * FROM "User" WHERE "id" = $1 LIMIT 1', [req.params.id]);
  res.json(updated);
}));

// SUPER ADMIN ONLY: Deactivate an admin user
adminRouter.post("/admins/:id/deactivate", requireSuperAdmin, asyncHandler(async (req: AuthedRequest, res: Response) => {
  const admin = await queryOne<any>('SELECT * FROM "User" WHERE "id" = $1 AND "role" IN ($2,$3,$4,$5,$6,$7) LIMIT 1', [req.params.id, "administrator", "volunteer", "ngo", "blood_bank", "hospital", "super_admin"]);
  if (!admin) return res.status(404).json({ error: "Admin user not found" });
  await exec('UPDATE "User" SET "verified" = false WHERE "id" = $1', [req.params.id]);
  const updated = await queryOne<any>('SELECT * FROM "User" WHERE "id" = $1 LIMIT 1', [req.params.id]);
  res.json(updated);
}));

// SUPER ADMIN ONLY: Freeze an admin user
adminRouter.post("/admins/:id/freeze", requireSuperAdmin, asyncHandler(async (req: AuthedRequest, res: Response) => {
  const admin = await queryOne<any>('SELECT * FROM "User" WHERE "id" = $1 AND "role" IN ($2,$3,$4,$5,$6,$7) LIMIT 1', [req.params.id, "administrator", "volunteer", "ngo", "blood_bank", "hospital", "super_admin"]);
  if (!admin) return res.status(404).json({ error: "Admin user not found" });
  await exec('UPDATE "User" SET "banned" = true WHERE "id" = $1', [req.params.id]);
  const updated = await queryOne<any>('SELECT * FROM "User" WHERE "id" = $1 LIMIT 1', [req.params.id]);
  res.json(updated);
}));

// SUPER ADMIN ONLY: Reset any user's password
adminRouter.post("/admins/:id/reset-password", requireSuperAdmin, asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: "Password is required" });
  const admin = await queryOne<any>('SELECT * FROM "User" WHERE "id" = $1 LIMIT 1', [req.params.id]);
  if (!admin) return res.status(404).json({ error: "User not found" });
  const bcrypt = await import("bcryptjs");
  const hashedPassword = await bcrypt.hash(password, 10);
  await exec('UPDATE "User" SET "password" = $1, "plainPassword" = $2 WHERE "id" = $3', [hashedPassword, password, req.params.id]);
  res.json({ ok: true });
}));

// SUPER ADMIN ONLY: View any user's password
adminRouter.get("/admins/:id/password", requireSuperAdmin, asyncHandler(async (req: AuthedRequest, res: Response) => {
  const admin = await queryOne<any>('SELECT "plainPassword" FROM "User" WHERE "id" = $1 LIMIT 1', [req.params.id]);
  if (!admin) return res.status(404).json({ error: "User not found" });
  res.json({ password: admin.plainPassword || "Password not available (created before this feature)" });
}));

// Any authenticated user: change own password
adminRouter.post("/change-password", requireAuth, asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: "Current password and new password are required" });
  const user = await queryOne<any>('SELECT "password" FROM "User" WHERE "id" = $1 LIMIT 1', [req.userId]);
  if (!user || !user.password) return res.status(400).json({ error: "No password set" });
  const bcrypt = await import("bcryptjs");
  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) return res.status(400).json({ error: "Current password is incorrect" });
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await exec('UPDATE "User" SET "password" = $1, "plainPassword" = $2 WHERE "id" = $3', [hashedPassword, newPassword, req.userId]);
  res.json({ ok: true });
}));

// Get all NGOs (for parent-child selection)
adminRouter.get("/ngos", requireAdminOrVolunteer, asyncHandler(async (_req: AuthedRequest, res: Response) => {
  const ngos = await query<any>('SELECT * FROM "Ngo" ORDER BY "createdAt" DESC');
  res.json(ngos);
}));

// Create an NGO
adminRouter.post("/ngos", requireSuperAdmin, asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { name, address, registrationNumber, registrationYear, phone, email, district, contactName, description, website } = req.body;
  if (!name || !district) return res.status(400).json({ error: "NGO name and district are required" });
  const existing = await queryOne<any>('SELECT * FROM "Ngo" WHERE LOWER("name") = LOWER($1) LIMIT 1', [name]);
  if (existing) return res.status(400).json({ error: "NGO with this name already exists" });
  const ngo = await queryOne<any>(
    'INSERT INTO "Ngo" ("name","address","registrationNumber","registrationYear","phone","email","district","contactName","description","website","status","createdAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW()) RETURNING *',
    [name, address || null, registrationNumber || null, registrationYear || null, phone || null, email || null, district, contactName || null, description || null, website || null, "approved"]
  );
  res.status(201).json(ngo);
}));

// ============ CRM ENDPOINTS ============

// Activity timeline (recent audit logs)
adminRouter.get("/activity", requireAdminOrVolunteer, asyncHandler(async (req: AuthedRequest, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
  const logs = await query<any>(
    `SELECT a.*, u."name" as "userName", u."role" as "userRole"
     FROM "AuditLog" a
     LEFT JOIN "User" u ON a."userId" = u."id"
     ORDER BY a."createdAt" DESC
     LIMIT $1`,
    [limit]
  );
  res.json(logs);
}));

// User activity timeline (for a specific user)
adminRouter.get("/users/:id/activity", requireAdminOrVolunteer, asyncHandler(async (req: AuthedRequest, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 30, 100);
  const logs = await query<any>(
    `SELECT a.*, u."name" as "userName", u."role" as "userRole"
     FROM "AuditLog" a
     LEFT JOIN "User" u ON a."userId" = u."id"
     WHERE a."userId" = $1
     ORDER BY a."createdAt" DESC
     LIMIT $2`,
    [req.params.id, limit]
  );
  res.json(logs);
}));

// Donor search with filters and sorting
adminRouter.get("/donors/search", requireAdminOrVolunteer, asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { q, bloodGroup, district, sortBy, sortOrder, minDonations, maxDonations } = req.query;
  let sql = `SELECT * FROM "User" WHERE "role" = 'donor'`;
  const params: any[] = [];
  let idx = 1;

  if (q) {
    sql += ` AND ("name" ILIKE $${idx} OR "mobile" ILIKE $${idx})`;
    params.push(`%${q}%`);
    idx++;
  }
  if (bloodGroup) {
    sql += ` AND "bloodGroup" = $${idx}`;
    params.push(bloodGroup);
    idx++;
  }
  if (district) {
    sql += ` AND "district" = $${idx}`;
    params.push(district);
    idx++;
  }
  if (minDonations) {
    sql += ` AND "donationCount" >= $${idx}`;
    params.push(parseInt(minDonations as string));
    idx++;
  }
  if (maxDonations) {
    sql += ` AND "donationCount" <= $${idx}`;
    params.push(parseInt(maxDonations as string));
    idx++;
  }

  const validSortFields = ["createdAt", "name", "donationCount", "reputationScore", "lastDonationDate"];
  const sortField = validSortFields.includes(sortBy as string) ? `"${sortBy}"` : '"createdAt"';
  const sortDir = sortOrder === "asc" ? "ASC" : "DESC";
  sql += ` ORDER BY ${sortField} ${sortDir}`;

  const donors = await query<any>(sql, params);
  res.json(donors);
}));

// Blood inventory (aggregate by blood group)
adminRouter.get("/blood-inventory", requireAdminOrVolunteer, asyncHandler(async (_req: AuthedRequest, res: Response) => {
  const byGroup = await query<any>(
    `SELECT "bloodGroup", COUNT(*)::int as "donorCount",
            COUNT(*) FILTER (WHERE "lastDonationDate" IS NULL OR "lastDonationDate" < NOW() - INTERVAL '90 days')::int as "eligibleDonors",
            COUNT(*) FILTER (WHERE "isPlateletDonor" = true)::int as "plateletDonors"
     FROM "User" WHERE "role" = 'donor' AND "verified" = true AND "banned" = false
     GROUP BY "bloodGroup" ORDER BY "bloodGroup"`
  );
  const byDistrict = await query<any>(
    `SELECT "district", COUNT(*)::int as "donorCount",
            COUNT(*) FILTER (WHERE "lastDonationDate" IS NULL OR "lastDonationDate" < NOW() - INTERVAL '90 days')::int as "eligibleDonors"
     FROM "User" WHERE "role" = 'donor' AND "verified" = true AND "banned" = false
     GROUP BY "district" ORDER BY "donorCount" DESC`
  );
  const totalDonors = byGroup.reduce((sum: number, g: any) => sum + g.donorCount, 0);
  const totalEligible = byGroup.reduce((sum: number, g: any) => sum + g.eligibleDonors, 0);
  res.json({ byGroup, byDistrict, totalDonors, totalEligible });
}));

// Request lifecycle / pipeline
adminRouter.get("/requests/pipeline", requireAdminOrVolunteer, asyncHandler(async (_req: AuthedRequest, res: Response) => {
  const byStatus = await query<any>(
    `SELECT "status", COUNT(*)::int as cnt,
            COUNT(*) FILTER (WHERE "emergencyLevel" = 'red')::int as "redCount",
            COUNT(*) FILTER (WHERE "emergencyLevel" = 'orange')::int as "orangeCount",
            COUNT(*) FILTER (WHERE "emergencyLevel" = 'green')::int as "greenCount"
     FROM "BloodRequest"
     GROUP BY "status" ORDER BY "status"`
  );
  const byBloodGroup = await query<any>(
    `SELECT "bloodGroup", COUNT(*)::int as cnt
     FROM "BloodRequest"
     GROUP BY "bloodGroup" ORDER BY "bloodGroup"`
  );
  const byDistrict = await query<any>(
    `SELECT "district", COUNT(*)::int as cnt
     FROM "BloodRequest"
     GROUP BY "district" ORDER BY cnt DESC`
  );
  const fulfillmentRate = await queryOne<any>(
    `SELECT
       COUNT(*)::int as "total",
       COUNT(*) FILTER (WHERE "status" = 'completed')::int as "completed",
       COUNT(*) FILTER (WHERE "status" = 'closed')::int as "closed",
       COUNT(*) FILTER (WHERE "status" = 'rejected')::int as "rejected"
     FROM "BloodRequest"`
  );
  res.json({ byStatus, byBloodGroup, byDistrict, fulfillmentRate });
}));

// Donor history (donation responses for a specific donor)
adminRouter.get("/donors/:id/history", requireAdminOrVolunteer, asyncHandler(async (req: AuthedRequest, res: Response) => {
  const history = await query<any>(
    `SELECT dr.*, br."patientName", br."bloodGroup", br."hospitalName", br."district", br."emergencyLevel"
     FROM "DonorResponse" dr
     JOIN "BloodRequest" br ON dr."requestId" = br."id"
     WHERE dr."donorId" = $1
     ORDER BY dr."createdAt" DESC`,
    [req.params.id]
  );
  res.json(history);
}));

// Role hierarchy
adminRouter.get("/role-hierarchy", requireAdminOrVolunteer, asyncHandler(async (_req: AuthedRequest, res: Response) => {
  const byRole = await query<any>(
    `SELECT "role", COUNT(*)::int as cnt,
            COUNT(*) FILTER (WHERE "verified" = true)::int as "activeCount",
            COUNT(*) FILTER (WHERE "banned" = true)::int as "bannedCount"
     FROM "User"
     WHERE "role" IN ('super_admin','administrator','volunteer','ngo','blood_bank','hospital','donor')
     GROUP BY "role" ORDER BY cnt DESC`
  );
  let ngoUsers: any[] = [];
  try {
    ngoUsers = await query<any>(
      `SELECT n."name" as "ngoName", n."district", n."status", COUNT(u."id")::int as "userCount"
       FROM "Ngo" n
       LEFT JOIN "User" u ON u."ngoId" = n."id"
       GROUP BY n."id", n."name", n."district", n."status"
       ORDER BY n."name"`
    );
  } catch { ngoUsers = []; }
  res.json({ byRole, ngoUsers });
}));

// Analytics dashboard
adminRouter.get("/analytics", requireAdminOrVolunteer, asyncHandler(async (_req: AuthedRequest, res: Response) => {
  const requestsOverTime = await query<any>(
    `SELECT DATE("createdAt") as date, COUNT(*)::int as cnt
     FROM "BloodRequest"
     WHERE "createdAt" > NOW() - INTERVAL '30 days'
     GROUP BY DATE("createdAt") ORDER BY date`
  );
  const donationsOverTime = await query<any>(
    `SELECT DATE("createdAt") as date, COUNT(*)::int as cnt
     FROM "DonorResponse"
     WHERE "createdAt" > NOW() - INTERVAL '30 days' AND "status" = 'completed'
     GROUP BY DATE("createdAt") ORDER BY date`
  );
  const topDonors = await query<any>(
    `SELECT "name", "mobile", "bloodGroup", "district", "donationCount", "livesSavedCount", "reputationScore"
     FROM "User" WHERE "role" = 'donor'
     ORDER BY "donationCount" DESC LIMIT 10`
  );
  const districtHeatmap = await query<any>(
    `SELECT "district", COUNT(*)::int as "requests",
            COUNT(*) FILTER (WHERE "status" NOT IN ('closed','rejected','completed'))::int as "active"
     FROM "BloodRequest"
     GROUP BY "district" ORDER BY "requests" DESC`
  );
  res.json({ requestsOverTime, donationsOverTime, topDonors, districtHeatmap });
}));
