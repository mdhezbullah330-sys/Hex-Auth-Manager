import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, blacklistTable } from "@workspace/db";
import {
  AddBlacklistBody,
  RemoveBlacklistParams,
} from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/blacklist", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const entries = await db
    .select()
    .from(blacklistTable)
    .where(eq(blacklistTable.ownerId, req.userId!));

  res.json(
    entries.map((e) => ({
      id: e.id,
      type: e.type,
      value: e.value,
      reason: e.reason ?? null,
      createdAt: e.createdAt.toISOString(),
    }))
  );
});

router.post("/blacklist", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const parsed = AddBlacklistBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [entry] = await db
    .insert(blacklistTable)
    .values({
      ownerId: req.userId!,
      type: parsed.data.type,
      value: parsed.data.value,
      reason: parsed.data.reason ?? null,
    })
    .returning();

  res.status(201).json({
    id: entry.id,
    type: entry.type,
    value: entry.value,
    reason: entry.reason ?? null,
    createdAt: entry.createdAt.toISOString(),
  });
});

router.delete("/blacklist/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = RemoveBlacklistParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [entry] = await db
    .delete(blacklistTable)
    .where(and(eq(blacklistTable.id, params.data.id), eq(blacklistTable.ownerId, req.userId!)))
    .returning();

  if (!entry) {
    res.status(404).json({ error: "Entry not found" });
    return;
  }

  res.json({ ok: true, message: "Entry removed" });
});

export default router;
