import { useTranslation } from "react-i18next";

const TONES = ["bg-violet-600", "bg-amber-500", "bg-fuchsia-500"];

export default function RulesList({ compact = false }) {
  const { t } = useTranslation();
  const rules = ["rules.r1", "rules.r2", "rules.r3"];
  return (
    <ol className={compact ? "space-y-2" : "space-y-4"}>
      {rules.map((key, i) => (
        <li key={key} className="flex gap-3 items-start">
          <span className={`shrink-0 grid place-items-center rounded-full text-white font-extrabold ${TONES[i]} ${compact ? "w-6 h-6 text-xs" : "w-8 h-8 text-sm"}`}>
            {i + 1}
          </span>
          <span className={`${compact ? "text-sm" : "text-base"} text-gray-700 leading-relaxed`}>{t(key)}</span>
        </li>
      ))}
    </ol>
  );
}

export function isSuspended(user) {
  if (!user?.suspendedUntil) return false;
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
  return String(user.suspendedUntil).slice(0, 10) >= today;
}
