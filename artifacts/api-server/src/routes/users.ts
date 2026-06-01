import { Router, type IRouter } from "express";
import { User, Log } from "../models";
import { UpdateUserPlanBody, UpdateUserSubscriptionBody } from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { sendDiscordWebhook } from "../lib/discord";
import { Types } from "mongoose";

const router: IRouter = Router();

function formatUser(user: any) {
  return { id: user._id, username: user.username, email: user.email, plan: user.plan, status: user.status, hwid: user.hwid ?? null, subscriptionExpiry: user.subscriptionExpiry?.toISOString() ?? null, createdAt: user.createdAt.toISOString() };
}

router.get("/users", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const users = await User.find({ _id: { $ne: new Types.ObjectId(req.userId) } });
  res.json(users.map(formatUser));
});

router.get("/users/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = await User.findById(req.params.id);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(formatUser(user));
});

router.post("/users/:id/ban", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = await User.findByIdAndUpdate(req.params.id, { status: "banned" }, { new: true });
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  const admin = await User.findById(req.userId);
  await Log.create({ ownerId: new Types.ObjectId(req.userId), userId: user._id, action: "user.ban", description: `${admin?.username ?? "admin"} · Banned "${user.username}"`, ipAddress: req.ip ?? null, severity: "bad" });
  if (admin?.webhookUrl) await sendDiscordWebhook(admin.webhookUrl, "user.ban", user.username, req.ip ?? "", `Banned by ${admin.username}`);
  res.json(formatUser(user));
});

router.post("/users/:id/unban", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = await User.findByIdAndUpdate(req.params.id, { status: "active" }, { new: true });
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  const admin = await User.findById(req.userId);
  await Log.create({ ownerId: new Types.ObjectId(req.userId), userId: user._id, action: "user.unban", description: `${admin?.username ?? "admin"} · Unbanned "${user.username}"`, ipAddress: req.ip ?? null, severity: "good" });
  res.json(formatUser(user));
});

router.post("/users/:id/reset-hwid", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = await User.findByIdAndUpdate(req.params.id, { hwid: null }, { new: true });
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  const admin = await User.findById(req.userId);
  await Log.create({ ownerId: new Types.ObjectId(req.userId), userId: user._id, action: "hwid.reset", description: `${admin?.username ?? "admin"} · Reset HWID for "${user.username}"`, ipAddress: req.ip ?? null, severity: "warn" });
  if (admin?.webhookUrl) await sendDiscordWebhook(admin.webhookUrl, "hwid.reset", user.username, req.ip ?? "", `HWID reset by ${admin.username}`);
  res.json(formatUser(user));
});

router.patch("/users/:id/plan", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const body = UpdateUserPlanBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }
  const user = await User.findByIdAndUpdate(req.params.id, { plan: body.data.plan }, { new: true });
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  await Log.create({ ownerId: new Types.ObjectId(req.userId), userId: user._id, action: "user.plan", description: `Plan changed to "${body.data.plan}" for "${user.username}"`, ipAddress: req.ip ?? null, severity: "info" });
  res.json(formatUser(user));
});

router.patch("/users/:id/subscription", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const body = UpdateUserSubscriptionBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }
  const expiry = body.data.expiresAt ? new Date(body.data.expiresAt) : null;
  const user = await User.findByIdAndUpdate(req.params.id, { subscriptionExpiry: expiry }, { new: true });
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(formatUser(user));
});

export default router;
