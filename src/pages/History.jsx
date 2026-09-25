import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import GAMES from "../data/games";
import { useAuth } from "../context/AuthContext";

export default function History() {
  const { t } = useTranslation();
  const { authFetch } = useAuth();
  const [history, setHistory] = useState([]);
  const [search, setSearch] = useState("");

  const gameMap = Object.fromEntries(GAMES.map((g) => [g.id, g]));
  const fmtDate = (d) => d ? d.slice(0, 10) : "";

  const loadHistory = useCallback(async () => {
    try {
      const res = await authFetch("/api/borrowings/history");
      if (res.ok) setHistory(await res.json());
    } catch { /* ignore */ }
  }, [authFetch]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const filtered = history.filter(
    (b) =>
      b.borrower_name.toLowerCase().includes(search.toLowerCase()) ||
      b.borrower_student_id.includes(search)
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-600 via-fuchsia-500 to-amber-500 bg-clip-text text-transparent">{t("history.title")}</h1>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("history.searchPlaceholder")}
          className="input w-full sm:w-72"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-gray-400 py-12">{t("history.noHistory")}</p>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="sm:hidden space-y-3">
            {filtered.map((b) => (
              <div key={b.id} className="bg-white/80 backdrop-blur-sm rounded-xl border border-violet-100 p-4 space-y-1.5">
                <div className="font-medium text-gray-900">{gameMap[b.game_id]?.name}</div>
                <div className="text-sm text-gray-600">{b.borrower_name} · {b.borrower_student_id}</div>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>{t("history.borrowDate")}: {fmtDate(b.borrow_date)}</span>
                  <span>{t("history.returnDate")}: {fmtDate(b.returned_date)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto bg-white/80 backdrop-blur-sm rounded-xl border border-violet-100">
            <table className="w-full text-sm text-left">
              <thead className="bg-gradient-to-r from-violet-50 to-fuchsia-50 text-gray-500 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">{t("history.game")}</th>
                  <th className="px-4 py-3">{t("history.borrower")}</th>
                  <th className="px-4 py-3">{t("history.studentId")}</th>
                  <th className="px-4 py-3">{t("history.borrowDate")}</th>
                  <th className="px-4 py-3">{t("history.returnDate")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((b) => (
                  <tr key={b.id}>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {gameMap[b.game_id]?.name}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{b.borrower_name}</td>
                    <td className="px-4 py-3 text-gray-700">{b.borrower_student_id}</td>
                    <td className="px-4 py-3 text-gray-700">{fmtDate(b.borrow_date)}</td>
                    <td className="px-4 py-3 text-gray-700">{fmtDate(b.returned_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
