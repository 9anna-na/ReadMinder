import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${pathname}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("accepts valid platform identity headers and rejects malformed values", async () => {
  const { parseAuthenticatedUserHeaders } = await import("../app/authenticated-user.ts");
  const validHeaders = new Headers({
    "oai-authenticated-user-id": "user-123",
    "oai-authenticated-user-email": "reader@example.com",
    "oai-authenticated-user-full-name": "Joanna%20Lee",
    "oai-authenticated-user-full-name-encoding": "percent-encoded-utf-8",
  });
  assert.deepEqual(parseAuthenticatedUserHeaders(validHeaders), {
    userId: "user-123",
    displayName: "Joanna Lee",
    email: "reader@example.com",
    fullName: "Joanna Lee",
  });

  const malformedHeaders = [
    new Headers(),
    new Headers({ "oai-authenticated-user-id": "user-123" }),
    new Headers({
      "oai-authenticated-user-id": "x".repeat(201),
      "oai-authenticated-user-email": "reader@example.com",
    }),
    new Headers({
      "oai-authenticated-user-id": "user-123",
      "oai-authenticated-user-email": "not-an-email",
    }),
  ];
  for (const headers of malformedHeaders) {
    assert.equal(parseAuthenticatedUserHeaders(headers), null);
  }

  const reminderRoute = await readFile(new URL("../app/api/reminders/route.ts", import.meta.url), "utf8");
  for (const handler of ["GET", "POST", "PATCH", "DELETE"]) {
    const start = reminderRoute.indexOf(`export async function ${handler}`);
    const nextHandler = reminderRoute.indexOf("export async function ", start + 1);
    const source = reminderRoute.slice(start, nextHandler === -1 ? undefined : nextHandler);
    assert.ok(source.indexOf("await getChatGPTUser()") < source.indexOf("await ensureReminderSchema()"));
  }
});

test("server-renders the Traditional Chinese ReadMinder landing page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html lang="zh-Hant">/);
  assert.match(html, /ReadMinder｜讀懂重要日期，準時提醒你/);
  assert.match(html, /建立我的提醒/);
  assert.match(html, /匯入支援的資料/);
  assert.match(html, /href="\/en"/);
});

test("server-renders the matching English experience", async () => {
  const response = await render("/en");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /Never miss what/);
  assert.match(html, /Build my reminder/);
  assert.match(html, /Import supported data/);
  assert.match(html, /href="\/"/);
});

test("server-renders the bilingual reminder management routes", async () => {
  const [zhResponse, enResponse] = await Promise.all([render("/reminders"), render("/en/reminders")]);

  assert.equal(zhResponse.status, 200);
  assert.equal(enResponse.status, 200);

  const [zhHtml, enHtml] = await Promise.all([zhResponse.text(), enResponse.text()]);
  assert.match(zhHtml, /正在整理你的提醒/);
  assert.match(enHtml, /Organising your reminders/);
});

