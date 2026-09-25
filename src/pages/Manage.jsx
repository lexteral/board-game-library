import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import GAMES from "../data/games";
import { useAuth } from "../context/AuthContext";
import ReturnModal from "../components/ReturnModal";
import PhotoModal from "../components/PhotoModal";

export default function Manage() {
  const { t } = useTranslation();
  const { user, authFetch } = useAuth();
  const [active, setActive] = useState([]);
  const [pending, setPending] = useState([]);
  const [toast, setToast] = useState("");
  const [returnTarget, setReturnTarget] = useState(null);
  const [viewPhoto, setViewPhoto] = useState(null);

  const gameMap = Object.fromEntries(GAMES.map((g) => [g.id, g]));
  const today = new Date().toISOString().slice(0, 10);
  const fmtDate = (d) => d ? d.slice(0, 10) : "";
  const isAdmin = user?.role === "admin";

  const loadData = useCallback(async () => {
    try {
      const [activeRes, pendingRes] = await Promise.all([
        authFetch("/api/borrowings/active"),
        authFetch("/api/borrowings/pending"),
      ]);
      if (activeRes.ok) {
        const data = await activeRes.json();
        setActive(data.filter((b) => b.status === "active").sort((a, b) => {
          const aOverdue = fmtDate(a.expected_return_date) < today;
          const bOverdue = fmtDate(b.expected_return_date) < today;
          if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
          return a.expected_return_date.localeCompare(b.expected_return_date);
        }));
      }
      if (pendingRes.ok) setPending(await pendingRes.json());
    } catch { /* ignore */ }
  }, [authFetch, today]);

  useEffect(() => { loadData(); }, [loadData]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const handleReturn = async (photo) => {
    const res = await authFetch(`/api/borrowings/${returnTarget.id}/return`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photo }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error);
    }
    setReturnTarget(null);
    showToast(t("manage.returnSuccess"));
    loadData();
  };

  const handleApprove = async (id) => {
    const res = await authFetch(`/api/borrowings/${id}/approve`, { method: "POST" });
    if (res.ok) { showToast(t("manage.approveSuccess")); loadData(); }
  };

  const handleReject = async (id) => {
    const res = await authFetch(`/api/borrowings/${id}/reject`, { method: "POST" });
    if (res.ok) { showToast(t("manage.rejectSuccess")); loadData(); }
  };

  return (
    <div className="space-y-8">
      {/* Pending Returns Section */}
      {pending.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span className="bg-gradient-to-r from-amber-500 to-fuchsia-500 bg-clip-text text-transparent">
              {t("manage.pendingReturns")}
            </span>
            <span className="text-sm font-normal text-gray-400">({pending.length})</span>
          </h2>

          {/* Mobile cards */}
          <div className="sm:hidden space-y-3">
            {pending.map((b) => (
              <div key={b.id} className="bg-white/80 backdrop-blur-sm rounded-xl border border-amber-200/60 p-4 space-y-3">
                <div className="font-medium text-gray-900">{gameMap[b.game_id]?.name}</div>
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>{b.borrower_name}</span>
                  <span className="text-gray-400">{b.borrower_student_id}</span>
                </div>
                <div className="flex items-center justify-between">
                  {b.return_photo && (
                    <button
                      onClick={() => setViewPhoto(b.return_photo)}
                      className="w-12 h-12 rounded-lg overflow-hidden border border-violet-200 hover:border-fuchsia-400 transition-colors"
                    >
                      <img src={b.return_photo} alt="" className="w-full h-full object-cover" />
                    </button>
                  )}
                  {isAdmin && (
                    <div className="flex gap-2 ml-auto">
                      <button
                        onClick={() => handleApprove(b.id)}
                        className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700 transition-colors"
                      >
                        {t("manage.approveButton")}
                      </button>
                      <button
                        onClick={() => handleReject(b.id)}
                        className="px-3 py-1.5 rounded-lg bg-red-100 text-red-700 text-xs font-medium hover:bg-red-200 transition-colors"
                      >
                        {t("manage.rejectButton")}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto bg-white/80 backdrop-blur-sm rounded-xl border border-amber-200/60">
            <table className="w-full text-sm text-left">
              <thead className="bg-gradient-to-r from-amber-50 to-fuchsia-50 text-gray-500 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">{t("manage.game")}</th>
                  <th className="px-4 py-3">{t("manage.borrower")}</th>
                  <th className="px-4 py-3">{t("manage.studentId")}</th>
                  <th className="px-4 py-3">{t("manage.photo")}</th>
                  {isAdmin && <th className="px-4 py-3">{t("manage.action")}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pending.map((b) => (
                  <tr key={b.id} className="bg-amber-50/20">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {gameMap[b.game_id]?.name}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{b.borrower_name}</td>
                    <td className="px-4 py-3 text-gray-700">{b.borrower_student_id}</td>
                    <td className="px-4 py-3">
                      {b.return_photo && (
                        <button
                          onClick={() => setViewPhoto(b.return_photo)}
                          className="w-12 h-12 rounded-lg overflow-hidden border border-violet-200 hover:border-fuchsia-400 transition-colors"
                        >
                          <img src={b.return_photo} alt="" className="w-full h-full object-cover" />
                        </button>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(b.id)}
                            className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700 transition-colors"
                          >
                            {t("manage.approveButton")}
                          </button>
                          <button
                            onClick={() => handleReject(b.id)}
                            className="px-3 py-1.5 rounded-lg bg-red-100 text-red-700 text-xs font-medium hover:bg-red-200 transition-colors"
                          >
                            {t("manage.rejectButton")}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Active Borrowings Section */}
      <section>
        <h2 className="text-xl font-bold mb-4">
          <span className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-amber-500 bg-clip-text text-transparent">
            {pending.length > 0 ? t("manage.activeBorrowings") : t("manage.title")}
          </span>
        </h2>

        {active.length === 0 ? (
          <p className="text-center text-gray-400 py-12">{t("manage.noActive")}</p>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="sm:hidden space-y-3">
              {active.map((b) => {
                const overdue = fmtDate(b.expected_return_date) < today;
                return (
                  <div key={b.id} className={`bg-white/80 backdrop-blur-sm rounded-xl border p-4 space-y-2 ${overdue ? "border-orange-200" : "border-violet-100"}`}>
                    <div className="flex items-start justify-between">
                      <div className="font-medium text-gray-900">{gameMap[b.game_id]?.name}</div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${overdue ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"}`}>
                        {overdue ? t("manage.overdue") : t("manage.onTime")}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">{b.borrower_name} · {b.borrower_student_id}</div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">{t("manage.expectedReturn")}: {fmtDate(b.expected_return_date)}</span>
                      <button
                        onClick={() => setReturnTarget({ id: b.id, game: gameMap[b.game_id] })}
                        className="px-3 py-1.5 rounded-lg text-white text-xs font-medium btn-gradient transition-all hover:shadow-sm hover:shadow-violet-200"
                      >
                        {t("manage.returnButton")}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto bg-white/80 backdrop-blur-sm rounded-xl border border-violet-100">
              <table className="w-full text-sm text-left">
                <thead className="bg-gradient-to-r from-violet-50 to-fuchsia-50 text-gray-500 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3">{t("manage.game")}</th>
                    <th className="px-4 py-3">{t("manage.borrower")}</th>
                    <th className="px-4 py-3">{t("manage.studentId")}</th>
                    <th className="px-4 py-3 hidden md:table-cell">{t("manage.borrowDate")}</th>
                    <th className="px-4 py-3">{t("manage.expectedReturn")}</th>
                    <th className="px-4 py-3">{t("manage.status")}</th>
                    <th className="px-4 py-3">{t("manage.action")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {active.map((b) => {
                    const overdue = fmtDate(b.expected_return_date) < today;
                    return (
                      <tr key={b.id} className={overdue ? "bg-orange-50/50" : ""}>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {gameMap[b.game_id]?.name}
                        </td>
                        <td className="px-4 py-3 text-gray-700">{b.borrower_name}</td>
                        <td className="px-4 py-3 text-gray-700">{b.borrower_student_id}</td>
                        <td className="px-4 py-3 text-gray-700 hidden md:table-cell">{fmtDate(b.borrow_date)}</td>
                        <td className="px-4 py-3 text-gray-700">{fmtDate(b.expected_return_date)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-xs font-semibold px-2 py-1 rounded-full ${
                              overdue
                                ? "bg-orange-100 text-orange-700"
                                : "bg-green-100 text-green-700"
                            }`}
                          >
                            {overdue ? t("manage.overdue") : t("manage.onTime")}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setReturnTarget({ id: b.id, game: gameMap[b.game_id] })}
                            className="px-3 py-1.5 rounded-lg text-white text-xs font-medium btn-gradient transition-all hover:shadow-sm hover:shadow-violet-200"
                          >
                            {t("manage.returnButton")}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {returnTarget && (
        <ReturnModal
          game={returnTarget.game}
          onConfirm={handleReturn}
          onClose={() => setReturnTarget(null)}
        />
      )}

      {viewPhoto && (
        <PhotoModal photo={viewPhoto} onClose={() => setViewPhoto(null)} />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 toast-gradient text-white px-6 py-3 rounded-xl shadow-lg text-sm font-medium z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
