import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import GAMES from "../data/games";
import PageTitle from "../components/PageTitle";
import { useAuth } from "../context/AuthContext";

const fmtDate = (d) => (d ? String(d).slice(0, 10) : "–");

function oneSemesterFromToday() {
  const d = new Date();
  d.setMonth(d.getMonth() + 4);
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
}

function SuspendPanel({ user, onDone, authFetch, t }) {
  const [until, setUntil] = useState(oneSemesterFromToday);
  const [reason, setReason] = useState(t("rules.defaultReason"));
  const [busy, setBusy] = useState(false);

  const call = async (method, body) => {
    setBusy(true);
    try {
      const res = await authFetch(`/api/admin/users/${user.id}/suspend`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      onDone(res.ok ? (method === "POST" ? t("rules.suspendedOk") : t("rules.liftedOk")) : data.error);
    } finally {
      setBusy(false);
    }
  };

  if (user.suspended_until) {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-fuchsia-50 border-2 border-fuchsia-100 px-4 py-3 mb-3">
        <div className="text-sm">
          <div className="font-bold text-fuchsia-700">{t("rules.suspendedUntilShort", { date: fmtDate(user.suspended_until) })}</div>
          {user.suspension_reason && <div className="text-gray-600">{t("rules.reason")}: {user.suspension_reason}</div>}
        </div>
        <button onClick={() => call("DELETE")} disabled={busy} className="self-start px-4 py-1.5 rounded-full text-xs font-bold border-2 border-gray-200 text-gray-700 hover:bg-gray-100 disabled:opacity-50">
          {t("rules.lift")}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-gray-50 border-2 border-gray-100 px-4 py-3 mb-3">
      <div className="text-sm font-bold text-gray-900 mb-2">{t("rules.suspendTitle")}</div>
      <div className="flex flex-col sm:flex-row gap-2">
        <input type="date" value={until} onChange={(e) => setUntil(e.target.value)} className="input sm:!w-44 !py-1.5 text-sm" />
        <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("rules.reason")} className="input !py-1.5 text-sm flex-1" />
        <button
          onClick={() => { if (window.confirm(t("rules.confirmSuspend", { name: user.name, date: until }))) call("POST", { until, reason }); }}
          disabled={busy || !until}
          className="px-4 py-1.5 rounded-full text-xs font-bold bg-fuchsia-500 text-white hover:bg-fuchsia-600 disabled:opacity-50 whitespace-nowrap"
        >
          {t("rules.suspend")}
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }) {
  return (
    <div className={`rounded-2xl p-5 ${tone}`}>
      <div className="headline text-4xl">{value}</div>
      <div className="text-sm font-semibold mt-1 opacity-80">{label}</div>
    </div>
  );
}

function Badge({ tone, children }) {
  return <span className={`text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${tone}`}>{children}</span>;
}

