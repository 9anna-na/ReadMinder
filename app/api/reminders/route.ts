import { and, desc, eq } from "drizzle-orm";
import { getChatGPTUser } from "../../chatgpt-auth";
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
    status: reminders.status,
    createdAt: reminders.createdAt,
  }).from(reminders)
    .where(and(eq(reminders.ownerId, user.userId), eq(reminders.status, "draft")))
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
    const primaryDate = clean(payload.primaryDate, 10);
    const leadDays = Number(payload.leadDays);

    if (!topic || !source || !reminderFormat || delivery !== "Email") {
      return Response.json({ error: "Reminder details are incomplete." }, { status: 400 });
    }
    if (!emailPattern.test(recipientEmail)) {
      return Response.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    if (!allowedLeadDays.has(leadDays)) {
      return Response.json({ error: "Choose a supported lead time." }, { status: 400 });
    }

    const analysis = payload.analysis && typeof payload.analysis === "object" ? payload.analysis : {};
    const analysisJson = JSON.stringify(analysis).slice(0, 20_000);
    const id = crypto.randomUUID();

    await ensureReminderSchema();
    await getDb().insert(reminders).values({
      id,
      ownerId: user.userId,
      recipientEmail,
      topic,
      source,
      reminderFormat,
      delivery,
      leadDays,
      primaryDate,
      analysisJson,
      status: "draft",
    });

    return Response.json({ reminder: { id, status: "draft", recipientEmail } }, { status: 201 });
  } catch {
    return Response.json({ error: "The reminder could not be saved." }, { status: 500 });
  }
}
