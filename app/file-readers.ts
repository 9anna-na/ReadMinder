const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_TEXT_CHARACTERS = 250_000;
const MAX_PDF_PAGES = 80;
const PDF_MODULE_URL = "/vendor/pdfjs/pdf.min.mjs";
const PDF_WORKER_URL = "/vendor/pdfjs/pdf.worker.min.mjs";

export type ExtractedDocument = {
  text: string;
  limited: boolean;
  format: string;
};

export class DocumentReadError extends Error {
  code: "file-too-large" | "unsupported" | "empty" | "encrypted" | "read-failed";

  constructor(code: DocumentReadError["code"], message: string) {
    super(message);
    this.name = "DocumentReadError";
    this.code = code;
  }
}

function extensionOf(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

function trimExtractedText(text: string) {
  return text.split(String.fromCharCode(0)).join("").trim().slice(0, MAX_TEXT_CHARACTERS);
}

function finish(text: string, format: string, limited = false): ExtractedDocument {
  const cleaned = trimExtractedText(text);
  if (!cleaned) throw new DocumentReadError("empty", "No readable text was found in this document.");
  return { text: cleaned, format, limited: limited || text.length > MAX_TEXT_CHARACTERS };
}

async function readPdf(file: File) {
  const pdfModuleUrl = new URL(PDF_MODULE_URL, globalThis.location.href).href;
  const pdfWorkerUrl = new URL(PDF_WORKER_URL, globalThis.location.href).href;
  const pdfjs = await import(/* @vite-ignore */ pdfModuleUrl) as typeof import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

  try {
    const document = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    const pageCount = Math.min(document.numPages, MAX_PDF_PAGES);
    const pages: string[] = [];

    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" "));
    }

    return finish(pages.join("\n"), "PDF", document.numPages > MAX_PDF_PAGES);
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    if (name === "PasswordException") {
      throw new DocumentReadError("encrypted", "Password-protected PDFs cannot be read yet.");
    }
    if (error instanceof DocumentReadError) throw error;
    throw new DocumentReadError("read-failed", "This PDF could not be read.");
  }
}

async function readDocx(file: File) {
  try {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return finish(result.value, "DOCX");
  } catch (error) {
    if (error instanceof DocumentReadError) throw error;
    throw new DocumentReadError("read-failed", "This Word document could not be read.");
  }
}

async function readWorkbook(file: File, extension: string) {
  try {
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
    const sheets = workbook.SheetNames.map((name) => {
      const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[name], { blankrows: false });
      return `[${name}]\n${csv}`;
    });
    return finish(sheets.join("\n\n"), extension.toUpperCase());
  } catch (error) {
    if (error instanceof DocumentReadError) throw error;
    throw new DocumentReadError("read-failed", "This spreadsheet could not be read.");
  }
}

export async function extractDocumentText(file: File): Promise<ExtractedDocument> {
  if (file.size > MAX_FILE_BYTES) {
    throw new DocumentReadError("file-too-large", "Files must be 10 MB or smaller.");
  }

  const extension = extensionOf(file.name);
  if (["txt", "csv", "json", "md"].includes(extension)) {
    return finish(await file.text(), extension.toUpperCase());
  }
  if (extension === "pdf") return readPdf(file);
  if (extension === "docx") return readDocx(file);
  if (["xlsx", "xls"].includes(extension)) return readWorkbook(file, extension);
  if (extension === "doc") {
    throw new DocumentReadError("unsupported", "Legacy .doc files are not supported. Save the file as .docx and try again.");
  }

  throw new DocumentReadError("unsupported", "This file format is not supported yet.");
}
