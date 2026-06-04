import { Router, type IRouter } from "express";
import { v4 as uuidv4 } from "uuid";
import { App, Session } from "../models";
import { CreateAppBody, UpdateAppBody } from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { Types } from "mongoose";

const router: IRouter = Router();

router.get("/apps", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const apps = await App.find({ ownerId: new Types.ObjectId(req.workspaceId!) });
  const result = await Promise.all(apps.map(async (app) => {
    const userCount = await Session.countDocuments({ appId: app._id, ownerId: app.ownerId });
    return { id: app._id, name: app.name, version: app.version, apiToken: app.apiToken, appId: app.appId, appSecret: app.appSecret, status: app.status, userCount, createdAt: app.createdAt.toISOString() };
  }));
  res.json(result);
});

router.post("/apps", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const parsed = CreateAppBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const app = await App.create({
    ownerId: new Types.ObjectId(req.workspaceId!),
    name: parsed.data.name, version: parsed.data.version || "1.0",
    apiToken: uuidv4().replace(/-/g, ""), appId: uuidv4(), appSecret: uuidv4().replace(/-/g, ""), status: "active",
  });
  res.status(201).json({ id: app._id, name: app.name, version: app.version, apiToken: app.apiToken, appId: app.appId, appSecret: app.appSecret, status: app.status, userCount: 0, createdAt: app.createdAt.toISOString() });
});

router.get("/apps/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const app = await App.findOne({ _id: req.params.id, ownerId: new Types.ObjectId(req.workspaceId!) });
  if (!app) { res.status(404).json({ error: "App not found" }); return; }
  res.json({ id: app._id, name: app.name, version: app.version, apiToken: app.apiToken, appId: app.appId, appSecret: app.appSecret, status: app.status, userCount: 0, createdAt: app.createdAt.toISOString() });
});

router.put("/apps/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const parsed = UpdateAppBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const app = await App.findOneAndUpdate({ _id: req.params.id, ownerId: new Types.ObjectId(req.workspaceId!) }, parsed.data, { new: true });
  if (!app) { res.status(404).json({ error: "App not found" }); return; }
  res.json({ id: app._id, name: app.name, version: app.version, apiToken: app.apiToken, appId: app.appId, appSecret: app.appSecret, status: app.status, userCount: 0, createdAt: app.createdAt.toISOString() });
});

router.delete("/apps/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const app = await App.findOneAndDelete({ _id: req.params.id, ownerId: new Types.ObjectId(req.workspaceId!) });
  if (!app) { res.status(404).json({ error: "App not found" }); return; }
  res.json({ ok: true, message: "App deleted" });
});

router.post("/apps/:id/rotate-token", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const app = await App.findOneAndUpdate(
    { _id: req.params.id, ownerId: new Types.ObjectId(req.workspaceId!) },
    { apiToken: uuidv4().replace(/-/g, ""), appSecret: uuidv4().replace(/-/g, "") },
    { new: true }
  );
  if (!app) { res.status(404).json({ error: "App not found" }); return; }
  res.json({ id: app._id, name: app.name, version: app.version, apiToken: app.apiToken, appId: app.appId, appSecret: app.appSecret, status: app.status, userCount: 0, createdAt: app.createdAt.toISOString() });
});

export default router;
