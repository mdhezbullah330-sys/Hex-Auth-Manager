import { Router, type IRouter } from "express";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import { User, Session, App, Log, Variable, Blacklist } from "../models";
import { SdkLoginBody, SdkValidateBody } from "@workspace/api-zod";
import { sendDiscordWebhook } from "../lib/discord";
import { Types } from "mongoose";

const router: IRouter = Router();

router.post("/sdk/login", async (req, res): Promise<void> => {
  const parsed = SdkLoginBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ ok: false, message: "Invalid request" }); return; }
  const { appId, username, password, hwid, version } = parsed.data;
  const ip = req.ip ?? "unknown";

  const app = await App.findOne({ appId });
  if (!app) { res.json({ ok: false, message: "Application not found" }); return; }

  const user = await User.findOne({ username });
  if (!user) {
    await Log.create({ ownerId: app.ownerId, action: "login.fail", description: `${username} · User not found`, ipAddress: ip, severity: "bad" });
    res.json({ ok: false, message: "User not found" }); return;
  }

  if (user.status === "banned") {
    await Log.create({ ownerId: app.ownerId, userId: user._id, action: "login.banned", description: `${username} · Banned account`, ipAddress: ip, severity: "bad" });
    res.json({ ok: false, message: "Your account has been banned" }); return;
  }

  const blacklisted = await Blacklist.findOne({ value: hwid });
  if (blacklisted) { res.json({ ok: false, message: "Your hardware ID is blacklisted" }); return; }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) {
    await Log.create({ ownerId: app.ownerId, userId: user._id, action: "login.fail", description: `${username} · Invalid password`, ipAddress: ip, severity: "bad" });
    res.json({ ok: false, message: "Invalid credentials" }); return;
  }

  if (!user.hwid) {
    user.hwid = hwid; await user.save();
  } else if (user.hwid !== hwid) {
    await Log.create({ ownerId: app.ownerId, userId: user._id, action: "hwid.deny", description: `${username} · HWID mismatch`, ipAddress: ip, severity: "bad" });
    const owner = await User.findById(app.ownerId);
    if (owner?.webhookUrl) await sendDiscordWebhook(owner.webhookUrl, "hwid.deny", username, ip, "HWID mismatch detected");
    res.json({ ok: false, message: "Hardware ID mismatch. Contact support." }); return;
  }

  if (user.subscriptionExpiry && user.subscriptionExpiry < new Date()) {
    res.json({ ok: false, message: "Subscription expired" }); return;
  }

  const token = uuidv4().replace(/-/g, "");
  await Session.create({ userId: user._id, ownerId: app.ownerId, token, ipAddress: ip, hwid, appId: app._id, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) });
  await Log.create({ ownerId: app.ownerId, userId: user._id, action: "login.ok", description: `${username} · Login from ${ip}`, ipAddress: ip, severity: "good" });

  const owner = await User.findById(app.ownerId);
  if (owner?.webhookUrl) await sendDiscordWebhook(owner.webhookUrl, "login.ok", username, ip, "Successful login");

  res.json({ ok: true, sessionToken: token, user: { username: user.username, plan: user.plan, expiresAt: user.subscriptionExpiry?.toISOString() ?? null } });
});

router.post("/sdk/validate", async (req, res): Promise<void> => {
  const parsed = SdkValidateBody.safeParse(req.body);
  if (!parsed.success) { res.json({ ok: false, message: "Invalid request" }); return; }
  const session = await Session.findOne({ token: parsed.data.sessionToken });
  if (!session) { res.json({ ok: false, message: "Session not found" }); return; }
  if (session.expiresAt && session.expiresAt < new Date()) { res.json({ ok: false, message: "Session expired" }); return; }
  const user = await User.findById(session.userId);
  if (!user || user.status === "banned") { res.json({ ok: false, message: "Account suspended" }); return; }
  res.json({ ok: true, user: { username: user.username, plan: user.plan, expiresAt: user.subscriptionExpiry?.toISOString() ?? null } });
});

router.get("/sdk/variable/:name", async (req, res): Promise<void> => {
  const { name } = req.params;
  const sessionToken = req.headers.authorization?.replace("Bearer ", "");
  if (!sessionToken) { res.status(401).json({ name, value: "" }); return; }
  const session = await Session.findOne({ token: sessionToken });
  if (!session) { res.status(401).json({ name, value: "" }); return; }
  if (session.appId) {
    const variable = await Variable.findOne({ name });
    if (variable) { res.json({ name: variable.name, value: variable.value }); return; }
  }
  res.json({ name, value: "" });
});

export default router;
