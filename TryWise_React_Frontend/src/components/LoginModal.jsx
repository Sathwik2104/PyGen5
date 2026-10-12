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
          <input
            placeholder="Password"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
          />

          {/* CONFIRM PASSWORD FOR REGISTER */}
          {type === "register" && (
            <input
              placeholder="Confirm Password"
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
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
