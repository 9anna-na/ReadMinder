import { env } from "cloudflare:workers";

type LineRuntime = {
  LINE_CHANNEL_ACCESS_TOKEN?: string;
  LINE_CHANNEL_SECRET?: string;
  LINE_OFFICIAL_ACCOUNT_ID?: string;
  LINE_RECIPIENT_USER_ID?: string;
  LINE_RECIPIENT_EMAIL?: string;
};

const runtime = env as unknown as LineRuntime;

export function getLineConfiguration() {
  const accessToken = runtime.LINE_CHANNEL_ACCESS_TOKEN?.trim() ?? "";
  const channelSecret = runtime.LINE_CHANNEL_SECRET?.trim() ?? "";
  const officialAccountId = runtime.LINE_OFFICIAL_ACCOUNT_ID?.trim() ?? "";
  const recipientUserId = runtime.LINE_RECIPIENT_USER_ID?.trim() ?? "";
  const recipientEmail = runtime.LINE_RECIPIENT_EMAIL?.trim().toLowerCase() ?? "";
  const personalConfigured = Boolean(accessToken && recipientUserId && recipientEmail);
  const linkingConfigured = Boolean(accessToken && channelSecret && officialAccountId);
  return {
    accessToken,
    channelSecret,
    officialAccountId,
    recipientUserId,
    recipientEmail,
    personalConfigured,
    linkingConfigured,
    configured: personalConfigured || linkingConfigured,
  };
}

async function send(endpoint: "reply" | "push", payload: Record<string, unknown>) {
  const { accessToken } = getLineConfiguration();
  if (!accessToken) return { sent: false, status: 0 };
  const response = await fetch(`https://api.line.me/v2/bot/message/${endpoint}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  return { sent: response.ok, status: response.status };
}

export async function sendLineReply(replyToken: string, text: string) {
  if (!replyToken) return { sent: false, status: 0 };
  return send("reply", { replyToken, messages: [{ type: "text", text }] });
}

export async function sendLineReminder(input: {
  lineUserId: string;
  topic: string;
  source: string;
  primaryDate: string;
  leadDays: number;
  locale: "zh" | "en";
}) {
  const text = input.locale === "en"
    ? `ReadMinder reminder\n${input.topic}\nImportant date: ${input.primaryDate}\nReminder: ${input.leadDays} day${input.leadDays === 1 ? "" : "s"} ahead\nSource: ${input.source}`
    : `ReadMinder 提醒\n${input.topic}\n重要日期：${input.primaryDate}\n提前 ${input.leadDays} 天提醒\n資料來源：${input.source}`;
  return send("push", { to: input.lineUserId, messages: [{ type: "text", text }] });
}
