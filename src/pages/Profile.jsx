import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";

export default function Profile() {
  const { t } = useTranslation();
  const { user, setUser, authFetch } = useAuth();

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [profileMsg, setProfileMsg] = useState("");
  const [profileError, setProfileError] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwMsg, setPwMsg] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  async function handleProfileSubmit(e) {
    e.preventDefault();
    setProfileMsg("");
    setProfileError("");
    if (!name.trim() || !email.trim()) {
      setProfileError(t("profile.allFieldsRequired"));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setProfileError(t("auth.invalidEmail"));
      return;
    }
    setProfileLoading(true);
    try {
      const res = await authFetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUser(data);
      setProfileMsg(t("profile.updateSuccess"));
    } catch (err) {
      setProfileError(err.message);
    } finally {
      setProfileLoading(false);
    }
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setPwMsg("");
    setPwError("");
    if (!currentPassword || !newPassword) {
      setPwError(t("profile.allFieldsRequired"));
      return;
    }
    if (newPassword.length < 4) {
      setPwError(t("auth.passwordTooShort"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError(t("auth.passwordMismatch"));
      return;
    }
    setPwLoading(true);
    try {
      const res = await authFetch("/api/auth/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPwMsg(t("profile.passwordSuccess"));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPwError(err.message);
    } finally {
      setPwLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-600 via-fuchsia-500 to-amber-500 bg-clip-text text-transparent">
        {t("profile.title")}
      </h1>

      <form onSubmit={handleProfileSubmit} className="bg-white/80 backdrop-blur-md rounded-xl border border-violet-100 p-6 space-y-4 shadow-lg shadow-violet-100/50">
        <h2 className="text-lg font-semibold text-gray-900">{t("profile.editInfo")}</h2>

        {profileMsg && <div className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">{profileMsg}</div>}
        {profileError && <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{profileError}</div>}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t("auth.studentId")}</label>
          <input
            type="text"
            className="input bg-gray-50 cursor-not-allowed"
            value={user?.studentId || ""}
            disabled
          />
        </div>

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

        <button
          type="submit"
          disabled={profileLoading}
          className="w-full py-2.5 px-4 rounded-lg text-sm font-medium text-white btn-gradient disabled:opacity-50 transition-all hover:shadow-md hover:shadow-violet-200"
        >
          {profileLoading ? t("profile.saving") : t("profile.saveChanges")}
        </button>
      </form>

      <form onSubmit={handlePasswordSubmit} className="bg-white/80 backdrop-blur-md rounded-xl border border-violet-100 p-6 space-y-4 shadow-lg shadow-violet-100/50">
        <h2 className="text-lg font-semibold text-gray-900">{t("profile.changePassword")}</h2>

        {pwMsg && <div className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">{pwMsg}</div>}
        {pwError && <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{pwError}</div>}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t("profile.currentPassword")}</label>
          <input
            type="password"
            className="input"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t("profile.newPassword")}</label>
          <input
            type="password"
            className="input"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
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
          disabled={pwLoading}
          className="w-full py-2.5 px-4 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 disabled:opacity-50 transition-all hover:shadow-md rounded-lg"
        >
          {pwLoading ? t("profile.saving") : t("profile.resetPassword")}
        </button>
      </form>
    </div>
  );
}
