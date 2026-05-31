import { Router, type IRouter } from "express";
import { ne } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/subscriptions", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const users = await db
    .select()
    .from(usersTable)
    .where(ne(usersTable.id, req.userId!));

  const subscriptions = users.map((user, i) => ({
    id: user.id,
    userId: user.id,
    username: user.username,
    email: user.email,
    plan: user.plan,
    status: user.status === "banned" ? "cancelled" : user.plan === "free" ? "free" : "active",
    expiresAt: user.subscriptionExpiry?.toISOString() ?? null,
    startedAt: user.createdAt.toISOString(),
  }));

  res.json(subscriptions);
});

export default router;
