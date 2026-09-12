import { and, eq, gt } from "drizzle-orm";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { getLineConfiguration } from "../../../line-messaging";
import { getDb } from "../../../../db";
import { lineConnections, lineLinkCodes, reminders } from "../../../../db/schema";

export const dynamic = "force-dynamic";

function publicConfiguration() {
  const { linkingConfigured, officialAccountId } = getLineConfiguration();
  return {
    configured: linkingConfigured,
    officialAccountId,
    addFriendUrl: linkingConfigured
      ? `https://line.me/R/ti/p/${encodeURIComponent(officialAccountId)}`
      : "",
  };
}

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in is required." }, { status: 401 });

  const configuration = publicConfiguration();
  const lineConfiguration = getLineConfiguration();
  const personalConnected = lineConfiguration.personalConfigured && lineConfiguration.recipientEmail === user.email.toLowerCase();
  if (personalConnected) {
    return Response.json({ ...configuration, configured: true, connected: true, managedByAdmin: true, code: "", expiresAt: "" });
  }
  if (!configuration.configured) {
    return Response.json({ ...configuration, connected: false, managedByAdmin: false, code: "", expiresAt: "" });
  }

  const db = getDb();
  const [connection] = await db.select({ ownerId: lineConnections.ownerId })
    .from(lineConnections)
    .where(eq(lineConnections.ownerId, user.userId))
    .limit(1);
  const [pendingCode] = await db.select({ code: lineLinkCodes.code, expiresAt: lineLinkCodes.expiresAt })
    .from(lineLinkCodes)
    .where(and(eq(lineLinkCodes.ownerId, user.userId), gt(lineLinkCodes.expiresAt, new Date().toISOString())))
    .limit(1);

  return Response.json({
    ...configuration,
    connected: Boolean(connection),
    managedByAdmin: false,
    code: pendingCode?.code ?? "",
    expiresAt: pendingCode?.expiresAt ?? "",
  });
}

export async function POST() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in is required." }, { status: 401 });

  const configuration = publicConfiguration();
  const lineConfiguration = getLineConfiguration();
  if (lineConfiguration.personalConfigured && lineConfiguration.recipientEmail === user.email.toLowerCase()) {
    return Response.json({ ...configuration, configured: true, connected: true, managedByAdmin: true, code: "", expiresAt: "" });
  }
  if (!lineConfiguration.linkingConfigured) {
    return Response.json({ error: "LINE is not configured." }, { status: 503 });
  }

  const db = getDb();
  const code = `RM-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000).toISOString();
  await db.delete(lineLinkCodes).where(eq(lineLinkCodes.ownerId, user.userId));
  await db.insert(lineLinkCodes).values({ code, ownerId: user.userId, expiresAt });

  return Response.json({ ...configuration, connected: false, code, expiresAt }, { status: 201 });
}

export async function DELETE() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in is required." }, { status: 401 });

  const db = getDb();
  await db.batch([
    db.delete(lineConnections).where(eq(lineConnections.ownerId, user.userId)),
    db.delete(lineLinkCodes).where(eq(lineLinkCodes.ownerId, user.userId)),
    db.update(reminders).set({ status: "paused", scheduledFor: "", recipientLineUserId: "", updatedAt: new Date().toISOString() })
      .where(and(eq(reminders.ownerId, user.userId), eq(reminders.delivery, "LINE"))),
  ]);
  return Response.json({ disconnected: true });
}
