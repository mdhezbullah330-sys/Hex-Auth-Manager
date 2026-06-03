import { Router, type IRouter } from "express";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import { AppUser, User, App, Log } from "../models";
import { UpdateUserPlanBody, UpdateUserSubscriptionBody } from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { sendDiscordWebhook } from "../lib/discord";
import { Types } from "mongoose";

const router: IRouter = Router();

function generateUserToken(): string {
  const hex = uuidv4().replace(/-/g, "").toUpperCase().slice(0, 16);
  return `USR-${hex}`;
}

function formatAppUser(u: any) {
  return {
    id: u._id,
    username: u.username,
    email: u.email ?? "",
    plan: u.plan,
    status: u.status,
    hwid: u.hwid ?? null,
    subscriptionExpiry: u.subscriptionExpiry?.toISOString() ?? null,
    token: u.token,
    bypassHwid: u.bypassHwid ?? false,
    maxConcurrentSessions: u.maxConcurrentSessions ?? 1,
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    appId: u.appId?.toString() ?? null,
    createdAt: u.createdAt.toISOString(),
  };
}

router.get("/users", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const filter: Record<string, any> = { ownerId: new Types.ObjectId(req.userId) };
  if (req.query.appId && typeof req.query.appId === "string") {
    filter.appId = new Types.ObjectId(req.query.appId);
  }
  const users = await AppUser.find(filter).sort({ createdAt: -1 });
  res.json(users.map(formatAppUser));
});

router.post("/users", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { username, email, password, plan, expiresAt, bypassHwid, maxConcurrentSessions, appId } = req.body;
  if (!username || !password || !plan) {
    res.status(400).json({ error: "username, password, and plan are required" });
    return;
  }
  const existing = await AppUser.findOne({ ownerId: new Types.ObjectId(req.userId), username });
  if (existing) { res.status(400).json({ error: "Username already exists for this account" }); return; }
  const passwordHash = await bcrypt.hash(password, 10);
  const token = generateUserToken();
  const user = await AppUser.create({
    ownerId: new Types.ObjectId(req.userId),
    appId: appId ? new Types.ObjectId(appId) : null,
    username,
    email: email ?? "",
    passwordHash,
    plan: plan ?? "free",
    status: "active",
    bypassHwid: bypassHwid ?? false,
    maxConcurrentSessions: maxConcurrentSessions ?? 1,
    token,
    subscriptionExpiry: expiresAt ? new Date(expiresAt) : null,
  });
  const admin = await User.findById(req.userId);
  await Log.create({ ownerId: new Types.ObjectId(req.userId), userId: user._id, action: "user.create", description: `${admin?.username ?? "admin"} · Created user "${username}"`, ipAddress: req.ip ?? null, severity: "info" });
  res.status(201).json(formatAppUser(user));
});

router.get("/users/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = await AppUser.findOne({ _id: req.params.id, ownerId: new Types.ObjectId(req.userId) });
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(formatAppUser(user));
});

router.delete("/users/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = await AppUser.findOneAndDelete({ _id: req.params.id, ownerId: new Types.ObjectId(req.userId) });
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  const admin = await User.findById(req.userId);
  await Log.create({ ownerId: new Types.ObjectId(req.userId), userId: null, action: "user.delete", description: `${admin?.username ?? "admin"} · Deleted user "${user.username}"`, ipAddress: req.ip ?? null, severity: "warn" });
  res.json({ ok: true, message: "User deleted" });
});

router.post("/users/:id/rotate-token", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const newToken = generateUserToken();
  const user = await AppUser.findOneAndUpdate(
    { _id: req.params.id, ownerId: new Types.ObjectId(req.userId) },
    { token: newToken },
    { new: true }
  );
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(formatAppUser(user));
});

router.post("/users/:id/ban", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = await AppUser.findOneAndUpdate({ _id: req.params.id, ownerId: new Types.ObjectId(req.userId) }, { status: "banned" }, { new: true });
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  const admin = await User.findById(req.userId);
  await Log.create({ ownerId: new Types.ObjectId(req.userId), userId: user._id, action: "user.ban", description: `${admin?.username ?? "admin"} · Banned "${user.username}"`, ipAddress: req.ip ?? null, severity: "bad" });
  if (admin?.webhookUrl) await sendDiscordWebhook(admin.webhookUrl, "user.ban", user.username, req.ip ?? "", `Banned by ${admin.username}`);
  res.json(formatAppUser(user));
});

router.post("/users/:id/unban", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = await AppUser.findOneAndUpdate({ _id: req.params.id, ownerId: new Types.ObjectId(req.userId) }, { status: "active" }, { new: true });
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  const admin = await User.findById(req.userId);
  await Log.create({ ownerId: new Types.ObjectId(req.userId), userId: user._id, action: "user.unban", description: `${admin?.username ?? "admin"} · Unbanned "${user.username}"`, ipAddress: req.ip ?? null, severity: "good" });
  res.json(formatAppUser(user));
});

router.post("/users/:id/reset-hwid", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = await AppUser.findOneAndUpdate({ _id: req.params.id, ownerId: new Types.ObjectId(req.userId) }, { hwid: null }, { new: true });
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  const admin = await User.findById(req.userId);
  await Log.create({ ownerId: new Types.ObjectId(req.userId), userId: user._id, action: "hwid.reset", description: `${admin?.username ?? "admin"} · Reset HWID for "${user.username}"`, ipAddress: req.ip ?? null, severity: "warn" });
  if (admin?.webhookUrl) await sendDiscordWebhook(admin.webhookUrl, "hwid.reset", user.username, req.ip ?? "", `HWID reset by ${admin.username}`);
  res.json(formatAppUser(user));
});

router.patch("/users/:id/plan", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const body = UpdateUserPlanBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }
  const user = await AppUser.findOneAndUpdate({ _id: req.params.id, ownerId: new Types.ObjectId(req.userId) }, { plan: body.data.plan }, { new: true });
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(formatAppUser(user));
});

router.patch("/users/:id/subscription", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const body = UpdateUserSubscriptionBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }
  const expiry = body.data.expiresAt ? new Date(body.data.expiresAt) : null;
  const user = await AppUser.findOneAndUpdate({ _id: req.params.id, ownerId: new Types.ObjectId(req.userId) }, { subscriptionExpiry: expiry }, { new: true });
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(formatAppUser(user));
});

export default router;
