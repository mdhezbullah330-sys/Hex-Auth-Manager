import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import { db, usersTable, teamMembersTable } from "@workspace/db";
import {
  UpdateProfileBody,
  UpdatePasswordBody,
  UpdateWebhookBody,
  InviteTeamMemberBody,
  RemoveTeamMemberParams,
  AcceptTeamInviteParams,
} from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { sendTeamInviteEmail } from "../lib/email";

const router: IRouter = Router();

router.get("/settings", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({ webhookUrl: user.webhookUrl ?? null });
});

router.put("/settings/profile", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [user] = await db
    .update(usersTable)
    .set(parsed.data)
    .where(eq(usersTable.id, req.userId!))
    .returning();

  res.json({
    id: user.id,
    username: user.username,
    email: user.email,
    plan: user.plan,
    status: user.status,
    role: user.role,
    emailVerified: user.emailVerified,
    subscriptionExpiry: user.subscriptionExpiry?.toISOString() ?? null,
    webhookUrl: user.webhookUrl,
    createdAt: user.createdAt.toISOString(),
  });
});

router.put("/settings/password", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const parsed = UpdatePasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const match = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!match) {
    res.status(400).json({ error: "Current password is incorrect" });
    return;
  }

  const newHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await db.update(usersTable).set({ passwordHash: newHash }).where(eq(usersTable.id, req.userId!));

  res.json({ ok: true, message: "Password updated" });
});

router.put("/settings/webhook", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const parsed = UpdateWebhookBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  await db.update(usersTable).set({ webhookUrl: parsed.data.webhookUrl ?? null }).where(eq(usersTable.id, req.userId!));

  res.json({ ok: true, message: "Webhook updated" });
});

router.get("/settings/team", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const [owner] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  if (!owner) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const members = await db
    .select()
    .from(teamMembersTable)
    .where(eq(teamMembersTable.ownerId, req.userId!));

  const enriched = await Promise.all(
    members.map(async (m) => {
      let username = m.email.split("@")[0];
      if (m.userId) {
        const [u] = await db.select().from(usersTable).where(eq(usersTable.id, m.userId)).limit(1);
        if (u) username = u.username;
      }
      return {
        id: m.id,
        username,
        email: m.email,
        role: m.role,
        isYou: m.userId === req.userId,
        joinedAt: (m.joinedAt ?? m.createdAt).toISOString(),
      };
    })
  );

  // Add owner itself
  const result = [
    {
      id: owner.id,
      username: owner.username,
      email: owner.email,
      role: "owner",
      isYou: true,
      joinedAt: owner.createdAt.toISOString(),
    },
    ...enriched,
  ];

  res.json(result);
});

router.post("/settings/team/invite", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const parsed = InviteTeamMemberBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [owner] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);

  const token = uuidv4();
  const expiry = new Date(Date.now() + 48 * 60 * 60 * 1000);

  await db.insert(teamMembersTable).values({
    ownerId: req.userId!,
    email: parsed.data.email,
    role: parsed.data.role,
    status: "pending",
    inviteToken: token,
    inviteExpiry: expiry,
  });

  const baseUrl = process.env.REPLIT_DOMAINS?.split(",")[0]
    ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
    : "http://localhost";
  const acceptLink = `${baseUrl}/api/settings/team/accept/${token}`;

  await sendTeamInviteEmail(parsed.data.email, owner?.username ?? "admin", parsed.data.role, acceptLink);

  res.json({ ok: true, message: "Invitation sent" });
});

router.delete("/settings/team/:userId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = RemoveTeamMemberParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [member] = await db
    .delete(teamMembersTable)
    .where(eq(teamMembersTable.id, params.data.userId))
    .returning();

  if (!member) {
    res.status(404).json({ error: "Team member not found" });
    return;
  }

  res.json({ ok: true, message: "Member removed" });
});

router.get("/settings/team/accept/:token", async (req, res): Promise<void> => {
  const params = AcceptTeamInviteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid token" });
    return;
  }

  const [member] = await db
    .select()
    .from(teamMembersTable)
    .where(eq(teamMembersTable.inviteToken, params.data.token))
    .limit(1);

  if (!member) {
    res.status(404).json({ error: "Invitation not found" });
    return;
  }

  if (member.inviteExpiry && member.inviteExpiry < new Date()) {
    res.status(400).json({ error: "Invitation has expired" });
    return;
  }

  await db
    .update(teamMembersTable)
    .set({ status: "accepted", joinedAt: new Date(), inviteToken: null })
    .where(eq(teamMembersTable.id, member.id));

  res.json({ ok: true, message: "Invitation accepted. You can now log in." });
});

router.get("/settings/credentials", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const baseUrl = process.env.REPLIT_DOMAINS?.split(",")[0]
    ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
    : "http://localhost";

  res.json({
    appId: user.appId ?? uuidv4(),
    appSecret: user.appSecret ?? uuidv4().replace(/-/g, ""),
    apiEndpoint: `${baseUrl}/api`,
  });
});

export default router;
