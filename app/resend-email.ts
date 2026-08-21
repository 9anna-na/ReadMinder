import { env } from "cloudflare:workers";

type ReminderEmailInput = {
  dates?: Array<{ date: string; leadDays: number; scheduledAt: string }>;
  id: string;
  leadDays: number;
  locale: "zh" | "en";
  primaryDate: string;
  recipientEmail: string;
  source: string;
  topic: string;
};

type ResendRuntimeEnv = {
  RESEND_API_KEY?: string;
  RESEND_FROM?: string;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  })[character] ?? character);
}

function formatScheduledAt(value: string, locale: "zh" | "en") {
  if (!value) return "";
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "zh-TW", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Taipei",
  }).format(new Date(value));
}

function buildConfirmationEmail(input: ReminderEmailInput, scheduledAt = "") {
  const isEnglish = input.locale === "en";
  const dates = input.dates?.length ? input.dates : [{ date: input.primaryDate, leadDays: input.leadDays, scheduledAt }];
  const scheduledCount = dates.filter((item) => item.scheduledAt).length;
  const subject = isEnglish ? `ReadMinder setup confirmed: ${input.topic}` : `ReadMinder｜提醒設定已收到：${input.topic}`;
  const heading = isEnglish ? "Your reminder setup is saved" : "你的提醒設定已儲存";
  const intro = isEnglish
    ? `${dates.length} date reminder${dates.length === 1 ? "" : "s"} saved; ${scheduledCount} scheduled for automatic delivery.`
    : `已儲存 ${dates.length} 個日期提醒，其中 ${scheduledCount} 個已排定自動寄送。`;
  const labels = isEnglish
    ? { topic: "Topic", source: "Source", date: "Detected date", lead: "Lead time", days: "days" }
    : { topic: "提醒主題", source: "資料來源", date: "辨識日期", lead: "提前提醒", days: "天" };

  const dateRows = dates.map((item) => `<p style="margin:0;padding:12px;border-top:1px solid #dfb9b1"><b>${labels.date}：</b>${escapeHtml(item.date)} · ${labels.lead} ${item.leadDays} ${labels.days}${item.scheduledAt ? ` · ${escapeHtml(formatScheduledAt(item.scheduledAt, input.locale))}` : ""}</p>`).join("");
  const html = `<!doctype html><html><body style="margin:0;background:#f3d7d0;color:#1f3552;font-family:Arial,sans-serif"><div style="max-width:580px;margin:0 auto;padding:36px 20px"><div style="background:#fffaf2;border:2px solid #1f3552;box-shadow:8px 8px 0 #cb4b39;padding:30px"><div style="font-size:24px;font-weight:800;margin-bottom:26px"><span style="display:inline-block;background:#1f3552;color:#fffaf2;padding:9px 13px;margin-right:10px">R</span>ReadMinder</div><h1 style="font-size:30px;line-height:1.2;margin:0 0 12px">${escapeHtml(heading)}</h1><p style="color:#655d5b;line-height:1.7;margin:0 0 24px">${escapeHtml(intro)}</p><div style="border:1px solid #1f3552;background:#fff"><p style="margin:0;padding:12px;border-bottom:1px solid #dfb9b1"><b>${labels.topic}：</b>${escapeHtml(input.topic)}</p><p style="margin:0;padding:12px"><b>${labels.source}：</b>${escapeHtml(input.source)}</p>${dateRows}</div></div></div></body></html>`;

  const textDates = dates.map((item) => `${labels.date}: ${item.date} · ${labels.lead}: ${item.leadDays} ${labels.days}${item.scheduledAt ? ` · ${formatScheduledAt(item.scheduledAt, input.locale)}` : ""}`).join("\n");
  const text = `${heading}\n\n${intro}\n\n${labels.topic}: ${input.topic}\n${labels.source}: ${input.source}\n${textDates}`;
  return { html, subject, text };
}

