"use client";

import { ChangeEvent, FormEvent, useRef, useState } from "react";
import { DocumentReadError, extractDocumentText } from "./file-readers";
import { analyzeReminderText, ReminderAnalysis, sampleReminderDocument } from "./reminder-analysis";

type Locale = "zh" | "en";
type Option = { label: string; icon: string; note?: string; available?: boolean };
type DateRule = { date: string; leadDays: number };

const content = {
  zh: {
    lang: "EN", langHref: "/en", homeLabel: "ReadMinder 首頁", login: "登入", manage: "我的提醒", manageHref: "/reminders",
    badge: "✦ 個人化提醒設定 ✦", heroTop: "重要的事，", heroEm: "不再錯過",
    intro: "回答幾個問題、提供資料，ReadMinder 會讀懂文件中的重要日期，替你建立專屬提醒。",
    cta: "建立我的提醒", free: "免費 · 不需註冊",
    features: [
      ["匯入任何來源", "PDF、試算表、文件，或直接貼上資料連結。", "↗"],
      ["一次選好所有日期", "同一份文件可複選多個日期，分別設定提前天數。", "✦"],
      ["送到習慣的地方", "現在先用 Email，未來也能接上 LINE 與行事曆。", "→"],
    ],
    subtitle: "你的個人提醒建立助手", setup: "設定中", complete: "完成",
    hello: "嗨！我是 ReadMinder，你的文件提醒建立助手 👋",
    guide: "我會帶你快速完成設定，只要幾個步驟，提醒就準備好了。",
    topicQuestion: "你想針對什麼主題建立提醒？",
    sourceQuestion: "收到！你有相關的文件或資料來源嗎？上傳檔案，或直接貼上連結就可以。",
    formatQuestion: "我找到了幾個重要日期。請勾選要追蹤的日期，並分別設定提前多久提醒。",
    deliveryQuestion: "最後一題：提醒要傳送到哪裡？",
    sourcePrefix: "資料來源：", chooseData: "選擇文件或資料", fileTypes: "PDF、DOCX、Excel、CSV、TXT、JSON（最大 10 MB）",
    orLink: "或貼上連結", useLink: "使用連結", later: "稍後再提供", laterValue: "稍後連接資料",
    ready: "你的提醒準備好了", readyCopy: "從現在開始，重要變化會主動來找你。",
    summary: ["主題", "資料", "日期提醒", "傳送到"], activate: "儲存並設定 Email", restart: "再建立一個提醒",
    placeholder: "例如：合約快到期、待辦還沒完成……", send: "送出", user: "你",
    loginSoon: "登入功能即將開放", prototype: "這是互動原型：下一版會在這裡連接帳號並啟用提醒。",
    sample: "試用範例合約", localOnly: "目前在你的瀏覽器內分析，不會上傳文件內容。",
    analysisTitle: "ReadMinder 讀到這些期限線索", datesFound: "可複選要提醒的日期", keywordsFound: "期限關鍵字",
    noDate: "目前沒有找到明確日期，請在下方手動選擇。", limited: "文件很長，ReadMinder 已分析前段內容。建議確認下方日期是否完整。",
    analyzing: "正在讀取文件…", readErrors: {
      "file-too-large": "檔案超過 10 MB，請縮小後再試一次。", unsupported: "目前不支援這個格式；舊版 .doc 請先另存成 .docx。",
      empty: "沒有讀到文字。若是掃描型 PDF，下一版加入 OCR 後才能辨識。", encrypted: "目前無法讀取有密碼的 PDF。", "read-failed": "文件讀取失敗，請確認檔案沒有損毀後再試一次。",
    },
    manualDate: "找不到想要的日期？手動加入", addDate: "加入日期", selectedDates: "已選日期與提醒時間", continue: "選好，繼續", dateHint: "每個日期都能設定不同的提前天數；Email 可自動排定未來 30 天內的提醒。", dateRequired: "請至少選擇一個提醒日期。",
    remindBefore: "提前多久提醒", days: "天", recipientEmail: "提醒要寄到哪個 Email？", emailPlaceholder: "you@example.com",
    emailConsent: "按下儲存即同意 ReadMinder 僅將此 Email 用於這筆提醒。", testMode: "測試模式目前只能寄到你註冊 Resend 的信箱。", saving: "正在安全儲存…", saved: "已儲存到雲端 ✓", sent: "確認信已寄出 ✓", scheduled: "自動提醒已排定 ✓",
    scheduledNote: "已排定的自動提醒：", partialNote: "部分提醒已排定；其餘日期超過 30 天，目前只會保存、不會自動寄出。", reviewNote: "提醒已儲存，但所選日期目前無法自動排定；請選擇有效的未來日期。", waitingNote: "提醒已儲存，但寄送時間超過 30 天，目前尚未排程。", pendingNote: "提醒已保存，但確認信未寄出；測試模式請使用你註冊 Resend 的信箱。", saveError: "暫時無法儲存，請確認已登入後再試一次。",
  },
  en: {
    lang: "中文", langHref: "/", homeLabel: "ReadMinder home", login: "Log in", manage: "My reminders", manageHref: "/en/reminders",
    badge: "✦ PERSONALISED REMINDER SETUP ✦", heroTop: "Never miss what", heroEm: "matters most",
    intro: "Answer a few questions, upload your data, and ReadMinder turns important dates into tailored reminders.",
    cta: "Build my reminder", free: "Free · No sign-up needed",
    features: [
      ["Import any source", "Upload a PDF or spreadsheet, or simply paste a link.", "↗"],
      ["Select every important date", "Track multiple dates from one document, each with its own lead time.", "✦"],
      ["Delivered your way", "Start with email, with LINE and calendar support coming later.", "→"],
    ],
    subtitle: "Your personal reminder builder", setup: "SETUP", complete: "COMPLETE",
    hello: "Hi there! I'm ReadMinder, your document-aware reminder builder. 👋",
    guide: "I'll guide you through a quick setup — a few steps and your reminders will be ready.",
    topicQuestion: "What's the topic you'd like to build reminders around?",
    sourceQuestion: "Great. Do you have a document or data source? Upload a file or paste a link.",
    formatQuestion: "I found several important dates. Select the ones to track and set a lead time for each.",
    deliveryQuestion: "One last question: where should we send your reminders?",
    sourcePrefix: "Source: ", chooseData: "Choose a document or data file", fileTypes: "PDF, DOCX, Excel, CSV, TXT, JSON (10 MB max)",
    orLink: "or paste a link", useLink: "Use link", later: "I'll add it later", laterValue: "Connect data later",
    ready: "Your reminder is ready", readyCopy: "You're all set. Important changes will now come to you.",
    summary: ["TOPIC", "SOURCE", "DATE REMINDERS", "DELIVERY"], activate: "Save and set up email", restart: "Build another reminder",
    placeholder: "Type your message...", send: "Send", user: "You",
    loginSoon: "Login is coming soon", prototype: "This is an interactive prototype. Account connection will be added next.",
    sample: "Try a sample contract", localOnly: "For now, analysis happens in your browser. The document is not uploaded.",
    analysisTitle: "ReadMinder found these deadline signals", datesFound: "Select one or more dates", keywordsFound: "Deadline keywords",
    noDate: "No explicit date was found. Choose one manually below.", limited: "This is a long document, so ReadMinder analysed its first section. Check that the dates below are complete.",
    analyzing: "Reading document…", readErrors: {
      "file-too-large": "This file is over 10 MB. Please reduce its size and try again.", unsupported: "This format is not supported yet. Save legacy .doc files as .docx and try again.",
      empty: "No text was found. Scanned PDFs will need OCR support in a future version.", encrypted: "Password-protected PDFs cannot be read yet.", "read-failed": "The document could not be read. Check that it is not damaged and try again.",
    },
    manualDate: "Can't find the date? Add it manually", addDate: "Add date", selectedDates: "Selected dates and timing", continue: "Continue", dateHint: "Each date can have a different lead time. Email reminders can be scheduled up to 30 days ahead.", dateRequired: "Choose at least one reminder date.",
    remindBefore: "Remind me before", days: "days", recipientEmail: "Which email should receive the reminder?", emailPlaceholder: "you@example.com",
    emailConsent: "By saving, you agree that ReadMinder may use this email only for this reminder.", testMode: "Test mode can currently send only to the email registered with your Resend account.", saving: "Saving securely…", saved: "Saved to the cloud ✓", sent: "Confirmation sent ✓", scheduled: "Automatic reminder scheduled ✓",
    scheduledNote: "Scheduled automatic reminders:", partialNote: "Some reminders are scheduled. Dates beyond 30 days are saved but will not be sent automatically yet.", reviewNote: "The reminders were saved, but the selected dates could not be scheduled. Choose valid future dates.", waitingNote: "The reminders are saved, but their send times are more than 30 days away and are not scheduled yet.", pendingNote: "Your reminders are saved, but confirmation could not be sent. In test mode, use your Resend account email.", saveError: "We couldn't save these reminders. Check that you're signed in and try again.",
  },
} as const;

