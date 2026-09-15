import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../../components/icons/Logo";
import { useAuth, DEMO_USERS } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { useNotifications } from "../../context/NotificationContext";
import "./auth.css";

export default function Login() {
  const { login } = useAuth();
  const { t } = useLanguage();
  const { addToast } = useNotifications();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const result = await login(email, password);
      if (result.success) {
        addToast("Logged in successfully", "success");
        navigate(result.redirect);
      } else {
        setError(result.error);
        addToast(result.error, "error");
      }
    } catch (err) {
      const msg = err.message || "An unexpected error occurred";
      setError(msg);
      addToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="df-auth-page">
      <div className="df-auth-brand">
        <Logo size={56} variant="light" />
        <h2>Advanced Dental Care</h2>
        <p>Sign in to manage appointments, view records, and access your personalized dental dashboard.</p>
      </div>
      <div className="df-auth-form-side">
        <div className="df-auth-card">
          <h1>{t("auth.loginTitle")}</h1>
          <p>{t("auth.loginSubtitle")}</p>
          {error && <div className="df-alert df-alert-error" style={{ marginBottom: 16 }}>{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="df-form-group">
              <label className="df-label">Email</label>
              <input
                className="df-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                required
                disabled={submitting}
              />
            </div>
            <div className="df-form-group df-pw-toggle">
              <label className="df-label">Password</label>
              <input
                className="df-input"
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={submitting}
              />
              <button
                type="button"
                className="df-pw-toggle-btn"
                onClick={() => setShowPw(!showPw)}
                disabled={submitting}
              >
                {showPw ? "Hide" : "Show"}
              </button>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  disabled={submitting}
                />
                {t("auth.rememberMe")}
              </label>
              <Link to="/forgot-password" style={{ fontSize: 13, color: "var(--df-primary-500)", fontWeight: 600 }}>
                {t("auth.forgotPassword")}
              </Link>
            </div>
            <button type="submit" className="df-btn df-btn-primary df-btn-block df-btn-lg" disabled={submitting}>
              {submitting ? t("common.loading") : "Login"}
            </button>
          </form>
          <div className="df-auth-footer">
            {t("auth.noAccount")} <Link to="/register">Register</Link>
          </div>
          <div className="df-demo-accounts">
            <strong>Demo Accounts (click to fill)</strong>
            {Object.entries(DEMO_USERS).map(([e, u]) => (
              <div
                key={e}
                style={{ cursor: "pointer" }}
                onClick={() => {
                  setEmail(e);
                  setPassword(u.password || "demo123");
                }}
              >
                {u.role}: {e}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
