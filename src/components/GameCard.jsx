import { useState } from "react";
import { useTranslation } from "react-i18next";

const TINTS = ["bg-violet-50", "bg-amber-100", "bg-fuchsia-100", "bg-green-100", "bg-amber-50", "bg-violet-100"];

export default function GameCard({ game, borrowing, onBorrow, onViewDetails, index = 0 }) {
  const { t } = useTranslation();
  const isBorrowed = !!borrowing;
  const [imgError, setImgError] = useState(false);

  return (
    <div
      className="pop-in lift rounded-2xl border-2 border-gray-100 bg-white overflow-hidden flex flex-col"
      style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
    >
      <div className={`relative h-48 m-2 rounded-xl ${TINTS[index % TINTS.length]} flex items-center justify-center overflow-hidden`}>
        {game.image && !imgError ? (
          <img
            src={game.image}
            alt={game.name}
            className="w-full h-full object-contain p-3"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <span className="text-5xl">🎲</span>
        )}
        <span
          className={`absolute top-3 right-3 text-xs font-bold px-3 py-1 rounded-full ${
            isBorrowed ? "bg-fuchsia-500 text-white" : "bg-green-600 text-white"
          }`}
        >
          {isBorrowed ? t("dashboard.borrowed") : t("dashboard.available")}
        </span>
      </div>

      <div className="px-5 pb-5 pt-2 flex flex-col gap-4 flex-1">
        <div className="flex-1">
          <h3 className="text-lg font-extrabold text-gray-900 leading-snug">{game.name}</h3>
          <p className="text-sm text-gray-500 mt-1">
            {t("dashboard.players", { count: game.playerCount })}
          </p>
        </div>

        {isBorrowed ? (
          <button
            onClick={() => onViewDetails(game, borrowing)}
            className="w-full py-2.5 px-4 rounded-full text-sm font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
          >
            {t("dashboard.detailsButton")}
          </button>
        ) : (
          <button
            onClick={() => onBorrow(game)}
            className="w-full py-2.5 px-4 text-sm text-white btn-gradient"
          >
            {t("dashboard.borrowButton")}
          </button>
        )}
      </div>
    </div>
  );
}
