import { and, desc, eq } from "drizzle-orm";
import { getChatGPTUser } from "../../chatgpt-auth";
import { planReminderSchedule } from "../../reminder-schedule";
import { cancelScheduledReminderEmail, scheduleReminderEmail, sendReminderConfirmation } from "../../resend-email";
import { ensureReminderSchema, getDb } from "../../../db";
import { reminders } from "../../../db/schema";

export const dynamic = "force-dynamic";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const allowedLeadDays = new Set([1, 3, 7, 14, 30]);

function clean(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in is required." }, { status: 401 });

  await ensureReminderSchema();
  const rows = await getDb().select({
    id: reminders.id,
    topic: reminders.topic,
    source: reminders.source,
    reminderFormat: reminders.reminderFormat,
    delivery: reminders.delivery,
    leadDays: reminders.leadDays,
    primaryDate: reminders.primaryDate,
    scheduledFor: reminders.scheduledFor,
    status: reminders.status,
    createdAt: reminders.createdAt,
  }).from(reminders)
    .where(eq(reminders.ownerId, user.userId))
    .orderBy(desc(reminders.createdAt))
    .limit(50);

  return Response.json({ reminders: rows, user: { email: user.email, displayName: user.displayName } });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in is required." }, { status: 401 });

  try {
    const payload = await request.json() as Record<string, unknown>;
    const topic = clean(payload.topic, 180);
    const source = clean(payload.source, 500);
    const reminderFormat = clean(payload.format, 80);
    const delivery = clean(payload.delivery, 80);
    const recipientEmail = clean(payload.recipientEmail, 254).toLowerCase();
    const locale = payload.locale === "en" ? "en" : "zh";
    const reminderRules = Array.isArray(payload.reminders)
      ? payload.reminders.slice(0, 10).map((item) => {
        const rule = item && typeof item === "object" ? item as Record<string, unknown> : {};
        return { primaryDate: clean(rule.date, 10), leadDays: Number(rule.leadDays) };
      })
      : [{ primaryDate: clean(payload.primaryDate, 10), leadDays: Number(payload.leadDays) }];

    if (!topic || !source || !reminderFormat || delivery !== "Email") {
      return Response.json({ error: "Reminder details are incomplete." }, { status: 400 });
    }
    if (!emailPattern.test(recipientEmail)) {
      return Response.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    if (!reminderRules.length || reminderRules.some((rule) => !rule.primaryDate || !allowedLeadDays.has(rule.leadDays))) {
      return Response.json({ error: "Choose a supported lead time." }, { status: 400 });
    }

    const analysis = payload.analysis && typeof payload.analysis === "object" ? payload.analysis : {};
    const analysisJson = JSON.stringify({ ...analysis, selectedReminderRules: reminderRules }).slice(0, 20_000);
    const groupId = crypto.randomUUID();

    await ensureReminderSchema();
    const db = getDb();
    const results: Array<{ date: string; leadDays: number; scheduledFor: string; status: string }> = [];

    for (const rule of reminderRules) {
      const id = crypto.randomUUID();
      const schedule = planReminderSchedule(rule.primaryDate, rule.leadDays);
      await db.insert(reminders).values({
        id,
        ownerId: user.userId,
        recipientEmail,
        topic,
        source,
        reminderFormat,
        delivery,
        leadDays: rule.leadDays,
        primaryDate: rule.primaryDate,
        locale,
        analysisJson,
        status: "draft",
      });

      const emailInput = { id, leadDays: rule.leadDays, locale, primaryDate: rule.primaryDate, recipientEmail, source, topic };
      const scheduledEmail = schedule.status === "scheduled"
        ? await scheduleReminderEmail(emailInput, schedule.scheduledAt)
        : { sent: false, providerId: "" };
      const scheduledFor = scheduledEmail.sent && schedule.status === "scheduled" ? schedule.scheduledAt : "";
      const status = scheduledFor
        ? "scheduled"
        : schedule.status === "outside-window"
          ? "awaiting_schedule_window"
          : schedule.status === "past" || schedule.status === "invalid-date" || schedule.status === "missing-date"
            ? "needs_date_review"
            : "schedule_failed";
      await db.update(reminders).set({
        status,
        scheduledFor,
        scheduledEmailId: scheduledEmail.providerId ?? "",
        updatedAt: new Date().toISOString(),
      }).where(eq(reminders.id, id));
      results.push({ date: rule.primaryDate, leadDays: rule.leadDays, scheduledFor, status });
    }

    const first = reminderRules[0];
    const confirmation = await sendReminderConfirmation({
      id: groupId,
      leadDays: first.leadDays,
      locale,
      primaryDate: first.primaryDate,
      recipientEmail,
      source,
      topic,
      dates: results.map((result) => ({ date: result.date, leadDays: result.leadDays, scheduledAt: result.scheduledFor })),
    });
    const scheduledItems = results.filter((result) => result.scheduledFor).map((result) => ({ date: result.date, scheduledFor: result.scheduledFor }));
    const status = scheduledItems.length === results.length
      ? "scheduled"
      : scheduledItems.length
        ? "partially_scheduled"
        : results.some((result) => result.status === "awaiting_schedule_window")
          ? "awaiting_schedule_window"
          : results.some((result) => result.status === "needs_date_review")
            ? "needs_date_review"
            : "schedule_failed";

    return Response.json({
      reminder: { id: groupId, status, recipientEmail, confirmationSent: confirmation.sent, count: results.length, scheduledItems },
    }, { status: 201 });
  } catch {
    return Response.json({ error: "The reminder could not be saved." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in is required." }, { status: 401 });

  try {
    const payload = await request.json() as Record<string, unknown>;
    const id = clean(payload.id, 80);
    const primaryDate = clean(payload.primaryDate, 10);
    const leadDays = Number(payload.leadDays);
    if (!id || !primaryDate || !allowedLeadDays.has(leadDays)) {
      return Response.json({ error: "Reminder details are incomplete." }, { status: 400 });
    }

    await ensureReminderSchema();
    const db = getDb();
    const [existing] = await db.select().from(reminders)
      .where(and(eq(reminders.id, id), eq(reminders.ownerId, user.userId)))
      .limit(1);
    if (!existing) return Response.json({ error: "Reminder not found." }, { status: 404 });

    if (existing.scheduledEmailId && Date.parse(existing.scheduledFor) > Date.now()) {
      const cancellation = await cancelScheduledReminderEmail(existing.scheduledEmailId);
      if (!cancellation.cancelled && cancellation.status !== 404) {
        return Response.json({ error: "The existing scheduled email could not be cancelled." }, { status: 502 });
      }
    }

    const schedule = planReminderSchedule(primaryDate, leadDays);
    const scheduledEmail = schedule.status === "scheduled"
      ? await scheduleReminderEmail({
        id: `${id}-rescheduled-${Date.now()}`,
        leadDays,
        locale: existing.locale === "en" ? "en" : "zh",
        primaryDate,
        recipientEmail: existing.recipientEmail,
        source: existing.source,
        topic: existing.topic,
      }, schedule.scheduledAt)
      : { sent: false, providerId: "" };
    const scheduledFor = scheduledEmail.sent && schedule.status === "scheduled" ? schedule.scheduledAt : "";
    const status = scheduledFor
      ? "scheduled"
      : schedule.status === "outside-window"
        ? "awaiting_schedule_window"
        : schedule.status === "past" || schedule.status === "invalid-date" || schedule.status === "missing-date"
          ? "needs_date_review"
          : "schedule_failed";

    await db.update(reminders).set({
      leadDays,
      primaryDate,
      scheduledFor,
      scheduledEmailId: scheduledEmail.providerId ?? "",
      status,
      updatedAt: new Date().toISOString(),
    }).where(and(eq(reminders.id, id), eq(reminders.ownerId, user.userId)));

    return Response.json({ reminder: { id, leadDays, primaryDate, scheduledFor, status } });
  } catch {
    return Response.json({ error: "The reminder could not be updated." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in is required." }, { status: 401 });

  try {
    const id = clean(new URL(request.url).searchParams.get("id"), 80);
    if (!id) return Response.json({ error: "Reminder id is required." }, { status: 400 });

    await ensureReminderSchema();
    const db = getDb();
    const [existing] = await db.select().from(reminders)
      .where(and(eq(reminders.id, id), eq(reminders.ownerId, user.userId)))
      .limit(1);
    if (!existing) return Response.json({ error: "Reminder not found." }, { status: 404 });

    let cancelled = false;
    if (existing.scheduledEmailId && Date.parse(existing.scheduledFor) > Date.now()) {
      const cancellation = await cancelScheduledReminderEmail(existing.scheduledEmailId);
      if (!cancellation.cancelled && cancellation.status !== 404) {
        return Response.json({ error: "The scheduled email could not be cancelled." }, { status: 502 });
      }
      cancelled = cancellation.cancelled;
    }

    await db.delete(reminders).where(and(eq(reminders.id, id), eq(reminders.ownerId, user.userId)));
    return Response.json({ deleted: true, cancelled });
  } catch {
    return Response.json({ error: "The reminder could not be deleted." }, { status: 500 });
  }
}
