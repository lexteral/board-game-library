import { useTranslation } from "react-i18next";

export default function LanguageToggle() {
  const { i18n } = useTranslation();

  const setLang = (lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem("lang", lang);
  };

  return (
    <div className="flex items-center rounded-full border border-violet-200 overflow-hidden text-xs font-semibold">
      <button
        onClick={() => setLang("th")}
        className={`px-2.5 py-1.5 transition-all ${
          i18n.language === "th"
            ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white"
            : "bg-white text-gray-400 hover:bg-violet-50 hover:text-violet-500"
        }`}
      >
        TH
      </button>
      <button
        onClick={() => setLang("en")}
        className={`px-2.5 py-1.5 transition-all ${
          i18n.language === "en"
            ? "bg-gradient-to-r from-fuchsia-500 to-amber-400 text-white"
            : "bg-white text-gray-400 hover:bg-violet-50 hover:text-violet-500"
        }`}
      >
        EN
      </button>
    </div>
  );
}
