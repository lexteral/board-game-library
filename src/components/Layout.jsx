import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import LanguageToggle from "./LanguageToggle";
import ThemeToggle from "./ThemeToggle";

const WORLDS = { "/": "blue", "/manage": "orange", "/history": "pink", "/profile": "green" };

export default function Layout() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const { pathname } = useLocation();

  const linkClass = ({ isActive }) =>
    `px-4 py-1.5 rounded-full text-sm font-bold transition-all whitespace-nowrap ${
      isActive
        ? "bg-gray-900 text-[var(--bg)]"
        : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
    }`;

  return (
    <div className="min-h-screen aurora-bg" data-world={WORLDS[pathname] || "periwinkle"}>
      <header className="bg-white/80 backdrop-blur-md border-b-2 border-gray-100 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <NavLink to="/" className="flex items-center gap-2.5 min-w-0">
              <span className="wiggle text-2xl shrink-0 w-10 h-10 rounded-2xl bg-amber-100 grid place-items-center" role="img" aria-label="dice">
                🎲
              </span>
              <div className="min-w-0">
                <span className="headline text-lg block">{t("appName")}.</span>
                <span className="text-xs text-gray-500 leading-tight hidden sm:block truncate">
                  {i18n.language === "th"
                    ? "สาขาวิชาการสอนภาษาอังกฤษ สำนักวิชาศึกษาศาสตร์"
                    : "English Language Teaching, School of Education"}
                </span>
              </div>
            </NavLink>

            <div className="flex items-center gap-2 shrink-0">
              <ThemeToggle />
              <LanguageToggle />
              <NavLink
                to="/profile"
                className="text-sm font-semibold text-gray-600 hidden md:inline hover:text-violet-600 transition-colors"
              >
                {user?.name}
              </NavLink>
              <button
                onClick={logout}
                className="px-3 py-1.5 rounded-full border-2 border-gray-200 text-xs font-bold text-gray-600 hover:text-fuchsia-600 hover:border-fuchsia-200 hover:bg-fuchsia-50 transition-colors"
              >
                {t("auth.logout")}
              </button>
            </div>
          </div>

          <nav className="flex items-center gap-1 mt-3 -mx-1 overflow-x-auto scrollbar-hide">
            <NavLink to="/" end className={linkClass}>{t("nav.dashboard")}</NavLink>
            <NavLink to="/manage" className={linkClass}>{t("nav.manage")}</NavLink>
            <NavLink to="/history" className={linkClass}>{t("nav.history")}</NavLink>
            <NavLink to="/profile" className={linkClass}>{t("profile.title")}</NavLink>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10 sm:py-14 relative z-10">
        <Outlet />
      </main>
    </div>
  );
}
