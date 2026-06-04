import { Router, type IRouter } from "express";
import { Blacklist } from "../models";
import { AddBlacklistBody } from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { Types } from "mongoose";

const router: IRouter = Router();

router.get("/blacklist", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const entries = await Blacklist.find({ ownerId: new Types.ObjectId(req.workspaceId!) });
  res.json(entries.map((e) => ({ id: e._id, type: e.type, value: e.value, reason: e.reason ?? null, createdAt: e.createdAt.toISOString() })));
});

router.post("/blacklist", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const parsed = AddBlacklistBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const entry = await Blacklist.create({ ownerId: new Types.ObjectId(req.workspaceId!), type: parsed.data.type, value: parsed.data.value, reason: parsed.data.reason ?? null });
  res.status(201).json({ id: entry._id, type: entry.type, value: entry.value, reason: entry.reason ?? null, createdAt: entry.createdAt.toISOString() });
});

router.delete("/blacklist/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const entry = await Blacklist.findOneAndDelete({ _id: req.params.id, ownerId: new Types.ObjectId(req.workspaceId!) });
  if (!entry) { res.status(404).json({ error: "Entry not found" }); return; }
  res.json({ ok: true, message: "Entry removed" });
});

export default router;
