"use client";

import { useEffect, useMemo, useState } from "react";

type Locale = "zh" | "en";
type Reminder = {
  id: string;
  topic: string;
  source: string;
  reminderFormat: string;
  delivery: string;
  leadDays: number;
  primaryDate: string;
  scheduledFor: string;
  status: string;
  createdAt: string;
};
type Filter = "all" | "upcoming" | "waiting" | "attention";

const copy = {
  zh: {
    title: "我的提醒", eyebrow: "REMINDER DASHBOARD", subtitle: "所有重要日期，一次看清楚。",
    back: "建立新提醒", lang: "EN", langHref: "/en/reminders", loading: "正在整理你的提醒…",
    signIn: "請先登入，才能查看你的提醒。", signInButton: "登入 ReadMinder",
    loadError: "暫時讀不到提醒，請稍後再試。", retry: "重新整理", empty: "目前還沒有提醒",
    emptyCopy: "上傳一份文件，ReadMinder 會替你找出重要日期。", create: "建立第一個提醒",
    metrics: ["全部提醒", "即將提醒", "等待排程", "需要確認"],
    filters: { all: "全部", upcoming: "即將提醒", waiting: "等待排程", attention: "需要確認" },
    status: { scheduled: "已排程", passed: "提醒時間已到", waiting: "等待排程", attention: "需要確認", saved: "已儲存" },
    date: "重要日期", lead: "提前提醒", delivery: "通知方式", schedule: "預計寄送", source: "資料來源",
    days: "天", edit: "修改", remove: "刪除", editTitle: "修改提醒時間", save: "儲存修改", saving: "正在更新…",
    cancel: "取消", deleteTitle: "刪除這個提醒？", deleteCopy: "這會移除提醒；如果 Email 尚未寄出，也會一併取消排程。",
    confirmDelete: "確認刪除", deleting: "正在刪除…", actionError: "操作失敗，請稍後再試。",
    scheduleUnavailable: "尚未排定", created: "建立於",
  },
  en: {
    title: "My reminders", eyebrow: "REMINDER DASHBOARD", subtitle: "Every important date, clearly organised.",
    back: "Create reminder", lang: "中文", langHref: "/reminders", loading: "Organising your reminders…",
    signIn: "Sign in to view your reminders.", signInButton: "Sign in to ReadMinder",
    loadError: "We couldn't load your reminders. Try again in a moment.", retry: "Try again", empty: "No reminders yet",
    emptyCopy: "Upload a document and ReadMinder will find the important dates for you.", create: "Create your first reminder",
    metrics: ["All reminders", "Upcoming", "Waiting", "Needs review"],
    filters: { all: "All", upcoming: "Upcoming", waiting: "Waiting", attention: "Needs review" },
    status: { scheduled: "Scheduled", passed: "Reminder time reached", waiting: "Waiting", attention: "Needs review", saved: "Saved" },
    date: "Important date", lead: "Lead time", delivery: "Delivery", schedule: "Scheduled for", source: "Source",
    days: "days", edit: "Edit", remove: "Delete", editTitle: "Edit reminder timing", save: "Save changes", saving: "Updating…",
    cancel: "Cancel", deleteTitle: "Delete this reminder?", deleteCopy: "This removes the reminder and cancels its email if it has not been sent yet.",
    confirmDelete: "Delete reminder", deleting: "Deleting…", actionError: "Something went wrong. Please try again.",
    scheduleUnavailable: "Not scheduled yet", created: "Created",
  },
} as const;

function category(reminder: Reminder): Exclude<Filter, "all"> | "saved" | "passed" {
  if (reminder.scheduledFor) return Date.parse(reminder.scheduledFor) > Date.now() ? "upcoming" : "passed";
  if (reminder.status === "awaiting_schedule_window") return "waiting";
  if (["needs_date_review", "schedule_failed", "partially_scheduled"].includes(reminder.status)) return "attention";
  return "saved";
}

