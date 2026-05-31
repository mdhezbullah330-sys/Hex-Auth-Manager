import { Router, type IRouter } from "express";
import { v4 as uuidv4 } from "uuid";
import { eq, and, count } from "drizzle-orm";
import { db, appsTable, sessionsTable } from "@workspace/db";
import {
  CreateAppBody,
  GetAppParams,
  UpdateAppParams,
  UpdateAppBody,
  DeleteAppParams,
  RotateAppTokenParams,
} from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/apps", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const apps = await db
    .select()
    .from(appsTable)
    .where(eq(appsTable.ownerId, req.userId!));

  const appsWithCount = await Promise.all(
    apps.map(async (app) => {
      const [sessionCount] = await db
        .select({ count: count() })
        .from(sessionsTable)
        .where(and(eq(sessionsTable.appId, app.id), eq(sessionsTable.ownerId, req.userId!)));
      return {
        id: app.id,
        name: app.name,
        version: app.version,
        apiToken: app.apiToken,
        appId: app.appId,
        appSecret: app.appSecret,
        status: app.status,
        userCount: sessionCount?.count ?? 0,
        createdAt: app.createdAt.toISOString(),
      };
    })
  );

  res.json(appsWithCount);
});

router.post("/apps", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const parsed = CreateAppBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const apiToken = uuidv4().replace(/-/g, "");
  const appId = uuidv4();
  const appSecret = uuidv4().replace(/-/g, "");

  const [app] = await db
    .insert(appsTable)
    .values({
      ownerId: req.userId!,
      name: parsed.data.name,
      version: parsed.data.version || "1.0",
      apiToken,
      appId,
      appSecret,
      status: "active",
    })
    .returning();

  res.status(201).json({
    id: app.id,
    name: app.name,
    version: app.version,
    apiToken: app.apiToken,
    appId: app.appId,
    appSecret: app.appSecret,
    status: app.status,
    userCount: 0,
    createdAt: app.createdAt.toISOString(),
  });
});

router.get("/apps/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = GetAppParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [app] = await db
    .select()
    .from(appsTable)
    .where(and(eq(appsTable.id, params.data.id), eq(appsTable.ownerId, req.userId!)))
    .limit(1);

  if (!app) {
    res.status(404).json({ error: "App not found" });
    return;
  }

  res.json({
    id: app.id,
    name: app.name,
    version: app.version,
    apiToken: app.apiToken,
    appId: app.appId,
    appSecret: app.appSecret,
    status: app.status,
    userCount: 0,
    createdAt: app.createdAt.toISOString(),
  });
});

router.put("/apps/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = UpdateAppParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateAppBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [app] = await db
    .update(appsTable)
    .set(parsed.data)
    .where(and(eq(appsTable.id, params.data.id), eq(appsTable.ownerId, req.userId!)))
    .returning();

  if (!app) {
    res.status(404).json({ error: "App not found" });
    return;
  }

  res.json({
    id: app.id,
    name: app.name,
    version: app.version,
    apiToken: app.apiToken,
    appId: app.appId,
    appSecret: app.appSecret,
    status: app.status,
    userCount: 0,
    createdAt: app.createdAt.toISOString(),
  });
});

router.delete("/apps/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = DeleteAppParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [app] = await db
    .delete(appsTable)
    .where(and(eq(appsTable.id, params.data.id), eq(appsTable.ownerId, req.userId!)))
    .returning();

  if (!app) {
    res.status(404).json({ error: "App not found" });
    return;
  }

  res.json({ ok: true, message: "App deleted" });
});

router.post("/apps/:id/rotate-token", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = RotateAppTokenParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const newToken = uuidv4().replace(/-/g, "");
  const newSecret = uuidv4().replace(/-/g, "");

  const [app] = await db
    .update(appsTable)
    .set({ apiToken: newToken, appSecret: newSecret })
    .where(and(eq(appsTable.id, params.data.id), eq(appsTable.ownerId, req.userId!)))
    .returning();

  if (!app) {
    res.status(404).json({ error: "App not found" });
    return;
  }

  res.json({
    id: app.id,
    name: app.name,
    version: app.version,
    apiToken: app.apiToken,
    appId: app.appId,
    appSecret: app.appSecret,
    status: app.status,
    userCount: 0,
    createdAt: app.createdAt.toISOString(),
  });
});

export default router;
