import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function getDb() {
  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database."
    );
  }

  return drizzle(env.DB, { schema });
}

export async function ensureReminderSchema() {
  if (!env.DB) throw new Error("Cloudflare D1 binding `DB` is unavailable.");

  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY NOT NULL,
      owner_id TEXT NOT NULL,
      recipient_email TEXT NOT NULL,
      topic TEXT NOT NULL,
      source TEXT NOT NULL,
      reminder_format TEXT NOT NULL,
      delivery TEXT NOT NULL,
      lead_days INTEGER NOT NULL,
      primary_date TEXT NOT NULL DEFAULT '',
      analysis_json TEXT NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_reminders_owner_created ON reminders(owner_id, created_at)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_reminders_status_date ON reminders(status, primary_date)"),
  ]);
}
