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

test("keeps document parsing local and supports the advertised formats", async () => {
  const [reader, experience] = await Promise.all([
    readFile(new URL("../app/file-readers.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/remind-experience.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(reader, /import\("pdfjs-dist"\)/);
  assert.match(reader, /import\("mammoth"\)/);
  assert.match(reader, /import\("xlsx"\)/);
  assert.match(reader, /MAX_FILE_BYTES = 10 \* 1024 \* 1024/);
  assert.match(experience, /目前在你的瀏覽器內分析，不會上傳文件內容/);
  assert.match(experience, /ReadMinder 讀到這些期限線索/);
  assert.match(experience, /\.pdf,\.csv,\.xlsx,\.xls,\.docx,\.txt,\.json,\.md/);
});