export default function ReminderManager({ locale = "zh" }: { locale?: Locale }) {
  const t = copy[locale];
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [editing, setEditing] = useState<Reminder | null>(null);
  const [deleting, setDeleting] = useState<Reminder | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editLeadDays, setEditLeadDays] = useState(7);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  async function loadReminders() {
    setLoading(true);
    setLoadError("");
    try {
      const response = await fetch("/api/reminders", { headers: { accept: "application/json" } });
      if (response.status === 401) { setUnauthorized(true); return; }
      if (!response.ok) throw new Error("load failed");
      const result = await response.json() as { reminders?: Reminder[] };
      setReminders(result.reminders ?? []);
      setUnauthorized(false);
    } catch {
      setLoadError(t.loadError);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadReminders(); }, []);

  const metrics = useMemo(() => [
    reminders.length,
    reminders.filter((item) => category(item) === "upcoming").length,
    reminders.filter((item) => category(item) === "waiting").length,
    reminders.filter((item) => category(item) === "attention").length,
  ], [reminders]);
  const visibleReminders = useMemo(() => filter === "all" ? reminders : reminders.filter((item) => category(item) === filter), [filter, reminders]);

  function openEdit(reminder: Reminder) {
    setEditing(reminder);
    setEditDate(reminder.primaryDate);
    setEditLeadDays(reminder.leadDays);
    setActionError("");
  }

  async function saveEdit() {
    if (!editing || !editDate) return;
    setBusy(true);
    setActionError("");
    try {
      const response = await fetch("/api/reminders", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: editing.id, primaryDate: editDate, leadDays: editLeadDays }),
      });
      if (!response.ok) throw new Error("update failed");
      const result = await response.json() as { reminder: Partial<Reminder> & { id: string } };
      setReminders((items) => items.map((item) => item.id === result.reminder.id ? { ...item, ...result.reminder } : item));
      setEditing(null);
    } catch {
      setActionError(t.actionError);
    } finally {
      setBusy(false);
    }
  }

  async function deleteReminder() {
    if (!deleting) return;
    setBusy(true);
    setActionError("");
    try {
      const response = await fetch(`/api/reminders?id=${encodeURIComponent(deleting.id)}`, { method: "DELETE" });
      if (!response.ok) throw new Error("delete failed");
      setReminders((items) => items.filter((item) => item.id !== deleting.id));
      setDeleting(null);
    } catch {
      setActionError(t.actionError);
    } finally {
      setBusy(false);
    }
  }

  const formatDate = (value: string) => value ? new Intl.DateTimeFormat(locale === "en" ? "en-US" : "zh-TW", { dateStyle: "medium", timeZone: "Asia/Taipei" }).format(new Date(`${value}T00:00:00+08:00`)) : "—";
  const formatDateTime = (value: string) => value ? new Intl.DateTimeFormat(locale === "en" ? "en-US" : "zh-TW", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Taipei" }).format(new Date(value)) : t.scheduleUnavailable;
  const statusLabel = (reminder: Reminder) => {
    const value = category(reminder);
    return value === "upcoming" ? t.status.scheduled : value === "passed" ? t.status.passed : value === "waiting" ? t.status.waiting : value === "attention" ? t.status.attention : t.status.saved;
  };

  return <main className={`rm-dashboard f-${locale}`}>
    <header className="rm-header">
      <a className="f-brand" href={locale === "en" ? "/en" : "/"}><span className="f-brand-mark">R</span><span>ReadMinder</span></a>
      <nav><a href={t.langHref}>{t.lang}</a><a className="rm-new-link" href={locale === "en" ? "/en" : "/"}>{t.back} →</a></nav>
    </header>

    <section className="rm-hero">
      <div><small>{t.eyebrow}</small><h1>{t.title}</h1><p>{t.subtitle}</p></div>
      {!loading && !unauthorized && !loadError && <div className="rm-metrics">{metrics.map((value, index) => <article key={t.metrics[index]}><b>{value}</b><span>{t.metrics[index]}</span></article>)}</div>}
    </section>

    {loading ? <section className="rm-state"><span className="rm-loader">R</span><p>{t.loading}</p></section>
      : unauthorized ? <section className="rm-state"><span>↗</span><h2>{t.signIn}</h2><a href={`/signin-with-chatgpt?return_to=${encodeURIComponent(locale === "en" ? "/en/reminders" : "/reminders")}`}>{t.signInButton}</a></section>
        : loadError ? <section className="rm-state"><span>!</span><h2>{loadError}</h2><button onClick={() => void loadReminders()}>{t.retry}</button></section>
          : reminders.length === 0 ? <section className="rm-state"><span>✦</span><h2>{t.empty}</h2><p>{t.emptyCopy}</p><a href={locale === "en" ? "/en" : "/"}>{t.create} →</a></section>
            : <>
              <div className="rm-filters">{(Object.keys(t.filters) as Filter[]).map((key) => <button className={filter === key ? "is-active" : ""} onClick={() => setFilter(key)} key={key}>{t.filters[key]}<span>{key === "all" ? metrics[0] : key === "upcoming" ? metrics[1] : key === "waiting" ? metrics[2] : metrics[3]}</span></button>)}</div>
              <section className="rm-list">{visibleReminders.map((reminder) => <article className="rm-card" key={reminder.id}>
                <div className="rm-card-head"><div><span className={`rm-status is-${category(reminder)}`}>{statusLabel(reminder)}</span><h2>{reminder.topic}</h2></div><b className="rm-date">{formatDate(reminder.primaryDate)}</b></div>
                <div className="rm-details">
                  <div><span>{t.date}</span><b>{formatDate(reminder.primaryDate)}</b></div>
                  <div><span>{t.lead}</span><b>{reminder.leadDays} {t.days}</b></div>
                  <div><span>{t.delivery}</span><b>{reminder.delivery}</b></div>
                  <div><span>{t.schedule}</span><b>{formatDateTime(reminder.scheduledFor)}</b></div>
                </div>
                <p className="rm-source"><span>{t.source}</span>{reminder.source}</p>
                <footer><small>{t.created} {formatDate(reminder.createdAt.slice(0, 10))}</small><div><button onClick={() => openEdit(reminder)}>{t.edit}</button><button className="is-delete" onClick={() => { setDeleting(reminder); setActionError(""); }}>{t.remove}</button></div></footer>
              </article>)}</section>
              {!visibleReminders.length && <section className="rm-state rm-filter-empty"><p>{t.empty}</p></section>}
            </>}

    {editing && <div className="rm-modal-backdrop" role="presentation"><section className="rm-modal" role="dialog" aria-modal="true" aria-labelledby="edit-reminder-title"><button className="rm-modal-close" aria-label={t.cancel} onClick={() => setEditing(null)}>×</button><small>EDIT REMINDER</small><h2 id="edit-reminder-title">{t.editTitle}</h2><p>{editing.topic}</p><label><span>{t.date}</span><input type="date" value={editDate} onChange={(event) => setEditDate(event.target.value)} /></label><label><span>{t.lead}</span><select value={editLeadDays} onChange={(event) => setEditLeadDays(Number(event.target.value))}>{[1, 3, 7, 14, 30].map((days) => <option value={days} key={days}>{days} {t.days}</option>)}</select></label>{actionError && <p className="rm-action-error">{actionError}</p>}<div className="rm-modal-actions"><button onClick={() => setEditing(null)}>{t.cancel}</button><button disabled={busy || !editDate} onClick={() => void saveEdit()}>{busy ? t.saving : t.save}</button></div></section></div>}
    {deleting && <div className="rm-modal-backdrop" role="presentation"><section className="rm-modal rm-delete-modal" role="dialog" aria-modal="true" aria-labelledby="delete-reminder-title"><button className="rm-modal-close" aria-label={t.cancel} onClick={() => setDeleting(null)}>×</button><small>DELETE REMINDER</small><h2 id="delete-reminder-title">{t.deleteTitle}</h2><p>{deleting.topic} · {formatDate(deleting.primaryDate)}</p><p>{t.deleteCopy}</p>{actionError && <p className="rm-action-error">{actionError}</p>}<div className="rm-modal-actions"><button onClick={() => setDeleting(null)}>{t.cancel}</button><button className="is-danger" disabled={busy} onClick={() => void deleteReminder()}>{busy ? t.deleting : t.confirmDelete}</button></div></section></div>}
  </main>;
}
