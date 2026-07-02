import { Router, Response, NextFunction } from "express";
import { query, queryOne } from "../db.js";
import { requireAuth, requireAdminOrVolunteer, AuthedRequest } from "../middleware/auth.js";

export const analyticsRouter = Router();
analyticsRouter.use(requireAuth);

function asyncHandler(fn: (req: AuthedRequest, res: Response, next: NextFunction) => Promise<any>) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      console.error("[analytics] route error:", err.message || err);
      res.status(500).json({ error: err.message || "Internal server error" });
    });
  };
}

// Overview stats
analyticsRouter.get("/overview", requireAdminOrVolunteer, asyncHandler(async (_req: AuthedRequest, res: Response) => {
  const avgResponseTime = await queryOne<any>(`
    SELECT AVG(EXTRACT(EPOCH FROM (dr."acceptedAt" - dr."createdAt")) / 60) as avg_minutes
    FROM "DonorResponse" dr
    WHERE dr."acceptedAt" IS NOT NULL
  `);
  
  const acceptanceRate = await queryOne<any>(`
    SELECT 
      COUNT(*) FILTER (WHERE status = 'accepted')::float / NULLIF(COUNT(*), 0) * 100 as rate
    FROM "DonorResponse"
  `);
  
  const successfulDonations = await queryOne<any>(`
    SELECT COUNT(*)::int as cnt
    FROM "DonorResponse"
    WHERE status = 'completed'
  `);
  
  const expiredRequests = await queryOne<any>(`
    SELECT COUNT(*)::int as cnt
    FROM "BloodRequest"
    WHERE status = 'expired'
  `);
  
  const districtDemand = await query<any>(`
    SELECT district, COUNT(*)::int as request_count
    FROM "BloodRequest"
    WHERE "createdAt" >= NOW() - INTERVAL '30 days'
    GROUP BY district
    ORDER BY request_count DESC
    LIMIT 10
  `);
  
  const bloodGroupHeatmap = await query<any>(`
    SELECT "bloodGroup", COUNT(*)::int as request_count
    FROM "BloodRequest"
    WHERE "createdAt" >= NOW() - INTERVAL '30 days'
    GROUP BY "bloodGroup"
    ORDER BY request_count DESC
  `);
  
  const dailyRequests = await query<any>(`
    SELECT DATE("createdAt") as date, COUNT(*)::int as count
    FROM "BloodRequest"
    WHERE "createdAt" >= NOW() - INTERVAL '30 days'
    GROUP BY DATE("createdAt")
    ORDER BY date DESC
  `);
  
  const monthlyDonations = await query<any>(`
    SELECT DATE_TRUNC('month', "completedAt") as month, COUNT(*)::int as count
    FROM "DonorResponse"
    WHERE "completedAt" IS NOT NULL AND "completedAt" >= NOW() - INTERVAL '12 months'
    GROUP BY DATE_TRUNC('month', "completedAt")
    ORDER BY month DESC
  `);
  
  const hospitalRankings = await query<any>(`
    SELECT "hospitalName", COUNT(*)::int as request_count
    FROM "BloodRequest"
    WHERE "createdAt" >= NOW() - INTERVAL '30 days'
    GROUP BY "hospitalName"
    ORDER BY request_count DESC
    LIMIT 10
  `);
  
  res.json({
    avgResponseTimeMinutes: Number(avgResponseTime?.avg_minutes || 0).toFixed(1),
    acceptanceRatePercent: Number(acceptanceRate?.rate || 0).toFixed(1),
    successfulDonations: successfulDonations?.cnt || 0,
    expiredRequests: expiredRequests?.cnt || 0,
    districtDemand,
    bloodGroupHeatmap,
    dailyRequests,
    monthlyDonations,
    hospitalRankings,
  });
}));

// Request status breakdown
analyticsRouter.get("/request-status", requireAdminOrVolunteer, asyncHandler(async (_req: AuthedRequest, res: Response) => {
  const statusBreakdown = await query<any>(`
    SELECT status, COUNT(*)::int as count
    FROM "BloodRequest"
    WHERE "createdAt" >= NOW() - INTERVAL '30 days'
    GROUP BY status
    ORDER BY count DESC
  `);
  res.json(statusBreakdown);
}));

// Donor activity
analyticsRouter.get("/donor-activity", requireAdminOrVolunteer, asyncHandler(async (_req: AuthedRequest, res: Response) => {
  const topDonors = await query<any>(`
    SELECT u."name", u."bloodGroup", u."donationCount", u."livesSavedCount"
    FROM "User" u
    WHERE u."role" = 'donor'
    ORDER BY u."donationCount" DESC, u."livesSavedCount" DESC
    LIMIT 20
  `);
  
  const recentDonors = await query<any>(`
    SELECT u."name", u."bloodGroup", u."district", dr."completedAt"
    FROM "User" u
    JOIN "DonorResponse" dr ON u.id = dr."donorId"
    WHERE dr."status" = 'completed' AND dr."completedAt" >= NOW() - INTERVAL '7 days'
    ORDER BY dr."completedAt" DESC
    LIMIT 20
  `);
  
  res.json({ topDonors, recentDonors });
}));

// Alert effectiveness
analyticsRouter.get("/alert-effectiveness", requireAdminOrVolunteer, asyncHandler(async (_req: AuthedRequest, res: Response) => {
  const alertStats = await query<any>(`
    SELECT 
      COUNT(*)::int as total_alerts,
      COUNT(*) FILTER (WHERE status = 'accepted')::int as accepted,
      COUNT(*) FILTER (WHERE status = 'completed')::int as completed,
      AVG("distanceKm") as avg_distance_km
    FROM "DonorResponse"
    WHERE "createdAt" >= NOW() - INTERVAL '30 days'
  `);
  
  const radiusEffectiveness = await query<any>(`
    SELECT 
      "alertRadiusKm",
      COUNT(*)::int as request_count,
      AVG(EXTRACT(EPOCH FROM (dr."acceptedAt" - br."createdAt")) / 60) as avg_response_minutes
    FROM "BloodRequest" br
    JOIN "DonorResponse" dr ON br.id = dr."requestId"
    WHERE br."createdAt" >= NOW() - INTERVAL '30 days' AND dr."acceptedAt" IS NOT NULL
    GROUP BY "alertRadiusKm"
    ORDER BY "alertRadiusKm"
  `);
  
  res.json({ alertStats, radiusEffectiveness });
}));
