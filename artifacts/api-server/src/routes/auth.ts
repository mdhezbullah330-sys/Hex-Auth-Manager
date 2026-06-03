import { Router, type IRouter } from "express";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import { User, PendingRegistration } from "../models";
import { RegisterBody, VerifyEmailBody, LoginBody } from "@workspace/api-zod";
import { generateToken, requireAuth, type AuthRequest } from "../middlewares/auth";
import { sendVerificationEmail } from "../lib/email";

const router: IRouter = Router();

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ── Register ──────────────────────────────────────────────────────────────────
// Saves to PendingRegistration only. Real User is created AFTER email is verified.
router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { username, email, password } = parsed.data;

  try {
    // Check if a verified account already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      if (existingUser.email === email) {
        res.status(400).json({ error: "This email is already registered. Please sign in.", code: "EMAIL_EXISTS" });
      } else {
        res.status(400).json({ error: "This username is already taken. Please choose another.", code: "USERNAME_EXISTS" });
      }
      return;
    }

    // If a pending registration exists for this email, regenerate code & resend
    const existing = await PendingRegistration.findOne({ email });
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    if (existing) {
      // Update the code and expiry, keep the same hashed password
      existing.code = code;
      existing.expiresAt = expiresAt;
      await existing.save();

      try {
        await sendVerificationEmail(email, code, existing.username);
      } catch {
        // Email failed — delete pending so user can try again
        await PendingRegistration.deleteOne({ email });
        res.status(500).json({ error: "Failed to send verification email. Please try again." });
        return;
      }

      res.status(201).json({
        ok: true,
        requiresVerification: true,
        message: "A new verification code has been sent to your email.",
      });
      return;
    }

    // Check username uniqueness in pending too
    const pendingUsername = await PendingRegistration.findOne({ username });
    if (pendingUsername) {
      res.status(400).json({ error: "This username is already taken. Please choose another.", code: "USERNAME_EXISTS" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Try sending email BEFORE saving anything to DB
    const pending = new PendingRegistration({ username, email, passwordHash, code, expiresAt });

    try {
      await sendVerificationEmail(email, code, username);
    } catch {
      res.status(500).json({ error: "Failed to send verification email. Please check your email address and try again." });
      return;
    }

    // Email sent successfully — now save to pending collection
    await pending.save();

    res.status(201).json({
      ok: true,
      requiresVerification: true,
      message: "Verification code sent to your email. Please check your inbox.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: `Registration failed: ${message}` });
  }
});

// ── Verify Email ──────────────────────────────────────────────────────────────
// Creates the real User only after the OTP code is confirmed.
router.post("/auth/verify-email", async (req, res): Promise<void> => {
  const parsed = VerifyEmailBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { email, code } = parsed.data;

  // Check pending registrations first
  const pending = await PendingRegistration.findOne({ email });
  if (pending) {
    if (pending.code !== code) {
      res.status(400).json({ error: "Invalid verification code." }); return;
    }
    if (pending.expiresAt < new Date()) {
      await PendingRegistration.deleteOne({ email });
      res.status(400).json({ error: "Verification code has expired. Please register again." }); return;
    }

    // Code is valid — create the real user now
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

      // Remove the pending record
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

  // Fallback: check if already verified user exists (e.g. re-verification attempt)
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

  const user = await User.findOne({ $or: [{ email: identifier }, { username: identifier }] });
  if (!user) {
    // Check if there's a pending registration — auto-resend code and redirect
    const pending = await PendingRegistration.findOne({ $or: [{ email: identifier }, { username: identifier }] });
    if (pending) {
      // Verify password matches what they registered with
      const passwordMatch = await bcrypt.compare(password, pending.passwordHash);
      if (!passwordMatch) {
        res.status(401).json({ ok: false, message: "Invalid credentials" }); return;
      }
      // Auto-resend a fresh code
      const code = generateCode();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      try {
        await sendVerificationEmail(pending.email, code, pending.username);
        pending.code = code;
        pending.expiresAt = expiresAt;
        await pending.save();
      } catch {
        // Silently continue — still redirect to verify page
      }
      res.status(401).json({ ok: false, message: "Please verify your email first. A new code has been sent.", requiresVerification: true, email: pending.email });
      return;
    }
    res.status(401).json({ ok: false, message: "Invalid credentials" }); return;
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) { res.status(401).json({ ok: false, message: "Invalid credentials" }); return; }
  if (user.status === "banned") { res.status(401).json({ ok: false, message: "Your account has been banned" }); return; }

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
      // Check if already verified
      const user = await User.findOne({ email });
      if (user?.emailVerified) {
        res.status(400).json({ error: "Email is already verified. Please sign in." }); return;
      }
      res.status(404).json({ error: "No pending registration found. Please register first." }); return;
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    try {
      await sendVerificationEmail(email, code, pending.username);
    } catch {
      res.status(500).json({ error: "Failed to send verification email. Please try again." }); return;
    }

    // Update code only after email confirms sent
    pending.code = code;
    pending.expiresAt = expiresAt;
    await pending.save();

    res.json({ ok: true, message: "Verification code resent" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: `Failed to resend: ${message}` });
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

  const user = await User.findOne({ email }).select("emailVerified");
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json({ verified: user.emailVerified, code: null });
});

// ── Me ────────────────────────────────────────────────────────────────────────
router.get("/auth/me", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = await User.findById(req.userId);
  if (!user) { res.status(401).json({ error: "User not found" }); return; }
  res.json({ id: user._id, username: user.username, email: user.email, plan: user.plan, status: user.status, role: user.role, emailVerified: user.emailVerified, subscriptionExpiry: user.subscriptionExpiry?.toISOString() ?? null, webhookUrl: user.webhookUrl, createdAt: user.createdAt.toISOString() });
});

// ── My Teams ──────────────────────────────────────────────────────────────────
// Returns workspaces the logged-in user is a member of (not their own)
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
