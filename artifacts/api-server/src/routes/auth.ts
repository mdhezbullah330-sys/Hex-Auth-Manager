import { Router, type IRouter } from "express";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import { User } from "../models";
import { RegisterBody, VerifyEmailBody, LoginBody } from "@workspace/api-zod";
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
  try {
    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      res.status(400).json({ error: "Username or email already exists" });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const code = generateCode();
    const expiry = new Date(Date.now() + 15 * 60 * 1000);
    const user = await User.create({
      username, email, passwordHash,
      emailVerifyCode: code, emailVerifyExpiry: expiry,
      appId: uuidv4(), appSecret: uuidv4().replace(/-/g, ""),
      plan: "free", status: "active", role: "owner", emailVerified: false,
    });
    await sendVerificationEmail(email, code, username);
    res.status(201).json({
      ok: true, requiresVerification: true,
      message: "Verification code sent to your email",
      user: { id: user._id, username: user.username, email: user.email, plan: user.plan, status: user.status, role: user.role, emailVerified: user.emailVerified, createdAt: user.createdAt.toISOString() },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: `Registration failed: ${message}` });
  }
});

router.post("/auth/verify-email", async (req, res): Promise<void> => {
  const parsed = VerifyEmailBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { email, code } = parsed.data;
  const user = await User.findOne({ email });
  if (!user) { res.status(400).json({ error: "User not found" }); return; }
  if (user.emailVerified) { res.status(400).json({ error: "Email already verified" }); return; }
  if (user.emailVerifyCode !== code) { res.status(400).json({ error: "Invalid verification code" }); return; }
  if (user.emailVerifyExpiry && user.emailVerifyExpiry < new Date()) { res.status(400).json({ error: "Verification code expired" }); return; }
  user.emailVerified = true; user.emailVerifyCode = null; user.emailVerifyExpiry = null;
  await user.save();
  const token = generateToken(user._id.toString(), user.role);
  res.json({
    ok: true, token,
    user: { id: user._id, username: user.username, email: user.email, plan: user.plan, status: user.status, role: user.role, emailVerified: user.emailVerified, createdAt: user.createdAt.toISOString() },
  });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { identifier, password } = parsed.data;
  const user = await User.findOne({ $or: [{ email: identifier }, { username: identifier }] });
  if (!user) { res.status(401).json({ ok: false, message: "Invalid credentials" }); return; }
  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) { res.status(401).json({ ok: false, message: "Invalid credentials" }); return; }
  if (user.status === "banned") { res.status(401).json({ ok: false, message: "Your account has been banned" }); return; }
  if (!user.emailVerified) { res.status(401).json({ ok: false, message: "Please verify your email first", requiresVerification: true }); return; }
  const token = generateToken(user._id.toString(), user.role);
  res.json({
    ok: true, token,
    user: { id: user._id, username: user.username, email: user.email, plan: user.plan, status: user.status, role: user.role, emailVerified: user.emailVerified, subscriptionExpiry: user.subscriptionExpiry?.toISOString() ?? null, webhookUrl: user.webhookUrl, createdAt: user.createdAt.toISOString() },
  });
});

router.post("/auth/logout", (_req, res): void => { res.json({ ok: true, message: "Logged out" }); });

router.post("/auth/resend-code", async (req, res): Promise<void> => {
  const { email } = req.body;
  if (!email) { res.status(400).json({ error: "email required" }); return; }
  try {
    const user = await User.findOne({ email });
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    if (user.emailVerified) { res.status(400).json({ error: "Email already verified" }); return; }
    const code = generateCode();
    const expiry = new Date(Date.now() + 15 * 60 * 1000);
    user.emailVerifyCode = code; user.emailVerifyExpiry = expiry;
    await user.save();
    await sendVerificationEmail(email, code, user.username);
    res.json({ ok: true, message: "Verification code resent" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: `Failed to resend: ${message}` });
  }
});

router.get("/auth/dev-code", async (req, res): Promise<void> => {
  if (process.env.NODE_ENV === "production") { res.status(404).json({ error: "Not available" }); return; }
  const email = req.query.email as string;
  if (!email) { res.status(400).json({ error: "email query param required" }); return; }
  const user = await User.findOne({ email }).select("emailVerifyCode emailVerified");
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  if (user.emailVerified) { res.json({ verified: true, code: null }); return; }
  res.json({ verified: false, code: user.emailVerifyCode });
});

router.get("/auth/me", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = await User.findById(req.userId);
  if (!user) { res.status(401).json({ error: "User not found" }); return; }
  res.json({ id: user._id, username: user.username, email: user.email, plan: user.plan, status: user.status, role: user.role, emailVerified: user.emailVerified, subscriptionExpiry: user.subscriptionExpiry?.toISOString() ?? null, webhookUrl: user.webhookUrl, createdAt: user.createdAt.toISOString() });
});

export default router;
