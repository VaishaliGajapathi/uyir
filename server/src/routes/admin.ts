import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth, requireAdminOrHospitalApprover } from "../middleware/auth.js";

export const adminRouter = Router();

// Require admin role for all admin routes (except verification which allows hospital approver)
adminRouter.use(requireAuth);

// Get all donors with stats
adminRouter.get("/donors", async (req, res) => {
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
adminRouter.get("/requests", async (req, res) => {
  const requests = await prisma.bloodRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      documents: true,
      responses: { include: { donor: true } },
      hospital: true,
    },
  });
  res.json(requests);
});

// Get pending verification requests
adminRouter.get("/pending-verification", async (req, res) => {
  const pending = await prisma.bloodRequest.findMany({
    where: { status: "pending_verification" },
    orderBy: { createdAt: "asc" },
    include: { documents: true, hospital: true },
  });
  res.json(pending);
});

// Get fraud reports
adminRouter.get("/fraud-reports", async (req, res) => {
  const reports = await prisma.fraudReport.findMany({
    orderBy: { createdAt: "desc" },
    include: { againstUser: true },
  });
  res.json(reports);
});

// Get hospitals
adminRouter.get("/hospitals", async (req, res) => {
  const hospitals = await prisma.hospital.findMany({
    orderBy: { name: "asc" },
  });
  res.json(hospitals);
});

// Manual verification approval (for both admin and hospital approver)
adminRouter.post("/verify-request/:id", requireAdminOrHospitalApprover, async (req, res) => {
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

// Ban user
adminRouter.post("/ban-user/:id", async (req, res) => {
  const { id } = req.params;
  const user = await prisma.user.update({
    where: { id },
    data: { reputationScore: -1000 },
  });
  res.json(user);
});

// Get dashboard stats
adminRouter.get("/stats", async (req, res) => {
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
