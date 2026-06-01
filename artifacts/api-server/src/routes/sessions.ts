import { Router, type IRouter } from "express";
import { Session, User } from "../models";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { Types } from "mongoose";

const router: IRouter = Router();

router.get("/sessions", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const sessions = await Session.find({ ownerId: new Types.ObjectId(req.userId) });
  const enriched = await Promise.all(sessions.map(async (s) => {
    const user = await User.findById(s.userId).select("username");
    return { id: s._id, userId: s.userId, username: user?.username ?? "unknown", ipAddress: s.ipAddress ?? "", hwid: s.hwid ?? null, appId: s.appId ?? null, expiresAt: s.expiresAt?.toISOString() ?? null, createdAt: s.createdAt.toISOString() };
  }));
  res.json(enriched);
});

router.delete("/sessions/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const session = await Session.findOneAndDelete({ _id: req.params.id, ownerId: new Types.ObjectId(req.userId) });
  if (!session) { res.status(404).json({ error: "Session not found" }); return; }
  res.json({ ok: true, message: "Session killed" });
});

export default router;
