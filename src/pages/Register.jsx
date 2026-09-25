import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import LanguageToggle from "../components/LanguageToggle";

export default function Register() {
  const { t, i18n } = useTranslation();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!/^\d{8}$/.test(studentId)) {
      setError(t("auth.invalidStudentId"));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(t("auth.invalidEmail"));
      return;
    }
    if (password.length < 4) {
      setError(t("auth.passwordTooShort"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("auth.passwordMismatch"));
      return;
    }

    setLoading(true);
    try {
      await register(name, studentId, password, email);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen aurora-bg flex flex-col items-center justify-center px-4">
      <div className="absolute top-4 right-4 z-10">
        <LanguageToggle />
      </div>

      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-8">
          <span className="text-5xl">🎲</span>
          <h1 className="mt-3 text-2xl font-bold bg-gradient-to-r from-violet-600 via-fuchsia-500 to-amber-500 bg-clip-text text-transparent">
            {t("appName")}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {i18n.language === "th"
              ? "สาขาวิชาการสอนภาษาอังกฤษ สำนักวิชาศึกษาศาสตร์"
              : "English Language Teaching, School of Education"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/80 backdrop-blur-md rounded-xl border border-violet-100 p-6 space-y-4 shadow-lg shadow-violet-100/50">
          <h2 className="text-lg font-semibold text-gray-900">{t("auth.register")}</h2>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("auth.name")}</label>
            <input
              type="text"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("auth.studentId")}</label>
            <input
              type="text"
              className="input"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="12345678"
              maxLength={8}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("auth.email")}</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("auth.emailPlaceholder")}
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("auth.confirmPassword")}</label>
            <input
              type="password"
              className="input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-lg text-sm font-medium text-white btn-gradient disabled:opacity-50 transition-all hover:shadow-md hover:shadow-violet-200"
          >
            {loading ? t("auth.registering") : t("auth.register")}
          </button>

          <p className="text-sm text-center text-gray-500">
            {t("auth.hasAccount")}{" "}
            <Link to="/login" className="text-violet-600 hover:text-fuchsia-600 font-medium transition-colors">
              {t("auth.login")}
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
