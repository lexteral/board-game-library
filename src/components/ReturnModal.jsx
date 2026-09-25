import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";

export default function ReturnModal({ game, onConfirm, onClose }) {
  const { t } = useTranslation();
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef();

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
    setLoading(true);
    try {
      await onConfirm(photo);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl shadow-violet-200/30 w-full max-w-md mx-4 p-6 border border-violet-100"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold bg-gradient-to-r from-violet-600 to-fuchsia-500 bg-clip-text text-transparent mb-1">{t("return.title")}</h2>
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
