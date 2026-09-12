import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const reminders = sqliteTable("reminders", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  recipientEmail: text("recipient_email").notNull(),
  topic: text("topic").notNull(),
  source: text("source").notNull(),
  reminderFormat: text("reminder_format").notNull(),
  delivery: text("delivery").notNull(),
  leadDays: integer("lead_days").notNull(),
  primaryDate: text("primary_date").notNull().default(""),
  locale: text("locale").notNull().default("zh"),
  scheduledFor: text("scheduled_for").notNull().default(""),
  scheduledEmailId: text("scheduled_email_id").notNull().default(""),
  recipientLineUserId: text("recipient_line_user_id").notNull().default(""),
  deliveredAt: text("delivered_at").notNull().default(""),
  analysisJson: text("analysis_json").notNull().default("{}"),
  status: text("status").notNull().default("draft"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_reminders_owner_created").on(table.ownerId, table.createdAt),
  index("idx_reminders_status_date").on(table.status, table.primaryDate),
  index("idx_reminders_status_scheduled").on(table.status, table.scheduledFor),
]);

export const lineConnections = sqliteTable("line_connections", {
  ownerId: text("owner_id").primaryKey(),
  lineUserId: text("line_user_id").notNull().unique(),
  connectedAt: text("connected_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const lineLinkCodes = sqliteTable("line_link_codes", {
  code: text("code").primaryKey(),
  ownerId: text("owner_id").notNull().unique(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_line_link_codes_expires").on(table.expiresAt),
]);
