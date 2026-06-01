import { Router, type IRouter } from "express";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import { User, TeamMember } from "../models";
import { UpdateProfileBody, UpdatePasswordBody, UpdateWebhookBody, InviteTeamMemberBody, RemoveTeamMemberParams, AcceptTeamInviteParams } from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { sendTeamInviteEmail } from "../lib/email";
import { Types } from "mongoose";

const router: IRouter = Router();

router.get("/settings", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = await User.findById(req.userId);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json({ webhookUrl: user.webhookUrl ?? null });
});

router.put("/settings/profile", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const user = await User.findByIdAndUpdate(req.userId, parsed.data, { new: true });
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json({ id: user._id, username: user.username, email: user.email, plan: user.plan, status: user.status, role: user.role, emailVerified: user.emailVerified, subscriptionExpiry: user.subscriptionExpiry?.toISOString() ?? null, webhookUrl: user.webhookUrl, createdAt: user.createdAt.toISOString() });
});

router.put("/settings/password", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const parsed = UpdatePasswordBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const user = await User.findById(req.userId);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  const match = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!match) { res.status(400).json({ error: "Current password is incorrect" }); return; }
  user.passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await user.save();
  res.json({ ok: true, message: "Password updated" });
});

router.put("/settings/webhook", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const parsed = UpdateWebhookBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  await User.findByIdAndUpdate(req.userId, { webhookUrl: parsed.data.webhookUrl ?? null });
  res.json({ ok: true, message: "Webhook updated" });
});

router.get("/settings/team", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const owner = await User.findById(req.userId);
  if (!owner) { res.status(404).json({ error: "User not found" }); return; }
  const members = await TeamMember.find({ ownerId: new Types.ObjectId(req.userId) });
  const enriched = await Promise.all(members.map(async (m) => {
    let username = m.email.split("@")[0];
    if (m.userId) { const u = await User.findById(m.userId).select("username"); if (u) username = u.username; }
    return { id: m._id, username, email: m.email, role: m.role, isYou: m.userId?.toString() === req.userId, joinedAt: (m.joinedAt ?? m.createdAt).toISOString() };
  }));
  res.json([{ id: owner._id, username: owner.username, email: owner.email, role: "owner", isYou: true, joinedAt: owner.createdAt.toISOString() }, ...enriched]);
});

router.post("/settings/team/invite", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const parsed = InviteTeamMemberBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const owner = await User.findById(req.userId);
  const token = uuidv4();
  const expiry = new Date(Date.now() + 48 * 60 * 60 * 1000);
  await TeamMember.create({ ownerId: new Types.ObjectId(req.userId), email: parsed.data.email, role: parsed.data.role, status: "pending", inviteToken: token, inviteExpiry: expiry });
  const baseUrl = process.env.REPLIT_DOMAINS?.split(",")[0] ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}` : "http://localhost";
  await sendTeamInviteEmail(parsed.data.email, owner?.username ?? "admin", parsed.data.role, `${baseUrl}/api/settings/team/accept/${token}`);
  res.json({ ok: true, message: "Invitation sent" });
});

router.delete("/settings/team/:userId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = RemoveTeamMemberParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const member = await TeamMember.findByIdAndDelete(params.data.userId);
  if (!member) { res.status(404).json({ error: "Team member not found" }); return; }
  res.json({ ok: true, message: "Member removed" });
});

router.get("/settings/team/accept/:token", async (req, res): Promise<void> => {
  const params = AcceptTeamInviteParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid token" }); return; }
  const member = await TeamMember.findOne({ inviteToken: params.data.token });
  if (!member) { res.status(404).json({ error: "Invitation not found" }); return; }
  if (member.inviteExpiry && member.inviteExpiry < new Date()) { res.status(400).json({ error: "Invitation has expired" }); return; }
  member.status = "accepted"; member.joinedAt = new Date(); member.inviteToken = null;
  await member.save();
  res.json({ ok: true, message: "Invitation accepted. You can now log in." });
});

router.get("/settings/credentials", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = await User.findById(req.userId);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  const baseUrl = process.env.REPLIT_DOMAINS?.split(",")[0] ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}` : "http://localhost";
  res.json({ appId: user.appId ?? uuidv4(), appSecret: user.appSecret ?? uuidv4().replace(/-/g, ""), apiEndpoint: `${baseUrl}/api` });
});

export default router;
