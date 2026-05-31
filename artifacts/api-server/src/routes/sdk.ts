import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import { db, usersTable, sessionsTable, appsTable, logsTable, variablesTable, blacklistTable } from "@workspace/db";
import { SdkLoginBody, SdkValidateBody } from "@workspace/api-zod";
import { sendDiscordWebhook } from "../lib/discord";

const router: IRouter = Router();

router.post("/sdk/login", async (req, res): Promise<void> => {
  const parsed = SdkLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ ok: false, message: "Invalid request" });
    return;
  }

  const { appId, username, password, hwid, version } = parsed.data;
  const ip = req.ip ?? "unknown";

  // Find the app
  const [app] = await db.select().from(appsTable).where(eq(appsTable.appId, appId)).limit(1);
  if (!app) {
    res.json({ ok: false, message: "Application not found" });
    return;
  }

  // Find user
  const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);
  if (!user) {
    await db.insert(logsTable).values({
      ownerId: app.ownerId,
      action: "login.fail",
      description: `${username} · User not found`,
      ipAddress: ip,
      severity: "bad",
    });
    res.json({ ok: false, message: "User not found" });
    return;
  }

  // Check if banned
  if (user.status === "banned") {
    await db.insert(logsTable).values({
      ownerId: app.ownerId,
      userId: user.id,
      action: "login.banned",
      description: `${username} · Banned account`,
      ipAddress: ip,
      severity: "bad",
    });
    res.json({ ok: false, message: "Your account has been banned" });
    return;
  }

  // Check blacklist
  const [blacklisted] = await db
    .select()
    .from(blacklistTable)
    .where(eq(blacklistTable.value, hwid))
    .limit(1);

  if (blacklisted) {
    res.json({ ok: false, message: "Your hardware ID is blacklisted" });
    return;
  }

  // Check password
  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) {
    await db.insert(logsTable).values({
      ownerId: app.ownerId,
      userId: user.id,
      action: "login.fail",
      description: `${username} · Invalid password`,
      ipAddress: ip,
      severity: "bad",
    });
    res.json({ ok: false, message: "Invalid credentials" });
    return;
  }

  // HWID binding
  if (!user.hwid) {
    await db.update(usersTable).set({ hwid }).where(eq(usersTable.id, user.id));
  } else if (user.hwid !== hwid) {
    await db.insert(logsTable).values({
      ownerId: app.ownerId,
      userId: user.id,
      action: "hwid.deny",
      description: `${username} · HWID mismatch`,
      ipAddress: ip,
      severity: "bad",
    });

    const [owner] = await db.select().from(usersTable).where(eq(usersTable.id, app.ownerId)).limit(1);
    if (owner?.webhookUrl) {
      await sendDiscordWebhook(owner.webhookUrl, "hwid.deny", username, ip, "HWID mismatch detected");
    }

    res.json({ ok: false, message: "Hardware ID mismatch. Contact support." });
    return;
  }

  // Check subscription expiry
  if (user.subscriptionExpiry && user.subscriptionExpiry < new Date()) {
    res.json({ ok: false, message: "Subscription expired" });
    return;
  }

  // Create session
  const token = uuidv4().replace(/-/g, "");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await db.insert(sessionsTable).values({
    userId: user.id,
    ownerId: app.ownerId,
    token,
    ipAddress: ip,
    hwid,
    appId: app.id,
    expiresAt,
  });

  await db.insert(logsTable).values({
    ownerId: app.ownerId,
    userId: user.id,
    action: "login.ok",
    description: `${username} · Login from ${ip}`,
    ipAddress: ip,
    severity: "good",
  });

  const [owner] = await db.select().from(usersTable).where(eq(usersTable.id, app.ownerId)).limit(1);
  if (owner?.webhookUrl) {
    await sendDiscordWebhook(owner.webhookUrl, "login.ok", username, ip, `Successful login`);
  }

  res.json({
    ok: true,
    sessionToken: token,
    user: {
      username: user.username,
      plan: user.plan,
      expiresAt: user.subscriptionExpiry?.toISOString() ?? null,
    },
  });
});

router.post("/sdk/validate", async (req, res): Promise<void> => {
  const parsed = SdkValidateBody.safeParse(req.body);
  if (!parsed.success) {
    res.json({ ok: false, message: "Invalid request" });
    return;
  }

  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.token, parsed.data.sessionToken))
    .limit(1);

  if (!session) {
    res.json({ ok: false, message: "Session not found" });
    return;
  }

  if (session.expiresAt && session.expiresAt < new Date()) {
    res.json({ ok: false, message: "Session expired" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);

  if (!user || user.status === "banned") {
    res.json({ ok: false, message: "Account suspended" });
    return;
  }

  res.json({
    ok: true,
    user: {
      username: user.username,
      plan: user.plan,
      expiresAt: user.subscriptionExpiry?.toISOString() ?? null,
    },
  });
});

router.get("/sdk/variable/:name", async (req, res): Promise<void> => {
  const { name } = req.params;
  const sessionToken = req.headers.authorization?.replace("Bearer ", "");

  if (!sessionToken) {
    res.status(401).json({ name, value: "" });
    return;
  }

  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.token, sessionToken))
    .limit(1);

  if (!session) {
    res.status(401).json({ name, value: "" });
    return;
  }

  if (session.appId) {
    const [variable] = await db
      .select()
      .from(variablesTable)
      .where(eq(variablesTable.name, name))
      .limit(1);

    if (variable) {
      res.json({ name: variable.name, value: variable.value });
      return;
    }
  }

  res.json({ name, value: "" });
});

export default router;
