export type ReminderSignal = {
  date: string;
  rawDate: string;
  context: string;
};

export type ReminderAnalysis = {
  characterCount: number;
  fileName: string;
  keywords: string[];
  limited: boolean;
  primaryDate: string;
  signals: ReminderSignal[];
};

const reminderKeywords = [
  "到期", "截止", "期限", "續約", "繳交", "付款", "會議", "合約",
  "expire", "expiry", "deadline", "due", "renewal", "payment", "contract", "meeting",
];

const datePatterns = [
  /\b(20\d{2})[/.年-](0?[1-9]|1[0-2])[/.月-](0?[1-9]|[12]\d|3[01])日?\b/g,
  /\b(0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])[-/.](20\d{2})\b/g,
];

function toIsoDate(match: RegExpExecArray, patternIndex: number) {
  const year = patternIndex === 0 ? Number(match[1]) : Number(match[3]);
  const month = patternIndex === 0 ? Number(match[2]) : Number(match[1]);
  const day = Number(match[3 - patternIndex]);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (candidate.getUTCFullYear() !== year || candidate.getUTCMonth() !== month - 1 || candidate.getUTCDate() !== day) return "";
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function contextAround(text: string, index: number, length: number) {
  const lineStart = Math.max(text.lastIndexOf("\n", index) + 1, index - 55);
  const nextBreak = text.indexOf("\n", index + length);
  const lineEnd = Math.min(nextBreak === -1 ? text.length : nextBreak, index + length + 70);
  return text.slice(lineStart, lineEnd).replace(/\s+/g, " ").trim();
}

export function analyzeReminderText(text: string, fileName: string, limited = false): ReminderAnalysis {
  const searchable = `${fileName}\n${text}`;
  const keywords = reminderKeywords.filter((keyword) => searchable.toLowerCase().includes(keyword.toLowerCase())).slice(0, 6);
  const signals: ReminderSignal[] = [];

  datePatterns.forEach((pattern, patternIndex) => {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(searchable)) && signals.length < 12) {
      const date = toIsoDate(match, patternIndex);
      if (!date || signals.some((signal) => signal.date === date && signal.rawDate === match?.[0])) continue;
      signals.push({ date, rawDate: match[0], context: contextAround(searchable, match.index, match[0].length) });
    }
  });

  signals.sort((a, b) => {
    const aRelevant = reminderKeywords.some((keyword) => a.context.toLowerCase().includes(keyword.toLowerCase())) ? 0 : 1;
    const bRelevant = reminderKeywords.some((keyword) => b.context.toLowerCase().includes(keyword.toLowerCase())) ? 0 : 1;
    return aRelevant - bRelevant || a.date.localeCompare(b.date);
  });

  return {
    characterCount: text.length,
    fileName,
    keywords,
    limited,
    primaryDate: signals[0]?.date ?? "",
    signals,
  };
}

export function sampleReminderDocument(locale: "zh" | "en") {
  return locale === "zh"
    ? "年度顧問合約\n客戶：森木設計\n合約到期日：2026-09-30\n續約確認期限：2026-09-23\n負責人：Joanna\n狀態：尚未確認續約"
    : "Annual consulting contract\nClient: Morrow Studio\nContract expiry: 2026-09-30\nRenewal deadline: 2026-09-23\nOwner: Joanna\nStatus: Renewal not confirmed";
}
