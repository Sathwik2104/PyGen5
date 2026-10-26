import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import {
  verifyRegistrationOtp,
  resendRegistrationOtp,
  verifyLoginOtp,
  resendLoginOtp,
  forgotPassword,
  resetPassword,
} from "../services/api.js";

export default function LoginModal({ type, close, setLoginModal }) {
  const { login, register, setAuthData } = useAuth();
  const { showToast } = useToast();

  // Active view: 'choose' | 'customer' | 'store' | 'register' | 'otp_register' | 'otp_login' | 'forgot_request' | 'forgot_reset'
  const [currentView, setCurrentView] = useState(type || "choose");

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: type === "store" ? "store_owner" : "customer",
    phone: "",
  });

  // OTP state
  const [otp, setOtp] = useState("");
  const [tempToken, setTempToken] = useState("");
  const [emailHint, setEmailHint] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  // Forgot password state
  const [resetEmail, setResetEmail] = useState("");
  const [resetOtp, setResetOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  // Cooldown timer effect for OTP resend
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError(null);
  };

  // 1. Role Selection View
  if (currentView === "choose") {
    return (
      <div className="back" onClick={close}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <button className="x" onClick={close}>
            ×
          </button>
          <label>WELCOME TO TRYWISE</label>
          <h2>Continue as</h2>

          <button
            className="primary full"
            onClick={() => {
              setFormData((prev) => ({ ...prev, role: "customer" }));
              setCurrentView("customer");
            }}
          >
            Customer
          </button>

          <button
            className="secondary full"
            onClick={() => {
              setFormData((prev) => ({ ...prev, role: "store_owner" }));
              setCurrentView("store");
            }}
          >
            Store Owner
          </button>
        </div>
      </div>
    );
  }

  // 2. Submit Login or Registration
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (currentView === "register") {
        const res = await register({
          full_name: formData.fullName,
          email: formData.email,
          password: formData.password,
          confirm_password: formData.confirmPassword,
          role: formData.role,
          phone_number: formData.phone,
        });

        if (res.verification_required) {
          setTempToken(res.temp_token);
          setEmailHint(res.email);
          setResendCooldown(30);
          setSuccessMsg(`We sent a 6-digit verification code to ${res.email}.`);
          setCurrentView("otp_register");
        } else {
          const name = res.user?.first_name || res.user?.username || "there";
          showToast(`Registered successfully! Welcome, ${name}!`, "success");
          close();
        }
      } else {
        // Customer or Store Owner Login
        const res = await login({
          email_or_username: formData.email,
          password: formData.password,
        });

        if (res.otp_required) {
          // Store Owner 2FA required
          setTempToken(res.temp_token);
          setEmailHint(res.email_hint || formData.email);
          setResendCooldown(30);
          setSuccessMsg(`Store owner sign-in requires 2FA. We sent an OTP to ${res.email_hint || formData.email}.`);
          setCurrentView("otp_login");
        } else {
          // Customer login successful
          const name = res.user?.first_name || res.user?.username || "there";
          showToast(`Logged in successfully! Welcome back, ${name}!`, "success");
          close();
        }
      }
    } catch (err) {
      if (err.data && err.data.verification_required) {
        setTempToken(err.data.temp_token);
        setEmailHint(err.data.email);
        setResendCooldown(30);
        setError(err.message || "Please verify your email address.");
        setCurrentView("otp_register");
      } else {
        setError(err.message || "Authentication failed. Please check your credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  // 3. Verify Registration OTP
  const handleVerifyRegistrationOtp = async (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      setError("Please enter the 6-digit verification code.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const data = await verifyRegistrationOtp(tempToken, otp.trim());
      setAuthData(data.user, data.tokens);
      const name = data.user?.first_name || data.user?.username || "there";
      showToast(`Registered successfully! Welcome, ${name}!`, "success");
      close();
    } catch (err) {
      setError(err.message || "Failed to verify code.");
    } finally {
      setLoading(false);
    }
  };

  // 4. Verify Store Owner Login 2FA OTP
  const handleVerifyLoginOtp = async (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      setError("Please enter the 6-digit login code.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const data = await verifyLoginOtp(tempToken, otp.trim());
      setAuthData(data.user, data.tokens);
      const name = data.user?.first_name || data.user?.username || "there";
      showToast(`Logged in successfully! Welcome back, ${name}!`, "success");
      close();
    } catch (err) {
      setError(err.message || "Invalid or expired login code.");
    } finally {
      setLoading(false);
    }
  };

  // 5. Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    setError(null);
    try {
      if (currentView === "otp_register") {
        await resendRegistrationOtp(tempToken);
        setSuccessMsg("A new registration verification code has been emailed.");
      } else if (currentView === "otp_login") {
        await resendLoginOtp(tempToken);
        setSuccessMsg("A new 2FA login code has been emailed.");
      }
      setResendCooldown(30);
    } catch (err) {
      setError(err.message || "Failed to resend code.");
    } finally {
      setLoading(false);
    }
  };

  // 6. Forgot Password - Request Reset Code
  const handleForgotPasswordRequest = async (e) => {
    e.preventDefault();
    if (!resetEmail) {
      setError("Please enter your registered email address.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await forgotPassword(resetEmail.trim());
      setSuccessMsg(`If ${resetEmail} is registered, a 6-digit reset code has been sent.`);
      setCurrentView("forgot_reset");
    } catch (err) {
      setError(err.message || "Failed to initiate password reset.");
    } finally {
      setLoading(false);
    }
  };

  // 7. Forgot Password - Confirm New Password with OTP
  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!resetOtp || resetOtp.length !== 6) {
      setError("Please enter the 6-digit reset code.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await resetPassword({
        email: resetEmail.trim(),
        otp: resetOtp.trim(),
        new_password: newPassword,
        confirm_password: confirmNewPassword,
      });
      alert("Password has been reset successfully! You can now sign in with your new password.");
      setCurrentView("customer");
    } catch (err) {
      setError(err.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  // Titles for views
  const getHeaderInfo = () => {
    switch (currentView) {
      case "customer":
        return { label: "SIGN IN", title: "Customer Login" };
      case "store":
        return { label: "SIGN IN", title: "Store Owner Login" };
      case "register":
        return formData.role === "store_owner"
          ? { label: "STORE OWNER ONBOARDING", title: "Register Store Owner" }
          : { label: "WELCOME", title: "Create Customer Account" };
      case "otp_register":
        return { label: "EMAIL VERIFICATION", title: "Verify Your Email" };
      case "otp_login":
        return { label: "STORE OWNER 2FA", title: "Two-Factor Verification" };
      case "forgot_request":
        return { label: "ACCOUNT RECOVERY", title: "Forgot Password" };
      case "forgot_reset":
        return { label: "SET NEW PASSWORD", title: "Reset Password" };
      default:
        return { label: "TRYWISE", title: "Sign In" };
    }
  };

  const header = getHeaderInfo();

  return (
    <div className="back" onClick={close}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "460px" }}>
        {/* CLOSE BUTTON */}
        <button className="x" onClick={close}>
          ×
        </button>

        {/* TITLE */}
        <label>{header.label}</label>
        <h2>{header.title}</h2>

        {/* FEEDBACK NOTICES */}
        {error && (
          <div className="modal-feedback-error">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="modal-feedback-success">
            {successMsg}
          </div>
        )}

        {/* VIEW: REGISTRATION OTP VERIFICATION */}
        {currentView === "otp_register" && (
          <form onSubmit={handleVerifyRegistrationOtp}>
            <p className="modal-text-muted">
              Please enter the 6-digit verification code sent to <strong>{emailHint}</strong> to activate your account.
            </p>

            <input
              type="text"
              placeholder="6-Digit OTP Code"
              value={otp}
              onChange={(e) => {
                setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
                setError(null);
              }}
              className="modal-otp-input"
              required
              autoFocus
            />

            <button className="primary full" type="submit" disabled={loading || otp.length !== 6}>
              {loading ? "Verifying..." : "Verify & Activate Account"}
            </button>

            <div className="modal-nav-row">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendCooldown > 0 || loading}
                className={`modal-action-link ${resendCooldown > 0 ? "disabled" : ""}`}
              >
                {resendCooldown > 0 ? `Resend Code in ${resendCooldown}s` : "Resend Code"}
              </button>
              <button
                type="button"
                onClick={() => setCurrentView("register")}
                className="modal-back-btn"
              >
                Back to Register
              </button>
            </div>
          </form>
        )}

        {/* VIEW: STORE OWNER LOGIN 2FA OTP */}
        {currentView === "otp_login" && (
          <form onSubmit={handleVerifyLoginOtp}>
            <p className="modal-text-muted">
              To protect store operations, enter the 6-digit security code sent to <strong>{emailHint}</strong>.
            </p>

            <input
              type="text"
              placeholder="6-Digit OTP Code"
              value={otp}
              onChange={(e) => {
                setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
                setError(null);
              }}
              className="modal-otp-input"
              required
              autoFocus
            />

            <button className="primary full" type="submit" disabled={loading || otp.length !== 6}>
              {loading ? "Verifying..." : "Verify & Sign In"}
            </button>

            <div className="modal-nav-row">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendCooldown > 0 || loading}
                className={`modal-action-link ${resendCooldown > 0 ? "disabled" : ""}`}
              >
                {resendCooldown > 0 ? `Resend Code in ${resendCooldown}s` : "Resend Code"}
              </button>
              <button
                type="button"
                onClick={() => setCurrentView("store")}
                className="modal-back-btn"
              >
                Back to Sign In
              </button>
            </div>
          </form>
        )}

        {/* VIEW: FORGOT PASSWORD REQUEST */}
        {currentView === "forgot_request" && (
          <form onSubmit={handleForgotPasswordRequest}>
            <p className="modal-text-muted">
              Enter your registered email address. We'll send you a 6-digit code to reset your password.
            </p>

            <input
              placeholder="Your email address"
              type="email"
              value={resetEmail}
              onChange={(e) => {
                setResetEmail(e.target.value);
                setError(null);
              }}
              required
              autoFocus
            />

            <button className="primary full" type="submit" disabled={loading || !resetEmail}>
              {loading ? "Sending..." : "Send Reset Code ↗"}
            </button>

            <div className="modal-center-link-wrap">
              <button
                type="button"
                onClick={() => setCurrentView("customer")}
                className="modal-action-link"
              >
                ← Back to Login
              </button>
            </div>
          </form>
        )}

        {/* VIEW: FORGOT PASSWORD RESET */}
        {currentView === "forgot_reset" && (
          <form onSubmit={handleResetPasswordSubmit}>
            <p className="modal-text-muted">
              Enter the 6-digit code sent to <strong>{resetEmail}</strong> and choose a new password.
            </p>

            <input
              type="text"
              placeholder="6-Digit Reset Code"
              value={resetOtp}
              onChange={(e) => {
                setResetOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
                setError(null);
              }}
              className="modal-otp-input"
              required
              autoFocus
            />

            <div className="password-input-wrapper">
              <input
                placeholder="New Password *"
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setError(null);
                }}
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setShowNewPassword((prev) => !prev)}
                aria-label={showNewPassword ? "Hide password" : "Show password"}
                title={showNewPassword ? "Hide password" : "Show password"}
                tabIndex="-1"
              >
                {showNewPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>

            <div className="password-input-wrapper">
              <input
                placeholder="Confirm New Password *"
                type={showConfirmNewPassword ? "text" : "password"}
                value={confirmNewPassword}
                onChange={(e) => {
                  setConfirmNewPassword(e.target.value);
                  setError(null);
                }}
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setShowConfirmNewPassword((prev) => !prev)}
                aria-label={showConfirmNewPassword ? "Hide password" : "Show password"}
                title={showConfirmNewPassword ? "Hide password" : "Show password"}
                tabIndex="-1"
              >
                {showConfirmNewPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>

            <button className="primary full" type="submit" disabled={loading || resetOtp.length !== 6}>
              {loading ? "Updating..." : "Reset Password"}
            </button>

            <div className="modal-center-link-wrap">
              <button
                type="button"
                onClick={() => setCurrentView("forgot_request")}
                className="modal-back-btn"
              >
                Resend code / Change email
              </button>
            </div>
          </form>
        )}

        {/* VIEW: STANDARD LOGIN OR REGISTRATION */}
        {(currentView === "customer" || currentView === "store" || currentView === "register") && (
          <form onSubmit={handleSubmit}>
            {/* NAME FIELD FOR REGISTER */}
            {currentView === "register" && (
              <input
                placeholder="Full name *"
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                required
              />
            )}

            {/* ROLE SELECTOR TABS FOR REGISTER */}
            {currentView === "register" && (
              <div className="auth-role-tabs">
                <button
                  type="button"
                  className={`auth-role-tab ${formData.role === "customer" ? "active" : ""}`}
                  onClick={() => setFormData((prev) => ({ ...prev, role: "customer" }))}
                >
                  Customer Account
                </button>
                <button
                  type="button"
                  className={`auth-role-tab ${formData.role === "store_owner" ? "active-store" : ""}`}
                  onClick={() => setFormData((prev) => ({ ...prev, role: "store_owner" }))}
                >
                  Store Owner Account
                </button>
              </div>
            )}

            {/* PHONE NUMBER (OPTIONAL) FOR REGISTER */}
            {currentView === "register" && (
              <input
                placeholder="Phone number (optional)"
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
              />
            )}

            {/* EMAIL / USERNAME */}
            <input
              placeholder={currentView === "register" ? "Email address *" : "Email or Username *"}
              type="text"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />

            {/* PASSWORD */}
            <div className="password-input-wrapper">
              <input
                placeholder="Password *"
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide password" : "Show password"}
                tabIndex="-1"
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>

            {/* CONFIRM PASSWORD FOR REGISTER */}
            {currentView === "register" && (
              <div className="password-input-wrapper">
                <input
                  placeholder="Confirm Password *"
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  title={showConfirmPassword ? "Hide password" : "Show password"}
                  tabIndex="-1"
                >
                  {showConfirmPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            )}

            {/* FORGOT PASSWORD LINK (LOGIN ONLY) */}
            {currentView !== "register" && (
              <div className="modal-forgot-link-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(formData.email.includes("@") ? formData.email : "");
                    setCurrentView("forgot_request");
                  }}
                  className="modal-action-link"
                >
                  Forgot Password?
                </button>
              </div>
            )}

            {/* SUBMIT BUTTON */}
            <button
              className="primary full"
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Processing..."
                : currentView === "register"
                ? "Send Verification Code ↗"
                : currentView === "store"
                ? "Sign In (Store Owner 2FA) ↗"
                : "Sign In"}
            </button>
          </form>
        )}

        {/* BOTTOM SWITCH LINKS */}
        {(currentView === "customer" || currentView === "store" || currentView === "register") && (
          <small className="modal-switch-text">
            {currentView === "register" ? (
              <span>
                Already have an account?{" "}
                <button
                  type="button"
                  className="modal-inline-link"
                  onClick={() => setCurrentView(formData.role === "store_owner" ? "store" : "customer")}
                >
                  Log In
                </button>
              </span>
            ) : (
              <div className="modal-nav-row">
                <span>
                  Don't have an account?{" "}
                  <button
                    type="button"
                    className="modal-inline-link"
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        role: currentView === "store" ? "store_owner" : "customer",
                      }));
                      setCurrentView("register");
                    }}
                  >
                    Register
                  </button>
                </span>
                {currentView === "customer" ? (
                  <button
                    type="button"
                    className="modal-action-link"
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, role: "store_owner" }));
                      setCurrentView("store");
                    }}
                  >
                    Store Owner? ↗
                  </button>
                ) : (
                  <button
                    type="button"
                    className="modal-action-link"
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, role: "customer" }));
                      setCurrentView("customer");
                    }}
                  >
                    Customer Sign In ↗
                  </button>
                )}
              </div>
            )}
          </small>
        )}
      </div>
    </div>
  );
}
