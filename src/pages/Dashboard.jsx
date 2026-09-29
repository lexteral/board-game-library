import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import GAMES from "../data/games";
import { useAuth } from "../context/AuthContext";
import GameCard from "../components/GameCard";
import BorrowModal from "../components/BorrowModal";
import BorrowedInfoModal from "../components/BorrowedInfoModal";
import { Swash } from "../components/PageTitle";

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
      <section className="mb-12 sm:mb-16">
        <h1 className="headline headline-xl">
          {t("dashboard.heroLine1")}.
          <br />
          <Swash>{t("dashboard.heroLine2")}</Swash>.
        </h1>
        <p className="lede mt-6">{t("dashboard.heroLede")}</p>
        <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("dashboard.searchPlaceholder")}
            className="input sm:max-w-sm !rounded-full"
          />
          <span className="inline-flex items-center gap-2 self-start px-4 py-2 rounded-full bg-green-100 text-green-700 text-sm font-bold">
            <span className="w-2 h-2 rounded-full bg-green-600"></span>
            {t("dashboard.availableCount", { count: availableCount, total: GAMES.length })}
          </span>
        </div>
      </section>

      {filtered.length === 0 ? (
        <p className="text-center text-gray-400 py-12">{t("dashboard.noResults")}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((game, i) => (
            <GameCard
              index={i}
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
