import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.SESSION_SECRET!;

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
  workspaceId?: string;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string; role: string };
    req.userId = payload.userId;
    req.userRole = payload.role;

    const requestedWorkspaceId = req.headers["x-workspace-id"] as string | undefined;

    if (!requestedWorkspaceId || requestedWorkspaceId === payload.userId) {
      req.workspaceId = payload.userId;
      next();
      return;
    }

    import("../models").then(({ TeamMember }) => {
      import("mongoose").then(({ Types }) => {
        TeamMember.findOne({
          ownerId: new Types.ObjectId(requestedWorkspaceId),
          userId: new Types.ObjectId(payload.userId),
          status: "accepted",
        }).then((membership) => {
          if (!membership) {
            res.status(403).json({ error: "Access denied to this workspace" });
            return;
          }
          req.workspaceId = requestedWorkspaceId;
          next();
        }).catch(() => {
          res.status(500).json({ error: "Failed to verify workspace access" });
        });
      });
    });
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function generateToken(userId: string, role: string): string {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: "7d" });
}
