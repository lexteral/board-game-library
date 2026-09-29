import { useTranslation } from "react-i18next";

export default function LanguageToggle() {
  const { i18n } = useTranslation();

  const setLang = (lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem("lang", lang);
  };

  const btn = (lang, label) => (
    <button
      onClick={() => setLang(lang)}
      className={`px-2.5 py-1 rounded-full transition-all ${
        i18n.language === lang ? "bg-violet-600 text-white" : "text-gray-500 hover:text-gray-900"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex items-center gap-0.5 p-0.5 rounded-full border-2 border-gray-200 text-xs font-bold">
      {btn("th", "TH")}
      {btn("en", "EN")}
    </div>
  );
}
