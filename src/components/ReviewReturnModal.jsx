import { useState } from "react";
import { useTranslation } from "react-i18next";
import CHECKLISTS from "../data/checklists";

export default function ReviewReturnModal({ borrowing, game, onApprove, onReject, onClose }) {
  const { t } = useTranslation();
  const reported = Array.isArray(borrowing.return_checklist) ? borrowing.return_checklist : [];
  const base = (CHECKLISTS[borrowing.game_id] || []).map((item, i) => {
    const r = reported[i]?.name === item.name ? reported[i] : reported.find((x) => x.name === item.name);
    return { ...item, ok: r ? r.ok : null, found: r ? r.found : null };
  });

  const [items, setItems] = useState(() => base.map((i) => ({ ...i, verified: false, adminFound: "" })));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const unverified = items.filter((i) => !i.verified);
  const setItem = (idx, patch) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
    setError("");
  };

  async function approve() {
    if (unverified.length > 0 && !note.trim()) {
      setError(t("review.noteRequired"));
      return;
    }
    setBusy(true);
    try {
      await onApprove({
        checklist: items.map(({ name, expected, verified, adminFound }) => ({
          name,
          expected,
          ok: verified,
          found: verified ? expected : adminFound === "" ? null : Number(adminFound),
        })),
        note: note.trim(),
      });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  const reportedBadge = (it) => {
    if (it.ok === null || it.ok === undefined) return <span className="text-sm text-gray-400">{t("review.noReport")}</span>;
    if (it.ok) return <span className="text-sm font-bold text-green-700">✓ {t("review.borrowerOk")}</span>;
    return (
      <span className="text-sm font-bold text-fuchsia-600">
        ✗ {t("review.borrowerMissing")}
        {it.expected != null && ` (${it.found ?? "?"}/${it.expected})`}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 p-5 sm:p-7 border border-violet-100 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="headline text-3xl mb-1">{t("review.title")}</h2>
        <p className="text-base text-gray-600 mb-1">
          <span className="font-bold text-gray-900">{game?.name}</span>
        </p>
        <p className="text-sm text-gray-500 mb-5">
          {t("review.returnedBy")} {borrowing.borrower_name} · {borrowing.borrower_student_id}
        </p>

        {borrowing.return_note && (
          <div className="mb-5 rounded-xl bg-fuchsia-50 border-2 border-fuchsia-100 px-4 py-3">
            <div className="text-sm font-bold text-fuchsia-700 mb-0.5">{t("review.borrowerNote")}</div>
            <div className="text-base text-gray-800">“{borrowing.return_note}”</div>
          </div>
        )}

        <div className="rounded-2xl border-2 border-violet-200 bg-violet-50/40 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3 mb-1">
            <div className="headline text-2xl">{t("review.checklistTitle")}</div>
            <button
              type="button"
              onClick={() => setItems((prev) => prev.map((i) => ({ ...i, verified: true })))}
              className="px-4 py-2 rounded-full text-sm font-bold bg-violet-600 text-white hover:bg-violet-500 whitespace-nowrap"
            >
              {t("checklist.tickAll")}
            </button>
          </div>
          <p className="text-base text-gray-600 mb-4">{t("review.hint")}</p>

          <ul>
            {items.map((it, idx) => (
              <li key={idx} className="py-1.5">
                <label
                  className={`flex items-center gap-4 cursor-pointer rounded-xl px-3 py-3 transition-colors ${
                    it.verified ? "bg-green-100" : it.ok === false ? "bg-fuchsia-50" : "bg-white"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={it.verified}
                    onChange={(e) => setItem(idx, { verified: e.target.checked })}
                    className="w-7 h-7 accent-[var(--color-green-600)] shrink-0 cursor-pointer"
                  />
                  <span className="flex-1 min-w-0">
                    <span className="block text-lg font-semibold text-gray-900 leading-snug">{it.name}</span>
                    <span className="block mt-0.5">{reportedBadge(it)}</span>
                  </span>
                  <span className="text-lg font-extrabold text-gray-700 tabular-nums whitespace-nowrap">
                    {it.expected != null ? `× ${it.expected}` : ""}
                  </span>
                </label>
                {!it.verified && it.expected != null && (
                  <div className="flex items-center gap-2 mt-2 ml-14">
                    <span className="text-sm text-gray-600">{t("review.adminFound")}</span>
                    <input
                      type="number"
                      min="0"
                      max={it.expected}
                      value={it.adminFound}
                      onChange={(e) => setItem(idx, { adminFound: e.target.value })}
                      className="input !w-24 !py-1.5 !px-2 text-base"
                    />
                    <span className="text-sm text-gray-500">/ {it.expected}</span>
                  </div>
                )}
              </li>
            ))}
          </ul>

          <div className={`mt-4 text-base font-extrabold ${unverified.length ? "text-fuchsia-600" : "text-green-700"}`}>
            {unverified.length ? t("review.remaining", { count: unverified.length }) : t("review.allVerified")}
          </div>
          {unverified.length > 0 && (
            <textarea
              value={note}
              onChange={(e) => { setNote(e.target.value); setError(""); }}
              placeholder={t("review.notePlaceholder")}
              rows={2}
              className="input mt-2 text-base"
            />
          )}
        </div>

        {error && <div className="mt-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>}

        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="sm:flex-1 py-3 rounded-full border-2 border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50"
          >
            {t("return.cancel")}
          </button>
          <button
            type="button"
            onClick={async () => { setBusy(true); try { await onReject(); } finally { setBusy(false); } }}
            disabled={busy}
            className="sm:flex-1 py-3 rounded-full text-sm font-bold bg-fuchsia-100 text-fuchsia-700 hover:bg-fuchsia-200 disabled:opacity-50"
          >
            {t("manage.rejectButton")}
          </button>
          <button
            type="button"
            onClick={approve}
            disabled={busy || (unverified.length > 0 && !note.trim())}
            className="sm:flex-[1.4] py-3 rounded-full text-sm font-bold text-white bg-green-600 hover:bg-green-700 disabled:opacity-40"
          >
            {unverified.length ? t("review.approveWithIssues") : t("review.approve")}
          </button>
        </div>
      </div>
    </div>
  );
}
