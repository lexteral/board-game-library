import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import CHECKLISTS, { CHECKLIST_NOTES } from "../data/checklists";

export default function ReturnModal({ game, onConfirm, onClose }) {
  const { t } = useTranslation();
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef();
  const [items, setItems] = useState(() =>
    (CHECKLISTS[game.id] || []).map((i) => ({ ...i, ok: false, found: "" }))
  );
  const [note, setNote] = useState("");
  const missing = items.filter((i) => !i.ok);
  const setItem = (idx, patch) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
    setError("");
  };

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError(t("return.errors.invalidFile"));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const max = 800;
        let w = img.width, h = img.height;
        if (w > max || h > max) {
          if (w > h) { h = Math.round(h * max / w); w = max; }
          else { w = Math.round(w * max / h); h = max; }
        }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        setPhoto(dataUrl);
        setPreview(dataUrl);
        setError("");
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!photo) {
      setError(t("return.errors.photoRequired"));
      return;
    }
    if (missing.length > 0 && !note.trim()) {
      setError(t("checklist.noteRequired"));
      return;
    }
    setLoading(true);
    try {
      await onConfirm({
        photo,
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
        className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl shadow-violet-200/30 w-full max-w-lg mx-4 p-6 border border-violet-100 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="headline text-2xl mb-1">{t("return.title")}</h2>
        <p className="text-sm text-gray-500 mb-4">
          {t("return.returning")} <span className="font-medium text-gray-700">{game.name}</span>
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t("return.uploadPhoto")}</label>

            {preview ? (
              <div className="relative">
                <img src={preview} alt="Return photo" className="w-full rounded-lg border border-violet-100 max-h-48 object-contain bg-violet-50/30" />
                <button
                  type="button"
                  onClick={() => { setPhoto(null); setPreview(null); fileRef.current.value = ""; }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white text-sm flex items-center justify-center hover:bg-black/80"
                >
                  x
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full py-8 rounded-xl border-2 border-dashed border-violet-200 text-violet-300 hover:border-fuchsia-400 hover:text-fuchsia-500 transition-colors flex flex-col items-center gap-1"
              >
                <span className="text-3xl">📷</span>
                <span className="text-sm font-medium">{t("return.tapToUpload")}</span>
              </button>
            )}

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFile}
              className="hidden"
            />
          </div>

          {items.length > 0 && (
            <div className="rounded-xl border-2 border-gray-100 p-4">
              <div className="flex items-center justify-between gap-3 mb-1">
                <div className="font-extrabold text-gray-900">{t("checklist.title")}</div>
                <button
                  type="button"
                  onClick={() => setItems((prev) => prev.map((i) => ({ ...i, ok: true })))}
                  className="text-xs font-bold text-violet-600 hover:underline whitespace-nowrap"
                >
                  {t("checklist.tickAll")}
                </button>
              </div>
              <p className="text-xs text-gray-500 mb-3">{t("checklist.hint")}</p>
              {CHECKLIST_NOTES[game.id] && (
                <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-3">{CHECKLIST_NOTES[game.id]}</p>
              )}
              <ul className="divide-y divide-gray-100">
                {items.map((it, idx) => (
                  <li key={idx} className="py-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={it.ok}
                        onChange={(e) => setItem(idx, { ok: e.target.checked })}
                        className="w-5 h-5 accent-[var(--primary)] shrink-0"
                      />
                      <span className={`flex-1 text-sm ${it.ok ? "text-gray-900" : "text-gray-700"}`}>{it.name}</span>
                      <span className="text-sm font-bold text-gray-500 tabular-nums">
                        {it.expected != null ? `× ${it.expected}` : t("checklist.countUnknown")}
                      </span>
                    </label>
                    {!it.ok && it.expected != null && (
                      <div className="flex items-center gap-2 mt-1.5 ml-8">
                        <span className="text-xs text-gray-500">{t("checklist.found")}</span>
                        <input
                          type="number"
                          min="0"
                          max={it.expected}
                          value={it.found}
                          onChange={(e) => setItem(idx, { found: e.target.value })}
                          className="input !w-20 !py-1 !px-2 text-sm"
                        />
                        <span className="text-xs text-gray-400">/ {it.expected}</span>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
              <div className={`mt-3 text-sm font-bold ${missing.length ? "text-fuchsia-600" : "text-green-700"}`}>
                {missing.length ? t("checklist.remaining", { count: missing.length }) : t("checklist.allOk")}
              </div>
              {missing.length > 0 && (
                <textarea
                  value={note}
                  onChange={(e) => { setNote(e.target.value); setError(""); }}
                  placeholder={t("checklist.notePlaceholder")}
                  rows={2}
                  className="input mt-2 text-sm"
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
              disabled={!photo || loading}
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
