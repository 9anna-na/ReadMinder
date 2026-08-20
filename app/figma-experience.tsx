"use client";

import { ChangeEvent, FormEvent, useRef, useState } from "react";

type Format = "每日摘要" | "即時提醒" | "每週摘要" | "自訂排程";
type Delivery = "LINE" | "Email" | "Push 通知" | "Slack" | "Google 日曆";

const formats: { label: Format; icon: string; note: string }[] = [
  { label: "每日摘要", icon: "☀", note: "每天一次，整齊整理" },
  { label: "即時提醒", icon: "⚡", note: "條件發生立刻通知" },
  { label: "每週摘要", icon: "▦", note: "每週回顧重要變化" },
  { label: "自訂排程", icon: "⌁", note: "依你的時間與頻率" },
];

const deliveries: { label: Delivery; icon: string }[] = [
  { label: "LINE", icon: "L" }, { label: "Email", icon: "@" },
  { label: "Push 通知", icon: "◉" }, { label: "Slack", icon: "#" },
  { label: "Google 日曆", icon: "31" },
];

export default function FigmaExperience() {
  const [screen, setScreen] = useState<"landing" | "builder">("landing");
  const [step, setStep] = useState(1);
  const [topic, setTopic] = useState("");
  const [draft, setDraft] = useState("");
  const [source, setSource] = useState("");
  const [link, setLink] = useState("");
  const [format, setFormat] = useState<Format | "">("");
  const [delivery, setDelivery] = useState<Delivery | "">("");
  const fileRef = useRef<HTMLInputElement>(null);
  const progress = step >= 5 ? 100 : (step - 1) * 25;

  function start() { setScreen("builder"); window.scrollTo({ top: 0 }); }
  function submitTopic(event: FormEvent) { event.preventDefault(); if (draft.trim()) { setTopic(draft.trim()); setStep(2); } }
  function useLink() { if (link.trim()) { setSource(link.trim()); setStep(3); } }
  function chooseFile(event: ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; if (file) { setSource(file.name); setStep(3); } }
  function reset() { setStep(1); setTopic(""); setDraft(""); setSource(""); setLink(""); setFormat(""); setDelivery(""); }

  if (screen === "landing") return (
    <main className="f-landing">
      <header className="f-landing-header">
        <a className="f-brand" href="#top" aria-label="叮一下首頁"><span className="f-brand-mark">叮</span><span>叮一下</span></a>
        <button className="f-header-cta" onClick={start}>開始建立 <span>→</span></button>
      </header>
      <div className="f-stitch" aria-hidden="true">{Array.from({ length: 7 }).map((_, i) => <span key={i} />)}</div>
      <section className="f-hero" id="top">
        <div className="f-kicker">✦ 個人化提醒設定 ✦</div>
        <h1>重要的事，<br /><em>不再錯過</em></h1>
        <p>回答幾個問題、提供資料，叮一下會在兩分鐘內<br className="f-desktop-break" />替你建立專屬提醒系統。</p>
        <button className="f-main-cta" onClick={start}>建立我的提醒 <span>→</span></button>
        <small>免費 · 不需註冊</small>
      </section>
      <section className="f-features" aria-label="產品特色">
        <article><span>01</span><i>↗</i><h2>匯入任何來源</h2><p>PDF、試算表、文件，或直接貼上資料連結。</p></article>
        <article><span>02</span><i>✦</i><h2>你的格式，你的規則</h2><p>即時通知、每日摘要，或照你的節奏排程。</p></article>
        <article><span>03</span><i>→</i><h2>送到習慣的地方</h2><p>LINE、Email、Slack、行事曆，選你最常看的。</p></article>
      </section>
      <FigmaFooter />
    </main>
  );

  return (
    <main className="f-builder">
      <header className="f-builder-header">
        <button className="f-brand f-brand-button" onClick={() => setScreen("landing")} aria-label="回到首頁">
          <span className="f-brand-mark">叮</span><span className="f-brand-copy"><b>叮一下</b><small>你的個人提醒建立助手</small></span>
        </button>
        <span className="f-setup-tag">SETUP</span>
      </header>
      <section className="f-chat-card" aria-live="polite">
        <div className="f-progress"><div><b>{step >= 5 ? "完成" : `STEP ${step} OF 4`}</b><span>{progress}%</span></div><i><span style={{ width: `${progress}%` }} /></i></div>
        <div className="f-conversation">
          <Bot text="嗨！我是叮一下 👋 我會用幾個簡單問題，替你建立專屬提醒。" />
          <Bot text="首先，你想針對什麼主題建立提醒？" />
          {topic && <User text={topic} />}
          {step >= 2 && <Bot text="收到！你有相關的文件或資料來源嗎？上傳檔案，或直接貼上連結就可以。" />}
          {source && <User text={`資料來源：${source}`} />}
          {step >= 3 && <Bot text="很好，我會從這份資料裡找出需要注意的變化。你希望提醒怎麼整理？" />}
          {format && <User text={format} />}
          {step >= 4 && <Bot text="最後一題：提醒要傳送到哪裡？" />}
          {delivery && <User text={delivery} />}

          {step === 2 && <div className="f-source-picker">
            <input ref={fileRef} className="f-hidden" type="file" accept=".pdf,.csv,.xlsx,.xls,.doc,.docx,.txt,.json" onChange={chooseFile} />
            <button className="f-upload" onClick={() => fileRef.current?.click()}><span>↑</span><b>選擇文件或資料</b><small>PDF、CSV、Excel、Word、TXT、JSON</small></button>
            <div className="f-or"><span>或貼上連結</span></div>
            <div className="f-link"><input aria-label="資料來源連結" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://docs.google.com/..." /><button disabled={!link.trim()} onClick={useLink}>使用連結 →</button></div>
            <button className="f-skip" onClick={() => { setSource("稍後連接資料"); setStep(3); }}>稍後再提供</button>
          </div>}

          {step === 3 && <div className="f-choices">{formats.map((item) => <button key={item.label} onClick={() => { setFormat(item.label); window.setTimeout(() => setStep(4), 180); }}><i>{item.icon}</i><span><b>{item.label}</b><small>{item.note}</small></span><em>→</em></button>)}</div>}
          {step === 4 && <div className="f-choices f-deliveries">{deliveries.map((item) => <button key={item.label} onClick={() => { setDelivery(item.label); window.setTimeout(() => setStep(5), 180); }}><i>{item.icon}</i><b>{item.label}</b><em>→</em></button>)}</div>}

          {step === 5 && <div className="f-ready">
            <span className="f-ready-spark">✦</span><div><small>ALL SET</small><h2>你的提醒準備好了</h2><p>從現在開始，重要變化會主動來找你。</p></div>
            <div className="f-summary"><div><span>主題</span><b>{topic}</b></div><div><span>資料</span><b>{source}</b></div><div><span>格式</span><b>{format}</b></div><div><span>傳送到</span><b>{delivery}</b></div></div>
            <button className="f-activate" onClick={() => window.alert("這是互動原型：下一版會在這裡連接帳號並啟用提醒。")}>連接帳號並啟用 <span>→</span></button>
            <button className="f-restart" onClick={reset}>← 再建立一個提醒</button>
          </div>}
        </div>
        {step === 1 && <form className="f-composer" onSubmit={submitTopic}><input autoFocus aria-label="提醒主題" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="例如：合約快到期、待辦還沒完成……" /><button disabled={!draft.trim()}>送出 <span>→</span></button></form>}
      </section>
      <FigmaFooter />
    </main>
  );
}

function Bot({ text }: { text: string }) { return <div className="f-message f-bot"><span>叮</span><p>{text}</p></div>; }
function User({ text }: { text: string }) { return <div className="f-message f-user"><p>{text}</p><span>你</span></div>; }
function FigmaFooter() { return <footer className="f-footer"><span>Smart reminders, built around you.</span><i>✦</i></footer>; }
