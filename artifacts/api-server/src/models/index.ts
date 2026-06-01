import mongoose, { Schema, Document, Types } from "mongoose";

// ─── User ────────────────────────────────────────────────────────────────────
export interface IUser extends Document {
  _id: Types.ObjectId;
  username: string;
  email: string;
  passwordHash: string;
  hwid: string | null;
  plan: string;
  status: string;
  role: string;
  emailVerified: boolean;
  emailVerifyCode: string | null;
  emailVerifyExpiry: Date | null;
  subscriptionExpiry: Date | null;
  webhookUrl: string | null;
  appId: string | null;
  appSecret: string | null;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    hwid: { type: String, default: null },
    plan: { type: String, default: "free" },
    status: { type: String, default: "active" },
    role: { type: String, default: "owner" },
    emailVerified: { type: Boolean, default: false },
    emailVerifyCode: { type: String, default: null },
    emailVerifyExpiry: { type: Date, default: null },
    subscriptionExpiry: { type: Date, default: null },
    webhookUrl: { type: String, default: null },
    appId: { type: String, default: null },
    appSecret: { type: String, default: null },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

// ─── App ─────────────────────────────────────────────────────────────────────
export interface IApp extends Document {
  _id: Types.ObjectId;
  ownerId: Types.ObjectId;
  name: string;
  version: string;
  apiToken: string;
  appId: string;
  appSecret: string;
  status: string;
  createdAt: Date;
}

const AppSchema = new Schema<IApp>(
  {
    ownerId: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    version: { type: String, default: "1.0" },
    apiToken: { type: String, required: true },
    appId: { type: String, required: true },
    appSecret: { type: String, required: true },
    status: { type: String, default: "active" },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

// ─── License ─────────────────────────────────────────────────────────────────
export interface ILicense extends Document {
  _id: Types.ObjectId;
  ownerId: Types.ObjectId;
  key: string;
  plan: string;
  status: string;
  expiresAt: Date | null;
  usedBy: Types.ObjectId | null;
  usedAt: Date | null;
  createdAt: Date;
}

const LicenseSchema = new Schema<ILicense>(
  {
    ownerId: { type: Schema.Types.ObjectId, required: true },
    key: { type: String, required: true, unique: true },
    plan: { type: String, required: true },
    status: { type: String, default: "active" },
    expiresAt: { type: Date, default: null },
    usedBy: { type: Schema.Types.ObjectId, default: null },
    usedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

// ─── Session ──────────────────────────────────────────────────────────────────
export interface ISession extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  ownerId: Types.ObjectId;
  token: string;
  ipAddress: string | null;
  hwid: string | null;
  appId: Types.ObjectId | null;
  expiresAt: Date | null;
  createdAt: Date;
}

const SessionSchema = new Schema<ISession>(
  {
    userId: { type: Schema.Types.ObjectId, required: true },
    ownerId: { type: Schema.Types.ObjectId, required: true },
    token: { type: String, required: true, unique: true },
    ipAddress: { type: String, default: null },
    hwid: { type: String, default: null },
    appId: { type: Schema.Types.ObjectId, default: null },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

// ─── Log ──────────────────────────────────────────────────────────────────────
export interface ILog extends Document {
  _id: Types.ObjectId;
  ownerId: Types.ObjectId;
  userId: Types.ObjectId | null;
  action: string;
  description: string;
  ipAddress: string | null;
  severity: string;
  createdAt: Date;
}

const LogSchema = new Schema<ILog>(
  {
    ownerId: { type: Schema.Types.ObjectId, required: true },
    userId: { type: Schema.Types.ObjectId, default: null },
    action: { type: String, required: true },
    description: { type: String, required: true },
    ipAddress: { type: String, default: null },
    severity: { type: String, default: "info" },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

// ─── Blacklist ────────────────────────────────────────────────────────────────
export interface IBlacklist extends Document {
  _id: Types.ObjectId;
  ownerId: Types.ObjectId;
  type: string;
  value: string;
  reason: string | null;
  createdAt: Date;
}

const BlacklistSchema = new Schema<IBlacklist>(
  {
    ownerId: { type: Schema.Types.ObjectId, required: true },
    type: { type: String, required: true },
    value: { type: String, required: true },
    reason: { type: String, default: null },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

// ─── Variable ─────────────────────────────────────────────────────────────────
export interface IVariable extends Document {
  _id: Types.ObjectId;
  ownerId: Types.ObjectId;
  name: string;
  value: string;
  createdAt: Date;
}

const VariableSchema = new Schema<IVariable>(
  {
    ownerId: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    value: { type: String, required: true },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

// ─── TeamMember ───────────────────────────────────────────────────────────────
export interface ITeamMember extends Document {
  _id: Types.ObjectId;
  ownerId: Types.ObjectId;
  userId: Types.ObjectId | null;
  email: string;
  role: string;
  status: string;
  inviteToken: string | null;
  inviteExpiry: Date | null;
  joinedAt: Date | null;
  createdAt: Date;
}

const TeamMemberSchema = new Schema<ITeamMember>(
  {
    ownerId: { type: Schema.Types.ObjectId, required: true },
    userId: { type: Schema.Types.ObjectId, default: null },
    email: { type: String, required: true },
    role: { type: String, default: "member" },
    status: { type: String, default: "pending" },
    inviteToken: { type: String, default: null },
    inviteExpiry: { type: Date, default: null },
    joinedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

// ─── Exports ──────────────────────────────────────────────────────────────────
export const User = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
export const App = mongoose.models.App || mongoose.model<IApp>("App", AppSchema);
export const License = mongoose.models.License || mongoose.model<ILicense>("License", LicenseSchema);
export const Session = mongoose.models.Session || mongoose.model<ISession>("Session", SessionSchema);
export const Log = mongoose.models.Log || mongoose.model<ILog>("Log", LogSchema);
export const Blacklist = mongoose.models.Blacklist || mongoose.model<IBlacklist>("Blacklist", BlacklistSchema);
export const Variable = mongoose.models.Variable || mongoose.model<IVariable>("Variable", VariableSchema);
export const TeamMember = mongoose.models.TeamMember || mongoose.model<ITeamMember>("TeamMember", TeamMemberSchema);
