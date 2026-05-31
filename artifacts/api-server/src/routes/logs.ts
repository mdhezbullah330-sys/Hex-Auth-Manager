import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, logsTable, usersTable } from "@workspace/db";
import { GetLogsQueryParams } from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router: IRouter = Router();

const severityMap: Record<string, string> = {
  good: "good",
  bad: "bad",
  warn: "warn",
  info: "info",
};

router.get("/logs", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const queryParsed = GetLogsQueryParams.safeParse(req.query);
  const filter = queryParsed.success ? queryParsed.data.filter : undefined;
  const limit = queryParsed.success ? (queryParsed.data.limit ?? 100) : 100;

  let query = db
    .select()
    .from(logsTable)
    .where(
      filter && filter !== "all" && severityMap[filter]
        ? and(eq(logsTable.ownerId, req.userId!), eq(logsTable.severity, severityMap[filter]))
        : eq(logsTable.ownerId, req.userId!)
    )
    .orderBy(desc(logsTable.createdAt))
    .limit(limit);

  const logs = await query;

  const withUsernames = await Promise.all(
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

  res.json(withUsernames);
});

export default router;
