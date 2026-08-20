const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_SCHEDULE_DAYS = 30;

export type ReminderSchedule =
  | { status: "scheduled"; scheduledAt: string }
  | { status: "missing-date" | "invalid-date" | "past" | "outside-window"; scheduledAt: "" };

export function planReminderSchedule(primaryDate: string, leadDays: number, now = new Date()): ReminderSchedule {
  if (!primaryDate) return { status: "missing-date", scheduledAt: "" };

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(primaryDate);
  if (!match) return { status: "invalid-date", scheduledAt: "" };

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const deadlineAtTaipeiNine = Date.UTC(year, month - 1, day, 1, 0, 0);
  const deadline = new Date(deadlineAtTaipeiNine);

  if (
    deadline.getUTCFullYear() !== year ||
    deadline.getUTCMonth() !== month - 1 ||
    deadline.getUTCDate() !== day
  ) {
    return { status: "invalid-date", scheduledAt: "" };
  }

  const scheduledAtMs = deadlineAtTaipeiNine - leadDays * DAY_MS;
  const delayMs = scheduledAtMs - now.getTime();
  if (delayMs <= 0) return { status: "past", scheduledAt: "" };
  if (delayMs > MAX_SCHEDULE_DAYS * DAY_MS) return { status: "outside-window", scheduledAt: "" };

  return { status: "scheduled", scheduledAt: new Date(scheduledAtMs).toISOString() };
}
