import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  hwid: text("hwid"),
  plan: text("plan").notNull().default("free"),
  status: text("status").notNull().default("active"),
  role: text("role").notNull().default("owner"),
  emailVerified: boolean("email_verified").notNull().default(false),
  emailVerifyCode: text("email_verify_code"),
  emailVerifyExpiry: timestamp("email_verify_expiry", { withTimezone: true }),
  subscriptionExpiry: timestamp("subscription_expiry", { withTimezone: true }),
  webhookUrl: text("webhook_url"),
  appId: text("app_id"),
  appSecret: text("app_secret"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
