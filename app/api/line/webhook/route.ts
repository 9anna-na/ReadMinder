import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { lineConnections, lineLinkCodes } from "../../../../db/schema";
import { getLineConfiguration, sendLineReply } from "../../../line-messaging";
import { verifyLineSignature } from "../../../line-signature";

type LineWebhookEvent = {
  type?: string;
  replyToken?: string;
  source?: { type?: string; userId?: string };
  message?: { type?: string; text?: string };
};

export async function POST(request: Request) {
  const { channelSecret } = getLineConfiguration();
  if (!channelSecret) return Response.json({ error: "LINE is not configured." }, { status: 503 });

  const body = await request.text();
  const signature = request.headers.get("x-line-signature") ?? "";
  if (!(await verifyLineSignature(body, signature, channelSecret))) {
    return Response.json({ error: "Invalid signature." }, { status: 401 });
  }

  let payload: { events?: LineWebhookEvent[] };
  try {
    payload = JSON.parse(body) as { events?: LineWebhookEvent[] };
  } catch {
    return Response.json({ error: "Invalid payload." }, { status: 400 });
  }

  const db = getDb();
  for (const event of payload.events ?? []) {
    const lineUserId = event.source?.userId ?? "";
    const message = event.message?.type === "text" ? event.message.text?.trim().toUpperCase() ?? "" : "";
    if (!lineUserId || !/^RM-[A-F0-9]{12}$/.test(message)) continue;

    const [link] = await db.select().from(lineLinkCodes).where(eq(lineLinkCodes.code, message)).limit(1);
    if (!link || Date.parse(link.expiresAt) <= Date.now()) {
      if (event.replyToken) await sendLineReply(event.replyToken, "這組 ReadMinder 連結碼已失效，請回網站重新產生。");
      continue;
    }

    await db.delete(lineConnections).where(eq(lineConnections.lineUserId, lineUserId));
    await db.insert(lineConnections).values({ ownerId: link.ownerId, lineUserId })
      .onConflictDoUpdate({
        target: lineConnections.ownerId,
        set: { lineUserId, updatedAt: new Date().toISOString() },
      });
    await db.delete(lineLinkCodes).where(eq(lineLinkCodes.code, message));
    if (event.replyToken) await sendLineReply(event.replyToken, "ReadMinder 已成功連接你的 LINE。現在可以回網站儲存提醒了！");
  }

  return Response.json({ ok: true });
}
