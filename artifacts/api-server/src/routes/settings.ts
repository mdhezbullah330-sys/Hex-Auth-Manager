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
  const members = await TeamMember.find({ ownerId: new Types.ObjectId(req.userId) }).sort({ createdAt: 1 });
  const enriched = await Promise.all(members.map(async (m) => {
    let username = m.email.split("@")[0];
    if (m.userId) { const u = await User.findById(m.userId).select("username"); if (u) username = u.username; }
    return {
      id: m._id,
      username,
      email: m.email,
      role: m.role,
      status: m.status,
      isYou: m.userId?.toString() === req.userId,
      joinedAt: (m.joinedAt ?? m.createdAt).toISOString(),
    };
  }));
  // owner is always first, sorted by joinedAt ascending (join order matters for admin hierarchy)
  res.json([
    { id: owner._id, username: owner.username, email: owner.email, role: "owner", status: "accepted", isYou: true, joinedAt: owner.createdAt.toISOString() },
    ...enriched,
  ]);
});

router.post("/settings/team/invite", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  // Only owner or admin can invite
  const inviter = await User.findById(req.userId);
  if (!inviter) { res.status(404).json({ error: "User not found" }); return; }

  // Check if inviter is owner or accepted admin of this workspace
  const isOwner = inviter.role === "owner" || req.workspaceId === req.userId;
  const membership = await TeamMember.findOne({ ownerId: new Types.ObjectId(req.workspaceId!), userId: new Types.ObjectId(req.userId), status: "accepted", role: "admin" });
  const isAdmin = !!membership;

  if (!isOwner && !isAdmin) {
    res.status(403).json({ error: "Only owners and admins can invite team members" }); return;
  }

  const parsed = InviteTeamMemberBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  // Viewers cannot be invited as admins by non-owners
  if (parsed.data.role === "admin" && !isOwner && isAdmin) {
    // admins can invite other admins - allowed
  }

  const owner = await User.findById(req.workspaceId);
  const token = uuidv4();
  const expiry = new Date(Date.now() + 48 * 60 * 60 * 1000);
  await TeamMember.create({ ownerId: new Types.ObjectId(req.workspaceId!), email: parsed.data.email, role: parsed.data.role, status: "pending", inviteToken: token, inviteExpiry: expiry });
  const baseUrl = process.env.REPLIT_DOMAINS?.split(",")[0] ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}` : "http://localhost";
  await sendTeamInviteEmail(parsed.data.email, owner?.username ?? inviter.username ?? "admin", parsed.data.role, `${baseUrl}/api/settings/team/accept/${token}`);
  res.json({ ok: true, message: "Invitation sent" });
});

router.delete("/settings/team/:userId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = RemoveTeamMemberParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const memberToRemove = await TeamMember.findById(params.data.userId);
  if (!memberToRemove) { res.status(404).json({ error: "Team member not found" }); return; }

  // Cannot remove owner
  const targetUser = memberToRemove.userId ? await User.findById(memberToRemove.userId) : null;
  if (targetUser && targetUser.role === "owner") {
    res.status(403).json({ error: "Cannot remove the workspace owner" }); return;
  }

  // Check requester's role
  const isOwner = req.workspaceId === req.userId;
  if (!isOwner) {
    // Must be an accepted admin
    const requesterMembership = await TeamMember.findOne({
      ownerId: new Types.ObjectId(req.workspaceId!),
      userId: new Types.ObjectId(req.userId),
      status: "accepted",
      role: "admin",
    });
    if (!requesterMembership) {
      res.status(403).json({ error: "Only owners and admins can remove team members" }); return;
    }

    // Admin cannot remove another admin who joined earlier (lower index = earlier)
    if (memberToRemove.role === "admin") {
      const requesterJoinedAt = requesterMembership.joinedAt ?? requesterMembership.createdAt;
      const targetJoinedAt = memberToRemove.joinedAt ?? memberToRemove.createdAt;
      if (targetJoinedAt <= requesterJoinedAt) {
        res.status(403).json({ error: "You cannot remove an admin who joined before you" }); return;
      }
    }

    // Admin can only remove viewers and later-joined admins
    if (memberToRemove.role !== "viewer" && memberToRemove.role !== "admin") {
      res.status(403).json({ error: "Admins can only remove viewers or later-joined admins" }); return;
    }
  }

  await memberToRemove.deleteOne();
  res.json({ ok: true, message: "Member removed" });
});

router.get("/settings/team/accept/:token", async (req, res): Promise<void> => {
  const params = AcceptTeamInviteParams.safeParse(req.params);
  const frontendBase = process.env.REPLIT_DOMAINS?.split(",")[0] ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}` : "http://localhost";
  if (!params.success) { res.redirect(`${frontendBase}/invite-accepted?error=invalid`); return; }
  const member = await TeamMember.findOne({ inviteToken: params.data.token });
  if (!member) { res.redirect(`${frontendBase}/invite-accepted?error=notfound`); return; }
  if (member.inviteExpiry && member.inviteExpiry < new Date()) { res.redirect(`${frontendBase}/invite-accepted?error=expired`); return; }
  const existingUser = await User.findOne({ email: member.email });
  if (!existingUser) {
    res.redirect(`${frontendBase}/invite-signup?token=${params.data.token}`);
    return;
  }
  member.status = "accepted";
  member.joinedAt = new Date();
  member.inviteToken = null;
  member.userId = existingUser._id as Types.ObjectId;
  await member.save();
  res.redirect(`${frontendBase}/invite-accepted?ok=1`);
});

router.get("/settings/credentials", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = await User.findById(req.userId);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  const baseUrl = process.env.REPLIT_DOMAINS?.split(",")[0] ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}` : "http://localhost";
  res.json({ appId: user.appId ?? uuidv4(), appSecret: user.appSecret ?? uuidv4().replace(/-/g, ""), apiEndpoint: `${baseUrl}/api` });
});

export default router;
