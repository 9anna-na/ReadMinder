"use client";

import { ChangeEvent, FormEvent, useRef, useState } from "react";
import { DocumentReadError, extractDocumentText } from "./file-readers";
import { analyzeReminderText, ReminderAnalysis, sampleReminderDocument } from "./reminder-analysis";

type Locale = "zh" | "en";
type Option = { label: string; icon: string; note?: string };

const content = {
  zh: {
    lang: "EN", langHref: "/en", homeLabel: "Remind 首頁", login: "登入",
    badge: "✦ 個人化提醒設定 ✦", heroTop: "重要的事，", heroEm: "不再錯過",
    intro: "回答幾個問題、提供資料，Remind 會在兩分鐘內替你建立專屬提醒系統。",
    cta: "建立我的提醒", free: "免費 · 不需註冊",
    features: [
      ["匯入任何來源", "PDF、試算表、文件，或直接貼上資料連結。", "↗"],
      ["你的格式，你的規則", "即時通知、每日摘要，或照你的節奏排程。", "✦"],
      ["送到習慣的地方", "LINE、Email、Slack、行事曆，選你最常看的。", "→"],
    ],
    subtitle: "你的個人提醒建立助手", setup: "設定中", complete: "完成",
    hello: "嗨！我是 Remind，你的個人提醒建立助手 👋",
    guide: "我會帶你快速完成設定，只要幾個步驟，提醒就準備好了。",
    topicQuestion: "你想針對什麼主題建立提醒？",
    sourceQuestion: "收到！你有相關的文件或資料來源嗎？上傳檔案，或直接貼上連結就可以。",
    formatQuestion: "很好，我會從這份資料裡找出需要注意的變化。你希望提醒怎麼整理？",
    deliveryQuestion: "最後一題：提醒要傳送到哪裡？",
    sourcePrefix: "資料來源：", chooseData: "選擇文件或資料", fileTypes: "PDF、DOCX、Excel、CSV、TXT、JSON（最大 10 MB）",
    orLink: "或貼上連結", useLink: "使用連結", later: "稍後再提供", laterValue: "稍後連接資料",
    ready: "你的提醒準備好了", readyCopy: "從現在開始，重要變化會主動來找你。",
    summary: ["主題", "資料", "格式", "傳送到"], activate: "儲存這個提醒", restart: "再建立一個提醒",
    placeholder: "例如：合約快到期、待辦還沒完成……", send: "送出", user: "你",
    loginSoon: "登入功能即將開放", prototype: "這是互動原型：下一版會在這裡連接帳號並啟用提醒。",
    sample: "試用範例合約", localOnly: "目前在你的瀏覽器內分析，不會上傳文件內容。",
    analysisTitle: "Remind 讀到這些期限線索", datesFound: "辨識到的日期", keywordsFound: "期限關鍵字",
    noDate: "目前沒有找到明確日期，你仍可以繼續建立提醒。", limited: "文件很長，Remind 已分析前段內容。建議確認下方日期是否完整。",
    analyzing: "正在讀取文件…", readErrors: {
      "file-too-large": "檔案超過 10 MB，請縮小後再試一次。", unsupported: "目前不支援這個格式；舊版 .doc 請先另存成 .docx。",
      empty: "沒有讀到文字。若是掃描型 PDF，下一版加入 OCR 後才能辨識。", encrypted: "目前無法讀取有密碼的 PDF。", "read-failed": "文件讀取失敗，請確認檔案沒有損毀後再試一次。",
    },
    remindBefore: "提前多久提醒", days: "天", saved: "已儲存在這台裝置 ✓", savedNote: "這筆提醒已保存在瀏覽器；下一階段會接上帳號、排程與真正通知。",
  },
  en: {
    lang: "中文", langHref: "/", homeLabel: "Remind home", login: "Log in",
    badge: "✦ PERSONALISED REMINDER SETUP ✦", heroTop: "Never miss what", heroEm: "matters most",
    intro: "Answer a few questions, upload your data, and Remind builds a tailored reminder system — in under two minutes.",
    cta: "Build my reminder", free: "Free · No sign-up needed",
    features: [
      ["Import any source", "Upload a PDF or spreadsheet, or simply paste a link.", "↗"],
      ["Your format, your rules", "Choose instant alerts, daily digests, or a custom schedule.", "✦"],
      ["Delivered your way", "Send it to LINE, email, Slack, or your calendar.", "→"],
    ],
    subtitle: "Your personal reminder builder", setup: "SETUP", complete: "COMPLETE",
    hello: "Hi there! I'm Remind, your personal reminder builder. 👋",
    guide: "I'll guide you through a quick setup — a few steps and your reminders will be ready.",
    topicQuestion: "What's the topic you'd like to build reminders around?",
    sourceQuestion: "Great. Do you have a document or data source? Upload a file or paste a link.",
    formatQuestion: "Perfect. How would you like your reminders to be organised?",
    deliveryQuestion: "One last question: where should we send your reminders?",
    sourcePrefix: "Source: ", chooseData: "Choose a document or data file", fileTypes: "PDF, DOCX, Excel, CSV, TXT, JSON (10 MB max)",
    orLink: "or paste a link", useLink: "Use link", later: "I'll add it later", laterValue: "Connect data later",
    ready: "Your reminder is ready", readyCopy: "You're all set. Important changes will now come to you.",
    summary: ["TOPIC", "SOURCE", "FORMAT", "DELIVERY"], activate: "Save this reminder", restart: "Build another reminder",
    placeholder: "Type your message...", send: "Send", user: "You",
    loginSoon: "Login is coming soon", prototype: "This is an interactive prototype. Account connection will be added next.",
    sample: "Try a sample contract", localOnly: "For now, analysis happens in your browser. The document is not uploaded.",
    analysisTitle: "Remind found these deadline signals", datesFound: "Dates found", keywordsFound: "Deadline keywords",
    noDate: "No explicit date was found. You can still continue building the reminder.", limited: "This is a long document, so Remind analysed its first section. Check that the dates below are complete.",
    analyzing: "Reading document…", readErrors: {
      "file-too-large": "This file is over 10 MB. Please reduce its size and try again.", unsupported: "This format is not supported yet. Save legacy .doc files as .docx and try again.",
      empty: "No text was found. Scanned PDFs will need OCR support in a future version.", encrypted: "Password-protected PDFs cannot be read yet.", "read-failed": "The document could not be read. Check that it is not damaged and try again.",
    },
    remindBefore: "Remind me before", days: "days", saved: "Saved on this device ✓", savedNote: "This reminder is stored in your browser. Accounts, scheduling and live delivery come next.",
  },
} as const;

