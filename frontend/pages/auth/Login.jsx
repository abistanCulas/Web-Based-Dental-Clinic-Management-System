import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react";

import Logo from "../../components/icons/Logo.jsx";
import {
  useAuth,
  DEMO_USERS,
} from "../../context/AuthContext.jsx";
import { useNotifications } from "../../context/NotificationContext.jsx";
import authApi from "../../api/auth.js";

import clinicBanner from "../../assets/clinic_reception_banner.png";

import "./Login.css";

const ROLE_DEMO_LABELS = {
  "patient@dentaflow.com": "Patient",
  "dentist@dentaflow.com": "Doctor",
  "receptionist@dentaflow.com": "Receptionist",
  "pharmacist@dentaflow.com": "Pharmacist",
  "cashier@dentaflow.com": "Cashier",
  "admin@dentaflow.com": "Admin",
};

export default function Login() {
  const { login, loginWithGoogle, loginWithToken } = useAuth();
  const { addToast } = useNotifications();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Handle incoming OAuth 2.0 redirect parameters (code, token, or error)
  useEffect(() => {
    const code = searchParams.get("code");
    const token = searchParams.get("token");
    const oauthError = searchParams.get("error");
    const errorDesc = searchParams.get("error_description");

    if (oauthError) {
      const msg =
        oauthError === "access_denied"
          ? "Google sign-in was cancelled."
          : errorDesc || oauthError || "Google authentication failed.";
      setTimeout(() => {
        setError(msg);
        addToast(msg, "error");
      }, 0);
      setSearchParams({}, { replace: true });
      return;
    }

    if (token) {
      setTimeout(() => {
        setGoogleLoading(true);
        setSubmitting(true);
      }, 0);
      setSearchParams({}, { replace: true });
      loginWithToken(token)
        .then((result) => {
          if (result.success) {
            addToast("Logged in with Google successfully", "success");
            navigate(result.redirect);
          } else {
            setError(result.error);
            addToast(result.error, "error");
          }
        })
        .catch((err) => {
          const message = err.message || "Failed to authenticate with Google.";
          setError(message);
          addToast(message, "error");
        })
        .finally(() => {
          setGoogleLoading(false);
          setSubmitting(false);
        });
      return;
    }

    if (code) {
      setTimeout(() => {
        setGoogleLoading(true);
        setSubmitting(true);
      }, 0);

      const stateParam = searchParams.get("state") || "";
      const storedMode = sessionStorage.getItem("df_oauth_mode");
      const mode = (stateParam.startsWith("register_") || storedMode === "register") ? "register" : "login";

      sessionStorage.removeItem("df_oauth_mode");
      setSearchParams({}, { replace: true });

      const redirectUri = window.location.origin + "/login";

      loginWithGoogle({ code, redirectUri, mode })
        .then((result) => {
          if (result.success) {
            const successMsg = mode === "register"
              ? "Account created with Google successfully! Welcome to DentaFlow."
              : "Logged in with Google successfully";
            addToast(successMsg, "success");
            navigate(result.redirect);
          } else {
            setError(result.error);
            addToast(result.error, "error");
          }
        })
        .catch((err) => {
          const message = err.message || "Failed to authenticate with Google.";
          setError(message);
          addToast(message, "error");
        })
        .finally(() => {
          setGoogleLoading(false);
          setSubmitting(false);
        });
    }
  }, [searchParams, setSearchParams, loginWithGoogle, loginWithToken, navigate, addToast]);

  const handleSubmit = async (event) => {
    event.preventDefault();

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
      const message =
          err.message ||
          "An unexpected error occurred";

      setError(message);
      addToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setGoogleLoading(true);

    try {
      // Resolve Google Client ID and Redirect URI from frontend env or backend config
      let clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      let redirectUri = import.meta.env.VITE_GOOGLE_REDIRECT_URI || (window.location.origin + "/login");

      if (!clientId) {
        const config = await authApi.getGoogleConfig();
        if (config?.configured && config?.clientId) {
          clientId = config.clientId;
          if (config.redirectUri) {
            redirectUri = config.redirectUri;
          }
        }
      }

      if (!clientId) {
        const msg =
          "Google OAuth is not configured yet. Please set VITE_GOOGLE_CLIENT_ID or configure GOOGLE_CLIENT_ID on the backend.";
        setError(msg);
        addToast(msg, "error");
        setGoogleLoading(false);
        return;
      }

      // Generate state for CSRF protection and intent
      const state = "login_" + Math.random().toString(36).substring(2) + Date.now().toString(36);
      sessionStorage.setItem("df_oauth_state", state);
      sessionStorage.setItem("df_oauth_mode", "login");

      const params = new URLSearchParams({
        client_id: clientId.trim(),
        redirect_uri: redirectUri.trim(),
        response_type: "code",
        scope: "openid email profile",
        access_type: "offline",
        prompt: "select_account",
        state,
      });

      window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    } catch (err) {
      const message = err.message || "Failed to initialize Google authentication.";
      setError(message);
      addToast(message, "error");
      setGoogleLoading(false);
    }
  };

  const getDemoCredentials = (key, value) => {
    if (value && typeof value === "object") {
      return {
        email:
            value.email ||
            value.username ||
            key,
        password:
            value.password ||
            value.pass ||
            "",
      };
    }

    return {
      email: key,
      password:
          typeof value === "string"
              ? value
              : "",
    };
  };

  const handleDemoLogin = (key, value) => {
    const credentials = getDemoCredentials(
        key,
        value
    );

    setEmail(credentials.email);
    setPassword(credentials.password);
    setError("");

    addToast(
        `${ROLE_DEMO_LABELS[key] || "Demo"} account selected`,
        "info"
    );
  };

  return (
      <main className="df-login-page">

        <div className="df-login-shell">

          {/* =====================================================
            LEFT VISUAL PANEL
        ====================================================== */}

          <section className="df-login-visual">

            <img
                src={clinicBanner}
                alt="DentaFlow dental clinic"
                className="df-login-visual-image"
            />

            <div className="df-login-visual-overlay" />

            <div className="df-login-visual-content">

              {/* BRAND */}
              <div className="df-login-brand">

                <div className="df-login-brand-logo">
                  <Logo showText={false} size={32} />
                </div>

                <div>
                  <strong>DentaFlow</strong>
                  <span>Smart Dental Care for Everyone</span>
                </div>

              </div>


              {/* EYEBROW */}
              <div className="df-login-eyebrow">
                <Sparkles size={15} />
                <span>TRUSTED DENTAL CARE</span>
              </div>


              {/* WELCOME */}
              <div className="df-login-welcome">

                <h1>
                  Welcome
                  <span>Back!</span>
                </h1>

                <p>
                  Continue your journey to a healthier
                  smile with trusted professionals and
                  modern dental care.
                </p>

              </div>


              {/* BENEFITS */}
              <div className="df-login-benefits">

                <div className="df-login-benefit">

                  <div className="df-login-benefit-icon">
                    <CheckCircle2 size={18} />
                  </div>

                  <div>
                    <strong>Professional Care</strong>
                    <span>
                    Qualified dental professionals
                  </span>
                  </div>

                </div>


                <div className="df-login-benefit">

                  <div className="df-login-benefit-icon">
                    <ShieldCheck size={18} />
                  </div>

                  <div>
                    <strong>Secure & Private</strong>
                    <span>
                    Your dental information is protected
                  </span>
                  </div>

                </div>


                <div className="df-login-benefit">

                  <div className="df-login-benefit-icon">
                    <Sparkles size={18} />
                  </div>

                  <div>
                    <strong>Modern Experience</strong>
                    <span>
                    Simple and convenient dental care
                  </span>
                  </div>

                </div>

              </div>


              {/* REVIEWS */}
              <Link
                  to="/reviews"
                  className="df-login-review-link"
              >

                <div className="df-login-stars">
                  {[1, 2, 3, 4, 5].map(
                      (star) => (
                          <Star
                              key={star}
                              size={15}
                              fill="#ffd34d"
                              color="#ffd34d"
                          />
                      )
                  )}
                </div>

                <strong>
                  Read Our Patient Reviews
                </strong>

                <ArrowRight size={16} />

              </Link>


              {/* SLOGAN */}
              <div className="df-login-slogan">
                <span>Healthy Smiles</span>
                <b>•</b>
                <span>Happier Lives</span>
              </div>

            </div>

          </section>


          {/* =====================================================
            RIGHT LOGIN PANEL
        ====================================================== */}

          <section className="df-login-form-side">

            <div className="df-login-card">

              {/* HEADING */}
              <div className="df-login-heading">

              <span className="df-login-form-eyebrow">
                <LockKeyhole size={14} />
                SECURE ACCESS
              </span>

                <h2>Login to DentaFlow</h2>

                <p>
                  Access your account to manage
                  appointments, records and more.
                </p>

              </div>


              {/* ERROR */}
              {error && (
                  <div className="df-login-error">
                    <ShieldCheck size={17} />
                    <span>{error}</span>
                    {error.toLowerCase().includes("register") && (
                      <Link
                        to="/register"
                        style={{
                          marginLeft: "8px",
                          fontWeight: "600",
                          textDecoration: "underline",
                          color: "inherit",
                        }}
                      >
                        Register here
                      </Link>
                    )}
                  </div>
              )}


              {/* LOGIN FORM */}
              <form
                  className="df-login-form"
                  onSubmit={handleSubmit}
              >

                {/* EMAIL */}
                <div className="df-login-field">

                  <label htmlFor="login-email">
                    Email Address
                  </label>

                  <div className="df-login-input-wrap">

                    <Mail
                        size={18}
                        className="df-login-input-icon"
                    />

                    <input
                        id="login-email"
                        type="email"
                        value={email}
                        onChange={(event) => {
                          setEmail(event.target.value);

                          if (error) {
                            setError("");
                          }
                        }}
                        placeholder="you@example.com"
                        autoComplete="email"
                        disabled={submitting}
                        required
                    />

                  </div>

                </div>


                {/* PASSWORD */}
                <div className="df-login-field">

                  <div className="df-login-password-label">

                    <label htmlFor="login-password">
                      Password
                    </label>

                    <Link to="/forgot-password">
                      Forgot Password?
                    </Link>

                  </div>

                  <div className="df-login-input-wrap">

                    <LockKeyhole
                        size={18}
                        className="df-login-input-icon"
                    />

                    <input
                        id="login-password"
                        type={
                          showPw
                              ? "text"
                              : "password"
                        }
                        value={password}
                        onChange={(event) => {
                          setPassword(
                              event.target.value
                          );

                          if (error) {
                            setError("");
                          }
                        }}
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        disabled={submitting}
                        required
                    />

                    <button
                        type="button"
                        className="df-login-password-toggle"
                        onClick={() =>
                            setShowPw(
                                (previous) => !previous
                            )
                        }
                        disabled={submitting}
                        aria-label={
                          showPw
                              ? "Hide password"
                              : "Show password"
                        }
                    >
                      {showPw ? (
                          <EyeOff size={18} />
                      ) : (
                          <Eye size={18} />
                      )}
                    </button>

                  </div>

                </div>


                {/* REMEMBER */}
                <label className="df-login-remember">

                  <input
                      type="checkbox"
                      checked={remember}
                      onChange={(event) =>
                          setRemember(
                              event.target.checked
                          )
                      }
                      disabled={submitting}
                  />

                  <span>
                  Remember me
                </span>

                </label>


                {/* LOGIN BUTTON */}
                <button
                    type="submit"
                    className="df-login-primary-btn"
                    disabled={submitting}
                >

                  {submitting
                      ? "Logging in..."
                      : "Login"}

                  {!submitting && (
                      <ArrowRight size={18} />
                  )}

                </button>


                {/* DIVIDER */}
                <div className="df-login-divider">

                  <span />

                  <strong>OR</strong>

                  <span />

                </div>


                {/* GOOGLE */}
                <button
                    type="button"
                    className="df-login-google-btn"
                    onClick={handleGoogleLogin}
                    disabled={submitting || googleLoading}
                >

                  <GoogleIcon />

                  <span>
                  {googleLoading ? "Connecting to Google..." : "Continue with Google"}
                </span>

                </button>

              </form>


              {/* REGISTER */}
              <div className="df-login-register-row">

              <span>
                Don't have an account?
              </span>

                <Link to="/register">
                  Create an account
                  <ArrowRight size={15} />
                </Link>

              </div>


              {/* DEMO ACCOUNTS */}
              {DEMO_USERS &&
                  Object.keys(DEMO_USERS).length > 0 && (
                      <div className="df-login-demo">

                        <div className="df-login-demo-heading">

                          <span className="df-login-demo-dot" />

                          <strong>
                            Quick-Fill Demo Accounts
                          </strong>

                        </div>

                        <div className="df-login-demo-list">

                          {Object.entries(
                              DEMO_USERS
                          ).map(([key, value]) => (
                              <button
                                  type="button"
                                  key={key}
                                  onClick={() =>
                                      handleDemoLogin(
                                          key,
                                          value
                                      )
                                  }
                                  disabled={submitting}
                              >
                                {ROLE_DEMO_LABELS[key] ||
                                    key}
                              </button>
                          ))}

                        </div>

                      </div>
                  )}


              {/* SECURITY NOTE */}
              <div className="df-login-security">

                <ShieldCheck size={15} />

                <span>
                Your account information is securely
                protected.
              </span>

              </div>

            </div>

          </section>

        </div>

      </main>
  );
}


/* =========================================================
   GOOGLE ICON
   ========================================================= */

function GoogleIcon() {
  return (
      <svg
          width="19"
          height="19"
          viewBox="0 0 24 24"
          aria-hidden="true"
      >
        <path
            fill="#4285F4"
            d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
        />

        <path
            fill="#34A853"
            d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.26 21.36 7.36 24 12 24z"
        />

        <path
            fill="#FBBC05"
            d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.97 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
        />

        <path
            fill="#EA4335"
            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
        />
      </svg>
  );
}