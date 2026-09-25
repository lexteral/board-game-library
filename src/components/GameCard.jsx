import { useState } from "react";
import { useTranslation } from "react-i18next";

export default function GameCard({ game, borrowing, onBorrow, onViewDetails }) {
  const { t } = useTranslation();
  const isBorrowed = !!borrowing;
  const [imgError, setImgError] = useState(false);

  return (
    <div
      className={`rounded-xl border bg-white/70 backdrop-blur-sm overflow-hidden flex flex-col transition-all hover:shadow-lg hover:shadow-violet-100 ${
        isBorrowed ? "border-fuchsia-200" : "border-violet-100"
      }`}
    >
      <div className="relative h-44 bg-gradient-to-br from-violet-50 to-amber-50 flex items-center justify-center overflow-hidden">
        {game.image && !imgError ? (
          <img
            src={game.image}
            alt={game.name}
            className="w-full h-full object-contain p-2"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <span className="text-5xl">🎲</span>
        )}
        <span
          className={`absolute top-2 right-2 text-xs font-semibold px-2.5 py-1 rounded-full ${
            isBorrowed
              ? "bg-fuchsia-100 text-fuchsia-700"
              : "bg-green-100 text-green-700"
          }`}
        >
          {isBorrowed ? t("dashboard.borrowed") : t("dashboard.available")}
        </span>
      </div>

      <div className="p-4 flex flex-col gap-3 flex-1">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 leading-snug">{game.name}</h3>
          <p className="text-sm text-gray-500 mt-1">
            {t("dashboard.players", { count: game.playerCount })}
          </p>
        </div>

        {isBorrowed ? (
          <button
            onClick={() => onViewDetails(game, borrowing)}
            className="w-full py-2 px-4 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
          >
            {t("dashboard.detailsButton")}
          </button>
        ) : (
          <button
            onClick={() => onBorrow(game)}
            className="w-full py-2 px-4 rounded-lg text-sm font-medium text-white btn-gradient transition-all hover:shadow-md hover:shadow-violet-200"
          >
            {t("dashboard.borrowButton")}
          </button>
        )}
      </div>
    </div>
  );
}