const formats: Record<Locale, Option[]> = {
  zh: [
    { label: "每日摘要", icon: "☀", note: "每天一次，整齊整理" }, { label: "即時提醒", icon: "⚡", note: "條件發生立刻通知" },
    { label: "每週摘要", icon: "▦", note: "每週回顧重要變化" }, { label: "自訂排程", icon: "⌁", note: "依你的時間與頻率" },
  ],
  en: [
    { label: "Daily digest", icon: "☀", note: "One tidy update every day" }, { label: "Immediate alert", icon: "⚡", note: "Know as soon as it happens" },
    { label: "Weekly summary", icon: "▦", note: "Review key changes each week" }, { label: "Custom schedule", icon: "⌁", note: "Set your own timing and rhythm" },
  ],
};

const deliveries: Record<Locale, Option[]> = {
  zh: [{ label: "LINE", icon: "L" }, { label: "Email", icon: "@" }, { label: "Push 通知", icon: "◉" }, { label: "Slack", icon: "#" }, { label: "Google 日曆", icon: "31" }],
  en: [{ label: "LINE", icon: "L" }, { label: "Email", icon: "@" }, { label: "Push notification", icon: "◉" }, { label: "Slack", icon: "#" }, { label: "Google Calendar", icon: "31" }],
};

export default function RemindExperience({ locale = "zh" }: { locale?: Locale }) {
  const t = content[locale];
  const [screen, setScreen] = useState<"landing" | "builder">("landing");
  const [step, setStep] = useState(1);
  const [topic, setTopic] = useState(""); const [draft, setDraft] = useState("");
  const [source, setSource] = useState(""); const [link, setLink] = useState("");
  const [format, setFormat] = useState(""); const [delivery, setDelivery] = useState("");
  const [analysis, setAnalysis] = useState<ReminderAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [leadDays, setLeadDays] = useState(7);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const progress = step >= 5 ? 100 : (step - 1) * 25;

  function start() { setScreen("builder"); window.scrollTo({ top: 0 }); }
  function submitTopic(event: FormEvent) { event.preventDefault(); if (draft.trim()) { setTopic(draft.trim()); setStep(2); } }
  function useLink() { if (link.trim()) { setSource(link.trim()); setAnalysis(analyzeReminderText(link.trim(), link.trim(), true)); setStep(3); } }
  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setAnalyzing(true);
    setAnalysisError("");
    try {
      const document = await extractDocumentText(file);
      setSource(file.name);
      setAnalysis(analyzeReminderText(document.text, file.name, document.limited));
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
    setAnalysis(analyzeReminderText(sample, fileName));
    setStep(3);
  }
  function saveReminder() {
    const reminder = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), topic, source, format, delivery, leadDays, analysis };
    const current = JSON.parse(window.localStorage.getItem("remind.reminders") ?? "[]");
    window.localStorage.setItem("remind.reminders", JSON.stringify([...current, reminder]));
    setSaved(true);
  }
  function reset() { setStep(1); setTopic(""); setDraft(""); setSource(""); setLink(""); setFormat(""); setDelivery(""); setAnalysis(null); setAnalysisError(""); setLeadDays(7); setSaved(false); }

  if (screen === "landing") return <main className={`f-landing f-${locale}`}>
    <header className="f-landing-header">
      <a className="f-brand" href="#top" aria-label={t.homeLabel}><span className="f-brand-mark">R</span><span>Remind</span></a>
      <div className="f-header-actions"><a href={t.langHref}>{t.lang}</a><button className="f-header-cta" onClick={() => window.alert(t.loginSoon)}>{t.login} <span>→</span></button></div>
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
      <button className="f-brand f-brand-button" onClick={() => setScreen("landing")} aria-label={locale === "en" ? "Back to home" : "回到首頁"}><span className="f-brand-mark">R</span><span className="f-brand-copy"><b>Remind</b><small>{t.subtitle}</small></span></button>
      <div className="f-builder-actions"><a href={t.langHref}>{t.lang}</a><button onClick={() => window.alert(t.loginSoon)}>{t.login}</button><span className="f-setup-tag">{t.setup}</span></div>
    </header>
    <section className="f-chat-card" aria-live="polite">
      <div className="f-progress"><div><b>{step >= 5 ? t.complete : `STEP ${step} OF 4`}</b><span>{progress}%</span></div><i><span style={{ width: `${progress}%` }} /></i></div>
      <div className="f-conversation">
        <Bot text={t.hello} /><Bot text={t.guide} /><Bot text={t.topicQuestion} />
        {topic && <User text={topic} label={t.user} />}{step >= 2 && <Bot text={t.sourceQuestion} />}{source && <User text={`${t.sourcePrefix}${source}`} label={t.user} />}
        {step >= 3 && <Bot text={t.formatQuestion} />}{format && <User text={format} label={t.user} />}{step >= 4 && <Bot text={t.deliveryQuestion} />}{delivery && <User text={delivery} label={t.user} />}

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
            {analysis.signals.length ? <div className="f-signal-list"><span>{t.datesFound}</span>{analysis.signals.slice(0, 3).map((signal) => <div key={`${signal.date}-${signal.rawDate}`}><b>{signal.date}</b><p>{signal.context}</p></div>)}</div> : <p className="f-analysis-empty">{t.noDate}</p>}
            {!!analysis.keywords.length && <div className="f-keywords"><span>{t.keywordsFound}</span><div>{analysis.keywords.map((keyword) => <b key={keyword}>{keyword}</b>)}</div></div>}
            <label className="f-lead-days"><span>{t.remindBefore}</span><select value={leadDays} onChange={(event) => setLeadDays(Number(event.target.value))}><option value={1}>1 {t.days}</option><option value={3}>3 {t.days}</option><option value={7}>7 {t.days}</option><option value={14}>14 {t.days}</option><option value={30}>30 {t.days}</option></select></label>
          </div>}
          <div className="f-choices">{formats[locale].map((item) => <button key={item.label} onClick={() => { setFormat(item.label); window.setTimeout(() => setStep(4), 180); }}><i>{item.icon}</i><span><b>{item.label}</b><small>{item.note}</small></span><em>→</em></button>)}</div>
        </>}
        {step === 4 && <div className="f-choices f-deliveries">{deliveries[locale].map((item) => <button key={item.label} onClick={() => { setDelivery(item.label); window.setTimeout(() => setStep(5), 180); }}><i>{item.icon}</i><b>{item.label}</b><em>→</em></button>)}</div>}
        {step === 5 && <div className="f-ready"><span className="f-ready-spark">✦</span><div><small>ALL SET</small><h2>{t.ready}</h2><p>{t.readyCopy}</p></div>{analysis?.primaryDate && <div className="f-final-rule"><span>{t.remindBefore}</span><b>{analysis.primaryDate}</b><em>− {leadDays} {t.days}</em></div>}<div className="f-summary">{[topic, source, format, delivery].map((value, i) => <div key={t.summary[i]}><span>{t.summary[i]}</span><b>{value}</b></div>)}</div><button className={`f-activate ${saved ? "is-saved" : ""}`} disabled={saved} onClick={saveReminder}>{saved ? t.saved : t.activate} <span>{saved ? "" : "→"}</span></button>{saved && <p className="f-saved-note">{t.savedNote}</p>}<button className="f-restart" onClick={reset}>← {t.restart}</button></div>}
      </div>
      {step === 1 && <form className="f-composer" onSubmit={submitTopic}><input aria-label={t.topicQuestion} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={t.placeholder} /><button disabled={!draft.trim()}>{t.send} <span>→</span></button></form>}
    </section><Footer />
  </main>;
}

function Bot({ text }: { text: string }) { return <div className="f-message f-bot"><span>R</span><p>{text}</p></div>; }
function User({ text, label }: { text: string; label: string }) { return <div className="f-message f-user"><p>{text}</p><span>{label}</span></div>; }
function Footer() { return <footer className="f-footer"><span>Smart reminders, built around you.</span><i>✦</i></footer>; }
