import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import GAMES from "../data/games";
import { useAuth } from "../context/AuthContext";
import GameCard from "../components/GameCard";
import BorrowModal from "../components/BorrowModal";
import BorrowedInfoModal from "../components/BorrowedInfoModal";

export default function Dashboard() {
  const { t } = useTranslation();
  const { authFetch } = useAuth();
  const [search, setSearch] = useState("");
  const [borrowTarget, setBorrowTarget] = useState(null);
  const [detailTarget, setDetailTarget] = useState(null);
  const [toast, setToast] = useState("");
  const [activeBorrowings, setActiveBorrowings] = useState([]);

  const loadBorrowings = useCallback(async () => {
    try {
      const res = await authFetch("/api/borrowings/active");
      if (res.ok) setActiveBorrowings(await res.json());
    } catch { /* ignore */ }
  }, [authFetch]);

  useEffect(() => { loadBorrowings(); }, [loadBorrowings]);

  const borrowingByGame = Object.fromEntries(activeBorrowings.map((b) => [b.game_id, b]));
  const availableCount = GAMES.length - activeBorrowings.length;

  const filtered = GAMES.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleConfirmBorrow = async (data) => {
    try {
      const res = await authFetch("/api/borrowings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      setBorrowTarget(null);
      setToast(t("borrow.success"));
      setTimeout(() => setToast(""), 3000);
      loadBorrowings();
    } catch (err) {
      setToast(err.message);
      setTimeout(() => setToast(""), 3000);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-600 via-fuchsia-500 to-amber-500 bg-clip-text text-transparent">{t("dashboard.title")}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {t("dashboard.availableCount", { count: availableCount, total: GAMES.length })}
          </p>
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("dashboard.searchPlaceholder")}
          className="input w-full sm:w-72"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-gray-400 py-12">{t("dashboard.noResults")}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              borrowing={borrowingByGame[game.id]}
              onBorrow={setBorrowTarget}
              onViewDetails={(g, b) => setDetailTarget({ game: g, borrowing: b })}
            />
          ))}
        </div>
      )}

      {borrowTarget && (
        <BorrowModal
          game={borrowTarget}
          onConfirm={handleConfirmBorrow}
          onClose={() => setBorrowTarget(null)}
        />
      )}

      {detailTarget && (
        <BorrowedInfoModal
          game={detailTarget.game}
          borrowing={detailTarget.borrowing}
          onClose={() => setDetailTarget(null)}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 toast-gradient text-white px-6 py-3 rounded-xl shadow-lg text-sm font-medium z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
