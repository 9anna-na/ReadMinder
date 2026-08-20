"use client";

import { useMemo, useState } from "react";
import RemindExperience from "./remind-experience";

export default function Home() {
  return <RemindExperience locale="zh" />;
}

type FontChoice = "sans" | "serif" | "round";

const stepMeta = [
  ["說出需求", "想自動注意什麼"],
  ["連接資料", "文件、表格或日曆"],
  ["確認規則", "條件與通知對象"],
  ["測試啟用", "讓提醒開始工作"],
];

const presets = [
  { label: "合約到期", text: "每天檢查合約資料夾，如果有文件將在 7 天內到期，就用 LINE 提醒負責人。" },
  { label: "會議待辦", text: "每週五檢查會議紀錄，如果有尚未完成的待辦，就用 LINE 提醒負責人。" },
  { label: "客訴追蹤", text: "客服紀錄裡出現超過 24 小時還沒回覆的客訴時，立刻用 LINE 通知客服主管。" },
];

const sources = [
  { name: "Google Drive", detail: "資料夾與檔案", mark: "D", color: "blue" },
  { name: "Google 文件", detail: "合約、紀錄、報告", mark: "Doc", color: "blue" },
  { name: "Google 試算表", detail: "名單與追蹤資料", mark: "▦", color: "green" },
  { name: "Google 日曆", detail: "活動與截止日期", mark: "31", color: "yellow" },
  { name: "上傳檔案", detail: "PDF、Word、CSV", mark: "↑", color: "purple" },
  { name: "網站或 RSS", detail: "定期檢查網頁變化", mark: "⌁", color: "orange" },
];

function understandIntent(intent: string) {
  if (intent.includes("會議") || intent.includes("待辦")) {
    return {
      watch: "會議紀錄中的待辦事項",
      condition: "每週五仍標示為「未完成」",
      recipient: "待辦事項的負責人",
      schedule: "每週五下午 4:00",
      source: "會議紀錄資料夾",
      message: "嗨小安，本週會議紀錄裡還有 2 件待辦尚未完成：\n\n・確認九月活動場地\n・更新報價單\n\n完成後記得回到文件勾選喔！",
    };
  }
  if (intent.includes("客訴") || intent.includes("客服")) {
    return {
      watch: "客服紀錄的回覆狀態",
      condition: "客訴超過 24 小時未回覆",
      recipient: "客服主管",
      schedule: "每小時檢查一次",
      source: "客服追蹤資料",
      message: "客服主管您好，有 1 筆客訴已超過 24 小時尚未回覆。\n\n案件：#CS-0821\n客戶：林小姐\n等待時間：26 小時\n\n請盡快協助處理。",
    };
  }
  return {
    watch: "合約文件中的到期日期",
    condition: "距離到期日少於 7 天",
    recipient: "文件中標示的負責人",
    schedule: "每天上午 9:00",
    source: "合約資料夾",
    message: "嗨小安，這份合約將在 7 天後到期：\n\n客戶：森木設計\n合約：年度顧問服務\n到期日：8 月 26 日\n\n要續約的話，記得提前聯絡客戶喔！",
  };
}

