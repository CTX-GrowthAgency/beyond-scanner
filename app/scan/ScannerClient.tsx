"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { ScanResponse, BookingInfo, EventInfo, UserInfo } from "@/types";

const RESCAN_COOLDOWN   = 3000;
const AUTO_CLEAR_RESULT = 10000;

// ─────────────────────────────────────────────────────────────────────────────
// Result Card
// ─────────────────────────────────────────────────────────────────────────────

function ResultCard({ result, onDismiss }: { result: ScanResponse; onDismiss: () => void }) {
  const fmt = (iso?: string) =>
    iso ? new Date(iso).toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    }) : "—";

  const fmtDate = (iso?: string) =>
    iso ? new Date(iso).toLocaleDateString("en-IN", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    }) : "—";

  const inr = (n?: number) =>
    n !== undefined ? `₹${n.toLocaleString("en-IN")}` : "—";

  type Cfg = { icon: string; label: string; sub: string; accent: string; pulse: string };
  const configs: Record<string, Cfg> = {
    valid:           { icon: "✓", label: "VERIFIED",     sub: "Ticket is valid — allow entry",     accent: "#22c55e", pulse: "pulse-green" },
    already_scanned: { icon: "⚠", label: "ALREADY USED", sub: "This ticket was already scanned",   accent: "#f59e0b", pulse: "pulse-amber" },
    invalid_payment: { icon: "✗", label: "NOT PAID",     sub: "Payment not completed",             accent: "#ef4444", pulse: "pulse-red"   },
    cancelled:       { icon: "✗", label: "CANCELLED",    sub: "This booking has been cancelled",   accent: "#ef4444", pulse: "pulse-red"   },
    not_found:       { icon: "?", label: "NOT FOUND",    sub: "Booking ID not in database",        accent: "#6b7280", pulse: ""            },
    error:           { icon: "!", label: "ERROR",        sub: (result as {outcome:"error";message:string}).message ?? "", accent: "#ef4444", pulse: "pulse-red" },
  };
  const cfg = configs[result.outcome] ?? configs.error;

  const booking     = "booking"     in result ? result.booking     as BookingInfo : undefined;
  const event       = "event"       in result ? result.event       as EventInfo   : undefined;
  const user        = "user"        in result ? result.user        as UserInfo    : undefined;
  const scannedAtPrev = "scannedAtPrev" in result ? (result as {scannedAtPrev:string}).scannedAtPrev : undefined;
  const scannedAt     = "scannedAt"     in result ? (result as {scannedAt:string}).scannedAt         : undefined;

  return (
    <div className="result-card" style={{ "--accent": cfg.accent } as React.CSSProperties}>
      <div className="result-header">
        <div className={`result-icon-wrap ${cfg.pulse}`}>
          <div className="result-icon">{cfg.icon}</div>
        </div>
        <div className="result-header-text">
          <div className="result-status">{cfg.label}</div>
          <div className="result-sub">{cfg.sub}</div>
        </div>
        <button className="result-dismiss" onClick={onDismiss}>✕</button>
      </div>

      {/* Action Button */}
      <div className="result-action">
        <button className="result-scan-next" onClick={onDismiss}>
          Scan Next Ticket
        </button>
      </div>

      {result.outcome === "already_scanned" && scannedAtPrev && (
        <div className="already-banner">
          <div className="already-banner-label">Previously scanned at</div>
          <div className="already-banner-time">{fmt(scannedAtPrev)}</div>
        </div>
      )}

      {booking && (
        <div className="result-body">
          <div className="result-section">
            <div className="result-row"><span className="rl">Booking ID</span><span className="rv mono">{booking.bookingId}</span></div>
            {event && <>
              <div className="result-row"><span className="rl">Event</span><span className="rv">{event.title}</span></div>
              <div className="result-row"><span className="rl">Venue</span><span className="rv">{event.venueName}</span></div>
              <div className="result-row"><span className="rl">Date</span><span className="rv">{fmtDate(event.date)}</span></div>
            </>}
            <div className="result-row"><span className="rl">Payment</span><span className={`rv status-badge status-${booking.paymentStatus}`}>{booking.paymentStatus}</span></div>
            <div className="result-row"><span className="rl">Status</span><span className={`rv status-badge status-${booking.ticketStatus}`}>{booking.ticketStatus}</span></div>
          </div>

          {user && (
            <div className="result-section">
              <div className="section-title">Attendee</div>
              <div className="result-row"><span className="rl">Name</span><span className="rv rv-name">{user.name}</span></div>
              <div className="result-row"><span className="rl">Email</span><span className="rv rv-small">{user.email}</span></div>
              <div className="result-row"><span className="rl">Phone</span><span className="rv">{user.phone}</span></div>
            </div>
          )}

          {booking.tickets && booking.tickets.length > 0 && (
            <div className="result-section">
              <div className="section-title">Pass Details</div>
              
              {/* Summary */}
              <div className="pass-summary">
                <div className="pass-summary-row">
                  <span className="pass-summary-label">Total Passes</span>
                  <span className="pass-summary-value">
                    {booking.tickets.reduce((sum, t) => sum + t.quantity, 0)} passes
                  </span>
                </div>
                <div className="pass-summary-row">
                  <span className="pass-summary-label">Pass Types</span>
                  <span className="pass-summary-value">{booking.tickets.length} types</span>
                </div>
              </div>

              {/* Detailed breakdown */}
              <div className="tickets-list">
                {booking.tickets.map((t, i) => (
                  <div key={i} className="ticket-row">
                    <div className="ticket-info">
                      <div className="ticket-name">{t.name}</div>
                      <div className="ticket-details">
                        {t.quantity} × {inr(t.price)} = {inr(t.lineTotal)}
                      </div>
                    </div>
                    <div className="ticket-qty-badge">
                      ×{t.quantity}
                    </div>
                  </div>
                ))}
              </div>

              {/* Payment breakdown */}
              <div className="payment-breakdown">
                <div className="payment-row">
                  <span className="payment-label">Subtotal</span>
                  <span className="payment-value">{inr(booking.pricing?.subtotal)}</span>
                </div>
                <div className="payment-row">
                  <span className="payment-label">Convenience Fee</span>
                  <span className="payment-value">{inr(booking.pricing?.convenienceFee)}</span>
                </div>
                <div className="payment-row">
                  <span className="payment-label">GST</span>
                  <span className="payment-value">{inr(booking.pricing?.gst)}</span>
                </div>
                <div className="payment-row payment-total">
                  <span className="payment-label">Total Paid</span>
                  <span className="payment-value total-amount">{inr(booking.pricing?.grandTotal)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="result-section result-ts">
            {scannedAt && result.outcome === "valid" && (
              <div className="result-row"><span className="rl">Scanned at</span><span className="rv">{fmt(scannedAt)}</span></div>
            )}
            {booking.paidAt && (
              <div className="result-row"><span className="rl">Paid at</span><span className="rv">{fmt(booking.paidAt)}</span></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Scanner
// ─────────────────────────────────────────────────────────────────────────────

export default function ScannerClient() {
  const router = useRouter();

  const [result,    setResult]    = useState<ScanResponse | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [flash,     setFlash]     = useState<"green" | "red" | null>(null);
  const [camReady,  setCamReady]  = useState(false);
  const [camError,  setCamError]  = useState<string | null>(null);
  const [manualId,  setManualId]  = useState("");
  const [tab,       setTab]       = useState<"camera" | "manual">("camera");
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [scanCount, setScanCount] = useState({ valid: 0, failed: 0 });
  const [sessionStart] = useState(() => new Date());
  const [sessionMins, setSessionMins] = useState(0);

  const scannerRef    = useRef<import("html5-qrcode").Html5Qrcode | null>(null);
  const cooldownRef   = useRef(false);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Update session timer every minute
  useEffect(() => {
    const t = setInterval(() => {
      setSessionMins(Math.floor((Date.now() - sessionStart.getTime()) / 60000));
    }, 30000);
    return () => clearInterval(t);
  }, [sessionStart]);

  // ── Core scan ───────────────────────────────────────────────────────────────
  const performScan = useCallback(async (rawId: string) => {
    if (loading || cooldownRef.current) return;
    const clean = rawId.trim();
    if (!clean) return;

    cooldownRef.current = true;
    setLoading(true);
    setResult(null);
    if (clearTimerRef.current) clearTimeout(clearTimerRef.current);

    try {
      const res  = await fetch("/api/scan", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ bookingId: clean }),
      });
      const data: ScanResponse = await res.json();
      setResult(data);

      const isGood = data.outcome === "valid";
      setFlash(isGood ? "green" : "red");
      setScanCount(c => ({
        valid:  isGood ? c.valid + 1 : c.valid,
        failed: isGood ? c.failed    : c.failed + 1,
      }));

      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(isGood ? [60, 0, 60] : [80, 50, 80, 50, 80]);
      }
      setTimeout(() => setFlash(null), 600);
      // Remove auto-clear - results stay until manually dismissed

    } catch {
      setResult({ outcome: "error", message: "Network error — check connection" });
      setFlash("red");
      setTimeout(() => setFlash(null), 600);
    } finally {
      setLoading(false);
      setTimeout(() => { cooldownRef.current = false; }, RESCAN_COOLDOWN);
    }
  }, [loading]);

  // ── Extract bookingId from QR value ────────────────────────────────────────
  const extractBookingId = (raw: string): string => {
    const trimmed = raw.trim();
    try {
      const url = new URL(trimmed);
      const param = url.searchParams.get("bookingId");
      if (param) return param;
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts.length > 0) return parts[parts.length - 1];
    } catch { /* not a URL */ }
    return trimmed;
  };

  // ── Init camera ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (tab !== "camera" || !cameraEnabled) return;
    let cancelled = false;

    async function init() {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;

        const scanner = new Html5Qrcode("qr-reader");
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 30,                  // High FPS — catch QR quickly
            // NO qrbox — scans the ENTIRE camera frame, no alignment needed
            aspectRatio: 1.7778,      // 16:9 fills the screen naturally
            disableFlip: false,
            videoConstraints: {
              facingMode: "environment",
              width:  { ideal: 1280 },
              height: { ideal: 720  },
            },
          },
          (decoded) => performScan(extractBookingId(decoded)),
          () => {}  // QR not found in frame — silent
        );

        if (!cancelled) setCamReady(true);
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.toLowerCase().includes("permission")) {
          setCamError("Camera permission denied. Allow camera access and refresh.");
        } else if (msg.toLowerCase().includes("not found") || msg.toLowerCase().includes("no camera")) {
          setCamError("No camera found on this device.");
        } else {
          setCamError(`Camera error: ${msg}`);
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      scannerRef.current?.stop().catch(() => {});
      scannerRef.current = null;
      setCamReady(false);
      setCamError(null);
    };
  }, [tab, performScan, cameraEnabled]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  async function handleManualScan() {
    if (!manualId.trim() || loading) return;
    await performScan(manualId);
    setManualId("");
  }

  function dismissResult() {
    setResult(null);
    if (clearTimerRef.current) {
      clearTimeout(clearTimerRef.current);
      clearTimerRef.current = null;
    }
  }

  function toggleCamera() {
    setCameraEnabled(prev => !prev);
  }

  return (
    <div className="scanner-shell">
      {flash && <div className={`flash-overlay ${flash}`} />}

      {/* Top bar */}
      <div className="topbar">
        <div className="topbar-brand">
          <svg className="topbar-hex" viewBox="0 0 32 32" fill="none">
            <path d="M16 3L28 10V22L16 29L4 22V10L16 3Z" stroke="currentColor" strokeWidth="1.2" fill="none"/>
            <path d="M16 10L22 14V20L16 23L10 20V14L16 10Z" fill="currentColor" opacity="0.2"/>
          </svg>
          <div>
            <div className="topbar-name">BEYOND</div>
            <div className="topbar-sub">Scanner</div>
          </div>
        </div>
        <div className="topbar-right">
          {loading && <div className="top-spinner" />}
          <div className="session-info">
            <span className="session-dot" />
            <span>{sessionMins}m</span>
          </div>
          <button className="logout-btn" onClick={handleLogout}>Sign out</button>
        </div>
      </div>

      <div className="scanner-content">

        {/* Stats */}
        <div className="stats-row">
          <div className="stat"><div className="stat-val stat-green">{scanCount.valid}</div><div className="stat-lbl">Verified</div></div>
          <div className="stat-divider" />
          <div className="stat"><div className="stat-val stat-red">{scanCount.failed}</div><div className="stat-lbl">Rejected</div></div>
          <div className="stat-divider" />
          <div className="stat"><div className="stat-val">{scanCount.valid + scanCount.failed}</div><div className="stat-lbl">Total</div></div>
        </div>

        {/* Tabs */}
        <div className="tab-row">
          <button className={`tab-btn ${tab === "camera" ? "active" : ""}`} onClick={() => setTab("camera")}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
            Camera Scan
          </button>
          <button className={`tab-btn ${tab === "manual" ? "active" : ""}`} onClick={() => setTab("manual")}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <path d="M8 12h8M12 8v8"/>
            </svg>
            Manual Entry
          </button>
          {tab === "camera" && (
            <button 
              className={`camera-toggle-btn ${cameraEnabled ? "on" : "off"}`} 
              onClick={toggleCamera}
              title={cameraEnabled ? "Turn off camera" : "Turn on camera"}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                {cameraEnabled ? (
                  <>
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                    <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2"/>
                  </>
                ) : (
                  <>
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </>
                )}
              </svg>
              {cameraEnabled ? "Camera On" : "Camera Off"}
            </button>
          )}
        </div>

        {/* Camera */}
        {tab === "camera" && (
          <div className={`viewfinder ${camReady && !camError ? "ready" : ""}`}>
            {/* html5-qrcode mounts here — fills the entire frame */}
            <div id="qr-reader" style={{ width: "100%", height: "100%" }} />

            {/* Subtle corner indicators — decorative only, not a restriction box */}
            {camReady && !camError && (
              <div className="vf-overlay">
                <div className="corner tl" /><div className="corner tr" />
                <div className="corner bl" /><div className="corner br" />
                <div className="vf-hint">Point at any QR code — no need to align</div>
              </div>
            )}

            {camError && (
              <div className="cam-state">
                <div className="cam-icon">📷</div>
                <div className="cam-title">Camera unavailable</div>
                <div className="cam-msg">{camError}</div>
                <button className="cam-switch" onClick={() => setTab("manual")}>Switch to Manual Entry</button>
              </div>
            )}

            {!camReady && !camError && (
              <div className="cam-state">
                {!cameraEnabled ? (
                  <>
                    <div className="cam-icon">📷</div>
                    <div className="cam-title">Camera is off</div>
                    <div className="cam-msg">Toggle the camera switch above to enable scanning</div>
                    <button className="cam-switch" onClick={() => setCameraEnabled(true)}>Turn Camera On</button>
                  </>
                ) : (
                  <>
                    <div className="cam-spinner" />
                    <div className="cam-msg">Starting camera…</div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Processing */}
        {loading && (
          <div className="processing">
            <div className="proc-spinner" />
            <span>Verifying with database…</span>
          </div>
        )}

        {/* Result */}
        {result && !loading && (
          <ResultCard result={result} onDismiss={dismissResult} />
        )}

        {/* Manual entry */}
        {tab === "manual" && (
          <div className="manual-wrap">
            <div className="manual-label">Enter Booking ID</div>
            <div className="manual-row">
              <input
                type="text"
                placeholder="Enter any booking ID format"
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleManualScan()}
                className="manual-input"
                disabled={loading}
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                onClick={handleManualScan}
                disabled={loading || !manualId.trim()}
                className="manual-btn"
              >
                {loading ? <span className="btn-spinner" /> : "Verify"}
              </button>
            </div>
            <div className="manual-hint">
              Enter any booking ID format - accepts letters, numbers, symbols, and mixed case
            </div>
          </div>
        )}

        {/* Idle hint */}
        {!result && !loading && tab === "camera" && camReady && (
          <div className="idle-hint">
            <div className="idle-hint-dot" />
            <span>Scanner active — just point at a QR code anywhere in frame</span>
          </div>
        )}
      </div>
    </div>
  );
}