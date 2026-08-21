import { eq } from "drizzle-orm";
import { ensureReminderSchema, getDb } from "../db";
import { reminders } from "../db/schema";
import { planReminderSchedule } from "./reminder-schedule";
import { scheduleReminderEmail } from "./resend-email";

const DAILY_BATCH_LIMIT = 20;

export type SchedulerResult = {
  checked: number;
  scheduled: number;
  needsReview: number;
  waiting: number;
};

export async function scheduleWaitingReminders(now = new Date()): Promise<SchedulerResult> {
  await ensureReminderSchema();
  const db = getDb();
  const waitingReminders = await db.select().from(reminders)
    .where(eq(reminders.status, "awaiting_schedule_window"))
    .limit(DAILY_BATCH_LIMIT);
  const result: SchedulerResult = { checked: waitingReminders.length, scheduled: 0, needsReview: 0, waiting: 0 };

  for (const reminder of waitingReminders) {
    const schedule = planReminderSchedule(reminder.primaryDate, reminder.leadDays, now);
    if (schedule.status === "outside-window") {
      result.waiting += 1;
      continue;
    }
    if (schedule.status !== "scheduled") {
      await db.update(reminders).set({
        status: "needs_date_review",
        updatedAt: now.toISOString(),
      }).where(eq(reminders.id, reminder.id));
      result.needsReview += 1;
      continue;
    }

    const email = await scheduleReminderEmail({
      id: `${reminder.id}-daily-${now.getTime()}`,
      leadDays: reminder.leadDays,
      locale: reminder.locale === "en" ? "en" : "zh",
      primaryDate: reminder.primaryDate,
      recipientEmail: reminder.recipientEmail,
      source: reminder.source,
      topic: reminder.topic,
    }, schedule.scheduledAt);
    if (!email.sent) {
      result.waiting += 1;
      continue;
    }

    await db.update(reminders).set({
      scheduledEmailId: email.providerId ?? "",
      scheduledFor: schedule.scheduledAt,
      status: "scheduled",
      updatedAt: now.toISOString(),
    }).where(eq(reminders.id, reminder.id));
    result.scheduled += 1;
  }

  return result;
}
