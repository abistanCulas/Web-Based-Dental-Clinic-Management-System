import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../../components/icons/Logo";
import { useLanguage } from "../../context/LanguageContext";
import { useNotifications } from "../../context/NotificationContext";
import authApi from "../../api/auth";
import "./auth.css";

export default function Register() {
  const { t } = useLanguage();
  const { addToast } = useNotifications();
  const navigate = useNavigate();

  // Steps: "form" | "otp" | "success"
  const [step, setStep] = useState("form");
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // OTP state
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpTimer, setOtpTimer] = useState(300); // 5 minutes TTL
  const [resendCooldown, setResendCooldown] = useState(60); // 60s cooldown

  const otpInputsRef = useRef([]);

  // 5-minute expiry countdown
  useEffect(() => {
    if (step === "otp" && otpTimer > 0) {
      const id = setTimeout(() => setOtpTimer((prev) => prev - 1), 1000);
      return () => clearTimeout(id);
    }
  }, [step, otpTimer]);

  // 60-second resend cooldown timer
  useEffect(() => {
    if (step === "otp" && resendCooldown > 0) {
      const id = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
      return () => clearTimeout(id);
    }
  }, [step, resendCooldown]);

  // Auto-focus first OTP input when entering OTP step
  useEffect(() => {
    if (step === "otp" && otpInputsRef.current[0]) {
      otpInputsRef.current[0].focus();
    }
  }, [step]);

  const pwStrength = () => {
    const p = form.password;
    if (!p) return { width: "0%", color: "transparent" };
    if (p.length < 4) return { width: "20%", color: "var(--df-error)" };
    if (p.length < 8) return { width: "50%", color: "var(--df-warning)" };
    if (/[A-Z]/.test(p) && /[0-9]/.test(p)) return { width: "100%", color: "var(--df-success)" };
    return { width: "75%", color: "var(--df-primary-500)" };
  };

  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  // STEP 1: FORM SUBMIT -> VALIDATE & SEND REGISTRATION OTP
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) {
      setError("Please enter your full name.");
      addToast("Please enter your full name", "warning");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email.trim())) {
      setError("Please enter a valid email address.");
      addToast("Please enter a valid email address", "warning");
      return;
    }

    if (form.password.length < 6) {
      setError("Password must contain at least 6 characters.");
      addToast("Password must contain at least 6 characters", "error");
      return;
    }

    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      addToast("Passwords do not match", "error");
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.sendRegistrationOtp(form.email.trim().toLowerCase());
      addToast(res.message || "Verification code sent to your email!", "success");
      setStep("otp");
      setOtp(["", "", "", "", "", ""]);
      setOtpTimer(300); // 5 minutes
      setResendCooldown(60); // 60s cooldown
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || "Failed to send verification code.";
      setError(msg);
      addToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  // OTP inputs handling
  const handleOtpChange = (index, value) => {
    if (error) setError("");
    const cleaned = value.replace(/\D/g, "");

    if (cleaned.length > 1) {
      // Handle paste of multiple digits
      const digits = cleaned.slice(0, 6).split("");
      const nextOtp = [...otp];
      digits.forEach((d, i) => {
        nextOtp[i] = d;
      });
      setOtp(nextOtp);
      const focusIndex = Math.min(digits.length, 5);
      if (otpInputsRef.current[focusIndex]) {
        otpInputsRef.current[focusIndex].focus();
      }
      return;
    }

    const nextOtp = [...otp];
    nextOtp[index] = cleaned;
    setOtp(nextOtp);

    if (cleaned && index < 5 && otpInputsRef.current[index + 1]) {
      otpInputsRef.current[index + 1].focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      if (otpInputsRef.current[index - 1]) {
        otpInputsRef.current[index - 1].focus();
      }
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasteData) return;
    const nextOtp = [...otp];
    pasteData.split("").forEach((d, i) => {
      nextOtp[i] = d;
    });
    setOtp(nextOtp);
    const focusIndex = Math.min(pasteData.length, 5);
    if (otpInputsRef.current[focusIndex]) {
      otpInputsRef.current[focusIndex].focus();
    }
  };

  // STEP 2: VERIFY OTP & CREATE ACCOUNT
  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const otpString = otp.join("");
    if (otpString.length !== 6) {
      setError("Please enter the complete 6-digit verification code.");
      addToast("Please enter the complete 6-digit verification code", "warning");
      return;
    }

    if (otpTimer === 0) {
      setError("Verification code has expired. Please click Resend Code.");
      addToast("Verification code has expired. Please click Resend Code", "warning");
      return;
    }

    const nameParts = (form.name || "").trim().split(/\s+/);
    const firstName = nameParts[0] || "User";
    const lastName = nameParts.slice(1).join(" ") || nameParts[0] || "Patient";

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

      const res = await authApi.verifyRegistrationOtp(payload);
      if (res.success || res.id || res.userId) {
        addToast("Account created successfully!", "success");
        setStep("success");
      } else {
        const errMsg = res.message || res.error || "Verification failed";
        setError(errMsg);
        addToast(errMsg, "error");
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || "Invalid or expired code.";
      setError(msg);
      addToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || loading) return;
    setError("");
    setLoading(true);
    try {
      const res = await authApi.resendRegistrationOtp(form.email.trim().toLowerCase());
      addToast(res.message || "A new verification code has been sent!", "success");
      setOtp(["", "", "", "", "", ""]);
      setOtpTimer(300);
      setResendCooldown(60);
      if (otpInputsRef.current[0]) otpInputsRef.current[0].focus();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || "Failed to resend code.";
      setError(msg);
      addToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  // STEP 3: SUCCESS STATE
  if (step === "success") {
    return (
      <div className="df-auth-page">
        <div className="df-auth-form-side" style={{ gridColumn: "1 / -1" }}>
          <div className="df-auth-card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h1>Account Created!</h1>
            <p style={{ color: "var(--df-text-secondary)", lineHeight: 1.6, marginBottom: 24 }}>
              Your DentaFlow account has been verified and created successfully. You can now log in to book appointments and manage your healthcare records.
            </p>
            <button className="df-btn df-btn-primary df-btn-lg df-btn-block" onClick={() => navigate("/login")}>
              Login Now
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="df-auth-page">
      <div className="df-auth-brand">
        <Logo size={56} variant="light" />
        <h2>Join DentaFlow</h2>
        <p>Create your account to book appointments, manage your dental records, and receive personalized care.</p>
      </div>

      <div className="df-auth-form-side">
        <div className="df-auth-card">
          {/* STEP 1: REGISTRATION FORM */}
          {step === "form" && (
            <>
              <h1>{t("auth.register")}</h1>
              <p>{t("auth.registerSubtitle")}</p>

              {error && (
                <div className="df-alert df-alert-error" style={{ marginBottom: 16 }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleFormSubmit}>
                <div className="df-form-group">
                  <label className="df-label">Full Name</label>
                  <input
                    className="df-input"
                    value={form.name}
                    onChange={(e) => {
                      setForm({ ...form, name: e.target.value });
                      if (error) setError("");
                    }}
                    placeholder="Sarah Mitchell"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="df-form-group">
                  <label className="df-label">Email Address</label>
                  <input
                    className="df-input"
                    type="email"
                    value={form.email}
                    onChange={(e) => {
                      setForm({ ...form, email: e.target.value });
                      if (error) setError("");
                    }}
                    placeholder="sarah@example.com"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="df-form-group">
                  <label className="df-label">Phone Number</label>
                  <input
                    className="df-input"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => {
                      setForm({ ...form, phone: e.target.value });
                      if (error) setError("");
                    }}
                    placeholder="+94 77 123 4567"
                    disabled={loading}
                  />
                </div>

                <div className="df-form-group df-pw-toggle">
                  <label className="df-label">Password</label>
                  <input
                    className="df-input"
                    type={showPw ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => {
                      setForm({ ...form, password: e.target.value });
                      if (error) setError("");
                    }}
                    placeholder="At least 6 characters"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="df-pw-toggle-btn"
                    onClick={() => setShowPw(!showPw)}
                  >
                    {showPw ? "Hide" : "Show"}
                  </button>
                  <div className="df-pw-strength" style={{ marginTop: 6, height: 4, background: "var(--df-border)", borderRadius: 2, overflow: "hidden" }}>
                    <div className="df-pw-strength-bar" style={{ height: "100%", transition: "all 0.3s ease", ...pwStrength() }} />
                  </div>
                </div>

                <div className="df-form-group">
                  <label className="df-label">Confirm Password</label>
                  <input
                    className="df-input"
                    type={showPw ? "text" : "password"}
                    value={form.confirm}
                    onChange={(e) => {
                      setForm({ ...form, confirm: e.target.value });
                      if (error) setError("");
                    }}
                    placeholder="Confirm password"
                    required
                    disabled={loading}
                  />
                </div>

                <button
                  type="submit"
                  className="df-btn df-btn-primary df-btn-block df-btn-lg"
                  disabled={loading}
                >
                  {loading ? "Sending verification code..." : "Send Verification Code"}
                </button>
              </form>

              <div className="df-auth-footer">
                {t("auth.hasAccount")} <Link to="/login">Login</Link>
              </div>
            </>
          )}

          {/* STEP 2: OTP VERIFICATION */}
          {step === "otp" && (
            <>
              <h1>Verify Your Email</h1>
              <p>
                Enter the 6-digit verification code sent to <strong>{form.email}</strong>
              </p>

              {error && (
                <div className="df-alert df-alert-error" style={{ marginBottom: 16 }}>
                  {error}
                </div>
              )}

              {/* Expiry indicator */}
              <div
                style={{
                  textAlign: "center",
                  fontSize: 13,
                  color: otpTimer < 60 ? "var(--df-error)" : "var(--df-text-secondary)",
                  marginBottom: 12,
                  fontWeight: 500,
                }}
              >
                {otpTimer > 0 ? (
                  <>Code expires in <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{formatTimer(otpTimer)}</span></>
                ) : (
                  <span style={{ color: "var(--df-error)" }}>Code has expired. Please click Resend Code.</span>
                )}
              </div>

              <form onSubmit={handleOtpSubmit}>
                <div className="df-otp-inputs" onPaste={handleOtpPaste}>
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (otpInputsRef.current[idx] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      className="df-otp-input"
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      disabled={loading || otpTimer === 0}
                    />
                  ))}
                </div>

                <button
                  type="submit"
                  className="df-btn df-btn-primary df-btn-block df-btn-lg"
                  disabled={loading || otp.join("").length !== 6 || otpTimer === 0}
                >
                  {loading ? "Verifying & creating account..." : "Verify & Create Account"}
                </button>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: 16,
                    fontSize: 13,
                  }}
                >
                  <button
                    type="button"
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--df-text-secondary)",
                      cursor: "pointer",
                      textDecoration: "underline",
                      padding: 0,
                    }}
                    onClick={() => {
                      setStep("form");
                      setError("");
                    }}
                    disabled={loading}
                  >
                    Change Email / Edit
                  </button>

                  <button
                    type="button"
                    style={{
                      background: "none",
                      border: "none",
                      color: resendCooldown > 0 ? "var(--df-text-muted)" : "var(--df-primary-600)",
                      cursor: resendCooldown > 0 ? "default" : "pointer",
                      fontWeight: 600,
                      padding: 0,
                    }}
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0 || loading}
                  >
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code"}
                  </button>
                </div>
              </form>

              <div className="df-auth-footer">
                Already registered? <Link to="/login">Login</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
