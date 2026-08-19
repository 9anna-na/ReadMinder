"use client";

import { useMemo, useState } from "react";

const stepMeta = [
  ["連接資料", "Google Sheet"],
  ["配對欄位", "姓名、日期、狀態"],
  ["編輯訊息", "套用個人化內容"],
  ["測試啟用", "確認後開始提醒"],
];

const defaultMessage = "{{姓名}}您好 👋\n\n提醒您{{日期}}{{時間}}有預約，目前{{狀態}}。\n\n如需改期，直接回覆這則訊息就可以囉！";

export default function Home() {
  const [step, setStep] = useState(1);
  const [maxStep, setMaxStep] = useState(1);
  const [connected, setConnected] = useState(false);
  const [sheet, setSheet] = useState("八月預約名單");
  const [message, setMessage] = useState(defaultMessage);
  const [tested, setTested] = useState(false);
  const [activated, setActivated] = useState(false);
  const [toast, setToast] = useState("");

  const previewMessage = useMemo(() => message
    .replaceAll("{{姓名}}", "王小明")
    .replaceAll("{{日期}}", "明天")
    .replaceAll("{{時間}}", "下午 2:00")
    .replaceAll("{{狀態}}", "款項尚未完成"), [message]);

  function goTo(next: number) {
    setStep(next);
    setMaxStep((current) => Math.max(current, next));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function flash(text: string) {
    setToast(text);
    window.setTimeout(() => setToast(""), 2400);
  }

  function connectGoogle() {
    setConnected(true);
    flash("Google 帳號已安全連接");
  }

  function insertVariable(variable: string) {
    setMessage((value) => `${value}${value.endsWith(" ") ? "" : " "}${variable}`);
  }

  return (
    <main className="app-shell">
      {toast && <div className="toast" role="status"><span>✓</span>{toast}</div>}
      <header className="topbar">
        <div className="brand" aria-label="叮一下首頁">
          <span className="brand-mark">叮</span><span>叮一下</span><span className="beta">BETA</span>
        </div>
        <div className="header-actions"><button className="help-button" onClick={() => flash("小幫手已收到，我們會陪你完成設定")}>需要幫忙？</button><div className="avatar">喬</div></div>
      </header>

      <section className="workspace">
        <nav className="steps" aria-label="設定步驟">
          {stepMeta.map(([title, description], index) => {
            const number = index + 1;
            return (
              <button key={title} className={`step ${step === number ? "active" : ""} ${number < step ? "done" : ""}`} disabled={number > maxStep} onClick={() => setStep(number)}>
                <span>{number < step ? "✓" : number}</span><div><b>{title}</b><small>{description}</small></div>
              </button>
            );
          })}
        </nav>

        <div className="main-grid">
          <section className="setup-panel">
            {activated ? (
              <div className="success-screen">
                <div className="success-mark">✓</div>
                <div className="eyebrow">設定完成</div>
                <h1>第一個提醒<br />開始工作了！</h1>
                <p className="intro">我們會在每天上午 9:00 檢查「{sheet}」。符合條件時，就會從 LINE 傳送個人化提醒。</p>
                <div className="success-summary"><span>下一次檢查</span><b>明天 上午 9:00</b><small>你可以隨時回來暫停或修改。</small></div>
                <button className="primary-button" onClick={() => { setActivated(false); setTested(false); goTo(1); }}>再建立一個提醒 <span>＋</span></button>
              </div>
            ) : step === 1 ? (
              <>
                <div className="eyebrow">STEP 1 OF 4</div>
                <h1>先把顧客名單<br />交給我們</h1>
                <p className="intro">選擇一份 Google 試算表。之後有新資料或日期到了，我們就會自動提醒該提醒的人。</p>
                {!connected ? (
                  <button className="connect-card" onClick={connectGoogle}>
                    <span className="sheets-logo" aria-hidden="true"><i /><i /><i /></span>
                    <span className="connect-copy"><b>連接 Google Sheet</b><small>登入並選擇一份試算表</small></span><span className="arrow">→</span>
                  </button>
                ) : (
                  <div className="sheet-picker">
                    <div className="connected-row"><span className="mini-google">G</span><div><b>已連接 Joanna 的 Google</b><small>joanna@example.com</small></div><span className="status-pill">已連接</span></div>
                    <label className="field-label" htmlFor="sheet-select">選擇要使用的試算表</label>
                    <select id="sheet-select" value={sheet} onChange={(event) => setSheet(event.target.value)}>
                      <option>八月預約名單</option><option>課程繳費追蹤</option><option>團購訂單 2026</option>
                    </select>
                    <div className="sheet-detail"><span className="file-icon">▦</span><div><b>{sheet}</b><small>最後更新：剛剛 · 28 筆資料</small></div><span>✓</span></div>
                    <button className="primary-button" onClick={() => goTo(2)}>使用這份表格 <span>→</span></button>
                  </div>
                )}
                <div className="trust-row"><span>✓ 只讀取你選擇的試算表</span><span>✓ 隨時可以中斷連接</span></div>
              </>
            ) : step === 2 ? (
              <>
                <div className="eyebrow">STEP 2 OF 4</div>
                <h1 className="compact-title">告訴我們<br />哪一欄是什麼</h1>
                <p className="intro compact-intro">我們先猜好了，你只要確認配對正不正確。</p>
                <div className="mapping-list">
                  {[["顧客姓名","姓名"],["預約日期","預約日期"],["預約時間","時間"],["目前狀態","付款狀態"]].map(([label, value]) => (
                    <label className="mapping-row" key={label}><span>{label}</span><select defaultValue={value}><option>{value}</option><option>電話</option><option>LINE ID</option><option>備註</option></select><i>✓</i></label>
                  ))}
                </div>
                <div className="data-preview"><div><b>資料預覽</b><span>第 2 列</span></div><p><span>王小明</span><span>8/22</span><span>14:00</span><span>未付款</span></p></div>
                <div className="button-row"><button className="secondary-button" onClick={() => setStep(1)}>← 返回</button><button className="primary-button" onClick={() => goTo(3)}>下一步 <span>→</span></button></div>
              </>
            ) : step === 3 ? (
              <>
                <div className="eyebrow">STEP 3 OF 4</div>
                <h1 className="compact-title">這則提醒<br />想怎麼說？</h1>
                <p className="intro compact-intro">點選變數，就能自動帶入每一位顧客的資料。</p>
                <div className="editor">
                  <div className="variable-bar"><span>插入資料</span>{["{{姓名}}","{{日期}}","{{時間}}","{{狀態}}"].map((item) => <button key={item} onClick={() => insertVariable(item)}>{item.slice(2,-2)}</button>)}</div>
                  <textarea aria-label="LINE 訊息內容" value={message} onChange={(event) => setMessage(event.target.value)} />
                  <div className="character-count">{message.length} 字 · LINE 文字訊息</div>
                </div>
                <div className="button-row"><button className="secondary-button" onClick={() => setStep(2)}>← 返回</button><button className="primary-button" disabled={!message.trim()} onClick={() => goTo(4)}>預覽並測試 <span>→</span></button></div>
              </>
            ) : (
              <>
                <div className="eyebrow">STEP 4 OF 4</div>
                <h1 className="compact-title">傳給自己<br />試試看</h1>
                <p className="intro compact-intro">正式啟用前，先確認手機收到的內容和你想的一樣。</p>
                <div className="test-card"><div className="test-icon">L</div><div><b>傳送測試訊息到 LINE</b><small>收件人：Joanna 的 LINE</small></div>{tested ? <span className="test-success">已送達 ✓</span> : <button onClick={() => { setTested(true); flash("測試訊息已送達 LINE"); }}>傳送測試</button>}</div>
                <div className="rule-card"><div><span>觸發條件</span><b>預約日期的前一天</b></div><div><span>檢查時間</span><b>每天上午 9:00</b></div><div><span>資料來源</span><b>{sheet}</b></div></div>
                {!tested && <p className="test-hint">請先傳送一次測試訊息，確認成功後即可啟用。</p>}
                <div className="button-row"><button className="secondary-button" onClick={() => setStep(3)}>← 修改內容</button><button className="primary-button activate-button" disabled={!tested} onClick={() => setActivated(true)}>啟用自動提醒 <span>✦</span></button></div>
              </>
            )}
          </section>

          <aside className="preview-panel">
            <div className="preview-head"><div><span className="live-dot" />訊息預覽</div><span>LINE</span></div>
            <div className="phone">
              <div className="phone-bar"><span>9:41</span><b>預約小幫手</b><span>•••</span></div>
              <div className="chat-date">8 月 22 日 週六</div>
              <div className="message-row"><div className="bot-avatar">叮</div><div><div className="bot-name">預約小幫手</div><div className="bubble">{previewMessage.split("\n").map((line, index) => <span key={index}>{line || <>&nbsp;</>}<br /></span>)}</div><div className="read-time">已讀　14:02</div></div></div>
              {tested && <div className="delivery-badge">✓ 測試訊息已送達</div>}
            </div>
            <div className="preview-note"><span className="spark">✦</span><p><b>{step === 3 ? "右邊會即時跟著你修改" : "每一則都會自動帶入正確資料"}</b><br />姓名、時間、狀態都能從表格抓取。</p></div>
          </aside>
        </div>
      </section>
    </main>
  );
}
