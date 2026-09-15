import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../../components/icons/Logo";
import { useNotifications } from "../../context/NotificationContext";
import authApi from "../../api/auth";
import "./auth.css";

export default function ForgotPassword() {
  const { addToast } = useNotifications();
  const navigate = useNavigate();

  // Steps: "email" | "otp" | "password" | "success"
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(60);
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const otpInputsRef = useRef([]);

  // Cooldown countdown for Resend OTP
  useEffect(() => {
    if (step === "otp" && timer > 0) {
      const id = setTimeout(() => setTimer((prev) => prev - 1), 1000);
      return () => clearTimeout(id);
    }
  }, [step, timer]);

  // Focus first OTP input when entering OTP step
  useEffect(() => {
    if (step === "otp" && otpInputsRef.current[0]) {
      otpInputsRef.current[0].focus();
    }
  }, [step]);

  const pwStrength = () => {
    const p = newPassword;
    if (!p) return { width: "0%", color: "transparent" };
    if (p.length < 4) return { width: "20%", color: "var(--df-error)" };
    if (p.length < 8) return { width: "50%", color: "var(--df-warning)" };
    if (/[A-Z]/.test(p) && /[0-9]/.test(p)) return { width: "100%", color: "var(--df-success)" };
    return { width: "75%", color: "var(--df-primary-500)" };
  };

  // Step 1: Request OTP
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError("Please enter your email address.");
      addToast("Please enter your email address", "warning");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      addToast("Please enter a valid email address", "warning");
      return;
    }

    setSubmitting(true);
    try {
      const res = await authApi.forgotPassword(trimmedEmail);
      addToast(res.message || "Verification code sent to your email!", "success");
      setStep("otp");
      setTimer(60);
      setOtp(["", "", "", "", "", ""]);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to send reset code. Please try again.";
      setError(msg);
      addToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle OTP individual input change
  const handleOtpChange = (index, value) => {
    if (error) setError("");
    const cleaned = value.replace(/\D/g, "");

    if (cleaned.length > 1) {
      // Handle paste
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

  // Step 2: Verify OTP
  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const otpString = otp.join("");
    if (otpString.length !== 6) {
      setError("Please enter the complete 6-digit code.");
      addToast("Please enter the complete 6-digit code", "warning");
      return;
    }

    setSubmitting(true);
    try {
      const res = await authApi.verifyOtp(email.trim().toLowerCase(), otpString);
      if (res.resetToken) {
        setResetToken(res.resetToken);
        addToast("Code verified successfully!", "success");
        setStep("password");
      } else {
        setError("Verification succeeded but no reset token returned.");
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Invalid or expired code.";
      setError(msg);
      addToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (timer > 0 || submitting) return;
    setError("");
    setSubmitting(true);
    try {
      const res = await authApi.resendOtp(email.trim().toLowerCase());
      addToast(res.message || "A new verification code has been sent!", "success");
      setTimer(60);
      setOtp(["", "", "", "", "", ""]);
      if (otpInputsRef.current[0]) otpInputsRef.current[0].focus();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to resend code.";
      setError(msg);
      addToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Step 3: Reset Password
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!newPassword) {
      setError("Please enter a new password.");
      addToast("Please enter a new password", "warning");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      addToast("Password must be at least 6 characters", "warning");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      addToast("Passwords do not match", "error");
      return;
    }

    setSubmitting(true);
    try {
      const res = await authApi.resetPassword(
        email.trim().toLowerCase(),
        resetToken,
        newPassword
      );
      addToast(res.message || "Password updated successfully!", "success");
      setStep("success");
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to reset password.";
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
        <h2>Account Recovery</h2>
        <p>Reset your password to regain access to your appointments, dental charts, and patient records.</p>
      </div>

      <div className="df-auth-form-side">
        <div className="df-auth-card">
          {/* STEP 1: EMAIL */}
          {step === "email" && (
            <>
              <h1>Reset Password</h1>
              <p>Enter your registered email address and we'll send you a verification code.</p>

              {error && (
                <div className="df-alert df-alert-error" style={{ marginBottom: 16 }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleEmailSubmit}>
                <div className="df-form-group">
                  <label className="df-label" htmlFor="reset-email">
                    Email Address
                  </label>
                  <input
                    id="reset-email"
                    className="df-input"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError("");
                    }}
                    placeholder="you@example.com"
                    required
                    disabled={submitting}
                  />
                </div>

                <button
                  type="submit"
                  className="df-btn df-btn-primary df-btn-block df-btn-lg"
                  disabled={submitting}
                >
                  {submitting ? "Sending code..." : "Send Verification Code"}
                </button>
              </form>

              <div className="df-auth-footer">
                Remember your password? <Link to="/login">Back to Login</Link>
              </div>
            </>
          )}

          {/* STEP 2: VERIFY OTP */}
          {step === "otp" && (
            <>
              <h1>Verify OTP Code</h1>
              <p>
                Enter the 6-digit code sent to <strong>{email}</strong>
              </p>

              {error && (
                <div className="df-alert df-alert-error" style={{ marginBottom: 16 }}>
                  {error}
                </div>
              )}

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
                      disabled={submitting}
                    />
                  ))}
                </div>

                <button
                  type="submit"
                  className="df-btn df-btn-primary df-btn-block df-btn-lg"
                  disabled={submitting || otp.join("").length !== 6}
                >
                  {submitting ? "Verifying..." : "Verify Code"}
                </button>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, fontSize: 13 }}>
                  <button
                    type="button"
                    style={{ background: "none", border: "none", color: "var(--df-text-secondary)", cursor: "pointer", textDecoration: "underline", padding: 0 }}
                    onClick={() => {
                      setStep("email");
                      setError("");
                    }}
                    disabled={submitting}
                  >
                    Change Email
                  </button>

                  <button
                    type="button"
                    style={{
                      background: "none",
                      border: "none",
                      color: timer > 0 ? "var(--df-text-muted)" : "var(--df-primary-600)",
                      cursor: timer > 0 ? "default" : "pointer",
                      fontWeight: 600,
                      padding: 0,
                    }}
                    onClick={handleResendOtp}
                    disabled={timer > 0 || submitting}
                  >
                    {timer > 0 ? `Resend code in ${timer}s` : "Resend Code"}
                  </button>
                </div>
              </form>

              <div className="df-auth-footer">
                <Link to="/login">Back to Login</Link>
              </div>
            </>
          )}

          {/* STEP 3: NEW PASSWORD */}
          {step === "password" && (
            <>
              <h1>Set New Password</h1>
              <p>Please enter your new password below.</p>

              {error && (
                <div className="df-alert df-alert-error" style={{ marginBottom: 16 }}>
                  {error}
                </div>
              )}

              <form onSubmit={handlePasswordSubmit}>
                <div className="df-form-group df-pw-toggle">
                  <label className="df-label" htmlFor="new-password">
                    New Password
                  </label>
                  <input
                    id="new-password"
                    className="df-input"
                    type={showPw ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (error) setError("");
                    }}
                    placeholder="At least 6 characters"
                    required
                    disabled={submitting}
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
                  <label className="df-label" htmlFor="confirm-password">
                    Confirm Password
                  </label>
                  <input
                    id="confirm-password"
                    className="df-input"
                    type={showPw ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (error) setError("");
                    }}
                    placeholder="Confirm new password"
                    required
                    disabled={submitting}
                  />
                </div>

                <button
                  type="submit"
                  className="df-btn df-btn-primary df-btn-block df-btn-lg"
                  disabled={submitting}
                >
                  {submitting ? "Updating password..." : "Update Password"}
                </button>
              </form>

              <div className="df-auth-footer">
                <Link to="/login">Back to Login</Link>
              </div>
            </>
          )}

          {/* STEP 4: SUCCESS */}
          {step === "success" && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
              <h1>Password Updated!</h1>
              <p style={{ lineHeight: 1.6, color: "var(--df-text-secondary)", marginBottom: 24 }}>
                Your password has been successfully reset. You can now log in using your new credentials.
              </p>

              <button
                type="button"
                className="df-btn df-btn-primary df-btn-block df-btn-lg"
                onClick={() => navigate("/login")}
              >
                Go to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