function LegacyHome() {
  const [step, setStep] = useState(1);
  const [maxStep, setMaxStep] = useState(1);
  const [intent, setIntent] = useState(presets[0].text);
  const [selectedSources, setSelectedSources] = useState(["Google Drive", "Google 文件"]);
  const [fontChoice, setFontChoice] = useState<FontChoice>("sans");
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [tested, setTested] = useState(false);
  const [activated, setActivated] = useState(false);
  const [toast, setToast] = useState("");
  const scenario = useMemo(() => understandIntent(intent), [intent]);

  function goTo(next: number) {
    setStep(next);
    setMaxStep((current) => Math.max(current, next));
    setTested(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function flash(text: string) {
    setToast(text);
    window.setTimeout(() => setToast(""), 2300);
  }

  function toggleSource(name: string) {
    setSelectedSources((current) => current.includes(name) ? current.filter((item) => item !== name) : [...current, name]);
  }

  return (
    <main className={`app-shell font-${fontChoice}`}>
      {toast && <div className="toast" role="status"><span>✓</span>{toast}</div>}
      <header className="topbar">
        <div className="brand" aria-label="叮一下首頁"><span className="brand-mark">叮</span><span>叮一下</span><span className="beta">BETA</span></div>
        <div className="header-actions">
          <div className="appearance-wrap">
            <button className="appearance-button" onClick={() => setAppearanceOpen((open) => !open)}><span>Aa</span> 字體</button>
            {appearanceOpen && (
              <div className="appearance-menu">
                <small>選擇網站字體</small>
                <button className={fontChoice === "sans" ? "selected" : ""} onClick={() => setFontChoice("sans")}><b>清晰現代</b><span>適合操作介面</span></button>
                <button className={fontChoice === "serif" ? "selected serif-sample" : "serif-sample"} onClick={() => setFontChoice("serif")}><b>編輯感</b><span>更像雜誌與文件</span></button>
                <button className={fontChoice === "round" ? "selected round-sample" : "round-sample"} onClick={() => setFontChoice("round")}><b>柔和圓潤</b><span>親切、輕鬆</span></button>
              </div>
            )}
          </div>
          <button className="help-button" onClick={() => flash("小幫手會陪你完成每一個步驟")}>需要幫忙？</button>
          <div className="avatar">喬</div>
        </div>
      </header>

      <section className="workspace">
        <div className="workspace-title"><span>建立新的自動提醒</span><small>草稿會自動儲存</small></div>
        <nav className="steps" aria-label="設定步驟">
          {stepMeta.map(([title, description], index) => {
            const number = index + 1;
            return <button key={title} className={`step ${step === number ? "active" : ""} ${number < step ? "done" : ""}`} disabled={number > maxStep} onClick={() => setStep(number)}><span>{number < step ? "✓" : number}</span><div><b>{title}</b><small>{description}</small></div></button>;
          })}
        </nav>

        <div className="main-grid">
          <section className="setup-panel">
            {activated ? (
              <div className="success-screen">
                <div className="success-mark">✓</div><div className="eyebrow">提醒已啟用</div>
                <h1>它會自己留意，<br />有事再找你。</h1>
                <p className="intro">從現在開始，叮一下會依照你設定的規則檢查「{scenario.source}」。符合條件時，才會用 LINE 通知對的人。</p>
                <div className="success-summary"><span>正在留意</span><b>{scenario.condition}</b><small>下一次檢查：{scenario.schedule}</small></div>
                <button className="primary-button" onClick={() => { setActivated(false); setStep(1); setMaxStep(1); }}>再建立一個提醒 <span>＋</span></button>
              </div>
            ) : step === 1 ? (
              <>
                <div className="eyebrow">從一句話開始</div>
                <h1>你想讓什麼事<br />自動來提醒？</h1>
                <p className="intro">不用先整理格式。直接說資料在哪裡、什麼情況要注意，以及想通知誰。</p>
                <div className="intent-box">
                  <textarea aria-label="描述你的自動提醒" value={intent} onChange={(event) => setIntent(event.target.value)} />
                  <div><span className="magic-dot">✦</span><span>叮一下會幫你整理成規則</span><button onClick={() => goTo(2)} disabled={!intent.trim()}>幫我設定 <span>→</span></button></div>
                </div>
                <div className="preset-section"><span>不知道怎麼說？選一個例子</span><div>{presets.map((preset) => <button key={preset.label} className={intent === preset.text ? "selected" : ""} onClick={() => setIntent(preset.text)}>{preset.label}</button>)}</div></div>
              </>
            ) : step === 2 ? (
              <>
                <div className="eyebrow">STEP 2 OF 4</div>
                <h1 className="compact-title">資料現在<br />放在哪裡？</h1>
                <p className="intro compact-intro">可以同時選擇不同來源。正式啟用時，我們才會請你登入授權。</p>
                <div className="source-grid">
                  {sources.map((source) => {
                    const selected = selectedSources.includes(source.name);
                    return <button key={source.name} className={`source-card ${selected ? "selected" : ""}`} onClick={() => toggleSource(source.name)}><span className={`source-mark ${source.color}`}>{source.mark}</span><div><b>{source.name}</b><small>{source.detail}</small></div><i>{selected ? "✓" : "+"}</i></button>;
                  })}
                </div>
                <div className="privacy-note"><span>◉</span><p><b>你可以只授權特定檔案或資料夾</b><br />其他資料我們看不到，也不會拿來訓練公開模型。</p></div>
                <div className="button-row"><button className="secondary-button" onClick={() => setStep(1)}>← 返回</button><button className="primary-button" disabled={!selectedSources.length} onClick={() => { flash("已讀懂你的要求"); goTo(3); }}>讓叮一下讀懂資料 <span>✦</span></button></div>
              </>
            ) : step === 3 ? (
              <>
                <div className="eyebrow">我們這樣理解你的要求</div>
                <h1 className="compact-title">確認一下，<br />有沒有會錯意？</h1>
                <div className="rule-builder">
                  <label><span className="rule-number">1</span><div><small>留意什麼</small><input defaultValue={scenario.watch} /></div></label>
                  <label><span className="rule-number">2</span><div><small>什麼情況要提醒</small><input defaultValue={scenario.condition} /></div></label>
                  <label><span className="rule-number">3</span><div><small>通知誰</small><input defaultValue={scenario.recipient} /></div></label>
                  <label><span className="rule-number">4</span><div><small>多久檢查一次</small><select defaultValue={scenario.schedule}><option>{scenario.schedule}</option><option>每天上午 9:00</option><option>每小時檢查一次</option><option>資料變動時立即檢查</option></select></div></label>
                </div>
                <div className="ai-note"><span>✦</span><p><b>還不確定文件格式也沒關係</b><br />連接資料後，我們會先用 3 筆範例測試，找不到欄位時再請你確認。</p></div>
                <div className="button-row"><button className="secondary-button" onClick={() => setStep(2)}>← 返回</button><button className="primary-button" onClick={() => goTo(4)}>確認並預覽提醒 <span>→</span></button></div>
              </>
            ) : (
              <>
                <div className="eyebrow">STEP 4 OF 4</div>
                <h1 className="compact-title">先傳給自己<br />確認一次</h1>
                <p className="intro compact-intro">右邊是根據範例資料產生的提醒。正式啟用前，不會傳給其他人。</p>
                <div className="test-card"><div className="test-icon">L</div><div><b>LINE 測試訊息</b><small>收件人：Joanna 的 LINE</small></div>{tested ? <span className="test-success">已送達 ✓</span> : <button onClick={() => { setTested(true); flash("測試訊息已送達 LINE"); }}>傳送測試</button>}</div>
                <div className="summary-list"><div><span>資料來源</span><b>{selectedSources.slice(0, 2).join(" ＋ ")}</b></div><div><span>觸發條件</span><b>{scenario.condition}</b></div><div><span>檢查頻率</span><b>{scenario.schedule}</b></div></div>
                {!tested && <p className="test-hint">請先傳送測試，確認文字與通知對象都正確。</p>}
                <div className="button-row"><button className="secondary-button" onClick={() => setStep(3)}>← 修改規則</button><button className="primary-button activate-button" disabled={!tested} onClick={() => setActivated(true)}>啟用自動提醒 <span>✦</span></button></div>
              </>
            )}
          </section>

          <aside className="preview-panel">
            <div className="preview-head"><div><span className="live-dot" />{step === 4 ? "LINE 訊息預覽" : "提醒藍圖"}</div><span>LIVE</span></div>
            {step === 4 || activated ? (
              <div className="phone">
                <div className="phone-bar"><span>9:41</span><b>叮一下</b><span>•••</span></div><div className="chat-date">今天 上午 9:00</div>
                <div className="message-row"><div className="bot-avatar">叮</div><div><div className="bot-name">叮一下</div><div className="bubble">{scenario.message.split("\n").map((line, index) => <span key={index}>{line || <>&nbsp;</>}<br /></span>)}</div><div className="read-time">已讀　09:01</div></div></div>
                {tested && <div className="delivery-badge">✓ 測試訊息已送達</div>}
              </div>
            ) : (
              <div className="blueprint">
                <div className="blueprint-source"><span className="folder-shape">⌑</span><div><small>從這裡讀取</small><b>{step === 1 ? "你的文件或資料" : selectedSources.slice(0, 2).join(" ＋ ")}</b></div></div>
                <span className="flow-arrow">↓</span>
                <div className="agent-card"><span>✦</span><div><small>叮一下會持續留意</small><b>{scenario.condition}</b></div><i className="pulse" /></div>
                <span className="flow-arrow">↓</span>
                <div className="blueprint-source line-source"><span>L</span><div><small>有狀況才通知</small><b>{scenario.recipient}</b></div></div>
                <div className="blueprint-caption"><b>你不用一直打開資料檢查。</b><br />沒發生事情時，叮一下會保持安靜。</div>
              </div>
            )}
            <div className="preview-note"><span className="spark">✦</span><p><b>不限試算表，也不要求固定格式</b><br />文件內容、日期、狀態與文字變化都能成為提醒條件。</p></div>
          </aside>
        </div>
      </section>
    </main>
  );
}
