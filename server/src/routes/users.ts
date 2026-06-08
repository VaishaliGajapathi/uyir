import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth, AuthedRequest } from "../middleware/auth.js";

export const usersRouter = Router();

usersRouter.get("/me", requireAuth, async (req: AuthedRequest, res: any) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    include: { badges: true },
  });
  if (!user) return res.status(404).json({ error: "Not found" });
  res.json(user);
});

usersRouter.patch("/me", requireAuth, async (req: AuthedRequest, res: any) => {
  const allowed = [
    "name", "language", "district", "taluk", "bloodGroup", "gender",
    "isPlateletDonor", "nightEmergency", "shareLocation", "role",
    "notificationsEnabled", "voiceEnabled", "locationEnabled", "pincode",
  ];
  const data: Record<string, any> = {};
  for (const k of allowed) if (k in req.body) data[k] = req.body[k];
  if ("lastDonationDate" in req.body && req.body.lastDonationDate) {
    data.lastDonationDate = new Date(req.body.lastDonationDate);
  }
  if ("dob" in req.body && req.body.dob) data.dob = new Date(req.body.dob);
  const user = await prisma.user.update({ where: { id: req.userId }, data });
  res.json(user);
});

// Update live location (opt-in donors only).
usersRouter.post("/me/location", requireAuth, async (req: AuthedRequest, res: any) => {
  const { lat, lng, district, taluk, pincode } = req.body;
  if (typeof lat !== "number" || typeof lng !== "number") {
    return res.status(400).json({ error: "lat/lng required" });
  }
  const data: Record<string, any> = { lat, lng, shareLocation: true, locationEnabled: true };
  if (typeof district === "string" && district.trim()) data.district = district.trim();
  if (typeof taluk === "string" && taluk.trim()) data.taluk = taluk.trim();
  if (typeof pincode === "string" && pincode.trim()) data.pincode = pincode.trim();
  const user = await prisma.user.update({
    where: { id: req.userId },
    data,
  });
  res.json({ ok: true, lat: user.lat, lng: user.lng, district: user.district, taluk: user.taluk, pincode: user.pincode });
});

usersRouter.post("/me/fcm-token", requireAuth, async (req: AuthedRequest, res: any) => {
  await prisma.user.update({ where: { id: req.userId }, data: { fcmToken: req.body.token } });
  res.json({ ok: true });
});

// Get donor documents
usersRouter.get("/me/documents", requireAuth, async (req: AuthedRequest, res: any) => {
  const documents = await prisma.donorDocument.findMany({
    where: { donorId: req.userId },
    orderBy: { uploadedAt: "desc" },
  });
  res.json(documents);
});

// Upload donor document
usersRouter.post("/me/documents", requireAuth, async (req: AuthedRequest, res: any) => {
  const { documentType, fileUrl, documentNumber } = req.body as {
    documentType: "aadhar" | "driving_license" | "passport";
    fileUrl: string;
    documentNumber?: string;
  };

  if (!documentType || !fileUrl) {
    return res.status(400).json({ error: "documentType and fileUrl required" });
  }

  const validTypes = ["aadhar", "driving_license", "passport"];
  if (!validTypes.includes(documentType)) {
    return res.status(400).json({ error: "Invalid document type" });
  }

  if (!req.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const document = await prisma.donorDocument.create({
    data: {
      donorId: req.userId,
      documentType,
      fileUrl,
      documentNumber,
    },
  });

  res.status(201).json(document);
});

// Delete donor document
usersRouter.delete("/me/documents/:id", requireAuth, async (req: AuthedRequest, res: any) => {
  const document = await prisma.donorDocument.findUnique({
    where: { id: req.params.id },
  });

  if (!document) {
    return res.status(404).json({ error: "Document not found" });
  }

  if (document.donorId !== req.userId) {
    return res.status(403).json({ error: "Not your document" });
  }

  await prisma.donorDocument.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});