export default function Admin() {
  const { t } = useTranslation();
  const { authFetch } = useAuth();
  const [tab, setTab] = useState("games");
  const [status, setStatus] = useState({ current: [], counts: [] });
  const [people, setPeople] = useState({ borrowers: [], loans: [] });
  const [smsReady, setSmsReady] = useState(false);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  };

  const load = useCallback(async () => {
    try {
      const [s, p, sms] = await Promise.all([
        authFetch("/api/admin/games-status"),
        authFetch("/api/admin/borrowers"),
        authFetch("/api/admin/sms-status"),
      ]);
      if (s.ok) setStatus(await s.json());
      if (p.ok) setPeople(await p.json());
      if (sms.ok) setSmsReady((await sms.json()).configured);
    } catch { /* ignore */ }
  }, [authFetch]);

  useEffect(() => { load(); }, [load]);

  const currentByGame = Object.fromEntries(status.current.map((b) => [b.game_id, b]));
  const countByGame = Object.fromEntries(status.counts.map((c) => [c.game_id, c.total]));
  const gameName = (id) => GAMES.find((g) => g.id === id)?.name || `#${id}`;
  const overdueCount = status.current.filter((b) => b.status === "active" && b.days_overdue > 0).length;
  const q = search.trim().toLowerCase();

  const sendSms = async (b) => {
    setBusy(b.id);
    try {
      const res = await authFetch(`/api/admin/borrowings/${b.id}/sms`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        showToast(t("admin.smsSent", { phone: data.phone }));
        load();
      } else if (data.code === "SMS_NOT_CONFIGURED") {
        window.location.href = `sms:${data.phone}?body=${encodeURIComponent(data.message)}`;
      } else {
        showToast(data.error);
      }
    } finally {
      setBusy(null);
    }
  };

  const runReminders = async () => {
    setBusy("reminders");
    try {
      const res = await authFetch("/api/admin/reminders/run", { method: "POST" });
      const data = await res.json();
      showToast(res.ok ? t("admin.remindersDone", data) : data.error);
    } finally {
      setBusy(null);
    }
  };

  const games = GAMES.filter((g) => {
    if (!q) return true;
    const b = currentByGame[g.id];
    return g.name.toLowerCase().includes(q) || b?.borrower_name.toLowerCase().includes(q) || b?.borrower_student_id.includes(q);
  }).sort((a, b) => {
    const A = currentByGame[a.id], B = currentByGame[b.id];
    return (B?.days_overdue ?? -1) - (A?.days_overdue ?? -1) || (B ? 1 : 0) - (A ? 1 : 0);
  });

  const borrowers = people.borrowers.filter(
    (u) => !q || u.name.toLowerCase().includes(q) || u.student_id.includes(q) || (u.phone || "").includes(q)
  );

  const statusBadge = (b) => {
    if (b.status === "pending_return") return <Badge tone="bg-amber-100 text-amber-600">{t("manage.pendingReturn")}</Badge>;
    if (b.days_overdue > 0) return <Badge tone="bg-fuchsia-500 text-white">{t("admin.overdueDays", { count: b.days_overdue })}</Badge>;
    return <Badge tone="bg-green-100 text-green-700">{t("manage.onTime")}</Badge>;
  };

  const smsButton = (b) =>
    b.status === "active" && b.days_overdue > 0 && b.phone ? (
      <button
        onClick={() => sendSms(b)}
        disabled={busy === b.id}
        className="px-3 py-1.5 rounded-full text-xs font-bold bg-fuchsia-500 text-white hover:bg-fuchsia-600 disabled:opacity-50 transition-colors whitespace-nowrap"
        title={smsReady ? "" : t("admin.smsFallbackHint")}
      >
        {busy === b.id ? "…" : t("admin.sendSms")}
      </button>
    ) : null;

  const tabClass = (key) =>
    `px-5 py-2 rounded-full text-sm font-bold transition-all ${
      tab === key ? "bg-gray-900 text-[var(--bg)]" : "text-gray-500 hover:bg-gray-100"
    }`;

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
        <div>
          <PageTitle>{t("admin.title")}</PageTitle>
          <p className="lede mt-5">{t("admin.lede")}</p>
        </div>
        <button onClick={runReminders} disabled={busy === "reminders"} className="self-start lg:self-auto px-5 py-2.5 text-sm text-white btn-gradient disabled:opacity-50">
          {busy === "reminders" ? "…" : t("admin.runReminders")}
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <Stat label={t("admin.statBorrowed")} value={status.current.length} tone="bg-violet-100 text-violet-700" />
        <Stat label={t("admin.statOverdue")} value={overdueCount} tone="bg-fuchsia-100 text-fuchsia-700" />
        <Stat label={t("admin.statAvailable")} value={GAMES.length - status.current.length} tone="bg-green-100 text-green-700" />
        <Stat label={t("admin.statBorrowers")} value={people.borrowers.length} tone="bg-amber-100 text-amber-600" />
      </div>

      {!smsReady && overdueCount > 0 && (
        <p className="mb-6 text-sm text-gray-600 bg-amber-50 border-2 border-amber-100 rounded-xl px-4 py-3">{t("admin.smsFallbackHint")}</p>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex gap-1 p-1 rounded-full border-2 border-gray-100 self-start">
          <button className={tabClass("games")} onClick={() => setTab("games")}>{t("admin.tabGames")}</button>
          <button className={tabClass("borrowers")} onClick={() => setTab("borrowers")}>{t("admin.tabBorrowers")}</button>
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("admin.searchPlaceholder")}
          className="input sm:max-w-xs !rounded-full"
        />
      </div>

      {tab === "games" ? (
        <div className="grid gap-3">
          {games.map((g) => {
            const b = currentByGame[g.id];
            return (
              <div key={g.id} className="bg-white rounded-2xl border-2 border-gray-100 p-4 sm:p-5 flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
                <div className="md:w-64 shrink-0">
                  <div className="font-extrabold text-gray-900">{g.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{t("admin.timesBorrowed", { count: countByGame[g.id] || 0 })}</div>
                </div>
                {b ? (
                  <>
                    <div className="flex-1 min-w-0 text-sm">
                      <div className="font-semibold text-gray-900">{b.borrower_name} <span className="text-gray-400 font-normal">· {b.borrower_student_id}</span></div>
                      <div className="text-gray-500 mt-0.5 flex flex-wrap gap-x-3">
                        {b.phone && <a href={`tel:${b.phone}`} className="text-violet-600 hover:underline">{b.phone}</a>}
                        <span>{fmtDate(b.borrow_date)} → {fmtDate(b.expected_return_date)}</span>
                        <span>{t("admin.daysBorrowed", { count: b.days_borrowed })}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {statusBadge(b)}
                      {smsButton(b)}
                    </div>
                  </>
                ) : (
                  <div className="flex-1"><Badge tone="bg-green-600 text-white">{t("dashboard.available")}</Badge></div>
                )}
              </div>
            );
          })}
        </div>
      ) : borrowers.length === 0 ? (
        <p className="text-center text-gray-400 py-12">{t("admin.noBorrowers")}</p>
      ) : (
        <div className="grid gap-3">
          {borrowers.map((u) => {
            const loans = people.loans.filter((l) => l.user_id === u.id);
            const open = expanded === u.id;
            return (
              <div key={u.id} className="bg-white rounded-2xl border-2 border-gray-100 overflow-hidden">
                <button
                  onClick={() => setExpanded(open ? null : u.id)}
                  className="w-full text-left p-4 sm:p-5 flex flex-col md:flex-row md:items-center gap-3 md:gap-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="md:w-64 shrink-0">
                    <div className="font-extrabold text-gray-900 flex items-center gap-2 flex-wrap">
                      {u.name}
                      {u.suspended_until && <Badge tone="bg-fuchsia-500 text-white">{t("rules.suspendedBadge")}</Badge>}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">{u.student_id}{u.phone ? ` · ${u.phone}` : ""}</div>
                  </div>
                  <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div><div className="text-gray-400 text-xs">{t("admin.totalLoans")}</div><div className="font-bold">{u.total_loans}</div></div>
                    <div><div className="text-gray-400 text-xs">{t("admin.activeLoans")}</div><div className="font-bold">{u.active_loans}</div></div>
                    <div><div className="text-gray-400 text-xs">{t("admin.avgDays")}</div><div className="font-bold">{u.avg_days != null ? t("admin.days", { count: Number(u.avg_days) }) : "–"}</div></div>
                    <div><div className="text-gray-400 text-xs">{t("admin.lateCount")}</div><div className={`font-bold ${u.late_count > 0 ? "text-fuchsia-600" : ""}`}>{u.late_count}</div></div>
                  </div>
                  <span className={`hidden md:block text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
                </button>

                {open && (
                  <div className="border-t-2 border-gray-100 px-4 sm:px-5 py-3">
                    <SuspendPanel user={u} authFetch={authFetch} t={t} onDone={(msg) => { showToast(msg); load(); }} />
                    {loans.length === 0 ? (
                      <p className="text-sm text-gray-400 py-2">{t("admin.noLoans")}</p>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {loans.map((l) => {
                          const late = l.status === "returned"
                            ? fmtDate(l.returned_date) > fmtDate(l.expected_return_date)
                            : l.status === "active" && l.days > l.days_requested;
                          return (
                            <div key={l.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm">
                              <div className="sm:w-56 font-semibold text-gray-900">{gameName(l.game_id)}</div>
                              <div className="flex-1 text-gray-500">
                                {fmtDate(l.borrow_date)} → {l.returned_date ? fmtDate(l.returned_date) : t("admin.notReturned")}
                                <span className="text-gray-400"> · {t("admin.requestedVsActual", { requested: l.days_requested, actual: l.days })}</span>
                              </div>
                              <div>
                                {l.status === "returned"
                                  ? <Badge tone={late ? "bg-fuchsia-100 text-fuchsia-700" : "bg-green-100 text-green-700"}>{late ? t("admin.returnedLate") : t("admin.returnedOnTime")}</Badge>
                                  : l.status === "pending_return"
                                    ? <Badge tone="bg-amber-100 text-amber-600">{t("manage.pendingReturn")}</Badge>
                                    : <Badge tone={late ? "bg-fuchsia-500 text-white" : "bg-violet-100 text-violet-700"}>{late ? t("manage.overdue") : t("admin.borrowing")}</Badge>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 toast-gradient px-6 py-3 shadow-lg text-sm font-medium z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
