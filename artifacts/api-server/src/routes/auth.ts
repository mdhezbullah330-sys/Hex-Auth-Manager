import { Router, type IRouter } from "express";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import { eq, or } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import {
  RegisterBody,
  VerifyEmailBody,
  LoginBody,
} from "@workspace/api-zod";
import { generateToken, requireAuth, type AuthRequest } from "../middlewares/auth";
import { sendVerificationEmail } from "../lib/email";

const router: IRouter = Router();

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { username, email, password } = parsed.data;

  const existing = await db
    .select()
    .from(usersTable)
    .where(or(eq(usersTable.email, email), eq(usersTable.username, username)))
    .limit(1);

  if (existing.length > 0) {
    res.status(400).json({ error: "Username or email already exists" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const code = generateCode();
  const expiry = new Date(Date.now() + 15 * 60 * 1000);

  const appId = uuidv4();
  const appSecret = uuidv4().replace(/-/g, "");

  const [user] = await db
    .insert(usersTable)
    .values({
      username,
      email,
      passwordHash,
      emailVerifyCode: code,
      emailVerifyExpiry: expiry,
      appId,
      appSecret,
      plan: "free",
      status: "active",
      role: "owner",
      emailVerified: false,
    })
    .returning();

  await sendVerificationEmail(email, code);

  res.status(201).json({
    ok: true,
    requiresVerification: true,
    message: "Verification code sent to your email",
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      plan: user.plan,
      status: user.status,
      role: user.role,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt.toISOString(),
    },
  });
});

router.post("/auth/verify-email", async (req, res): Promise<void> => {
  const parsed = VerifyEmailBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, code } = parsed.data;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  if (!user) {
    res.status(400).json({ error: "User not found" });
    return;
  }

  if (user.emailVerified) {
    res.status(400).json({ error: "Email already verified" });
    return;
  }

  if (user.emailVerifyCode !== code) {
    res.status(400).json({ error: "Invalid verification code" });
    return;
  }

  if (user.emailVerifyExpiry && user.emailVerifyExpiry < new Date()) {
    res.status(400).json({ error: "Verification code expired" });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set({ emailVerified: true, emailVerifyCode: null, emailVerifyExpiry: null })
    .where(eq(usersTable.id, user.id))
    .returning();

  const token = generateToken(updated.id, updated.role);

  res.json({
    ok: true,
    token,
    user: {
      id: updated.id,
      username: updated.username,
      email: updated.email,
      plan: updated.plan,
      status: updated.status,
      role: updated.role,
      emailVerified: updated.emailVerified,
      createdAt: updated.createdAt.toISOString(),
    },
  });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { identifier, password } = parsed.data;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(or(eq(usersTable.email, identifier), eq(usersTable.username, identifier)))
    .limit(1);

  if (!user) {
    res.status(401).json({ ok: false, message: "Invalid credentials" });
    return;
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) {
    res.status(401).json({ ok: false, message: "Invalid credentials" });
    return;
  }

  if (user.status === "banned") {
    res.status(401).json({ ok: false, message: "Your account has been banned" });
    return;
  }

  if (!user.emailVerified) {
    res.status(401).json({ ok: false, message: "Please verify your email first", requiresVerification: true });
    return;
  }

  const token = generateToken(user.id, user.role);

  res.json({
    ok: true,
    token,
    user: {
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
    },
  });
});

router.post("/auth/logout", (_req, res): void => {
  res.json({ ok: true, message: "Logged out" });
});

// Dev-only endpoint: returns verification code from DB when SMTP is not configured.
// Never exposed when SMTP_USER is set (production mode).
router.get("/auth/dev-code", async (req, res): Promise<void> => {
  if (process.env.SMTP_USER) {
    res.status(404).json({ error: "Not available" });
    return;
  }

  const email = req.query.email as string;
  if (!email) {
    res.status(400).json({ error: "email query param required" });
    return;
  }

  const [user] = await db
    .select({ code: usersTable.emailVerifyCode, verified: usersTable.emailVerified })
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (user.verified) {
    res.json({ verified: true, code: null });
    return;
  }

  res.json({ verified: false, code: user.code });
});

router.get("/auth/me", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.userId!))
    .limit(1);

  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

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

export default router;
