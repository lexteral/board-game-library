import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import RulesList from "./RulesList";

export default function BorrowModal({ game, onConfirm, onClose }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const today = new Date().toISOString().slice(0, 10);

  const [expectedReturnDate, setExpectedReturnDate] = useState("");
  const [error, setError] = useState("");
  const [accepted, setAccepted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!expectedReturnDate) {
      setError(t("borrow.errors.returnDateRequired"));
      return;
    }
    if (expectedReturnDate <= today) {
      setError(t("borrow.errors.returnDatePast"));
      return;
    }
    if (!accepted) {
      setError(t("rules.mustAccept"));
      return;
    }
    onConfirm({ gameId: game.id, expectedReturnDate, acceptRules: true });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl shadow-violet-200/30 w-full max-w-md mx-4 p-6 border border-violet-100 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="headline text-2xl mb-1">{t("borrow.title")}</h2>
        <p className="text-sm text-gray-500 mb-5">
          {t("borrow.borrowing")} <span className="font-medium text-gray-700">{game.name}</span>
        </p>

        <div className="mb-4 bg-gradient-to-r from-violet-50 to-fuchsia-50 rounded-lg px-4 py-3 text-sm border border-violet-100">
          <div className="flex justify-between">
            <span className="text-gray-500">{t("borrow.studentName")}</span>
            <span className="font-medium text-gray-900">{user.name}</span>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-gray-500">{t("borrow.studentId")}</span>
            <span className="font-medium text-gray-900">{user.studentId}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">{t("borrow.returnDate")}</span>
            <input
              type="date"
              value={expectedReturnDate}
              onChange={(e) => { setExpectedReturnDate(e.target.value); setError(""); }}
              min={today}
              className="input"
              autoFocus
            />
          </label>

          <div className="rounded-xl border-2 border-amber-100 bg-amber-50 p-4">
            <div className="font-extrabold text-gray-900 mb-3">{t("rules.title")}</div>
            <RulesList compact />
            <label className="flex items-start gap-2.5 mt-4 pt-3 border-t-2 border-amber-100 cursor-pointer">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => { setAccepted(e.target.checked); setError(""); }}
                className="mt-1 w-4 h-4 accent-[var(--primary)] shrink-0"
              />
              <span className="text-sm font-semibold text-gray-900">{t("rules.accept")}</span>
            </label>
          </div>

          {error && <span className="text-sm text-red-600">{error}</span>}

          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              {t("borrow.cancel")}
            </button>
            <button
              type="submit"
              disabled={!accepted}
              className="flex-1 disabled:opacity-40 disabled:cursor-not-allowed py-2.5 rounded-lg text-sm font-medium text-white btn-gradient transition-all hover:shadow-md hover:shadow-violet-200"
            >
              {t("borrow.submit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
