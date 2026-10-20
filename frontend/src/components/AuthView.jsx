import React, { useState } from "react";
import { api } from "../services/api";

export default function AuthView({ onAuthenticated }) {
  const [mode, setMode] = useState("login"); // 'login' | 'register'
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.email.trim() || !form.password) {
      setError("Please enter your email and password.");
      return;
    }
    if (mode === "register" && form.name.trim().length < 2) {
      setError("Please enter your full name.");
      return;
    }

    setLoading(true);
    try {
      const user =
        mode === "login"
          ? await api.login(form.email, form.password)
          : await api.register(form.name, form.email, form.password);
      onAuthenticated(user);
    } catch (err) {
      setError(err.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async () => {
    setLoading(true);
    try {
      const user = await api.login("admin@linkpulse.dev", "admin123");
      onAuthenticated(user);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="brand" style={{ borderBottom: "none", paddingBottom: "0.5rem", justifyContent: "center" }}>
          <div className="brand-Orb" />
          <div>
            <h1>OMEN LINKPULSE</h1>
            <span>URL Shortener, QR Studio & Analytics</span>
          </div>
        </div>

        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${mode === "login" ? "active" : ""}`}
            onClick={() => {
              setMode("login");
              setError("");
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-tab ${mode === "register" ? "active" : ""}`}
            onClick={() => {
              setMode("register");
              setError("");
            }}
          >
            Create Account
          </button>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit}>
          {mode === "register" && (
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                className="input-field"
                placeholder="Enter your name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
          )}

          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              className="input-field"
              placeholder="you@company.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              className="input-field"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", justifyContent: "center", marginTop: "0.5rem" }}
            disabled={loading}
          >
            {loading
              ? "Please wait..."
              : mode === "login"
              ? "Sign In to Dashboard"
              : "Create Account"}
          </button>
        </form>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <button
          type="button"
          className="btn btn-secondary"
          style={{ width: "100%", justifyContent: "center" }}
          onClick={handleQuickDemo}
        >
          ⚡ Instant Demo Login (admin@linkpulse.dev)
        </button>
      </div>
    </div>
  );
}