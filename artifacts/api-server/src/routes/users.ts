import { Router, type IRouter } from "express";
import { eq, ne } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { logsTable } from "@workspace/db";
import {
  GetUserParams,
  BanUserParams,
  UnbanUserParams,
  ResetUserHwidParams,
  UpdateUserPlanParams,
  UpdateUserPlanBody,
  UpdateUserSubscriptionParams,
  UpdateUserSubscriptionBody,
} from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { sendDiscordWebhook } from "../lib/discord";

const router: IRouter = Router();

function formatUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    plan: user.plan,
    status: user.status,
    hwid: user.hwid ?? null,
    subscriptionExpiry: user.subscriptionExpiry?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}

router.get("/users", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const users = await db
    .select()
    .from(usersTable)
    .where(ne(usersTable.id, req.userId!));

  res.json(users.map(formatUser));
});

router.get("/users/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = GetUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, params.data.id))
    .limit(1);

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(formatUser(user));
});

router.post("/users/:id/ban", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = BanUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [user] = await db
    .update(usersTable)
    .set({ status: "banned" })
    .where(eq(usersTable.id, params.data.id))
    .returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const [admin] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);

  await db.insert(logsTable).values({
    ownerId: req.userId,
    userId: user.id,
    action: "user.ban",
    description: `${admin?.username ?? "admin"} · Banned "${user.username}"`,
    ipAddress: req.ip ?? null,
    severity: "bad",
  });

  if (admin?.webhookUrl) {
    await sendDiscordWebhook(admin.webhookUrl, "user.ban", user.username, req.ip ?? "", `Banned by ${admin.username}`);
  }

  res.json(formatUser(user));
});

router.post("/users/:id/unban", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = UnbanUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [user] = await db
    .update(usersTable)
    .set({ status: "active" })
    .where(eq(usersTable.id, params.data.id))
    .returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const [admin] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);

  await db.insert(logsTable).values({
    ownerId: req.userId,
    userId: user.id,
    action: "user.unban",
    description: `${admin?.username ?? "admin"} · Unbanned "${user.username}"`,
    ipAddress: req.ip ?? null,
    severity: "good",
  });

  res.json(formatUser(user));
});

router.post("/users/:id/reset-hwid", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = ResetUserHwidParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [user] = await db
    .update(usersTable)
    .set({ hwid: null })
    .where(eq(usersTable.id, params.data.id))
    .returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const [admin] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);

  await db.insert(logsTable).values({
    ownerId: req.userId,
    userId: user.id,
    action: "hwid.reset",
    description: `${admin?.username ?? "admin"} · Reset HWID for "${user.username}"`,
    ipAddress: req.ip ?? null,
    severity: "warn",
  });

  if (admin?.webhookUrl) {
    await sendDiscordWebhook(admin.webhookUrl, "hwid.reset", user.username, req.ip ?? "", `HWID reset by ${admin.username}`);
  }

  res.json(formatUser(user));
});

router.patch("/users/:id/plan", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = UpdateUserPlanParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateUserPlanBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [user] = await db
    .update(usersTable)
    .set({ plan: body.data.plan })
    .where(eq(usersTable.id, params.data.id))
    .returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  await db.insert(logsTable).values({
    ownerId: req.userId,
    userId: user.id,
    action: "user.plan",
    description: `Plan changed to "${body.data.plan}" for "${user.username}"`,
    ipAddress: req.ip ?? null,
    severity: "info",
  });

  res.json(formatUser(user));
});

router.patch("/users/:id/subscription", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = UpdateUserSubscriptionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateUserSubscriptionBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const expiry = body.data.expiresAt ? new Date(body.data.expiresAt) : null;

  const [user] = await db
    .update(usersTable)
    .set({ subscriptionExpiry: expiry })
    .where(eq(usersTable.id, params.data.id))
    .returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(formatUser(user));
});

export default router;
