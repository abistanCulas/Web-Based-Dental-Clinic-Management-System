import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Phone,
  ShieldCheck,
  User,
  XCircle,
} from "lucide-react";

import Logo from "../../components/icons/Logo.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useLanguage } from "../../context/LanguageContext.jsx";
import { useNotifications } from "../../context/NotificationContext.jsx";
import authApi from "../../api/auth.js";

import registerHero from "../../assets/register_hero.png";

import "./Register.css";

export default function Register() {
  const { addToast } = useNotifications();
  const { loginWithGoogle, loginWithToken } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [step, setStep] = useState("form");
  const [googleLoading, setGoogleLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirm: "",
  });

  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [otp, setOtp] = useState([
    "",
    "",
    "",
    "",
    "",
    "",
  ]);

  const [otpTimer, setOtpTimer] = useState(300);
  const [resendCooldown, setResendCooldown] = useState(60);

  const otpInputsRef = useRef([]);

  useEffect(() => {
    if (step !== "otp" || otpTimer <= 0) return;

    const timer = setTimeout(() => {
      setOtpTimer((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [step, otpTimer]);

  useEffect(() => {
    if (step !== "otp" || resendCooldown <= 0) return;

    const timer = setTimeout(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [step, resendCooldown]);

  useEffect(() => {
    if (step === "otp") {
      const timer = setTimeout(() => {
        otpInputsRef.current[0]?.focus();
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [step]);

  // Handle incoming OAuth 2.0 redirect parameters if redirected to /register
  useEffect(() => {
    const code = searchParams.get("code");
    const token = searchParams.get("token");
    const oauthError = searchParams.get("error");
    const errorDesc = searchParams.get("error_description");

    if (oauthError) {
      const msg =
        oauthError === "access_denied"
          ? "Google registration was cancelled."
          : errorDesc || oauthError || "Google registration failed.";
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
      }, 0);
      setSearchParams({}, { replace: true });
      loginWithToken(token)
        .then((result) => {
          if (result.success) {
            addToast("Account created with Google successfully! Welcome to DentaFlow.", "success");
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
        });
      return;
    }

    if (code) {
      setTimeout(() => {
        setGoogleLoading(true);
      }, 0);
      setSearchParams({}, { replace: true });

      const redirectUri = window.location.origin + "/register";

      loginWithGoogle({ code, redirectUri, mode: "register" })
        .then((result) => {
          if (result.success) {
            addToast("Account created with Google successfully! Welcome to DentaFlow.", "success");
            navigate(result.redirect);
          } else {
            setError(result.error);
            addToast(result.error, "error");
          }
        })
        .catch((err) => {
          const message = err.message || "Failed to complete Google registration.";
          setError(message);
          addToast(message, "error");
        })
        .finally(() => {
          setGoogleLoading(false);
        });
    }
  }, [searchParams, setSearchParams, loginWithGoogle, loginWithToken, navigate, addToast]);

  const updateField = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (error) {
      setError("");
    }
  };

  const passwordStrength = () => {
    const password = form.password;

    if (!password) {
      return {
        width: "0%",
        className: "",
        label: "",
      };
    }

    if (password.length < 6) {
      return {
        width: "25%",
        className: "weak",
        label: "Weak password",
      };
    }

    if (
        password.length >= 8 &&
        /[A-Z]/.test(password) &&
        /[0-9]/.test(password)
    ) {
      return {
        width: "100%",
        className: "strong",
        label: "Strong password",
      };
    }

    return {
      width: "60%",
      className: "medium",
      label: "Medium password",
    };
  };

  const strength = passwordStrength();

  const formatTimer = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remaining = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(
        remaining
    ).padStart(2, "0")}`;
  };

  /* =========================================================
     STEP 1 — SEND OTP
     ========================================================= */

  const handleFormSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const phone = form.phone.trim();

    if (!name) {
      const message = "Please enter your full name.";
      setError(message);
      addToast(message, "warning");
      return;
    }

    if (!email) {
      const message = "Please enter your email address.";
      setError(message);
      addToast(message, "warning");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      const message = "Please enter a valid email address.";
      setError(message);
      addToast(message, "warning");
      return;
    }

    if (form.password.length < 6) {
      const message =
          "Password must contain at least 6 characters.";

      setError(message);
      addToast(message, "error");
      return;
    }

    if (form.password !== form.confirm) {
      const message = "Passwords do not match.";

      setError(message);
      addToast(message, "error");
      return;
    }

    setLoading(true);

    try {
      const response =
          await authApi.sendRegistrationOtp(email);

      addToast(
          response.message ||
          "Verification code sent to your email!",
          "success"
      );

      setStep("otp");
      setOtp(["", "", "", "", "", ""]);
      setOtpTimer(300);
      setResendCooldown(60);
    } catch (err) {
      const message =
          err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          "Failed to send verification code.";

      setError(message);
      addToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     OTP INPUT
     ========================================================= */

  const handleOtpChange = (index, value) => {
    if (error) {
      setError("");
    }

    const cleaned = value.replace(/\D/g, "");

    if (cleaned.length > 1) {
      const digits = cleaned.slice(0, 6).split("");
      const nextOtp = [...otp];

      digits.forEach((digit, i) => {
        nextOtp[i] = digit;
      });

      setOtp(nextOtp);

      const focusIndex = Math.min(digits.length, 5);
      otpInputsRef.current[focusIndex]?.focus();

      return;
    }

    const nextOtp = [...otp];

    nextOtp[index] = cleaned;

    setOtp(nextOtp);

    if (cleaned && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, event) => {
    if (
        event.key === "Backspace" &&
        !otp[index] &&
        index > 0
    ) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (event) => {
    event.preventDefault();

    const pasted = event.clipboardData
        .getData("text")
        .replace(/\D/g, "")
        .slice(0, 6);

    if (!pasted) return;

    const nextOtp = [...otp];

    pasted.split("").forEach((digit, index) => {
      nextOtp[index] = digit;
    });

    setOtp(nextOtp);

    const focusIndex = Math.min(pasted.length, 5);
    otpInputsRef.current[focusIndex]?.focus();
  };

  /* =========================================================
     STEP 2 — VERIFY OTP
     ========================================================= */

  const handleOtpSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const otpString = otp.join("");

    if (otpString.length !== 6) {
      const message =
          "Please enter the complete 6-digit verification code.";

      setError(message);
      addToast(message, "warning");
      return;
    }

    if (otpTimer === 0) {
      const message =
          "Verification code has expired. Please click Resend Code.";

      setError(message);
      addToast(message, "warning");
      return;
    }

    const nameParts = form.name.trim().split(/\s+/);

    const firstName = nameParts[0] || "User";

    const lastName =
        nameParts.slice(1).join(" ") ||
        nameParts[0] ||
        "Patient";

    setLoading(true);

    try {
      const payload = {
        firstName,
        lastName,
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        password: form.password,
        role: "PATIENT",
        otp: otpString,
      };

      const response =
          await authApi.verifyRegistrationOtp(payload);

      if (
          response.success ||
          response.id ||
          response.userId
      ) {
        addToast(
            "Account created successfully!",
            "success"
        );

        setStep("success");
      } else {
        const message =
            response.message ||
            response.error ||
            "Verification failed.";

        setError(message);
        addToast(message, "error");
      }
    } catch (err) {
      const message =
          err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          "Invalid or expired verification code.";

      setError(message);
      addToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     RESEND OTP
     ========================================================= */

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || loading) {
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response =
          await authApi.resendRegistrationOtp(
              form.email.trim().toLowerCase()
          );

      addToast(
          response.message ||
          "A new verification code has been sent!",
          "success"
      );

      setOtp(["", "", "", "", "", ""]);
      setOtpTimer(300);
      setResendCooldown(60);

      otpInputsRef.current[0]?.focus();
    } catch (err) {
      const message =
          err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          "Failed to resend code.";

      setError(message);
      addToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setError("");
    setGoogleLoading(true);

    try {
      let clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      let redirectUri = import.meta.env.VITE_GOOGLE_REGISTER_REDIRECT_URI || import.meta.env.VITE_GOOGLE_REDIRECT_URI || (window.location.origin + "/login");

      if (!clientId) {
        const config = await authApi.getGoogleConfig();
        if (config?.configured && config?.clientId) {
          clientId = config.clientId;
          if (config.redirectUri && !import.meta.env.VITE_GOOGLE_REGISTER_REDIRECT_URI) {
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

      // Generate state starting with register_ for intent identification
      const state = "register_" + Math.random().toString(36).substring(2) + Date.now().toString(36);
      sessionStorage.setItem("df_oauth_state", state);
      sessionStorage.setItem("df_oauth_mode", "register");

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
      const message = err.message || "Failed to initialize Google registration.";
      setError(message);
      addToast(message, "error");
      setGoogleLoading(false);
    }
  };

  /* =========================================================
     SUCCESS SCREEN
     ========================================================= */

  if (step === "success") {
    return (
        <main className="df-register-success-page">
          <section className="df-register-success-card">

            <div className="df-register-success-icon">
              <CheckCircle2 size={36} />
            </div>

            <span className="df-register-success-label">
            REGISTRATION COMPLETE
          </span>

            <h1>Account Created Successfully</h1>

            <p>
              Your DentaFlow patient account has been
              verified successfully. You can now sign in
              to access your digital records and book
              appointments.
            </p>

            <button
                type="button"
                className="df-register-primary-btn"
                onClick={() => navigate("/login")}
            >
              Proceed to Sign In
              <ArrowRight size={17} />
            </button>

          </section>
        </main>
    );
  }

  return (
      <main className="df-register-page">

        <div className="df-register-shell">

          {/* =====================================================
            LEFT VISUAL
        ====================================================== */}

          <section className="df-register-visual">

            <img
                src={registerHero}
                alt="DentaFlow patient registration"
                className="df-register-visual-image"
            />

            <div className="df-register-visual-overlay" />

            <div className="df-register-visual-content">

              {/* Brand */}
              <div className="df-register-brand">

                <div className="df-register-brand-logo">
                  <Logo showText={false} size={38} />
                </div>

                <div>
                  <strong>DentaFlow</strong>
                  <span>
                  Smart Dental Care for Everyone
                </span>
                </div>

              </div>

              {/* Eyebrow */}
              <div className="df-register-eyebrow">
                <ShieldCheck size={15} />
                <span>SECURE PATIENT REGISTRATION</span>
              </div>

              {/* Heading */}
              <div className="df-register-welcome">

                <h1>
                  Start Your
                  <span>Healthy Smile Journey</span>
                </h1>

                <p>
                  Create your DentaFlow patient account and
                  manage appointments, dental records and
                  healthcare information securely.
                </p>

              </div>

              {/* Benefits */}
              <div className="df-register-benefits">

                <div className="df-register-benefit">

                  <div className="df-register-benefit-icon">
                    <CheckCircle2 size={18} />
                  </div>

                  <div>
                    <strong>Easy Online Booking</strong>
                    <span>
                    Book appointments anytime
                  </span>
                  </div>

                </div>

                <div className="df-register-benefit">

                  <div className="df-register-benefit-icon">
                    <ShieldCheck size={18} />
                  </div>

                  <div>
                    <strong>Secure Health Records</strong>
                    <span>
                    Your information stays protected
                  </span>
                  </div>

                </div>

                <div className="df-register-benefit">

                  <div className="df-register-benefit-icon">
                    <HeartIcon />
                  </div>

                  <div>
                    <strong>Patient-Focused Care</strong>
                    <span>
                    Healthcare made easier
                  </span>
                  </div>

                </div>

              </div>

              <div className="df-register-slogan">
                <span>Healthy Smiles</span>
                <b>•</b>
                <span>Happier Lives</span>
              </div>

            </div>

          </section>


          {/* =====================================================
            RIGHT FORM
        ====================================================== */}

          <section className="df-register-form-side">

            <div className="df-register-card">

              {/* =================================================
                FORM STEP
            ================================================= */}

              {step === "form" && (
                  <>

                    <div className="df-register-heading">

                  <span className="df-register-form-eyebrow">
                    CREATE ACCOUNT
                  </span>

                      <h2>Create Your Account</h2>

                      <p>
                        Sign up to book appointments and
                        manage your dental care.
                      </p>

                    </div>


                    {error && (
                        <div className="df-register-error">
                          <XCircle size={17} />
                          <span>{error}</span>
                          {error.toLowerCase().includes("login") && (
                            <Link
                              to="/login"
                              style={{
                                marginLeft: "8px",
                                fontWeight: "600",
                                textDecoration: "underline",
                                color: "inherit",
                              }}
                            >
                              Login here
                            </Link>
                          )}
                        </div>
                    )}


                    <form
                        onSubmit={handleFormSubmit}
                        className="df-register-form"
                    >

                      {/* Full Name */}
                      <div className="df-register-field">

                        <label htmlFor="register-name">
                          Full Name
                        </label>

                        <div className="df-register-input-wrap">

                          <User size={18} />

                          <input
                              id="register-name"
                              type="text"
                              value={form.name}
                              onChange={(e) =>
                                  updateField(
                                      "name",
                                      e.target.value
                                  )
                              }
                              placeholder="Enter your full name"
                              disabled={loading}
                              autoComplete="name"
                          />

                        </div>

                      </div>


                      {/* Email */}
                      <div className="df-register-field">

                        <label htmlFor="register-email">
                          Email Address
                        </label>

                        <div className="df-register-input-wrap">

                          <Mail size={18} />

                          <input
                              id="register-email"
                              type="email"
                              value={form.email}
                              onChange={(e) =>
                                  updateField(
                                      "email",
                                      e.target.value
                                  )
                              }
                              placeholder="you@example.com"
                              disabled={loading}
                              autoComplete="email"
                          />

                        </div>

                      </div>


                      {/* Phone */}
                      <div className="df-register-field">

                        <label htmlFor="register-phone">
                          Phone Number
                        </label>

                        <div className="df-register-input-wrap">

                          <Phone size={18} />

                          <input
                              id="register-phone"
                              type="tel"
                              value={form.phone}
                              onChange={(e) =>
                                  updateField(
                                      "phone",
                                      e.target.value
                                  )
                              }
                              placeholder="+94 XX XXX XXXX"
                              disabled={loading}
                              autoComplete="tel"
                          />

                        </div>

                      </div>


                      {/* Password */}
                      <div className="df-register-field">

                        <label htmlFor="register-password">
                          Password
                        </label>

                        <div className="df-register-input-wrap">

                          <LockKeyhole size={18} />

                          <input
                              id="register-password"
                              type={
                                showPw
                                    ? "text"
                                    : "password"
                              }
                              value={form.password}
                              onChange={(e) =>
                                  updateField(
                                      "password",
                                      e.target.value
                                  )
                              }
                              placeholder="At least 6 characters"
                              disabled={loading}
                              autoComplete="new-password"
                          />

                          <button
                              type="button"
                              className="df-register-password-toggle"
                              onClick={() =>
                                  setShowPw(
                                      (prev) => !prev
                                  )
                              }
                              disabled={loading}
                              aria-label={
                                showPw
                                    ? "Hide password"
                                    : "Show password"
                              }
                          >
                            {showPw ? (
                                <EyeOff size={17} />
                            ) : (
                                <Eye size={17} />
                            )}
                          </button>

                        </div>


                        {/* Password strength */}
                        <div className="df-password-strength">

                          <div className="df-password-track">

                        <span
                            className={`df-password-bar ${strength.className}`}
                            style={{
                              width: strength.width,
                            }}
                        />

                          </div>

                          {strength.label && (
                              <small>
                                {strength.label}
                              </small>
                          )}

                        </div>

                      </div>


                      {/* Confirm Password */}
                      <div className="df-register-field">

                        <label htmlFor="register-confirm">
                          Confirm Password
                        </label>

                        <div className="df-register-input-wrap">

                          <LockKeyhole size={18} />

                          <input
                              id="register-confirm"
                              type={
                                showConfirm
                                    ? "text"
                                    : "password"
                              }
                              value={form.confirm}
                              onChange={(e) =>
                                  updateField(
                                      "confirm",
                                      e.target.value
                                  )
                              }
                              placeholder="Confirm your password"
                              disabled={loading}
                              autoComplete="new-password"
                          />

                          <button
                              type="button"
                              className="df-register-password-toggle"
                              onClick={() =>
                                  setShowConfirm(
                                      (prev) => !prev
                                  )
                              }
                              disabled={loading}
                              aria-label={
                                showConfirm
                                    ? "Hide password"
                                    : "Show password"
                              }
                          >
                            {showConfirm ? (
                                <EyeOff size={17} />
                            ) : (
                                <Eye size={17} />
                            )}
                          </button>

                        </div>

                      </div>


                      {/* Submit */}
                      <button
                          type="submit"
                          className="df-register-primary-btn df-register-submit"
                          disabled={loading}
                      >
                        {loading
                            ? "Sending Verification Code..."
                            : "Create Patient Account"}

                        {!loading && (
                            <ArrowRight size={17} />
                        )}
                      </button>


                      {/* Divider */}
                      <div className="df-register-divider">
                        <span />
                        <strong>OR</strong>
                        <span />
                      </div>


                      {/* Google */}
                      <button
                          type="button"
                          className="df-register-google-btn"
                          onClick={handleGoogleRegister}
                          disabled={loading || googleLoading}
                      >
                        <GoogleIcon />
                        <span>{googleLoading ? "Connecting to Google..." : "Continue with Google"}</span>
                      </button>

                    </form>


                    {/* Login */}
                    <div className="df-register-footer">

                  <span>
                    Already have an account?
                  </span>

                      <Link to="/login">
                        Sign In
                        <ArrowRight size={14} />
                      </Link>

                    </div>


                    {/* Security */}
                    <div className="df-register-security-note">

                      <ShieldCheck size={15} />

                      <span>
                    Your account information is securely
                    protected.
                  </span>

                    </div>

                  </>
              )}


              {/* =================================================
                OTP STEP
            ================================================= */}

              {step === "otp" && (
                  <div className="df-register-otp">

                    <div className="df-register-otp-icon">
                      <Mail size={28} />
                    </div>

                    <span className="df-register-form-eyebrow">
                  EMAIL VERIFICATION
                </span>

                    <h2>Verify Your Email</h2>

                    <p>
                      We've sent a 6-digit verification code
                      to{" "}
                      <strong>{form.email}</strong>
                    </p>


                    {error && (
                        <div className="df-register-error">
                          <XCircle size={17} />
                          <span>{error}</span>
                        </div>
                    )}


                    {/* Timer */}
                    <div className="df-register-otp-timer">

                      {otpTimer > 0 ? (
                          <>
                            Code expires in{" "}
                            <strong>
                              {formatTimer(otpTimer)}
                            </strong>
                          </>
                      ) : (
                          <span className="expired">
                      Verification code expired
                    </span>
                      )}

                    </div>


                    <form onSubmit={handleOtpSubmit}>

                      <div
                          className="df-register-otp-inputs"
                          onPaste={handleOtpPaste}
                      >
                        {otp.map((digit, index) => (
                            <input
                                key={index}
                                ref={(element) => {
                                  otpInputsRef.current[index] =
                                      element;
                                }}
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                value={digit}
                                onChange={(e) =>
                                    handleOtpChange(
                                        index,
                                        e.target.value
                                    )
                                }
                                onKeyDown={(e) =>
                                    handleOtpKeyDown(
                                        index,
                                        e
                                    )
                                }
                                disabled={
                                    loading ||
                                    otpTimer === 0
                                }
                                aria-label={`Verification digit ${
                                    index + 1
                                }`}
                            />
                        ))}
                      </div>


                      <button
                          type="submit"
                          className="df-register-primary-btn df-register-submit"
                          disabled={
                              loading ||
                              otp.join("").length !== 6 ||
                              otpTimer === 0
                          }
                      >
                        {loading
                            ? "Creating Account..."
                            : "Verify & Create Account"}

                        {!loading && (
                            <ArrowRight size={17} />
                        )}
                      </button>


                      <div className="df-register-otp-actions">

                        <button
                            type="button"
                            onClick={() => {
                              setStep("form");
                              setError("");
                            }}
                            disabled={loading}
                        >
                          ← Edit Information
                        </button>

                        <button
                            type="button"
                            onClick={handleResendOtp}
                            disabled={
                                resendCooldown > 0 ||
                                loading
                            }
                        >
                          {resendCooldown > 0
                              ? `Resend (${resendCooldown}s)`
                              : "Resend Code"}
                        </button>

                      </div>

                    </form>


                    <div className="df-register-footer">

                  <span>
                    Already registered?
                  </span>

                      <Link to="/login">
                        Sign In
                        <ArrowRight size={14} />
                      </Link>

                    </div>

                  </div>
              )}

            </div>

          </section>

        </div>

      </main>
  );
}


/* =========================================================
   ICONS
   ========================================================= */

function HeartIcon() {
  return (
      <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
  );
}

function GoogleIcon() {
  return (
      <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
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