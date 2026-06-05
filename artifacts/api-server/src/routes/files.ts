import { Router, type IRouter } from "express";
import { v4 as uuidv4 } from "uuid";
import { AppFile, Log } from "../models";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { Types } from "mongoose";

const router: IRouter = Router();

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes

router.get("/files", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const files = await AppFile.find({ ownerId: new Types.ObjectId(req.workspaceId!) })
    .select("-data")
    .sort({ createdAt: -1 });
  res.json(files.map(f => ({
    id: f._id,
    name: f.name,
    filename: f.filename,
    size: f.size,
    mimeType: f.mimeType,
    requiredPlan: f.requiredPlan,
    note: f.note,
    downloads: f.downloads,
    fileId: f.fileId,
    createdAt: f.createdAt.toISOString(),
  })));
});

router.post("/files", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { name, filename, mimeType, requiredPlan, note, data } = req.body;
  if (!filename || !data) {
    res.status(400).json({ error: "filename and data are required" }); return;
  }

  const base64Data = data.includes(",") ? data.split(",")[1] : data;
  const sizeBytes = Math.round((base64Data.length * 3) / 4);

  if (sizeBytes > MAX_FILE_SIZE) {
    res.status(400).json({ error: "File size exceeds 5MB limit" }); return;
  }

  const fileId = uuidv4().replace(/-/g, "");
  const file = await AppFile.create({
    ownerId: new Types.ObjectId(req.workspaceId!),
    name: name || filename,
    filename,
    size: sizeBytes,
    mimeType: mimeType || "application/octet-stream",
    requiredPlan: requiredPlan || "free",
    note: note || null,
    downloads: 0,
    fileId,
    data: base64Data,
  });

  await Log.create({
    ownerId: new Types.ObjectId(req.workspaceId!),
    userId: null,
    action: "file.upload",
    description: `Uploaded file "${file.name}"`,
    ipAddress: req.ip ?? null,
    severity: "info",
  });

  res.status(201).json({
    id: file._id,
    name: file.name,
    filename: file.filename,
    size: file.size,
    mimeType: file.mimeType,
    requiredPlan: file.requiredPlan,
    note: file.note,
    downloads: file.downloads,
    fileId: file.fileId,
    createdAt: file.createdAt.toISOString(),
  });
});

router.delete("/files/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const file = await AppFile.findOneAndDelete({ _id: req.params.id, ownerId: new Types.ObjectId(req.workspaceId!) });
  if (!file) { res.status(404).json({ error: "File not found" }); return; }
  await Log.create({
    ownerId: new Types.ObjectId(req.workspaceId!),
    userId: null,
    action: "file.delete",
    description: `Deleted file "${file.name}"`,
    ipAddress: req.ip ?? null,
    severity: "warn",
  });
  res.json({ ok: true, message: "File deleted" });
});

router.get("/files/:fileId/download", async (req, res): Promise<void> => {
  const file = await AppFile.findOne({ fileId: req.params.fileId });
  if (!file) { res.status(404).json({ error: "File not found" }); return; }
  await AppFile.findByIdAndUpdate(file._id, { $inc: { downloads: 1 } });
  const buffer = Buffer.from(file.data, "base64");
  res.setHeader("Content-Type", file.mimeType);
  res.setHeader("Content-Disposition", `attachment; filename="${file.filename}"`);
  res.setHeader("Content-Length", buffer.length);
  res.send(buffer);
});

export default router;
