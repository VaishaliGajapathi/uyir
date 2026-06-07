import { Router, Request, Response } from "express";
import { prisma } from "../db.js";

export const impactRouter = Router();

// Headline stats for Home + Impact screens.
impactRouter.get("/stats", async (_req: Request, res: Response) => {
  const [activeRequests, livesSaved, donors, today] = await Promise.all([
    prisma.bloodRequest.count({ where: { status: { in: ["verified", "alert_sent", "donor_accepted"] } } }),
    prisma.donorResponse.count({ where: { status: "completed" } }),
    prisma.user.count({ where: { role: "donor" } }),
    prisma.bloodRequest.count({ where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
  ]);
  res.json({ activeRequests, livesSaved, donors, requestsToday: today });
});

// District heat-map: active request count per district.
impactRouter.get("/heatmap", async (_req: Request, res: Response) => {
  const rows = await prisma.bloodRequest.groupBy({
    by: ["district"],
    where: { status: { in: ["verified", "alert_sent", "donor_accepted"] } },
    _count: { _all: true },
  });
  res.json(rows.map((r) => ({ district: r.district, active: r._count._all })));
});

// Donor leaderboard.
impactRouter.get("/leaderboard", async (_req: Request, res: Response) => {
  const donors = await prisma.user.findMany({
    where: { role: "donor", donationCount: { gt: 0 } },
    orderBy: [{ donationCount: "desc" }, { reputationScore: "desc" }],
    take: 20,
    select: { id: true, name: true, district: true, bloodGroup: true, donationCount: true, reputationScore: true },
  });
  res.json(donors);
});
