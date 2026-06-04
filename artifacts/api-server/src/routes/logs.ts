import { Router, type IRouter } from "express";
import { Log, User } from "../models";
import { GetLogsQueryParams } from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { Types } from "mongoose";

const router: IRouter = Router();

router.get("/logs", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const queryParsed = GetLogsQueryParams.safeParse(req.query);
  const filter = queryParsed.success ? queryParsed.data.filter : undefined;
  const limit = queryParsed.success ? (queryParsed.data.limit ?? 100) : 100;

  const query: any = { ownerId: new Types.ObjectId(req.workspaceId!) };
  if (filter && filter !== "all") query.severity = filter;

  const logs = await Log.find(query).sort({ createdAt: -1 }).limit(limit);
  const withUsernames = await Promise.all(logs.map(async (log) => {
    let username: string | undefined;
    if (log.userId) { const user = await User.findById(log.userId).select("username"); username = user?.username; }
    return { id: log._id, userId: log.userId ?? null, username: username ?? null, action: log.action, description: log.description, ipAddress: log.ipAddress ?? null, severity: log.severity, timestamp: log.createdAt.toISOString() };
  }));
  res.json(withUsernames);
});

export default router;
