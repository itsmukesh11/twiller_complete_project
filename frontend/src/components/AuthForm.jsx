import React, { useState } from "react";
import API from "../api";

export default function AuthForm({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  function validate() {
  if (!email) return "Email is required.";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return "Enter a valid email address.";
  if (!password) return "Password is required.";
  if (password.length < 6) return "Password must be at least 6 characters.";
  if (mode === "signup" && !name) return "Name is required.";
  return "";
  }

  async function handleSubmit(e) {
    e.preventDefault();
  setError("");
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setLoading(true);
    try {
      if (mode === "login") {
        const response = await API.post("/auth/login", { email, password });
        localStorage.setItem("token", response.data.token);
        onAuth(response.data.user);
      } else {
        await API.post("/auth/register", { name, email, password });
        alert("Registration successful! Please log in.");
        setMode("login");
      }
    } catch (err) {
  setError(err.response?.data?.message || err.message);
    }
  setLoading(false);
  }

  return (
    <div className="auth-form card">
      <h2 style={{textAlign:"center", color:"#1d9bf0"}}>Twiller</h2>
      <button
        type="button"
        style={{
          width: "100%",
          background: "#fff",
          color: "#444",
          border: "1.5px solid #e6ecf0",
          borderRadius: 22,
          padding: "10px 0",
          fontWeight: 600,
          fontSize: "1.05rem",
          marginBottom: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          cursor: "pointer",
          boxShadow: "0 1px 4px rgba(29,155,240,0.07)"
        }}
        onClick={() => window.location.href = "http://localhost:5000/auth/google"}
        title="Sign in with Google"
      >
        <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" style={{width:22, height:22, marginRight:8}} />
        Sign in with Google
      </button>
      {error && <div style={{color:"#d32f2f", marginBottom:10, textAlign:"center", fontWeight:500}}>{error}</div>}
      <form onSubmit={handleSubmit}>
        {mode === "signup" && (
          <input
            type="text"
            placeholder="Name (Gmail or Username)"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            style={{marginBottom:8}}
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          style={{marginBottom:8}}
        />
        <div className="password-input-wrapper">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password (min 6 chars)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="password-input"
          />
          <button
            type="button"
            className="password-eye-btn"
            onClick={() => setShowPassword((v) => !v)}
            tabIndex={-1}
            aria-label={showPassword ? "Hide password" : "Show password"}
            style={{ background: "none", border: "none", padding: 4 }}
          >
            {/* Inline SVG avoids external image loading issues */}
            {showPassword ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.94 17.94C16.425 19.037 14.5 19.661 12.5 19.661C7.5 19.661 3.45 16.496 1.5 12C2.59 9.302 4.3 7.098 6.44 5.59" stroke="#4A5568" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M15 9.5C15 11.985 12.985 14 10.5 14" stroke="#4A5568" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 12C3.5 7 7.5 4 12 4C16.5 4 20.5 7 22 12C20.5 17 16.5 20 12 20C7.5 20 3.5 17 2 12Z" stroke="#4A5568" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="12" r="3" stroke="#4A5568" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
        </div>
        <button type="submit" disabled={loading} style={{width:"100%",marginBottom:8}}>
          {loading ? "Please wait..." : mode === "login" ? "Login" : "Sign Up"}
        </button>
      </form>
      <div style={{textAlign:"center"}}>
        {mode === "login" ? (
          <>
            Don&apos;t have an account? 
            <button onClick={() => setMode("signup")} style={{ color: "#1d9bf0", background: "none", border: "none", cursor: "pointer" }}>Sign Up</button>
          </>
        ) : (
          <>
            Already have an account? 
            <button onClick={() => setMode("login")} style={{ color: "#1d9bf0", background: "none", border: "none", cursor: "pointer" }}>Login</button>
          </>
        )}
      </div>
    </div>
  );
}
