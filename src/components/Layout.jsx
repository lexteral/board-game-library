import { NavLink, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import LanguageToggle from "./LanguageToggle";

export default function Layout() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();

  const linkClass = ({ isActive }) =>
    `px-3 py-2 rounded-lg text-sm font-medium transition-all ${
      isActive
        ? "bg-gradient-to-r from-violet-500/15 via-fuchsia-500/10 to-amber-500/10 text-violet-700 ring-1 ring-violet-200"
        : "text-gray-500 hover:bg-white/60 hover:text-gray-900"
    }`;

  return (
    <div className="min-h-screen aurora-bg">
      <header className="bg-white/80 backdrop-blur-md border-b border-violet-100 sticky top-0 z-30">
        <div className="h-0.5 bg-gradient-to-r from-violet-400 via-fuchsia-400 to-amber-400"></div>
        <div className="max-w-6xl mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-2xl shrink-0" role="img" aria-label="dice">
                🎲
              </span>
              <div className="min-w-0">
                <span className="font-bold text-base bg-gradient-to-r from-violet-600 via-fuchsia-500 to-amber-500 bg-clip-text text-transparent block leading-tight">
                  {t("appName")}
                </span>
                <span className="text-xs text-gray-500 block leading-tight">
                  {i18n.language === "th"
                    ? "สาขาวิชาการสอนภาษาอังกฤษ สำนักวิชาศึกษาศาสตร์"
                    : "English Language Teaching, School of Education"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <nav className="flex items-center gap-1">
                <NavLink to="/" end className={linkClass}>
                  {t("nav.dashboard")}
                </NavLink>
                <NavLink to="/manage" className={linkClass}>
                  {t("nav.manage")}
                </NavLink>
                <NavLink to="/history" className={linkClass}>
                  {t("nav.history")}
                </NavLink>
              </nav>

              <div className="ml-1">
                <LanguageToggle />
              </div>

              <div className="ml-1 flex items-center gap-1.5">
                <NavLink
                  to="/profile"
                  className="text-xs text-gray-500 hidden sm:inline hover:text-violet-600 transition-colors cursor-pointer"
                >
                  {user?.name}
                </NavLink>
                <button
                  onClick={logout}
                  className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors"
                >
                  {t("auth.logout")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 relative z-10">
        <Outlet />
      </main>
    </div>
  );
}
