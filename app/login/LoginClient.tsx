"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginClient() {
  const router   = useRouter();
  const [pw, setPw]         = useState("");
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    setTimeout(() => inputRef.current?.focus(), 500);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pw.trim() || loading) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });

      if (res.ok) {
        router.push("/scan");
      } else {
        setError("Incorrect password. Try again.");
        setPw("");
        inputRef.current?.focus();
      }
    } catch {
      setError("Network error — check connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`login-shell ${mounted ? "mounted" : ""}`}>
      {/* Animated background */}
      <div className="login-bg">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
        <div className="grid-overlay" />
      </div>

      <div className="login-card">
        {/* Logo mark */}
        <div className="login-logo-wrap">
          <div className="login-hex">
            <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M24 4L42 14V34L24 44L6 34V14L24 4Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
              <path d="M24 14L33 19V29L24 34L15 29V19L24 14Z" fill="currentColor" opacity="0.15"/>
              <path d="M24 18L29 21V27L24 30L19 27V21L24 18Z" fill="currentColor" opacity="0.4"/>
            </svg>
          </div>
          <div className="login-brand">
            <span className="login-brand-main">BEYOND</span>
            <span className="login-brand-sub">SCANNER</span>
          </div>
        </div>

        <div className="login-divider" />

        <p className="login-desc">
          Staff portal — authorised access only
        </p>

        <form onSubmit={handleSubmit} className="login-form">
          <div className={`input-wrap ${error ? "has-error" : ""}`}>
            <label className="input-label">Access Code</label>
            <input
              ref={inputRef}
              type="password"
              value={pw}
              onChange={(e) => { setPw(e.target.value); setError(""); }}
              placeholder="Enter scanner password"
              className="login-input"
              autoComplete="current-password"
              disabled={loading}
            />
            {error && <div className="input-error">{error}</div>}
          </div>

          <button
            type="submit"
            disabled={loading || !pw.trim()}
            className="login-btn"
          >
            {loading ? (
              <span className="login-spinner" />
            ) : (
              <>
                <span>Access Scanner</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </>
            )}
          </button>
        </form>

        <div className="login-footer">
          <div className="login-footer-dot" />
          <span>Secured connection</span>
          <div className="login-footer-dot" />
          <span>12-hour session</span>
          <div className="login-footer-dot" />
        </div>
      </div>
    </div>
  );
}
