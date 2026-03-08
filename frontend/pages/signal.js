import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchMarketSignal, fetchIndiaSignal } from "../services/api";

const REFRESH_MS = 5 * 60 * 1000;

function SignalBlock({ flag, title, data, error }) {
  const signalConfig = {
    BUY:        { color: "#2C4A3E", bg: "#F0F7F2", border: "#2C4A3E", barColor: "#2C4A3E" },
    HOLD:       { color: "#1E2D40", bg: "#EFF4FA", border: "#1E2D40", barColor: "#1E2D40" },
    "RISK ALERT": { color: "#8B3A3A", bg: "#FDF0F0", border: "#8B3A3A", barColor: "#8B3A3A" },
    AVOID:      { color: "#C17F4A", bg: "#FDF8EE", border: "#C17F4A", barColor: "#C17F4A" },
  };
  const sig = data?.signal || "HOLD";
  const cfg = signalConfig[sig] || signalConfig.HOLD;

  if (error) {
    return (
      <section style={{
        background: "white",
        border: "1px solid var(--border)",
        borderRadius: "16px",
        padding: "1.75rem",
        marginBottom: "1.5rem",
        boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
        borderLeft: "4px solid var(--rose)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
          <span style={{ fontSize: "1.3rem" }}>{flag}</span>
          <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: "1.1rem", fontWeight: 700 }}>{title}</h2>
        </div>
        <p style={{ color: "var(--rose)", margin: 0 }}>{error}</p>
      </section>
    );
  }

  if (!data) {
    return (
      <section style={{
        background: "white",
        border: "1px solid var(--border)",
        borderRadius: "16px",
        padding: "1.75rem",
        marginBottom: "1.5rem",
        boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
          <span style={{ fontSize: "1.3rem" }}>{flag}</span>
          <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: "1.1rem", fontWeight: 700 }}>{title}</h2>
        </div>
        <p style={{ color: "var(--ink-muted)", margin: 0 }}>Loading signal...</p>
      </section>
    );
  }

  return (
    <section style={{
      background: "white",
      border: "1px solid var(--border)",
      borderRadius: "16px",
      padding: "1.75rem",
      marginBottom: "1.5rem",
      boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
      borderLeft: `4px solid ${cfg.border}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
        <span style={{ fontSize: "1.3rem" }}>{flag}</span>
        <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: "1.1rem", fontWeight: 700 }}>{title}</h2>
      </div>

      <div style={{ background: cfg.bg, border: `1px solid ${cfg.border}20`, borderRadius: "12px", padding: "1.5rem", marginBottom: "1rem" }}>
        <p style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--ink-muted)", fontWeight: 500, marginBottom: "0.4rem", fontFamily: "DM Sans" }}>
          Market Signal
        </p>
        <p style={{ fontFamily: "Playfair Display, serif", fontSize: "clamp(2rem, 4vw, 2.8rem)", fontWeight: 700, color: cfg.color, lineHeight: 1, marginBottom: "0.5rem" }}>
          {sig}
        </p>
        <p style={{ fontSize: "0.9rem", color: "var(--ink-muted)", marginBottom: "0.75rem" }}>
          Confidence: {data?.confidence ?? 0}%
        </p>
        <div style={{ height: "6px", background: "var(--border)", borderRadius: "3px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${data?.confidence ?? 0}%`, background: cfg.barColor, borderRadius: "3px", transition: "width 0.6s ease" }} />
        </div>
      </div>

      <div style={{ background: "var(--surface-alt)", borderRadius: "10px", padding: "1rem 1.1rem", marginBottom: "0.75rem" }}>
        <p style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--gold)", fontWeight: 500, marginBottom: "0.4rem", fontFamily: "DM Sans" }}>Explanation</p>
        <p style={{ fontSize: "0.92rem", color: "var(--ink)", lineHeight: 1.7, margin: 0 }}>{data?.explanation}</p>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "1.25rem", padding: "0.75rem 0" }}>
        {[
          { label: "Regime", value: data?.market_regime },
          { label: "Risk Score", value: data?.risk_score != null ? `${data.risk_score}/100` : "—" },
          { label: "Crash Probability", value: data?.crash_probability != null ? `${(data.crash_probability * 100).toFixed(1)}%` : "—" },
          { label: "Volatility", value: data?.volatility != null ? data.volatility.toFixed(4) : "—" },
        ].map((m) => (
          <div key={m.label}>
            <p style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-muted)", fontWeight: 500, fontFamily: "DM Sans", marginBottom: "0.2rem" }}>{m.label}</p>
            <p style={{ fontFamily: "Playfair Display, serif", fontSize: "1rem", fontWeight: 700, color: "var(--ink)", margin: 0 }}>{m.value ?? "—"}</p>
          </div>
        ))}
      </div>

      {data?.updated_at && (
        <p style={{ fontSize: "0.78rem", color: "var(--ink-muted)", marginTop: "0.5rem", fontStyle: "italic" }}>
          Last updated: {new Date(data.updated_at).toLocaleString()}
        </p>
      )}
    </section>
  );
}

export default function SignalPage() {
  const [usData, setUsData] = useState(null);
  const [indiaData, setIndiaData] = useState(null);
  const [usError, setUsError] = useState("");
  const [indiaError, setIndiaError] = useState("");

  const load = async () => {
    try {
      setUsError("");
      setUsData(await fetchMarketSignal());
    } catch (err) {
      setUsError(err.message || "Failed to load US signal");
    }

    try {
      setIndiaError("");
      setIndiaData(await fetchIndiaSignal());
    } catch (err) {
      setIndiaError(err.message || "Failed to load India signal");
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <nav style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "white",
        borderBottom: "1px solid var(--border)",
        height: "56px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 1.5rem",
      }}>
        <Link href="/" style={{ fontFamily: "Playfair Display, serif", fontSize: "1.1rem", fontWeight: 700, textDecoration: "none", color: "var(--ink)" }}>
          KAIROS <span style={{ color: "var(--gold)", margin: "0 0.25rem" }}>·</span> Markets
        </Link>
        <div style={{ display: "flex", gap: "1.5rem" }}>
          <Link href="/dashboard" style={{ fontSize: "0.875rem", color: "var(--ink-muted)", textDecoration: "none" }}>Dashboard</Link>
          <Link href="/trading-assistant" style={{ fontSize: "0.875rem", color: "var(--ink-muted)", textDecoration: "none" }}>AI Assistant</Link>
        </div>
      </nav>

      <main className="page-wrap" style={{ background: "var(--bg)", minHeight: "100vh", padding: "2rem 1.5rem 4rem", maxWidth: "720px", margin: "0 auto" }}>
        <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: "1.75rem", margin: "0 0 0.25rem", color: "var(--ink)" }}>Market Signal Engine</h1>
        <p style={{ color: "var(--ink-muted)", margin: "0 0 2rem", fontSize: "1rem" }}>Actionable signals from AI market analysis — refreshes every 5 minutes</p>

        <SignalBlock flag="🇺🇸" title="US Market Signal" data={usData} error={usError} />
        <SignalBlock flag="🇮🇳" title="India Market Signal" data={indiaData} error={indiaError} />

        <p style={{ marginTop: "2rem" }}>
          <Link href="/dashboard" style={{
            display: "inline-block",
            padding: "0.6rem 1.2rem",
            borderRadius: "8px",
            textDecoration: "none",
            color: "white",
            background: "var(--navy)",
            fontWeight: 600,
          }}>View full dashboard</Link>
        </p>
      </main>
    </>
  );
}