function buildScheduledReminderEmail(input: ReminderEmailInput) {
  const isEnglish = input.locale === "en";
  const subject = isEnglish ? `ReadMinder reminder: ${input.topic}` : `ReadMinder 提醒｜${input.topic}`;
  const heading = isEnglish ? "A date in your document is coming up" : "文件裡的重要日期快到了";
  const intro = isEnglish
    ? `This is the reminder you asked for ${input.leadDays} days before ${input.primaryDate}.`
    : `這是你設定在 ${input.primaryDate} 前 ${input.leadDays} 天收到的提醒。`;
  const html = `<!doctype html><html><body style="margin:0;background:#f3d7d0;color:#1f3552;font-family:Arial,sans-serif"><div style="max-width:580px;margin:0 auto;padding:36px 20px"><div style="background:#fffaf2;border:2px solid #1f3552;box-shadow:8px 8px 0 #cb4b39;padding:30px"><div style="font-size:24px;font-weight:800;margin-bottom:26px"><span style="display:inline-block;background:#1f3552;color:#fffaf2;padding:9px 13px;margin-right:10px">R</span>ReadMinder</div><h1 style="font-size:30px;line-height:1.2;margin:0 0 12px">${escapeHtml(heading)}</h1><p style="color:#655d5b;line-height:1.7;margin:0 0 24px">${escapeHtml(intro)}</p><div style="border:1px solid #1f3552;background:#fff"><p style="margin:0;padding:12px;border-bottom:1px solid #dfb9b1"><b>${isEnglish ? "Topic" : "提醒主題"}：</b>${escapeHtml(input.topic)}</p><p style="margin:0;padding:12px;border-bottom:1px solid #dfb9b1"><b>${isEnglish ? "Source" : "資料來源"}：</b>${escapeHtml(input.source)}</p><p style="margin:0;padding:12px"><b>${isEnglish ? "Date" : "重要日期"}：</b>${escapeHtml(input.primaryDate)}</p></div></div></div></body></html>`;
  const text = `${heading}\n\n${intro}\n\n${isEnglish ? "Topic" : "提醒主題"}: ${input.topic}\n${isEnglish ? "Source" : "資料來源"}: ${input.source}\n${isEnglish ? "Date" : "重要日期"}: ${input.primaryDate}`;
  return { html, subject, text };
}

async function sendEmail(input: ReminderEmailInput, email: { html: string; subject: string; text: string }, type: string, scheduledAt = "") {
  const runtime = env as unknown as ResendRuntimeEnv;
  if (!runtime.RESEND_API_KEY) return { sent: false };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${runtime.RESEND_API_KEY}`,
      "content-type": "application/json",
      "idempotency-key": `readminder-${type}-${input.id}`,
    },
    body: JSON.stringify({
      from: runtime.RESEND_FROM || "ReadMinder <onboarding@resend.dev>",
      to: [input.recipientEmail],
      subject: email.subject,
      html: email.html,
      text: email.text,
      tags: [{ name: "type", value: type }],
      ...(scheduledAt ? { scheduled_at: scheduledAt } : {}),
    }),
  });

  if (!response.ok) return { sent: false };
  const result = await response.json() as { id?: string };
  return { sent: true, providerId: result.id ?? "" };
}

export async function sendReminderConfirmation(input: ReminderEmailInput, scheduledAt = "") {
  return sendEmail(input, buildConfirmationEmail(input, scheduledAt), "reminder_confirmation");
}

export async function scheduleReminderEmail(input: ReminderEmailInput, scheduledAt: string) {
  return sendEmail(input, buildScheduledReminderEmail(input), "scheduled_reminder", scheduledAt);
}

export async function cancelScheduledReminderEmail(emailId: string) {
  const runtime = env as unknown as ResendRuntimeEnv;
  if (!runtime.RESEND_API_KEY || !emailId) return { cancelled: false, status: 0 };

  const response = await fetch(`https://api.resend.com/emails/${encodeURIComponent(emailId)}/cancel`, {
    method: "POST",
    headers: { authorization: `Bearer ${runtime.RESEND_API_KEY}` },
  });

  return { cancelled: response.ok, status: response.status };
}
