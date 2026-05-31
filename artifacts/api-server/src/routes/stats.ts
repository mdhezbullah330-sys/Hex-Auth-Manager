import { Router, type IRouter } from "express";
import { eq, count, ne, desc } from "drizzle-orm";
import { db, usersTable, appsTable, licensesTable, sessionsTable, logsTable } from "@workspace/db";
import { GetRecentActivityQueryParams, GetActiveUsersChartQueryParams } from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/stats", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const [appCount] = await db
    .select({ count: count() })
    .from(appsTable)
    .where(eq(appsTable.ownerId, req.userId!));

  const [userCount] = await db
    .select({ count: count() })
    .from(usersTable)
    .where(ne(usersTable.id, req.userId!));

  const [totalKeys] = await db
    .select({ count: count() })
    .from(licensesTable)
    .where(eq(licensesTable.ownerId, req.userId!));

  const [usedKeys] = await db
    .select({ count: count() })
    .from(licensesTable)
    .where(eq(licensesTable.status, "used"));

  const [sessionCount] = await db
    .select({ count: count() })
    .from(sessionsTable)
    .where(eq(sessionsTable.ownerId, req.userId!));

  res.json({
    totalApps: appCount?.count ?? 0,
    activeUsers: userCount?.count ?? 0,
    keysRedeemed: usedKeys?.count ?? 0,
    totalKeys: totalKeys?.count ?? 0,
    liveSessions: sessionCount?.count ?? 0,
    mrr: 0,
  });
});

router.get("/stats/activity", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const queryParsed = GetRecentActivityQueryParams.safeParse(req.query);
  const limit = queryParsed.success ? (queryParsed.data.limit ?? 20) : 20;

  const logs = await db
    .select()
    .from(logsTable)
    .where(eq(logsTable.ownerId, req.userId!))
    .orderBy(desc(logsTable.createdAt))
    .limit(limit);

  const enriched = await Promise.all(
    logs.map(async (log) => {
      let username: string | undefined;
      if (log.userId) {
        const [user] = await db.select().from(usersTable).where(eq(usersTable.id, log.userId)).limit(1);
        username = user?.username;
      }
      return {
        id: log.id,
        userId: log.userId ?? null,
        username: username ?? null,
        action: log.action,
        description: log.description,
        ipAddress: log.ipAddress ?? null,
        severity: log.severity,
        timestamp: log.createdAt.toISOString(),
      };
    })
  );

  res.json(enriched);
});

router.get("/stats/active-users", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const queryParsed = GetActiveUsersChartQueryParams.safeParse(req.query);
  const period = queryParsed.success ? queryParsed.data.period : "30d";

  const now = new Date();
  const days = period === "24h" ? 1 : period === "7d" ? 7 : period === "all" ? 90 : 30;

  const dataPoints = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];

    const users = await db.select().from(usersTable).where(ne(usersTable.id, req.userId!));
    const activeCount = users.filter((u) => {
      const createdDay = u.createdAt.toISOString().split("T")[0];
      return createdDay <= dateStr;
    }).length;

    dataPoints.push({ date: dateStr, value: activeCount });
  }

  res.json(dataPoints);
});

router.get("/stats/plan-mix", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const users = await db.select().from(usersTable).where(ne(usersTable.id, req.userId!));

  const planCounts: Record<string, number> = {};
  for (const user of users) {
    planCounts[user.plan] = (planCounts[user.plan] ?? 0) + 1;
  }

  const total = users.length || 1;
  const result = Object.entries(planCounts).map(([plan, count]) => ({
    plan,
    count,
    percentage: Math.round((count / total) * 100),
  }));

  res.json(result.length > 0 ? result : [{ plan: "free", count: 0, percentage: 100 }]);
});

export default router;
