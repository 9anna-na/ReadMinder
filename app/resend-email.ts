import { env } from "cloudflare:workers";

type ReminderEmailInput = {
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

function buildEmail(input: ReminderEmailInput) {
  const isEnglish = input.locale === "en";
  const subject = isEnglish ? `ReadMinder setup confirmed: ${input.topic}` : `ReadMinder｜提醒設定已收到：${input.topic}`;
  const date = input.primaryDate || (isEnglish ? "No explicit date found" : "尚未辨識到明確日期");
  const heading = isEnglish ? "Your reminder setup is saved" : "你的提醒設定已儲存";
  const intro = isEnglish
    ? "This confirmation proves that ReadMinder can now deliver email. Scheduled reminder checks will be enabled in the next milestone."
    : "這封確認信代表 ReadMinder 已經可以寄送 Email；自動排程檢查會在下一個里程碑啟用。";
  const labels = isEnglish
    ? { topic: "Topic", source: "Source", date: "Detected date", lead: "Lead time", days: "days" }
    : { topic: "提醒主題", source: "資料來源", date: "辨識日期", lead: "提前提醒", days: "天" };

  const html = `<!doctype html><html><body style="margin:0;background:#f3d7d0;color:#1f3552;font-family:Arial,sans-serif"><div style="max-width:580px;margin:0 auto;padding:36px 20px"><div style="background:#fffaf2;border:2px solid #1f3552;box-shadow:8px 8px 0 #cb4b39;padding:30px"><div style="font-size:24px;font-weight:800;margin-bottom:26px"><span style="display:inline-block;background:#1f3552;color:#fffaf2;padding:9px 13px;margin-right:10px">R</span>ReadMinder</div><h1 style="font-size:30px;line-height:1.2;margin:0 0 12px">${escapeHtml(heading)}</h1><p style="color:#655d5b;line-height:1.7;margin:0 0 24px">${escapeHtml(intro)}</p><div style="border:1px solid #1f3552;background:#fff"><p style="margin:0;padding:12px;border-bottom:1px solid #dfb9b1"><b>${labels.topic}：</b>${escapeHtml(input.topic)}</p><p style="margin:0;padding:12px;border-bottom:1px solid #dfb9b1"><b>${labels.source}：</b>${escapeHtml(input.source)}</p><p style="margin:0;padding:12px;border-bottom:1px solid #dfb9b1"><b>${labels.date}：</b>${escapeHtml(date)}</p><p style="margin:0;padding:12px"><b>${labels.lead}：</b>${input.leadDays} ${labels.days}</p></div></div></div></body></html>`;

  const text = `${heading}\n\n${intro}\n\n${labels.topic}: ${input.topic}\n${labels.source}: ${input.source}\n${labels.date}: ${date}\n${labels.lead}: ${input.leadDays} ${labels.days}`;
  return { html, subject, text };
}

export async function sendReminderConfirmation(input: ReminderEmailInput) {
  const runtime = env as unknown as ResendRuntimeEnv;
  if (!runtime.RESEND_API_KEY) return { sent: false };

  const email = buildEmail(input);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${runtime.RESEND_API_KEY}`,
      "content-type": "application/json",
      "idempotency-key": `readminder-confirmation-${input.id}`,
    },
    body: JSON.stringify({
      from: runtime.RESEND_FROM || "ReadMinder <onboarding@resend.dev>",
      to: [input.recipientEmail],
      subject: email.subject,
      html: email.html,
      text: email.text,
      tags: [{ name: "type", value: "reminder_confirmation" }],
    }),
  });

  if (!response.ok) return { sent: false };
  const result = await response.json() as { id?: string };
  return { sent: true, providerId: result.id ?? "" };
}
