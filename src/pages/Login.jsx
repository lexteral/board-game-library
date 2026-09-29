import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import LanguageToggle from "../components/LanguageToggle";
import ThemeToggle from "../components/ThemeToggle";
import PageTitle from "../components/PageTitle";

export default function Login() {
  const { t, i18n } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(studentId, password);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen aurora-bg flex flex-col items-center justify-center px-4 py-16" data-world="blue">
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <ThemeToggle />
        <LanguageToggle />
      </div>

      <div className="w-full max-w-sm relative z-10 pop-in">
        <div className="text-center mb-8">
          <span className="wiggle inline-grid place-items-center w-16 h-16 rounded-3xl bg-amber-100 text-4xl">🎲</span>
          <PageTitle className="mt-5">{t("appName")}</PageTitle>
          <p className="text-sm text-gray-500 mt-4">
            {i18n.language === "th"
              ? "สาขาวิชาการสอนภาษาอังกฤษ สำนักวิชาศึกษาศาสตร์"
              : "English Language Teaching, School of Education"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/80 backdrop-blur-md rounded-2xl border-2 border-gray-100 p-7 space-y-4 shadow-xl shadow-violet-100/40">
          <h2 className="text-lg font-semibold text-gray-900">{t("auth.login")}</h2>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("auth.studentId")}</label>
            <input
              type="text"
              className="input"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="12345678"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("auth.password")}</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-lg text-sm font-medium text-white btn-gradient disabled:opacity-50 transition-all hover:shadow-md hover:shadow-violet-200"
          >
            {loading ? t("auth.loggingIn") : t("auth.login")}
          </button>

          <p className="text-sm text-center text-gray-500">
            {t("auth.noAccount")}{" "}
            <Link to="/register" className="text-violet-600 hover:text-fuchsia-600 font-medium transition-colors">
              {t("auth.register")}
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
