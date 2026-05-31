import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, sessionsTable, usersTable } from "@workspace/db";
import { KillSessionParams } from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/sessions", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const sessions = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.ownerId, req.userId!));

  const enriched = await Promise.all(
    sessions.map(async (s) => {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, s.userId)).limit(1);
      return {
        id: s.id,
        userId: s.userId,
        username: user?.username ?? "unknown",
        ipAddress: s.ipAddress ?? "",
        hwid: s.hwid ?? null,
        appId: s.appId ?? null,
        expiresAt: s.expiresAt?.toISOString() ?? null,
        createdAt: s.createdAt.toISOString(),
      };
    })
  );

  res.json(enriched);
});

router.delete("/sessions/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = KillSessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [session] = await db
    .delete(sessionsTable)
    .where(and(eq(sessionsTable.id, params.data.id), eq(sessionsTable.ownerId, req.userId!)))
    .returning();

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  res.json({ ok: true, message: "Session killed" });
});

export default router;
