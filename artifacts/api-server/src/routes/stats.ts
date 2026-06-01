import { Router, type IRouter } from "express";
import { User, App, License, Session, Log } from "../models";
import { GetRecentActivityQueryParams, GetActiveUsersChartQueryParams } from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { Types } from "mongoose";

const router: IRouter = Router();

router.get("/stats", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const ownerId = new Types.ObjectId(req.userId);
  const [totalApps, activeUsers, totalKeys, usedKeys, liveSessions] = await Promise.all([
    App.countDocuments({ ownerId }),
    User.countDocuments({ _id: { $ne: ownerId } }),
    License.countDocuments({ ownerId }),
    License.countDocuments({ ownerId, status: "used" }),
    Session.countDocuments({ ownerId }),
  ]);
  res.json({ totalApps, activeUsers, keysRedeemed: usedKeys, totalKeys, liveSessions, mrr: 0 });
});

router.get("/stats/activity", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const queryParsed = GetRecentActivityQueryParams.safeParse(req.query);
  const limit = queryParsed.success ? (queryParsed.data.limit ?? 20) : 20;
  const logs = await Log.find({ ownerId: new Types.ObjectId(req.userId) }).sort({ createdAt: -1 }).limit(limit);
  const enriched = await Promise.all(logs.map(async (log) => {
    let username: string | undefined;
    if (log.userId) { const user = await User.findById(log.userId).select("username"); username = user?.username; }
    return { id: log._id, userId: log.userId ?? null, username: username ?? null, action: log.action, description: log.description, ipAddress: log.ipAddress ?? null, severity: log.severity, timestamp: log.createdAt.toISOString() };
  }));
  res.json(enriched);
});

router.get("/stats/active-users", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const queryParsed = GetActiveUsersChartQueryParams.safeParse(req.query);
  const period = queryParsed.success ? queryParsed.data.period : "30d";
  const now = new Date();
  const days = period === "24h" ? 1 : period === "7d" ? 7 : period === "all" ? 90 : 30;
  const ownerId = new Types.ObjectId(req.userId);
  const users = await User.find({ _id: { $ne: ownerId } }).select("createdAt");
  const dataPoints = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now); date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    const activeCount = users.filter((u) => u.createdAt.toISOString().split("T")[0] <= dateStr).length;
    dataPoints.push({ date: dateStr, value: activeCount });
  }
  res.json(dataPoints);
});

router.get("/stats/plan-mix", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const ownerId = new Types.ObjectId(req.userId);
  const users = await User.find({ _id: { $ne: ownerId } }).select("plan");
  const planCounts: Record<string, number> = {};
  for (const user of users) { planCounts[user.plan] = (planCounts[user.plan] ?? 0) + 1; }
  const total = users.length || 1;
  const result = Object.entries(planCounts).map(([plan, count]) => ({ plan, count, percentage: Math.round((count / total) * 100) }));
  res.json(result.length > 0 ? result : [{ plan: "free", count: 0, percentage: 100 }]);
});

export default router;
