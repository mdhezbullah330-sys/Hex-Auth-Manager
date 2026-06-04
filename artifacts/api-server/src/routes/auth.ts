import { Router, type IRouter } from "express";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import { User, PendingRegistration, AccountLog } from "../models";
import { RegisterBody, VerifyEmailBody, LoginBody } from "@workspace/api-zod";
import { generateToken, requireAuth, type AuthRequest } from "../middlewares/auth";
import { sendVerificationEmail, sendPasswordResetEmail } from "../lib/email";

const router: IRouter = Router();

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ── Register ──────────────────────────────────────────────────────────────────
router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { username, email, password } = parsed.data;

  try {
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      if (existingUser.email === email) {
        res.status(400).json({ error: "This email is already registered. Please sign in.", code: "EMAIL_EXISTS" });
      } else {
        res.status(400).json({ error: "This username is already taken. Please choose another.", code: "USERNAME_EXISTS" });
      }
      return;
    }

    const existing = await PendingRegistration.findOne({ email });
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    if (existing) {
      existing.code = code;
      existing.expiresAt = expiresAt;
      await existing.save();

      let emailSent = true;
      try {
        await sendVerificationEmail(email, code, existing.username);
      } catch {
        emailSent = false;
      }

      res.status(201).json({
        ok: true,
        requiresVerification: true,
        emailSent,
        message: emailSent
          ? "A new verification code has been sent to your email."
          : "Code updated. Email could not be sent — please use 'Resend code' on the verify page.",
      });
      return;
    }

    const pendingUsername = await PendingRegistration.findOne({ username });
    if (pendingUsername) {
      res.status(400).json({ error: "This username is already taken. Please choose another.", code: "USERNAME_EXISTS" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const pending = new PendingRegistration({ username, email, passwordHash, code, expiresAt });
    await pending.save();

    let emailSent = true;
    try {
      await sendVerificationEmail(email, code, username);
    } catch {
      emailSent = false;
    }

    res.status(201).json({
      ok: true,
      requiresVerification: true,
      emailSent,
      message: emailSent
        ? "Verification code sent to your email. Please check your inbox."
        : "Account created. Email could not be sent — please use 'Resend code' on the verify page.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: `Registration failed: ${message}` });
  }
});

// ── Verify Email ──────────────────────────────────────────────────────────────
router.post("/auth/verify-email", async (req, res): Promise<void> => {
  const parsed = VerifyEmailBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { email, code } = parsed.data;

  const pending = await PendingRegistration.findOne({ email });
  if (pending) {
    if (pending.code !== code) {
      res.status(400).json({ error: "Invalid verification code." }); return;
    }
    if (pending.expiresAt < new Date()) {
      await PendingRegistration.deleteOne({ email });
      res.status(400).json({ error: "Verification code has expired. Please register again." }); return;
    }

    try {
      const user = await User.create({
        username: pending.username,
        email: pending.email,
        passwordHash: pending.passwordHash,
        appId: uuidv4(),
        appSecret: uuidv4().replace(/-/g, ""),
        plan: "free",
        status: "active",
        role: "owner",
        emailVerified: true,
      });

      await PendingRegistration.deleteOne({ email });

      const token = generateToken(user._id.toString(), user.role);
      res.json({
        ok: true, token,
        user: { id: user._id, username: user.username, email: user.email, plan: user.plan, status: user.status, role: user.role, emailVerified: user.emailVerified, createdAt: user.createdAt.toISOString() },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(500).json({ error: `Account creation failed: ${message}` });
    }
    return;
  }

  const user = await User.findOne({ email });
  if (!user) { res.status(400).json({ error: "No pending registration found. Please register first." }); return; }
  if (user.emailVerified) { res.status(400).json({ error: "Email is already verified. Please sign in." }); return; }
  res.status(400).json({ error: "Invalid or expired verification code." });
});

// ── Login ─────────────────────────────────────────────────────────────────────
router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { identifier, password } = parsed.data;

  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.ip ?? "unknown";
  const userAgent = req.headers["user-agent"] ?? "unknown";

  const user = await User.findOne({ $or: [{ email: identifier }, { username: identifier }] });
  if (!user) {
    const pending = await PendingRegistration.findOne({ $or: [{ email: identifier }, { username: identifier }] });
    if (pending) {
      const passwordMatch = await bcrypt.compare(password, pending.passwordHash);
      if (!passwordMatch) {
        res.status(401).json({ ok: false, message: "Invalid credentials" }); return;
      }
      const code = generateCode();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      try {
        await sendVerificationEmail(pending.email, code, pending.username);
        pending.code = code;
        pending.expiresAt = expiresAt;
        await pending.save();
      } catch {
        // silently continue
      }
      res.status(401).json({ ok: false, message: "Please verify your email first. A new code has been sent.", requiresVerification: true, email: pending.email });
      return;
    }
    res.status(401).json({ ok: false, message: "Invalid credentials" }); return;
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) { res.status(401).json({ ok: false, message: "Invalid credentials" }); return; }
  if (user.status === "banned") { res.status(401).json({ ok: false, message: "Your account has been banned" }); return; }

  // Log this dashboard login for account logs
  try {
    await AccountLog.create({ userId: user._id, ipAddress: ip, userAgent });
  } catch {
    // non-blocking
  }

  const token = generateToken(user._id.toString(), user.role);
  res.json({
    ok: true, token,
    user: { id: user._id, username: user.username, email: user.email, plan: user.plan, status: user.status, role: user.role, emailVerified: user.emailVerified, subscriptionExpiry: user.subscriptionExpiry?.toISOString() ?? null, webhookUrl: user.webhookUrl, createdAt: user.createdAt.toISOString() },
  });
});

router.post("/auth/logout", (_req, res): void => { res.json({ ok: true, message: "Logged out" }); });

// ── Resend Code ───────────────────────────────────────────────────────────────
router.post("/auth/resend-code", async (req, res): Promise<void> => {
  const { email } = req.body;
  if (!email) { res.status(400).json({ error: "email required" }); return; }

  try {
    const pending = await PendingRegistration.findOne({ email });
    if (!pending) {
      const user = await User.findOne({ email });
      if (user?.emailVerified) {
        res.status(400).json({ error: "Email is already verified. Please sign in." }); return;
      }
      res.status(404).json({ error: "No pending registration found. Please register first." }); return;
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    pending.code = code;
    pending.expiresAt = expiresAt;
    await pending.save();

    let emailSent = true;
    try {
      await sendVerificationEmail(email, code, pending.username);
    } catch {
      emailSent = false;
    }

    res.json({ ok: true, emailSent, message: emailSent ? "Verification code resent" : "Code updated. Email could not be sent — check server logs." });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: `Failed to resend: ${message}` });
  }
});

// ── Forgot Password ───────────────────────────────────────────────────────────
router.post("/auth/forgot-password", async (req, res): Promise<void> => {
  const { email } = req.body;
  if (!email) { res.status(400).json({ error: "Email is required" }); return; }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      res.json({ ok: true, emailSent: false, message: "If that email exists, a reset code has been sent." });
      return;
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    user.passwordResetCode = code;
    user.passwordResetExpiry = expiresAt;
    await user.save();

    let emailSent = true;
    try {
      await sendPasswordResetEmail(email, code, user.username);
    } catch {
      emailSent = false;
    }

    res.json({ ok: true, emailSent, message: emailSent ? "Password reset code sent to your email." : "Code generated but email could not be sent." });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: `Failed: ${message}` });
  }
});

