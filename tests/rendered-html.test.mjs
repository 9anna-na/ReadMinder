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

test("server-renders the Traditional Chinese ReadMinder landing page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html lang="zh-Hant">/);
  assert.match(html, /ReadMinder｜讀懂重要日期，準時提醒你/);
  assert.match(html, /建立我的提醒/);
  assert.match(html, /匯入任何來源/);
  assert.match(html, /href="\/en"/);
});

test("server-renders the matching English experience", async () => {
  const response = await render("/en");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /Never miss what/);
  assert.match(html, /Build my reminder/);
  assert.match(html, /Import any source/);
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
  const [reader, experience, pdfModule, pdfWorker] = await Promise.all([
    readFile(new URL("../app/file-readers.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/remind-experience.tsx", import.meta.url), "utf8"),
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
  assert.match(reminderRoute, /export async function PATCH/);
  assert.match(reminderRoute, /export async function DELETE/);
  assert.match(reminderRoute, /and\(eq\(reminders\.id, id\), eq\(reminders\.ownerId, user\.userId\)\)/);
  assert.match(emailModule, /cancelScheduledReminderEmail/);
  assert.match(emailModule, /emails\/\$\{encodeURIComponent\(emailId\)\}\/cancel/);
});