test("keeps document parsing local and supports the advertised formats", async () => {
  const [reader, experience, styles, pdfModule, pdfWorker] = await Promise.all([
    readFile(new URL("../app/file-readers.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/remind-experience.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/figma.css", import.meta.url), "utf8"),
    readFile(new URL("../public/vendor/pdfjs/pdf.min.mjs", import.meta.url)),
    readFile(new URL("../public/vendor/pdfjs/pdf.worker.min.mjs", import.meta.url)),
  ]);

  assert.match(reader, /PDF_MODULE_URL = "\/vendor\/pdfjs\/pdf\.min\.mjs"/);
  assert.match(reader, /PDF_WORKER_URL = "\/vendor\/pdfjs\/pdf\.worker\.min\.mjs"/);
  assert.ok(pdfModule.byteLength > 100_000);
  assert.ok(pdfWorker.byteLength > 100_000);
  assert.match(reader, /import\("mammoth"\)/);
  assert.match(reader, /import\("xlsx"\)/);
  assert.match(reader, /MAX_FILE_BYTES = 10 \* 1024 \* 1024/);
  assert.match(experience, /目前在你的瀏覽器內分析，不會上傳文件內容/);
  assert.match(experience, /ReadMinder 讀到這些期限線索/);
  assert.match(experience, /\.pdf,\.csv,\.xlsx,\.xls,\.docx,\.txt,\.json,\.md/);
  assert.match(experience, /paste text containing dates/);
  assert.doesNotMatch(experience, /paste a link|貼上連結|docs\.google\.com/);
  assert.match(styles, /\.f-message\.f-user p\s*\{\s*color:#fff;\s*\}/);
});

test("preserves PDF rows and finds dates in week-based course timelines", async () => {
  const [{ joinPdfTextItems }, { analyzeReminderText }] = await Promise.all([
    import("../app/file-readers.ts"),
    import("../app/reminder-analysis.ts"),
  ]);
  const text = joinPdfTextItems([
    { str: "W1 (9/7)", transform: [1, 0, 0, 1, 20, 700] },
    { str: "Course introduction", transform: [1, 0, 0, 1, 120, 700], hasEOL: true },
    { str: "W3", transform: [1, 0, 0, 1, 20, 680] },
    { str: "Submit HW1", transform: [1, 0, 0, 1, 120, 680], hasEOL: true },
    { str: "W4", transform: [1, 0, 0, 1, 20, 670] },
    { str: "Prediction: Random Forest Case: Presentation by Group X", transform: [1, 0, 0, 1, 120, 670], hasEOL: true },
    { str: "W5 (10/5)", transform: [1, 0, 0, 1, 20, 660] },
    { str: "Upload Proposal", transform: [1, 0, 0, 1, 120, 660], hasEOL: true },
    { str: "W14 (12/7)", transform: [1, 0, 0, 1, 20, 640] },
    { str: "Upload Poster Draft", transform: [1, 0, 0, 1, 120, 640], hasEOL: true },
  ]);

  assert.match(text, /W3 Submit HW1/);
  assert.match(text, /W5 \(10\/5\) Upload Proposal/);
  const analysis = analyzeReminderText(
    text,
    "ECON 5166 Timeline - For Students.pdf",
    false,
    new Date("2026-09-12T00:00:00.000Z"),
  );
  assert.equal(analysis.primaryDate, "2026-09-21");
  assert.deepEqual(
    analysis.signals.filter((signal) => signal.context.includes("Submit HW1"))[0],
    {
      date: "2026-09-21",
      rawDate: "W3",
      context: "W3 Submit HW1",
      inferred: true,
    },
  );
  assert.ok(analysis.signals.some((signal) => signal.date === "2026-10-05" && !signal.inferred));
  assert.ok(analysis.signals.some((signal) => signal.date === "2026-12-07" && !signal.inferred));
  assert.ok(!analysis.signals.some((signal) => signal.date === "2026-09-28"));
});

test("sends confirmation email through a server-side secret", async () => {
  const [emailModule, exampleEnv] = await Promise.all([
    readFile(new URL("../app/resend-email.ts", import.meta.url), "utf8"),
    readFile(new URL("../.env.example", import.meta.url), "utf8"),
  ]);

  assert.match(emailModule, /https:\/\/api\.resend\.com\/emails/);
  assert.match(emailModule, /runtime\.RESEND_API_KEY/);
  assert.match(emailModule, /scheduled_at/);
  assert.match(emailModule, /scheduled_reminder/);
  assert.match(exampleEnv, /RESEND_API_KEY=\n/);
  assert.doesNotMatch(emailModule, /re_[A-Za-z0-9_-]{30,}/);
});

test("plans automatic reminder emails in Taipei time", async () => {
  const { planReminderSchedule } = await import("../app/reminder-schedule.ts");
  const now = new Date("2026-08-20T00:00:00.000Z");

  assert.deepEqual(planReminderSchedule("2026-08-27", 3, now), {
    status: "scheduled",
    scheduledAt: "2026-08-24T01:00:00.000Z",
  });
  assert.equal(planReminderSchedule("2026-08-19", 1, now).status, "past");
  assert.equal(planReminderSchedule("2026-10-30", 1, now).status, "outside-window");
  assert.equal(planReminderSchedule("2026-02-30", 1, now).status, "invalid-date");
});

test("supports multiple date rules without duplicate cadence choices", async () => {
  const experience = await readFile(new URL("../app/remind-experience.tsx", import.meta.url), "utf8");
  const reminderRoute = await readFile(new URL("../app/api/reminders/route.ts", import.meta.url), "utf8");

  assert.doesNotMatch(experience, /每日摘要|每週摘要|自訂排程/);
  assert.match(experience, /reminders: dateRules/);
  assert.match(reminderRoute, /for \(const rule of reminderRules\)/);
  assert.match(reminderRoute, /scheduledItems/);
});

test("manages reminders safely for the signed-in owner", async () => {
  const [manager, reminderRoute, emailModule] = await Promise.all([
    readFile(new URL("../app/reminder-manager.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/reminders/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/resend-email.ts", import.meta.url), "utf8"),
  ]);

  assert.match(manager, /fetch\("\/api\/reminders"/);
  assert.match(manager, /method: "PATCH"/);
  assert.match(manager, /method: "DELETE"/);
  assert.match(manager, /action: reminder\.status === "paused" \? "resume" : "pause"/);
  assert.match(reminderRoute, /export async function PATCH/);
  assert.match(reminderRoute, /export async function DELETE/);
  assert.match(reminderRoute, /action === "pause"/);
  assert.match(reminderRoute, /action === "resume"/);
  assert.match(reminderRoute, /and\(eq\(reminders\.id, id\), eq\(reminders\.ownerId, user\.userId\)\)/);
  assert.match(emailModule, /cancelScheduledReminderEmail/);
  assert.match(emailModule, /emails\/\$\{encodeURIComponent\(emailId\)\}\/cancel/);
});

test("checks waiting reminders automatically every day", async () => {
  const [scheduler, worker, viteConfig, builtConfig] = await Promise.all([
    readFile(new URL("../app/reminder-scheduler.ts", import.meta.url), "utf8"),
    readFile(new URL("../worker/index.ts", import.meta.url), "utf8"),
    readFile(new URL("../vite.config.ts", import.meta.url), "utf8"),
    readFile(new URL("../dist/server/wrangler.json", import.meta.url), "utf8"),
  ]);

  assert.match(scheduler, /awaiting_schedule_window/);
  assert.match(scheduler, /planReminderSchedule/);
  assert.match(scheduler, /scheduleReminderEmail/);
  assert.match(scheduler, /DAILY_BATCH_LIMIT = 20/);
  assert.match(worker, /async scheduled\(controller: CronController\)/);
  assert.match(viteConfig, /triggers: \{ crons: \["0 1 \* \* \*"\] \}/);
  assert.deepEqual(JSON.parse(builtConfig).triggers.crons, ["0 1 * * *"]);
});

test("supports secure LINE account linking and scheduled push delivery", async () => {
  const [{ verifyLineSignature }, { planLineReminderSchedule }, experience, webhook, messaging, scheduler, worker, schema, exampleEnv] = await Promise.all([
    import("../app/line-signature.ts"),
    import("../app/reminder-schedule.ts"),
    readFile(new URL("../app/remind-experience.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/line/webhook/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/line-messaging.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/reminder-scheduler.ts", import.meta.url), "utf8"),
    readFile(new URL("../worker/index.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../.env.example", import.meta.url), "utf8"),
  ]);

  const body = JSON.stringify({ events: [] });
  const secret = "test-channel-secret";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = Buffer.from(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body))).toString("base64");
  assert.equal(await verifyLineSignature(body, signature, secret), true);
  assert.equal(await verifyLineSignature(`${body} `, signature, secret), false);

  assert.deepEqual(planLineReminderSchedule("2027-04-30", 30, new Date("2026-09-12T00:00:00.000Z")), {
    status: "scheduled",
    scheduledAt: "2027-03-31T01:00:00.000Z",
  });
  assert.match(experience, /label: "LINE"[\s\S]*available: true/);
  assert.match(experience, /\/api\/line\/connect/);
  assert.match(webhook, /x-line-signature/);
  assert.match(webhook, /verifyLineSignature/);
  assert.match(messaging, /api\.line\.me\/v2\/bot\/message\/\$\{endpoint\}/);
  assert.match(messaging, /return send\("push"/);
  assert.match(scheduler, /deliverDueLineReminders/);
  assert.match(worker, /deliverDueLineReminders/);
  assert.match(schema, /lineConnections/);
  assert.match(schema, /recipientLineUserId/);
  for (const keyName of [
    "LINE_CHANNEL_ACCESS_TOKEN",
    "LINE_CHANNEL_SECRET",
    "LINE_OFFICIAL_ACCOUNT_ID",
    "LINE_RECIPIENT_USER_ID",
    "LINE_RECIPIENT_EMAIL",
  ]) {
    assert.match(exampleEnv, new RegExp(`${keyName}=`));
  }
});