// ── Reset Password ────────────────────────────────────────────────────────────
router.post("/auth/reset-password", async (req, res): Promise<void> => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) {
    res.status(400).json({ error: "email, code, and newPassword are required" }); return;
  }
  if (newPassword.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" }); return;
  }

  try {
    const user = await User.findOne({ email });
    if (!user || !user.passwordResetCode || !user.passwordResetExpiry) {
      res.status(400).json({ error: "Invalid or expired reset code. Please request a new one." }); return;
    }
    if (user.passwordResetCode !== code) {
      res.status(400).json({ error: "Invalid reset code." }); return;
    }
    if (user.passwordResetExpiry < new Date()) {
      user.passwordResetCode = null;
      user.passwordResetExpiry = null;
      await user.save();
      res.status(400).json({ error: "Reset code has expired. Please request a new one." }); return;
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.passwordResetCode = null;
    user.passwordResetExpiry = null;
    await user.save();

    res.json({ ok: true, message: "Password reset successfully. You can now sign in." });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: `Failed: ${message}` });
  }
});

// ── Dev Code (development only) ───────────────────────────────────────────────
router.get("/auth/dev-code", async (req, res): Promise<void> => {
  if (process.env.NODE_ENV === "production") { res.status(404).json({ error: "Not available" }); return; }
  const email = req.query.email as string;
  if (!email) { res.status(400).json({ error: "email query param required" }); return; }

  const pending = await PendingRegistration.findOne({ email });
  if (pending) {
    res.json({ verified: false, code: pending.code }); return;
  }

  const user = await User.findOne({ email }).select("emailVerified passwordResetCode");
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json({ verified: user.emailVerified, code: null, resetCode: user.passwordResetCode });
});

// ── Me ────────────────────────────────────────────────────────────────────────
router.get("/auth/me", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = await User.findById(req.userId);
  if (!user) { res.status(401).json({ error: "User not found" }); return; }
  res.json({ id: user._id, username: user.username, email: user.email, plan: user.plan, status: user.status, role: user.role, emailVerified: user.emailVerified, subscriptionExpiry: user.subscriptionExpiry?.toISOString() ?? null, webhookUrl: user.webhookUrl, createdAt: user.createdAt.toISOString() });
});

// ── Account Logs ──────────────────────────────────────────────────────────────
router.get("/auth/account-logs", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const { Types } = await import("mongoose");
    const logs = await AccountLog.find({ userId: new Types.ObjectId(req.userId) })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(logs.map(l => ({
      id: l._id,
      ipAddress: l.ipAddress,
      userAgent: l.userAgent,
      createdAt: l.createdAt.toISOString(),
    })));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch logs" });
  }
});

// ── My Teams ──────────────────────────────────────────────────────────────────
router.get("/auth/my-teams", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { TeamMember } = await import("../models");
  const memberships = await TeamMember.find({ userId: new (await import("mongoose")).Types.ObjectId(req.userId), status: "accepted" });
  const result = await Promise.all(memberships.map(async (m) => {
    const owner = await User.findById(m.ownerId).select("username email");
    if (!owner) return null;
    return {
      ownerId: owner._id.toString(),
      ownerUsername: owner.username,
      ownerEmail: owner.email,
      role: m.role,
      joinedAt: (m.joinedAt ?? m.createdAt).toISOString(),
    };
  }));
  res.json(result.filter(Boolean));
});

export default router;
