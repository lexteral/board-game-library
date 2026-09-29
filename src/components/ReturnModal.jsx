import { useState } from "react";
import { useTranslation } from "react-i18next";
import CHECKLISTS, { CHECKLIST_NOTES } from "../data/checklists";

export default function ReturnModal({ game, onConfirm, onClose }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState(() =>
    (CHECKLISTS[game.id] || []).map((i) => ({ ...i, ok: false, found: "" }))
  );
  const [note, setNote] = useState("");
  const missing = items.filter((i) => !i.ok);
  const setItem = (idx, patch) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
    setError("");
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (missing.length > 0 && !note.trim()) {
      setError(t("checklist.noteRequired"));
      return;
    }
    setLoading(true);
    try {
      await onConfirm({
        checklist: items.map(({ name, expected, ok, found }) => ({
          name, expected, ok, found: ok ? expected : found === "" ? null : Number(found),
        })),
        note: note.trim(),
      });
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl shadow-violet-200/30 w-full max-w-2xl mx-4 p-5 sm:p-7 border border-violet-100 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="headline text-2xl mb-1">{t("return.title")}</h2>
        <p className="text-sm text-gray-500 mb-4">
          {t("return.returning")} <span className="font-medium text-gray-700">{game.name}</span>
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {items.length > 0 && (
            <div className="rounded-2xl border-2 border-violet-200 bg-violet-50/40 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3 mb-1">
                <div className="headline text-2xl">{t("checklist.title")}</div>
                <button
                  type="button"
                  onClick={() => setItems((prev) => prev.map((i) => ({ ...i, ok: true })))}
                  className="px-4 py-2 rounded-full text-sm font-bold bg-violet-600 text-white hover:bg-violet-500 whitespace-nowrap"
                >
                  {t("checklist.tickAll")}
                </button>
              </div>
              <p className="text-base text-gray-600 mb-4">{t("checklist.hint")}</p>
              {CHECKLIST_NOTES[game.id] && (
                <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-3">{CHECKLIST_NOTES[game.id]}</p>
              )}
              <ul className="space-y-0">
                {items.map((it, idx) => (
                  <li key={idx} className="py-1.5">
                    <label className={`flex items-center gap-4 cursor-pointer rounded-xl px-3 py-3 transition-colors ${it.ok ? "bg-green-100" : "bg-white"}`}>
                      <input
                        type="checkbox"
                        checked={it.ok}
                        onChange={(e) => setItem(idx, { ok: e.target.checked })}
                        className="w-7 h-7 accent-[var(--color-green-600)] shrink-0 cursor-pointer"
                      />
                      <span className="flex-1 text-lg font-semibold text-gray-900 leading-snug">{it.name}</span>
                      <span className="text-lg font-extrabold text-gray-700 tabular-nums whitespace-nowrap">
                        {it.expected != null ? `× ${it.expected}` : t("checklist.countUnknown")}
                      </span>
                    </label>
                    {!it.ok && it.expected != null && (
                      <div className="flex items-center gap-2 mt-2 ml-14">
                        <span className="text-sm text-gray-600">{t("checklist.found")}</span>
                        <input
                          type="number"
                          min="0"
                          max={it.expected}
                          value={it.found}
                          onChange={(e) => setItem(idx, { found: e.target.value })}
                          className="input !w-24 !py-1.5 !px-2 text-base"
                        />
                        <span className="text-sm text-gray-500">/ {it.expected}</span>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
              <div className={`mt-4 text-base font-extrabold ${missing.length ? "text-fuchsia-600" : "text-green-700"}`}>
                {missing.length ? t("checklist.remaining", { count: missing.length }) : t("checklist.allOk")}
              </div>
              {missing.length > 0 && (
                <textarea
                  value={note}
                  onChange={(e) => { setNote(e.target.value); setError(""); }}
                  placeholder={t("checklist.notePlaceholder")}
                  rows={2}
                  className="input mt-2 text-base"
                />
              )}
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              {t("return.cancel")}
            </button>
            <button
              type="submit"
              disabled={loading || (missing.length > 0 && !note.trim())}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white btn-gradient disabled:opacity-50 transition-all hover:shadow-md hover:shadow-violet-200"
            >
              {loading ? t("return.submitting") : t("return.submit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
