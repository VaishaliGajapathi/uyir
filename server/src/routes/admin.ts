import { Router, Request, Response } from "express";
import { prisma } from "../db.js";
import { requireAuth, requireAdminOrHospitalApprover, requireAdminOrVerifier } from "../middleware/auth.js";
import { emitRequestUpdate } from "../services/alerts.js";

export const adminRouter = Router();

// Require admin role for all admin routes (except verification which allows hospital approver)
adminRouter.use(requireAuth);

// Get all donors with stats
adminRouter.get("/donors", requireAdminOrVerifier, async (req: Request, res: any) => {
  const donors = await prisma.user.findMany({
    where: { role: "donor" },
    orderBy: { createdAt: "desc" },
    include: {
      badges: true,
      _count: { select: { responses: true } },
    },
  });
  res.json(donors);
});

// Get all requests with details
adminRouter.get("/requests", requireAdminOrVerifier, async (req: Request, res: any) => {
  const requests = await prisma.bloodRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      documents: true,
      createdBy: {
        select: {
          id: true,
          name: true,
          mobile: true,
          district: true,
          taluk: true,
          pincode: true,
          lat: true,
          lng: true,
        },
      },
      responses: {
        include: {
          donor: {
            select: {
              id: true,
              name: true,
              mobile: true,
              district: true,
              taluk: true,
              pincode: true,
              lat: true,
              lng: true,
              bloodGroup: true,
            },
          },
        },
      },
      hospital: true,
    },
  });
  res.json(requests);
});

// Get pending verification requests
adminRouter.get("/pending-verification", requireAdminOrHospitalApprover, async (req: Request, res: any) => {
  const pending = await prisma.bloodRequest.findMany({
    where: { status: "pending_verification" },
    orderBy: { createdAt: "asc" },
    include: {
      documents: true,
      hospital: true,
      createdBy: {
        select: {
          id: true,
          name: true,
          mobile: true,
          district: true,
          taluk: true,
          pincode: true,
          lat: true,
          lng: true,
        },
      },
    },
  });
  res.json(pending);
});

// Get fraud reports
adminRouter.get("/fraud-reports", requireAdminOrVerifier, async (req: Request, res: any) => {
  const reports = await prisma.fraudReport.findMany({
    orderBy: { createdAt: "desc" },
    include: { againstUser: true },
  });
  res.json(reports);
});

// Get hospitals
adminRouter.get("/hospitals", requireAdminOrVerifier, async (req: Request, res: any) => {
  const hospitals = await prisma.hospital.findMany({
    orderBy: { name: "asc" },
  });
  res.json(hospitals);
});

// Manual verification approval (for both admin and hospital approver)
adminRouter.post("/verify-request/:id", requireAdminOrHospitalApprover, async (req: Request, res: any) => {
  const { id } = req.params;
  const { approved, notes } = req.body;
  const userId = (req as any).userId;

  // Get user to determine verification type
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ error: "User not found" });

  const verifiedByType = user.role === "hospital_approver" ? "hospital_approver" : "uyir_admin";

  const request = await prisma.bloodRequest.update({
    where: { id },
    data: {
      status: approved ? "verified" : "rejected",
      verificationNotes: notes,
      verificationScore: approved ? 100 : 0,
      verifiedBy: userId,
      verifiedByType,
      verifiedAt: new Date(),
    },
  });
  res.json(request);
});

adminRouter.post("/requests/:id/close", requireAdminOrVerifier, async (req: Request, res: any) => {
  const updated = await prisma.bloodRequest.update({
    where: { id: req.params.id },
    data: { status: "closed", closedAt: new Date() },
  });
  emitRequestUpdate(updated.id, { status: "closed" });
  res.json(updated);
});

adminRouter.post("/requests/:id/reject", requireAdminOrVerifier, async (req: Request, res: any) => {
  const notes = String(req.body?.notes || "Rejected by admin");
  const updated = await prisma.bloodRequest.update({
    where: { id: req.params.id },
    data: {
      status: "rejected",
      verificationNotes: notes,
      verificationScore: 0,
      verifiedAt: new Date(),
      verifiedBy: (req as any).userId,
      verifiedByType: "uyir_admin",
    },
  });
  emitRequestUpdate(updated.id, { status: "rejected" });
  res.json(updated);
});

// Ban user
adminRouter.post("/ban-user/:id", requireAdminOrVerifier, async (req: Request, res: any) => {
  const { id } = req.params;
  const user = await prisma.user.update({
    where: { id },
    data: { reputationScore: -1000 },
  });
  res.json(user);
});

// Get dashboard stats
adminRouter.get("/stats", requireAdminOrVerifier, async (req: Request, res: any) => {
  const [totalDonors, totalRequests, pendingVerifications, activeRequests, fraudReports, livesSaved] = await Promise.all([
    prisma.user.count({ where: { role: "donor" } }),
    prisma.bloodRequest.count(),
    prisma.bloodRequest.count({ where: { status: "pending_verification" } }),
    prisma.bloodRequest.count({ where: { status: { in: ["verified", "alert_sent", "donor_accepted"] } } }),
    prisma.fraudReport.count(),
    prisma.bloodRequest.count({ where: { status: "completed" } }),
  ]);
  res.json({ totalDonors, totalRequests, pendingVerifications, activeRequests, fraudReports, livesSaved });
});

// Get all admin users
adminRouter.get("/admins", requireAdminOrVerifier, async (req: Request, res: any) => {
  const admins = await prisma.user.findMany({
    where: { role: { in: ["admin", "verifier"] } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      mobile: true,
      role: true,
      createdAt: true,
    },
  });
  res.json(admins);
});

// Create new admin user (protected by admin role)
adminRouter.post("/admins", requireAdminOrVerifier, async (req: Request, res: any) => {
  const { name, mobile, role, password } = req.body;
  if (!name || !mobile || !role) {
    return res.status(400).json({ error: "Name, mobile, and role are required" });
  }
  if (!["admin", "verifier"].includes(role)) {
    return res.status(400).json({ error: "Role must be admin or verifier" });
  }

  const existingUser = await prisma.user.findUnique({ where: { mobile: mobile.replace(/\D/g, "").slice(-10) } });
  if (existingUser) {
    return res.status(400).json({ error: "User with this mobile already exists" });
  }

  const bcrypt = (await import("bcryptjs")).default;
  const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

  const admin = await prisma.user.create({
    data: {
      name,
      mobile: mobile.replace(/\D/g, "").slice(-10),
      role,
      password: hashedPassword,
      verified: true,
    },
  });

  res.json(admin);
});
