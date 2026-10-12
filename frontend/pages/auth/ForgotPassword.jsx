import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  XCircle,
} from "lucide-react";

import Logo from "../../components/icons/Logo.jsx";
import { useNotifications } from "../../context/NotificationContext.jsx";
import authApi from "../../api/auth.js";

import clinicBanner from "../../assets/clinic_reception_banner.png";

import "./ForgotPassword.css";

export default function ForgotPassword() {
  const { addToast } = useNotifications();
  const navigate = useNavigate();

  // email | otp | password | success
  const [step, setStep] = useState("email");

  const [email, setEmail] = useState("");

  const [otp, setOtp] = useState([
    "",
    "",
    "",
    "",
    "",
    "",
  ]);

  const [timer, setTimer] = useState(60);

  const [resetToken, setResetToken] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
      useState("");

  const [showPw, setShowPw] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const otpInputsRef = useRef([]);


  /* =========================================================
     OTP TIMER
     ========================================================= */

  useEffect(() => {
    if (step !== "otp" || timer <= 0) return;

    const id = setTimeout(() => {
      setTimer((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(id);
  }, [step, timer]);


  /* =========================================================
     OTP AUTO FOCUS
     ========================================================= */

  useEffect(() => {
    if (step === "otp") {
      const id = setTimeout(() => {
        otpInputsRef.current[0]?.focus();
      }, 50);

      return () => clearTimeout(id);
    }
  }, [step]);


  /* =========================================================
     PASSWORD STRENGTH
     ========================================================= */

  const passwordStrength = () => {
    const password = newPassword;

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


  /* =========================================================
     STEP 1 — EMAIL
     ========================================================= */

  const handleEmailSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const trimmedEmail =
        email.trim().toLowerCase();

    if (!trimmedEmail) {
      const message =
          "Please enter your email address.";

      setError(message);
      addToast(message, "warning");
      return;
    }

    const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(trimmedEmail)) {
      const message =
          "Please enter a valid email address.";

      setError(message);
      addToast(message, "warning");
      return;
    }

    setSubmitting(true);

    try {
      const response =
          await authApi.forgotPassword(trimmedEmail);

      addToast(
          response.message ||
          "Verification code sent to your email!",
          "success"
      );

      setStep("otp");
      setTimer(60);
      setOtp([
        "",
        "",
        "",
        "",
        "",
        "",
      ]);
    } catch (err) {
      const message =
          err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          "Failed to send reset code. Please try again.";

      setError(message);
      addToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  };


  /* =========================================================
     OTP INPUT
     ========================================================= */

  const handleOtpChange = (index, value) => {
    if (error) {
      setError("");
    }

    const cleaned =
        value.replace(/\D/g, "");

    if (cleaned.length > 1) {
      const digits =
          cleaned.slice(0, 6).split("");

      const nextOtp = [...otp];

      digits.forEach((digit, i) => {
        nextOtp[i] = digit;
      });

      setOtp(nextOtp);

      const focusIndex =
          Math.min(digits.length, 5);

      otpInputsRef.current[
          focusIndex
          ]?.focus();

      return;
    }

    const nextOtp = [...otp];

    nextOtp[index] = cleaned;

    setOtp(nextOtp);

    if (cleaned && index < 5) {
      otpInputsRef.current[
      index + 1
          ]?.focus();
    }
  };


  const handleOtpKeyDown = (
      index,
      event
  ) => {
    if (
        event.key === "Backspace" &&
        !otp[index] &&
        index > 0
    ) {
      otpInputsRef.current[
      index - 1
          ]?.focus();
    }
  };


  const handleOtpPaste = (event) => {
    event.preventDefault();

    const pasted =
        event.clipboardData
            .getData("text")
            .replace(/\D/g, "")
            .slice(0, 6);

    if (!pasted) return;

    const nextOtp = [...otp];

    pasted
        .split("")
        .forEach((digit, index) => {
          nextOtp[index] = digit;
        });

    setOtp(nextOtp);

    const focusIndex =
        Math.min(pasted.length, 5);

    otpInputsRef.current[
        focusIndex
        ]?.focus();
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
          "Please enter the complete 6-digit code.";

      setError(message);
      addToast(message, "warning");
      return;
    }

    setSubmitting(true);

    try {
      const response =
          await authApi.verifyResetOtp(
              email.trim().toLowerCase(),
              otpString
          );

      addToast(
          response.message ||
          "Code verified successfully!",
          "success"
      );

      setResetToken(
          response.token || otpString
      );

      setStep("password");
    } catch (err) {
      const message =
          err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          "Invalid or expired verification code.";

      setError(message);
      addToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  };


  /* =========================================================
     RESEND OTP
     ========================================================= */

  const handleResendOtp = async () => {
    if (timer > 0 || submitting) {
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const response =
          await authApi.resendResetOtp(
              email.trim().toLowerCase()
          );

      addToast(
          response.message ||
          "A new code has been sent!",
          "success"
      );

      setTimer(60);

      setOtp([
        "",
        "",
        "",
        "",
        "",
        "",
      ]);

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
      setSubmitting(false);
    }
  };


  /* =========================================================
     STEP 3 — NEW PASSWORD
     ========================================================= */

  const handlePasswordSubmit = async (
      event
  ) => {
    event.preventDefault();
    setError("");

    if (!newPassword) {
      const message =
          "Please enter a new password.";

      setError(message);
      addToast(message, "warning");
      return;
    }

    if (newPassword.length < 6) {
      const message =
          "Password must contain at least 6 characters.";

      setError(message);
      addToast(message, "error");
      return;
    }

    if (
        newPassword !== confirmPassword
    ) {
      const message =
          "Passwords do not match.";

      setError(message);
      addToast(message, "error");
      return;
    }

    setSubmitting(true);

    try {
      const response =
          await authApi.resetPassword(
              email.trim().toLowerCase(),
              resetToken,
              newPassword
          );

      addToast(
          response.message ||
          "Password updated successfully!",
          "success"
      );

      setStep("success");
    } catch (err) {
      const message =
          err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          "Failed to reset password.";

      setError(message);
      addToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  };


  /* =========================================================
     SUCCESS
     ========================================================= */

  if (step === "success") {
    return (
        <main className="df-forgot-success-page">

          <section className="df-forgot-success-card">

            <div className="df-forgot-success-icon">
              <CheckCircle2 size={36} />
            </div>

            <span className="df-forgot-success-label">
            PASSWORD UPDATED
          </span>

            <h1>Password Updated Successfully</h1>

            <p>
              Your password has been successfully reset.
              You can now sign in using your new credentials.
            </p>

            <button
                type="button"
                className="df-forgot-primary-btn"
                onClick={() => navigate("/login")}
            >
              Go to Sign In
              <ArrowRight size={17} />
            </button>

          </section>

        </main>
    );
  }


  return (
      <main className="df-forgot-page">

        <div className="df-forgot-shell">

          {/* =====================================================
            LEFT VISUAL
        ====================================================== */}

          <section className="df-forgot-visual">

            <img
                src={clinicBanner}
                alt="DentaFlow dental clinic"
                className="df-forgot-visual-image"
            />

            <div className="df-forgot-visual-overlay" />

            <div className="df-forgot-visual-content">

              <div className="df-forgot-brand">

                <div className="df-forgot-brand-logo">
                  <Logo />
                </div>

                <div>
                  <strong>DentaFlow</strong>
                  <span>
                  Smart Dental Care for Everyone
                </span>
                </div>

              </div>


              <div className="df-forgot-eyebrow">
                <ShieldCheck size={15} />
                <span>SECURE ACCOUNT RECOVERY</span>
              </div>


              <div className="df-forgot-welcome">

                <h1>
                  Get Back
                  <span>Into Your Account</span>
                </h1>

                <p>
                  Recover your DentaFlow account securely
                  and continue managing your dental care,
                  appointments and records.
                </p>

              </div>


              <div className="df-forgot-benefits">

                <div className="df-forgot-benefit">

                  <div className="df-forgot-benefit-icon">
                    <Mail size={18} />
                  </div>

                  <div>
                    <strong>Email Verification</strong>
                    <span>
                    Secure verification code
                  </span>
                  </div>

                </div>


                <div className="df-forgot-benefit">

                  <div className="df-forgot-benefit-icon">
                    <LockKeyhole size={18} />
                  </div>

                  <div>
                    <strong>Secure Password Reset</strong>
                    <span>
                    Protect your account
                  </span>
                  </div>

                </div>


                <div className="df-forgot-benefit">

                  <div className="df-forgot-benefit-icon">
                    <ShieldCheck size={18} />
                  </div>

                  <div>
                    <strong>Protected Information</strong>
                    <span>
                    Your dental data stays secure
                  </span>
                  </div>

                </div>

              </div>


              <div className="df-forgot-slogan">
                <span>Healthy Smiles</span>
                <b>•</b>
                <span>Happier Lives</span>
              </div>

            </div>

          </section>


          {/* =====================================================
            RIGHT FORM
        ====================================================== */}

          <section className="df-forgot-form-side">

            <div className="df-forgot-card">

              {/* =================================================
                STEP 1
            ================================================= */}

              {step === "email" && (
                  <>

                    <div className="df-forgot-heading">

                  <span className="df-forgot-form-eyebrow">
                    ACCOUNT RECOVERY
                  </span>

                      <h2>Reset Your Password</h2>

                      <p>
                        Enter your registered email and
                        we'll send you a verification code.
                      </p>

                    </div>


                    {error && (
                        <div className="df-forgot-error">
                          <XCircle size={17} />
                          <span>{error}</span>
                        </div>
                    )}


                    <form
                        className="df-forgot-form"
                        onSubmit={handleEmailSubmit}
                    >

                      <div className="df-forgot-field">

                        <label htmlFor="reset-email">
                          Email Address
                        </label>

                        <div className="df-forgot-input-wrap">

                          <Mail size={18} />

                          <input
                              id="reset-email"
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


                      <button
                          type="submit"
                          className="df-forgot-primary-btn"
                          disabled={submitting}
                      >
                        {submitting
                            ? "Sending Code..."
                            : "Send Verification Code"}

                        {!submitting && (
                            <ArrowRight size={17} />
                        )}
                      </button>

                    </form>


                    <div className="df-forgot-footer">
                  <span>
                    Remember your password?
                  </span>

                      <Link to="/login">
                        Back to Login
                        <ArrowRight size={14} />
                      </Link>
                    </div>

                  </>
              )}


              {/* =================================================
                STEP 2
            ================================================= */}

              {step === "otp" && (
                  <div className="df-forgot-otp">

                    <div className="df-forgot-otp-icon">
                      <Mail size={28} />
                    </div>

                    <span className="df-forgot-form-eyebrow">
                  EMAIL VERIFICATION
                </span>

                    <h2>Verify OTP Code</h2>

                    <p>
                      Enter the 6-digit code sent to{" "}
                      <strong>{email}</strong>
                    </p>


                    {error && (
                        <div className="df-forgot-error">
                          <XCircle size={17} />
                          <span>{error}</span>
                        </div>
                    )}


                    <div className="df-forgot-timer">

                      {timer > 0 ? (
                          <>
                            Code expires in{" "}
                            <strong>
                              00:{String(timer).padStart(2, "0")}
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
                          className="df-forgot-otp-inputs"
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
                                onChange={(event) =>
                                    handleOtpChange(
                                        index,
                                        event.target.value
                                    )
                                }
                                onKeyDown={(event) =>
                                    handleOtpKeyDown(
                                        index,
                                        event
                                    )
                                }
                                disabled={submitting}
                                aria-label={`Verification digit ${
                                    index + 1
                                }`}
                            />
                        ))}
                      </div>


                      <button
                          type="submit"
                          className="df-forgot-primary-btn"
                          disabled={
                              submitting ||
                              otp.join("").length !== 6
                          }
                      >
                        {submitting
                            ? "Verifying..."
                            : "Verify Code"}

                        {!submitting && (
                            <ArrowRight size={17} />
                        )}
                      </button>


                      <div className="df-forgot-otp-actions">

                        <button
                            type="button"
                            onClick={() => {
                              setStep("email");
                              setError("");
                            }}
                            disabled={submitting}
                        >
                          ← Change Email
                        </button>

                        <button
                            type="button"
                            onClick={handleResendOtp}
                            disabled={
                                timer > 0 ||
                                submitting
                            }
                        >
                          {timer > 0
                              ? `Resend (${timer}s)`
                              : "Resend Code"}
                        </button>

                      </div>

                    </form>


                    <div className="df-forgot-footer">

                  <span>
                    Remember your password?
                  </span>

                      <Link to="/login">
                        Back to Login
                        <ArrowRight size={14} />
                      </Link>

                    </div>

                  </div>
              )}


              {/* =================================================
                STEP 3
            ================================================= */}

              {step === "password" && (
                  <>

                    <div className="df-forgot-heading">

                  <span className="df-forgot-form-eyebrow">
                    NEW PASSWORD
                  </span>

                      <h2>Set New Password</h2>

                      <p>
                        Create a new password to secure
                        your DentaFlow account.
                      </p>

                    </div>


                    {error && (
                        <div className="df-forgot-error">
                          <XCircle size={17} />
                          <span>{error}</span>
                        </div>
                    )}


                    <form
                        className="df-forgot-form"
                        onSubmit={handlePasswordSubmit}
                    >

                      {/* New Password */}
                      <div className="df-forgot-field">

                        <label htmlFor="new-password">
                          New Password
                        </label>

                        <div className="df-forgot-input-wrap">

                          <LockKeyhole size={18} />

                          <input
                              id="new-password"
                              type={
                                showPw
                                    ? "text"
                                    : "password"
                              }
                              value={newPassword}
                              onChange={(event) => {
                                setNewPassword(
                                    event.target.value
                                );

                                if (error) {
                                  setError("");
                                }
                              }}
                              placeholder="At least 6 characters"
                              autoComplete="new-password"
                              disabled={submitting}
                              required
                          />

                          <button
                              type="button"
                              className="df-forgot-password-toggle"
                              onClick={() =>
                                  setShowPw(
                                      (prev) => !prev
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
                                <EyeOff size={17} />
                            ) : (
                                <Eye size={17} />
                            )}
                          </button>

                        </div>


                        <div className="df-forgot-strength">

                          <div className="df-forgot-strength-track">

                        <span
                            className={`df-forgot-strength-bar ${strength.className}`}
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


                      {/* Confirm */}
                      <div className="df-forgot-field">

                        <label htmlFor="confirm-password">
                          Confirm Password
                        </label>

                        <div className="df-forgot-input-wrap">

                          <LockKeyhole size={18} />

                          <input
                              id="confirm-password"
                              type={
                                showPw
                                    ? "text"
                                    : "password"
                              }
                              value={confirmPassword}
                              onChange={(event) => {
                                setConfirmPassword(
                                    event.target.value
                                );

                                if (error) {
                                  setError("");
                                }
                              }}
                              placeholder="Confirm new password"
                              autoComplete="new-password"
                              disabled={submitting}
                              required
                          />

                        </div>

                      </div>


                      <button
                          type="submit"
                          className="df-forgot-primary-btn"
                          disabled={submitting}
                      >
                        {submitting
                            ? "Updating Password..."
                            : "Update Password"}

                        {!submitting && (
                            <ArrowRight size={17} />
                        )}
                      </button>

                    </form>


                    <div className="df-forgot-footer">

                      <Link to="/login">
                        Back to Login
                        <ArrowRight size={14} />
                      </Link>

                    </div>

                  </>
              )}

            </div>

          </section>

        </div>

      </main>
  );
}