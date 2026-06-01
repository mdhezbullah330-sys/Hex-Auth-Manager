import { Router, type IRouter } from "express";
import { License, User, Log } from "../models";
import { GenerateLicenseBody, RedeemLicenseBody } from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { Types } from "mongoose";

const router: IRouter = Router();

function generateKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const segment = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `HEX-${segment()}-${segment()}-${segment()}`;
}

function formatLicense(lic: any, username?: string) {
  return { id: lic._id, key: lic.key, status: lic.status, plan: lic.plan, expiresAt: lic.expiresAt?.toISOString() ?? null, usedBy: lic.usedBy ?? null, usedByUsername: username ?? null, createdAt: lic.createdAt.toISOString() };
}

router.get("/licenses", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const licenses = await License.find({ ownerId: new Types.ObjectId(req.userId) }).sort({ createdAt: 1 });
  const withUsernames = await Promise.all(licenses.map(async (lic) => {
    let username: string | undefined;
    if (lic.usedBy) { const user = await User.findById(lic.usedBy).select("username"); username = user?.username; }
    return formatLicense(lic, username);
  }));
  res.json(withUsernames);
});

router.post("/licenses/generate", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const parsed = GenerateLicenseBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const quantity = parsed.data.quantity ?? 1;
  const keys = [];
  for (let i = 0; i < quantity; i++) {
    const lic = await License.create({ ownerId: new Types.ObjectId(req.userId), key: generateKey(), plan: parsed.data.plan, status: "active", expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null });
    keys.push(lic);
  }
  res.status(201).json(formatLicense(keys[0]));
});

router.post("/licenses/redeem", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const parsed = RedeemLicenseBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const lic = await License.findOne({ key: parsed.data.key.toUpperCase() });
  if (!lic) { res.status(400).json({ error: "License key not found" }); return; }
  if (lic.status === "used") { res.status(400).json({ error: "License key has already been used" }); return; }
  if (lic.expiresAt && lic.expiresAt < new Date()) { res.status(400).json({ error: "License key has expired" }); return; }
  lic.status = "used"; lic.usedBy = new Types.ObjectId(req.userId); lic.usedAt = new Date(); await lic.save();
  const user = await User.findByIdAndUpdate(req.userId, { plan: lic.plan }, { new: true });
  await Log.create({ ownerId: lic.ownerId, userId: new Types.ObjectId(req.userId), action: "license.redeem", description: `${user?.username ?? "user"} redeemed license key for plan: ${lic.plan}`, ipAddress: req.ip ?? null, severity: "good" });
  res.json(formatLicense(lic, user?.username));
});

router.delete("/licenses/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const lic = await License.findByIdAndDelete(req.params.id);
  if (!lic) { res.status(404).json({ error: "License not found" }); return; }
  res.json({ ok: true, message: "License deleted" });
});

export default router;
