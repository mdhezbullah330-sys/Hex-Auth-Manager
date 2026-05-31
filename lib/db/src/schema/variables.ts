import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const variablesTable = pgTable("variables", {
  id: serial("id").primaryKey(),
  appId: integer("app_id").notNull(),
  ownerId: integer("owner_id").notNull(),
  name: text("name").notNull(),
  value: text("value").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertVariableSchema = createInsertSchema(variablesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertVariable = z.infer<typeof insertVariableSchema>;
export type Variable = typeof variablesTable.$inferSelect;
