import { useTranslation } from "react-i18next";

export default function PhotoModal({ photo, onClose }) {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl w-full max-w-lg mx-4 p-4 border border-violet-100"
        onClick={(e) => e.stopPropagation()}
      >
        <img src={photo} alt="Return photo" className="w-full rounded-lg max-h-[60vh] object-contain bg-violet-50/30" />
        <button
          onClick={onClose}
          className="mt-3 w-full py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          {t("borrowedInfo.close")}
        </button>
      </div>
    </div>
  );
}