const deliveries: Record<Locale, Option[]> = {
  zh: [{ label: "Email", icon: "@", note: "目前可設定", available: true }, { label: "LINE", icon: "L", note: "即將開放" }, { label: "Google 日曆", icon: "31", note: "即將開放" }],
  en: [{ label: "Email", icon: "@", note: "Available now", available: true }, { label: "LINE", icon: "L", note: "Coming soon" }, { label: "Google Calendar", icon: "31", note: "Coming soon" }],
};

export default function ReadMinderExperience({ locale = "zh" }: { locale?: Locale }) {
  const t = content[locale];
  const [screen, setScreen] = useState<"landing" | "builder">("landing");
  const [step, setStep] = useState(1);
  const [topic, setTopic] = useState(""); const [draft, setDraft] = useState("");
  const [source, setSource] = useState(""); const [link, setLink] = useState("");
  const [delivery, setDelivery] = useState("");
  const [analysis, setAnalysis] = useState<ReminderAnalysis | null>(null);
  const [dateRules, setDateRules] = useState<DateRule[]>([]);
  const [manualDate, setManualDate] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [saved, setSaved] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [scheduleStatus, setScheduleStatus] = useState("");
  const [scheduledItems, setScheduledItems] = useState<Array<{ date: string; scheduledFor: string }>>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const progress = step >= 5 ? 100 : (step - 1) * 25;

  function start() { setScreen("builder"); window.scrollTo({ top: 0 }); }
  function submitTopic(event: FormEvent) { event.preventDefault(); if (draft.trim()) { setTopic(draft.trim()); setStep(2); } }
  function applyAnalysis(nextAnalysis: ReminderAnalysis) {
    setAnalysis(nextAnalysis);
    setDateRules(nextAnalysis.primaryDate ? [{ date: nextAnalysis.primaryDate, leadDays: 7 }] : []);
  }
  function toggleDate(date: string) {
    setDateRules((current) => current.some((rule) => rule.date === date)
      ? current.filter((rule) => rule.date !== date)
      : [...current, { date, leadDays: 7 }]);
  }
  function addManualDate() {
    if (!manualDate) return;
    setDateRules((current) => current.some((rule) => rule.date === manualDate) ? current : [...current, { date: manualDate, leadDays: 7 }]);
    setManualDate("");
  }
  function updateLeadDays(date: string, leadDays: number) {
    setDateRules((current) => current.map((rule) => rule.date === date ? { ...rule, leadDays } : rule));
  }
  function useLink() { if (link.trim()) { const nextAnalysis = analyzeReminderText(link.trim(), link.trim(), true); setSource(link.trim()); applyAnalysis(nextAnalysis); setStep(3); } }
  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setAnalyzing(true);
    setAnalysisError("");
    try {
      const document = await extractDocumentText(file);
      setSource(file.name);
      applyAnalysis(analyzeReminderText(document.text, file.name, document.limited));
      setStep(3);
    } catch (error) {
      const code = error instanceof DocumentReadError ? error.code : "read-failed";
      setAnalysisError(t.readErrors[code]);
      event.target.value = "";
    } finally {
      setAnalyzing(false);
    }
  }
  function useSample() {
    const fileName = locale === "zh" ? "年度顧問合約.csv" : "annual-consulting-contract.csv";
    const sample = sampleReminderDocument(locale);
    setSource(fileName);
    applyAnalysis(analyzeReminderText(sample, fileName));
    setStep(3);
  }
  async function saveReminder() {
    if (!recipientEmail.trim()) return;
    setSaving(true);
    setSaveError("");
    try {
      const response = await fetch("/api/reminders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ topic, source, format: locale === "en" ? "Date reminders" : "日期提醒", delivery, reminders: dateRules, recipientEmail, analysis, locale }),
      });
      if (!response.ok) throw new Error("save failed");
      const result = await response.json() as { reminder?: { confirmationSent?: boolean; scheduledItems?: Array<{ date: string; scheduledFor: string }>; status?: string } };
      setConfirmationSent(Boolean(result.reminder?.confirmationSent));
      setScheduledItems(result.reminder?.scheduledItems ?? []);
      setScheduleStatus(result.reminder?.status ?? "");
      setSaved(true);
    } catch {
      setSaveError(t.saveError);
    } finally {
      setSaving(false);
    }
  }
  function reset() { setStep(1); setTopic(""); setDraft(""); setSource(""); setLink(""); setDelivery(""); setAnalysis(null); setDateRules([]); setManualDate(""); setAnalysisError(""); setRecipientEmail(""); setSaved(false); setConfirmationSent(false); setScheduleStatus(""); setScheduledItems([]); setSaving(false); setSaveError(""); }

  const formatScheduledAt = (value: string) => new Intl.DateTimeFormat(locale === "en" ? "en-US" : "zh-TW", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Taipei" }).format(new Date(value));
  const dateSummary = locale === "en" ? `${dateRules.length} selected` : `已選 ${dateRules.length} 個日期`;

  if (screen === "landing") return <main className={`f-landing f-${locale}`}>
    <header className="f-landing-header">
      <a className="f-brand" href="#top" aria-label={t.homeLabel}><span className="f-brand-mark">R</span><span>ReadMinder</span></a>
      <div className="f-header-actions"><a href={t.manageHref}>{t.manage}</a><a href={t.langHref}>{t.lang}</a><button className="f-header-cta" onClick={() => window.alert(t.loginSoon)}>{t.login} <span>→</span></button></div>
    </header>
    <div className="f-stitch" aria-hidden="true">{Array.from({ length: 14 }).map((_, i) => <span key={i} />)}</div>
    <section className="f-hero" id="top">
      <div className="f-kicker">{t.badge}</div><h1>{t.heroTop}<br /><em>{t.heroEm}</em></h1><p>{t.intro}</p>
      <div className="f-cta-row"><button className="f-main-cta" onClick={start}>{t.cta} <span>→</span></button><small>{t.free}</small></div>
    </section>
    <section className="f-features" aria-label={locale === "en" ? "Product features" : "產品特色"}>{t.features.map((feature, i) => <article key={feature[0]}><span>0{i + 1}</span><i>{feature[2]}</i><h2>{feature[0]}</h2><p>{feature[1]}</p></article>)}</section>
    <Footer />
  </main>;

  return <main className={`f-builder f-${locale}`}>
    <header className="f-builder-header">
      <button className="f-brand f-brand-button" onClick={() => setScreen("landing")} aria-label={locale === "en" ? "Back to home" : "回到首頁"}><span className="f-brand-mark">R</span><span className="f-brand-copy"><b>ReadMinder</b><small>{t.subtitle}</small></span></button>
      <div className="f-builder-actions"><a href={t.manageHref}>{t.manage}</a><a href={t.langHref}>{t.lang}</a><button onClick={() => window.alert(t.loginSoon)}>{t.login}</button><span className="f-setup-tag">{t.setup}</span></div>
    </header>
    <section className="f-chat-card" aria-live="polite">
      <div className="f-progress"><div><b>{step >= 5 ? t.complete : `STEP ${step} OF 4`}</b><span>{progress}%</span></div><i><span style={{ width: `${progress}%` }} /></i></div>
      <div className="f-conversation">
        <Bot text={t.hello} /><Bot text={t.guide} /><Bot text={t.topicQuestion} />
        {topic && <User text={topic} label={t.user} />}{step >= 2 && <Bot text={t.sourceQuestion} />}{source && <User text={`${t.sourcePrefix}${source}`} label={t.user} />}
        {step >= 3 && <Bot text={t.formatQuestion} />}{step >= 4 && <User text={dateSummary} label={t.user} />}{step >= 4 && <Bot text={t.deliveryQuestion} />}{delivery && <User text={delivery} label={t.user} />}

        {step === 2 && <div className="f-source-picker">
          <input ref={fileRef} className="f-hidden" type="file" accept=".pdf,.csv,.xlsx,.xls,.docx,.txt,.json,.md" onChange={chooseFile} />
          <button className="f-upload" disabled={analyzing} onClick={() => fileRef.current?.click()}><span>{analyzing ? "…" : "↑"}</span><b>{analyzing ? t.analyzing : t.chooseData}</b><small>{t.fileTypes}</small></button>
          <p className="f-local-note">◎ {t.localOnly}</p>
          {analysisError && <p className="f-upload-error" role="alert">! {analysisError}</p>}
          <button className="f-sample" onClick={useSample}>✦ {t.sample} →</button>
          <div className="f-or"><span>{t.orLink}</span></div><div className="f-link"><input aria-label={t.orLink} value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://docs.google.com/..." /><button disabled={!link.trim()} onClick={useLink}>{t.useLink} →</button></div><button className="f-skip" onClick={() => { setSource(t.laterValue); setAnalysis(null); setStep(3); }}>{t.later}</button>
        </div>}
        {step === 3 && <>
          {analysis && <div className="f-analysis-card">
            <div className="f-analysis-head"><span>✦</span><div><small>DOCUMENT ANALYSIS</small><h3>{t.analysisTitle}</h3></div></div>
            {analysis.limited && <p className="f-analysis-warning">{t.limited}</p>}
            {analysis.signals.length ? <div className="f-signal-list"><span>{t.datesFound}</span>{analysis.signals.slice(0, 6).map((signal) => { const selected = dateRules.some((rule) => rule.date === signal.date); return <button type="button" className={selected ? "is-selected" : ""} aria-pressed={selected} onClick={() => toggleDate(signal.date)} key={`${signal.date}-${signal.rawDate}`}><b>{signal.date}</b><p>{signal.context}</p><i>{selected ? "✓" : "+"}</i></button>; })}</div> : <p className="f-analysis-empty">{t.noDate}</p>}
            {!!analysis.keywords.length && <div className="f-keywords"><span>{t.keywordsFound}</span><div>{analysis.keywords.map((keyword) => <b key={keyword}>{keyword}</b>)}</div></div>}
          </div>}
          <div className="f-date-settings">
            <div className="f-manual-date"><label><span>{t.manualDate}</span><input type="date" value={manualDate} onChange={(event) => setManualDate(event.target.value)} /></label><button type="button" disabled={!manualDate} onClick={addManualDate}>{t.addDate}</button></div>
            <small>{t.dateHint}</small>
            {!!dateRules.length && <div className="f-selected-dates"><b>{t.selectedDates}</b>{dateRules.map((rule) => <div key={rule.date}><span>{rule.date}</span><label><span>{t.remindBefore}</span><select value={rule.leadDays} onChange={(event) => updateLeadDays(rule.date, Number(event.target.value))}><option value={1}>1 {t.days}</option><option value={3}>3 {t.days}</option><option value={7}>7 {t.days}</option><option value={14}>14 {t.days}</option><option value={30}>30 {t.days}</option></select></label><button type="button" aria-label={`${rule.date} ×`} onClick={() => toggleDate(rule.date)}>×</button></div>)}</div>}
            {!dateRules.length && <p className="f-date-required">{t.dateRequired}</p>}
            <button type="button" className="f-date-continue" disabled={!dateRules.length} onClick={() => setStep(4)}>{t.continue} →</button>
          </div>
        </>}
        {step === 4 && <div className="f-choices f-deliveries">{deliveries[locale].map((item) => <button key={item.label} disabled={!item.available} onClick={() => { setDelivery(item.label); window.setTimeout(() => setStep(5), 180); }}><i>{item.icon}</i><span><b>{item.label}</b><small>{item.note}</small></span><em>{item.available ? "→" : "○"}</em></button>)}</div>}
        {step === 5 && <div className="f-ready"><span className="f-ready-spark">✦</span><div><small>ALL SET</small><h2>{t.ready}</h2><p>{t.readyCopy}</p></div><div className="f-final-rules">{dateRules.map((rule) => <div className="f-final-rule" key={rule.date}><span>{t.remindBefore}</span><b>{rule.date}</b><em>− {rule.leadDays} {t.days}</em></div>)}</div><div className="f-summary">{[topic, source, dateSummary, delivery].map((value, i) => <div key={t.summary[i]}><span>{t.summary[i]}</span><b>{value}</b></div>)}</div><label className="f-email-field"><span>{t.recipientEmail}</span><input type="email" autoComplete="email" value={recipientEmail} onChange={(event) => setRecipientEmail(event.target.value)} placeholder={t.emailPlaceholder} disabled={saved} /><small>{t.emailConsent}</small><small className="f-test-mode">◎ {t.testMode}</small></label><button className={`f-activate ${saved ? "is-saved" : ""}`} disabled={saved || saving || !dateRules.length || !recipientEmail.includes("@") || !recipientEmail.includes(".")} onClick={saveReminder}>{saved ? scheduledItems.length ? t.scheduled : confirmationSent ? t.sent : t.saved : saving ? t.saving : t.activate} <span>{saved || saving ? "" : "→"}</span></button>{saveError && <p className="f-save-error" role="alert">! {saveError}</p>}{saved && <div className="f-saved-note">{scheduledItems.length ? <><b>{scheduledItems.length < dateRules.length ? t.partialNote : t.scheduledNote}</b>{scheduledItems.map((item) => <span key={item.date}>{item.date} → {formatScheduledAt(item.scheduledFor)}</span>)}</> : scheduleStatus === "awaiting_schedule_window" ? t.waitingNote : confirmationSent ? t.reviewNote : t.pendingNote}</div>}<button className="f-restart" onClick={reset}>← {t.restart}</button></div>}
      </div>
      {step === 1 && <form className="f-composer" onSubmit={submitTopic}><input aria-label={t.topicQuestion} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={t.placeholder} /><button disabled={!draft.trim()}>{t.send} <span>→</span></button></form>}
    </section><Footer />
  </main>;
}

function Bot({ text }: { text: string }) { return <div className="f-message f-bot"><span>R</span><p>{text}</p></div>; }
function User({ text, label }: { text: string; label: string }) { return <div className="f-message f-user"><p>{text}</p><span>{label}</span></div>; }
function Footer() { return <footer className="f-footer"><span>Smart reminders, built around you.</span><i>✦</i></footer>; }
