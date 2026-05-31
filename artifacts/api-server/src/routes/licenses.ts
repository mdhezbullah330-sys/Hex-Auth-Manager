import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, licensesTable, usersTable, logsTable } from "@workspace/db";
import {
  GenerateLicenseBody,
  RedeemLicenseBody,
  DeleteLicenseParams,
} from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router: IRouter = Router();

function generateKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const segment = () =>
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `HEX-${segment()}-${segment()}-${segment()}`;
}

function formatLicense(lic: typeof licensesTable.$inferSelect, username?: string) {
  return {
    id: lic.id,
    key: lic.key,
    status: lic.status,
    plan: lic.plan,
    expiresAt: lic.expiresAt?.toISOString() ?? null,
    usedBy: lic.usedBy ?? null,
    usedByUsername: username ?? null,
    createdAt: lic.createdAt.toISOString(),
  };
}

router.get("/licenses", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const licenses = await db
    .select()
    .from(licensesTable)
    .where(eq(licensesTable.ownerId, req.userId!))
    .orderBy(licensesTable.createdAt);

  const withUsernames = await Promise.all(
    licenses.map(async (lic) => {
      let username: string | undefined;
      if (lic.usedBy) {
        const [user] = await db.select().from(usersTable).where(eq(usersTable.id, lic.usedBy)).limit(1);
        username = user?.username;
      }
      return formatLicense(lic, username);
    })
  );

  res.json(withUsernames);
});

router.post("/licenses/generate", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const parsed = GenerateLicenseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const quantity = parsed.data.quantity ?? 1;
  const keys: (typeof licensesTable.$inferSelect)[] = [];

  for (let i = 0; i < quantity; i++) {
    const [lic] = await db
      .insert(licensesTable)
      .values({
        ownerId: req.userId!,
        key: generateKey(),
        plan: parsed.data.plan,
        status: "active",
        expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
      })
      .returning();
    keys.push(lic);
  }

  res.status(201).json(formatLicense(keys[0]));
});

router.post("/licenses/redeem", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const parsed = RedeemLicenseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [lic] = await db
    .select()
    .from(licensesTable)
    .where(eq(licensesTable.key, parsed.data.key.toUpperCase()))
    .limit(1);

  if (!lic) {
    res.status(400).json({ error: "License key not found" });
    return;
  }

  if (lic.status === "used") {
    res.status(400).json({ error: "License key has already been used" });
    return;
  }

  if (lic.expiresAt && lic.expiresAt < new Date()) {
    res.status(400).json({ error: "License key has expired" });
    return;
  }

  const [updated] = await db
    .update(licensesTable)
    .set({ status: "used", usedBy: req.userId!, usedAt: new Date() })
    .where(eq(licensesTable.id, lic.id))
    .returning();

  await db
    .update(usersTable)
    .set({ plan: lic.plan })
    .where(eq(usersTable.id, req.userId!));

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);

  await db.insert(logsTable).values({
    ownerId: lic.ownerId,
    userId: req.userId,
    action: "license.redeem",
    description: `${user?.username ?? "user"} redeemed license key for plan: ${lic.plan}`,
    ipAddress: req.ip ?? null,
    severity: "good",
  });

  res.json(formatLicense(updated, user?.username));
});

router.delete("/licenses/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = DeleteLicenseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [lic] = await db
    .delete(licensesTable)
    .where(eq(licensesTable.id, params.data.id))
    .returning();

  if (!lic) {
    res.status(404).json({ error: "License not found" });
    return;
  }

  res.json({ ok: true, message: "License deleted" });
});

export default router;
