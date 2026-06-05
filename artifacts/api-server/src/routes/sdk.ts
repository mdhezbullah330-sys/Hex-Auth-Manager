import { Router, type IRouter } from "express";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import { User, Session, App, Log, Variable, Blacklist, AppUser } from "../models";
import { SdkLoginBody, SdkValidateBody } from "@workspace/api-zod";
import { sendDiscordWebhook } from "../lib/discord";
import { Types } from "mongoose";

const router: IRouter = Router();

function generateUserToken(): string {
  const hex = uuidv4().replace(/-/g, "").toUpperCase().slice(0, 16);
  return `USR-${hex}`;
}

router.post("/sdk/login", async (req, res): Promise<void> => {
  const parsed = SdkLoginBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ ok: false, message: "Invalid request" }); return; }
  const { appId, username, password, hwid, version } = parsed.data;
  const pcName = (req.body.pcName as string | undefined) ?? null;
  const ip = req.ip ?? "unknown";

  const app = await App.findOne({ appId });
  if (!app) { res.json({ ok: false, message: "Application not found" }); return; }

  const owner = await User.findById(app.ownerId);

  // Look up AppUser first, then fall back to User
  let appUser = await AppUser.findOne({ ownerId: app.ownerId, username });
  let isAppUser = true;

  if (!appUser) {
    // Fall back to legacy User lookup
    const legacyUser = await User.findOne({ username });
    if (!legacyUser) {
      await Log.create({ ownerId: app.ownerId, action: "login.fail", description: `${username} · User not found`, ipAddress: ip, severity: "bad" });
      res.json({ ok: false, message: "User not found" }); return;
    }

    if (legacyUser.status === "banned") {
      await Log.create({ ownerId: app.ownerId, userId: legacyUser._id, action: "login.banned", description: `${username} · Banned account`, ipAddress: ip, severity: "bad" });
      res.json({ ok: false, message: "Your account has been banned" }); return;
    }

    const blacklisted = await Blacklist.findOne({ ownerId: app.ownerId, value: hwid });
    if (blacklisted) { res.json({ ok: false, message: "Your hardware ID is blacklisted" }); return; }

    const passwordMatch = await bcrypt.compare(password, legacyUser.passwordHash);
    if (!passwordMatch) {
      await Log.create({ ownerId: app.ownerId, userId: legacyUser._id, action: "login.fail", description: `${username} · Invalid password`, ipAddress: ip, severity: "bad" });
      res.json({ ok: false, message: "Invalid credentials" }); return;
    }

    if (!legacyUser.hwid) { legacyUser.hwid = hwid; await legacyUser.save(); }
    else if (legacyUser.hwid !== hwid) {
      await Log.create({ ownerId: app.ownerId, userId: legacyUser._id, action: "hwid.deny", description: `${username} · HWID mismatch`, ipAddress: ip, severity: "bad" });
      if (owner?.webhookUrl) await sendDiscordWebhook(owner.webhookUrl, "hwid.deny", username, ip, "HWID mismatch detected", { appName: app.name, hwid, pcName: pcName ?? undefined });
      res.json({ ok: false, message: "Hardware ID mismatch. Contact support." }); return;
    }

    if (legacyUser.subscriptionExpiry && legacyUser.subscriptionExpiry < new Date()) {
      res.json({ ok: false, message: "Subscription expired" }); return;
    }

    const token = uuidv4().replace(/-/g, "");
    await Session.create({ userId: legacyUser._id, ownerId: app.ownerId, token, ipAddress: ip, hwid, appId: app._id, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) });
    await Log.create({ ownerId: app.ownerId, userId: legacyUser._id, action: "login.ok", description: `${username} · Login from ${ip}`, ipAddress: ip, severity: "good" });
    if (owner?.webhookUrl) await sendDiscordWebhook(owner.webhookUrl, "login.ok", username, ip, `Successful login via ${app.name}`, { appName: app.name, hwid, pcName: pcName ?? undefined });
    res.json({ ok: true, sessionToken: token, user: { username: legacyUser.username, plan: legacyUser.plan, expiresAt: legacyUser.subscriptionExpiry?.toISOString() ?? null } });
    return;
  }

  // AppUser login
  if (appUser.status === "banned") {
    await Log.create({ ownerId: app.ownerId, userId: appUser._id, action: "login.banned", description: `${username} · Banned account`, ipAddress: ip, severity: "bad" });
    res.json({ ok: false, message: "Your account has been banned" }); return;
  }

  const blacklisted = await Blacklist.findOne({ ownerId: app.ownerId, value: hwid });
  if (blacklisted) { res.json({ ok: false, message: "Your hardware ID is blacklisted" }); return; }

  const passwordMatch = await bcrypt.compare(password, appUser.passwordHash);
  if (!passwordMatch) {
    await Log.create({ ownerId: app.ownerId, userId: appUser._id, action: "login.fail", description: `${username} · Invalid password`, ipAddress: ip, severity: "bad" });
    res.json({ ok: false, message: "Invalid credentials" }); return;
  }

  if (!appUser.bypassHwid) {
    if (!appUser.hwid) { appUser.hwid = hwid; }
    else if (appUser.hwid !== hwid) {
      await Log.create({ ownerId: app.ownerId, userId: appUser._id, action: "hwid.deny", description: `${username} · HWID mismatch`, ipAddress: ip, severity: "bad" });
      if (owner?.webhookUrl) await sendDiscordWebhook(owner.webhookUrl, "hwid.deny", username, ip, "HWID mismatch detected", { appName: app.name, hwid, pcName: pcName ?? undefined });
      res.json({ ok: false, message: "Hardware ID mismatch. Contact support." }); return;
    }
  }

  if (appUser.subscriptionExpiry && appUser.subscriptionExpiry < new Date()) {
    res.json({ ok: false, message: "Subscription expired" }); return;
  }

  appUser.lastLoginAt = new Date();
  if (!appUser.token) appUser.token = generateUserToken();
  await appUser.save();

  const sessionToken = uuidv4().replace(/-/g, "");
  await Session.create({ userId: appUser._id, ownerId: app.ownerId, token: sessionToken, ipAddress: ip, hwid, appId: app._id, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) });
  await Log.create({ ownerId: app.ownerId, userId: appUser._id, action: "login.ok", description: `${username} · Login from ${ip}`, ipAddress: ip, severity: "good" });

  if (owner?.webhookUrl) await sendDiscordWebhook(owner.webhookUrl, "login.ok", username, ip, `Successful login via ${app.name}`, { appName: app.name, hwid, pcName: pcName ?? undefined });

  res.json({ ok: true, sessionToken, user: { username: appUser.username, plan: appUser.plan, token: appUser.token, expiresAt: appUser.subscriptionExpiry?.toISOString() ?? null } });
});

router.post("/sdk/validate", async (req, res): Promise<void> => {
  const parsed = SdkValidateBody.safeParse(req.body);
  if (!parsed.success) { res.json({ ok: false, message: "Invalid request" }); return; }
  const session = await Session.findOne({ token: parsed.data.sessionToken });
  if (!session) { res.json({ ok: false, message: "Session not found" }); return; }
  if (session.expiresAt && session.expiresAt < new Date()) { res.json({ ok: false, message: "Session expired" }); return; }
  // Try AppUser first
  const appUser = await AppUser.findById(session.userId);
  if (appUser) {
    if (appUser.status === "banned") { res.json({ ok: false, message: "Account suspended" }); return; }
    res.json({ ok: true, user: { username: appUser.username, plan: appUser.plan, token: appUser.token, expiresAt: appUser.subscriptionExpiry?.toISOString() ?? null } });
    return;
  }
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
    const variable = await Variable.findOne({ appId: session.appId, name });
    if (variable) { res.json({ name, value: variable.value }); return; }
  }
  res.json({ name, value: "" });
});

export default router;
