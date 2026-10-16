import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";

export default function LoginModal({ type, close, setLoginModal }) {
  const { login, register } = useAuth();

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: type === "store" ? "store_owner" : "customer",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError(null);
  };

  // Handle role selection step
  if (type === "choose") {
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
            onClick={() => setLoginModal("customer")}
          >
            Customer
          </button>

          <button
            className="secondary full"
            onClick={() => setLoginModal("store")}
          >
            Store Owner
          </button>
        </div>
      </div>
    );
  }

  // Handle Form Submission (Login or Register)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (type === "register") {
        await register({
          full_name: formData.fullName,
          email: formData.email,
          password: formData.password,
          confirm_password: formData.confirmPassword,
          role: formData.role,
        });
      } else {
        // Customer or Store Owner Login
        await login({
          email_or_username: formData.email,
          password: formData.password,
        });
      }
      close();
    } catch (err) {
      setError(err.message || "An error occurred during authentication.");
    } finally {
      setLoading(false);
    }
  };

  const title =
    type === "customer"
      ? "Customer Login"
      : type === "store"
      ? "Store Owner Login"
      : "Create your TryWise account";

  return (
    <div className="back" onClick={close}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {/* CLOSE BUTTON */}
        <button className="x" onClick={close}>
          ×
        </button>

        {/* TITLE */}
        <label>{type === "register" ? "WELCOME" : "SIGN IN"}</label>
        <h2>{title}</h2>

        {error && (
          <div style={{ color: "#e53e3e", fontSize: "0.85rem", marginBottom: "1rem", backgroundColor: "#fff5f5", padding: "0.5rem 0.75rem", borderRadius: "4px", border: "1px solid #fed7d7" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* NAME FIELD FOR REGISTER */}
          {type === "register" && (
            <input
              placeholder="Full name"
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              required
            />
          )}

          {/* ROLE SELECT FOR REGISTER */}
          {type === "register" && (
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              style={{
                width: "100%",
                padding: "0.75rem",
                marginBottom: "1rem",
                borderRadius: "4px",
                border: "1px solid #ccc",
                backgroundColor: "#fff",
              }}
            >
              <option value="customer">Register as Customer</option>
              <option value="store_owner">Register as Store Owner</option>
            </select>
          )}

          {/* EMAIL / USERNAME */}
          <input
            placeholder="Email or Username"
            type="text"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
          />

          {/* PASSWORD */}
          <div className="password-input-wrapper">
            <input
              placeholder="Password"
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
            <button
              type="button"
              className="password-toggle-btn"
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
          {type === "register" && (
            <div className="password-input-wrapper">
              <input
                placeholder="Confirm Password"
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
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

          {/* SUBMIT BUTTON */}
          <button
            className="primary full"
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Processing..."
              : type === "register"
              ? "Register"
              : "Login"}
          </button>
        </form>

        <small style={{ marginTop: "1rem", display: "block", color: "#666" }}>
          {type === "register" ? (
            <span>
              Already have an account?{" "}
              <button
                style={{ background: "none", border: "none", color: "#000", textDecoration: "underline", cursor: "pointer", padding: 0 }}
                onClick={() => setLoginModal("customer")}
              >
                Log In
              </button>
            </span>
          ) : (
            <span>
              Don't have an account?{" "}
              <button
                style={{ background: "none", border: "none", color: "#000", textDecoration: "underline", cursor: "pointer", padding: 0 }}
                onClick={() => setLoginModal("register")}
              >
                Register
              </button>
            </span>
          )}
        </small>
      </div>
    </div>
  );
}
