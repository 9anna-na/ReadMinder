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
  analysisJson: text("analysis_json").notNull().default("{}"),
  status: text("status").notNull().default("draft"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_reminders_owner_created").on(table.ownerId, table.createdAt),
  index("idx_reminders_status_date").on(table.status, table.primaryDate),
]);
