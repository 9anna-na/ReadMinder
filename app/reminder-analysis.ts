export type ReminderSignal = {
  date: string;
  rawDate: string;
  context: string;
  inferred?: boolean;
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
  "作業", "期中", "期末", "報告", "提案", "簡報",
  "expire", "expiry", "deadline", "due", "renewal", "payment", "contract", "meeting",
  "submit", "upload", "presentation", "midterm", "exam", "homework", "milestone",
];

const datePatterns = [
  /\b(20\d{2})[/.年-](0?[1-9]|1[0-2])[/.月-](0?[1-9]|[12]\d|3[01])日?\b/g,
  /\b(0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])[-/.](20\d{2})\b/g,
  /\b(0?[1-9]|1[0-2])\/(0?[1-9]|[12]\d|3[01])\b(?!\s*\/\s*\d)/g,
];

function semesterYear(fileName: string) {
  const match = fileName.match(/\b(?:fa|fall|sp|spring|su|summer|wi|winter)[\s_-]?(\d{2}|20\d{2})\b/i);
  if (!match) return null;
  const value = Number(match[1]);
  return value < 100 ? 2000 + value : value;
}

function closestYear(month: number, day: number, fileName: string, referenceDate: Date) {
  const namedYear = semesterYear(fileName);
  if (namedYear) return namedYear;

  const referenceYear = referenceDate.getUTCFullYear();
  return [referenceYear - 1, referenceYear, referenceYear + 1].sort((a, b) => {
    const aDistance = Math.abs(Date.UTC(a, month - 1, day) - referenceDate.getTime());
    const bDistance = Math.abs(Date.UTC(b, month - 1, day) - referenceDate.getTime());
    return aDistance - bDistance;
  })[0];
}

function isoDate(year: number, month: number, day: number) {
  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (candidate.getUTCFullYear() !== year || candidate.getUTCMonth() !== month - 1 || candidate.getUTCDate() !== day) return "";
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function toIsoDate(match: RegExpExecArray, patternIndex: number, fileName: string, referenceDate: Date) {
  const month = patternIndex === 0 ? Number(match[2]) : Number(match[1]);
  const day = patternIndex === 0 ? Number(match[3]) : Number(match[2]);
  const year = patternIndex === 0
    ? Number(match[1])
    : patternIndex === 1
      ? Number(match[3])
      : closestYear(month, day, fileName, referenceDate);
  return isoDate(year, month, day);
}

function contextAround(text: string, index: number, length: number) {
  const lineStart = Math.max(text.lastIndexOf("\n", index) + 1, index - 55);
  const nextBreak = text.indexOf("\n", index + length);
  const lineEnd = Math.min(nextBreak === -1 ? text.length : nextBreak, index + length + 70);
  return text.slice(lineStart, lineEnd).replace(/\s+/g, " ").trim();
}

function addWeekScheduleSignals(
  searchable: string,
  fileName: string,
  referenceDate: Date,
  signals: ReminderSignal[],
) {
  const lines = searchable.split(/\r?\n/);
  const anchor = lines.map((line) => line.match(/^\s*W(?:eek\s*)?(\d{1,2})\s*\(\s*(\d{1,2})\/(\d{1,2})\s*\)/i)).find(Boolean);
  if (!anchor) return;

  const anchorWeek = Number(anchor[1]);
  const anchorMonth = Number(anchor[2]);
  const anchorDay = Number(anchor[3]);
  const anchorYear = closestYear(anchorMonth, anchorDay, fileName, referenceDate);
  const anchorDate = new Date(Date.UTC(anchorYear, anchorMonth - 1, anchorDay));
  if (Number.isNaN(anchorDate.getTime())) return;

  const actionPattern = /\b(submit|upload|presentation|midterm|exam|homework|milestone)\b|作業|期中|期末|報告|提案|簡報/i;
  for (const line of lines) {
    const weekMatch = line.match(/^\s*W(?:eek\s*)?(\d{1,2})\b/i);
    if (!weekMatch) continue;
    const milestoneText = line.split(/\s+(?=(?:Prediction|Counterfactual|Couterfactual|Segmentation|Case|Workshop|Project Discussion|Project Presentation):?\b)/i)[0];
    if (signals.length >= 12 || !actionPattern.test(milestoneText)) continue;

    const week = Number(weekMatch[1]);
    const dateValue = new Date(anchorDate);
    dateValue.setUTCDate(anchorDate.getUTCDate() + (week - anchorWeek) * 7);
    const date = isoDate(dateValue.getUTCFullYear(), dateValue.getUTCMonth() + 1, dateValue.getUTCDate());
    if (!date || signals.some((signal) => signal.date === date)) continue;
    signals.push({
      date,
      rawDate: weekMatch[0].trim(),
      context: milestoneText.replace(/\s+/g, " ").trim().slice(0, 220),
      inferred: !/\(\s*\d{1,2}\/\d{1,2}\s*\)/.test(milestoneText),
    });
  }
}

export function analyzeReminderText(
  text: string,
  fileName: string,
  limited = false,
  referenceDate = new Date(),
): ReminderAnalysis {
  const searchable = `${fileName}\n${text}`;
  const keywords = reminderKeywords.filter((keyword) => searchable.toLowerCase().includes(keyword.toLowerCase())).slice(0, 6);
  const signals: ReminderSignal[] = [];

  addWeekScheduleSignals(searchable, fileName, referenceDate, signals);

  datePatterns.forEach((pattern, patternIndex) => {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(searchable)) && signals.length < 12) {
      const date = toIsoDate(match, patternIndex, fileName, referenceDate);
      if (!date || signals.some((signal) => signal.date === date)) continue;
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
