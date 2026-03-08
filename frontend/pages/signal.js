import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchMarketSignal, fetchIndiaSignal } from "../services/api";

const REFRESH_MS = 5 * 60 * 1000;
const signalColors = {
  BUY: "#2e7d32",
  HOLD: "#1565c0",
  "RISK ALERT": "#c62828",
  AVOID: "#ef6c00",
};
const signalBg = {
  BUY: "#f0fdf4",
  HOLD: "#eff6ff",
  "RISK ALERT": "#fef2f2",
  AVOID: "#fff7ed",
};
const signalBorder = {
  BUY: "#86efac",
  HOLD: "#bfdbfe",
  "RISK ALERT": "#fecaca",
  AVOID: "#fed7aa",
};

function SignalSection({ flag, title, data, error: sectionError }) {
  if (sectionError) {
    return (
      <section style={marketSection}>
        <div style={sectionHeader}>
          <span style={flagStyle}>{flag}</span>
          <h2 style={marketTitle}>{title}</h2>
        </div>
        <p style={{ color: "#c62828", margin: 0 }}>{sectionError}</p>
      </section>
    );
  }

  if (!data) {
    return (
      <section style={marketSection}>
        <div style={sectionHeader}>
          <span style={flagStyle}>{flag}</span>
          <h2 style={marketTitle}>{title}</h2>
        </div>
        <p style={{ color: "#6b7280", margin: 0 }}>Loading signal...</p>
      </section>
    );
  }

  const signal = data.signal || "HOLD";
  const color = signalColors[signal] || "#374151";
  const bg = signalBg[signal] || "#f9fafb";
  const border = signalBorder[signal] || "#e5e7eb";

  return (
    <section style={marketSection}>
      {/* Section header */}
      <div style={sectionHeader}>
        <span style={flagStyle}>{flag}</span>
        <h2 style={marketTitle}>{title}</h2>
      </div>

      {/* Signal card */}
      <div style={{ ...signalCard, background: bg, borderColor: border }}>
        <p style={signalLabel}>Market Signal</p>
        <p style={{ ...signalValue, color }}>{signal}</p>
        <p style={confidenceLabel}>Confidence: {data.confidence ?? 0}%</p>

        {/* Confidence bar */}
        <div style={confBarBg}>
          <div style={{ ...confBarFill, width: `${data.confidence ?? 0}%`, background: color }} />
        </div>
      </div>

      {/* Explanation */}
      <div style={explanationCard}>
        <h3 style={sectionTitle}>Explanation</h3>
        <p style={explanationText}>{data.explanation}</p>
      </div>

      {/* Underlying metrics */}
      <div style={contextCard}>
        <h3 style={sectionTitle}>Underlying metrics</h3>
        <p style={contextText}>
          Regime: <strong>{data.market_regime ?? "—"}</strong>
          {" · "}
          Risk score: <strong>{data.risk_score ?? "—"}/100</strong>
          {" · "}
          Volatility: <strong>{(data.volatility ?? 0).toFixed(4)}</strong>
          {" · "}
          Crash probability: <strong>{((data.crash_probability ?? 0) * 100).toFixed(1)}%</strong>
        </p>
        {data.updated_at && (
          <p style={updatedAt}>Last updated: {new Date(data.updated_at).toLocaleString()}</p>
        )}
      </div>
    </section>
  );
}

export default function SignalPage() {
  const [usData, setUsData] = useState(null);
  const [indiaData, setIndiaData] = useState(null);
  const [usError, setUsError] = useState("");
  const [indiaError, setIndiaError] = useState("");

  const load = async () => {
    // US signal
    try {
      setUsError("");
      setUsData(await fetchMarketSignal());
    } catch (err) {
      setUsError(err.message || "Failed to load US signal");
    }

    // India signal
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
    <main style={wrap}>
      <nav style={nav}>
        <Link href="/" style={navLink}>Home</Link>
        <Link href="/dashboard" style={navLink}>Dashboard</Link>
      </nav>

      <h1 style={pageTitle}>Market Signal Engine</h1>
      <p style={subtitle}>Actionable signals from AI market analysis — refreshes every 5 minutes</p>

      <SignalSection
        flag="🇺🇸"
        title="US Market Signal"
        data={usData}
        error={usError}
      />

      <SignalSection
        flag="🇮🇳"
        title="India Market Signal"
        data={indiaData}
        error={indiaError}
      />

      <p style={{ marginTop: "2rem" }}>
        <Link href="/dashboard" style={buttonStyle}>View full dashboard</Link>
      </p>
    </main>
  );
}

// ── styles ────────────────────────────────────────────────────────────────────
const wrap = {
  maxWidth: "720px",
  margin: "0 auto",
  padding: "2rem 1rem 4rem",
  fontFamily: "system-ui, -apple-system, sans-serif",
};
const nav = { marginBottom: "2rem", display: "flex", gap: "1rem" };
const navLink = { color: "#1565c0", textDecoration: "none", fontSize: "0.95rem" };
const pageTitle = { fontSize: "1.75rem", margin: "0 0 0.25rem" };
const subtitle = { color: "#6b7280", margin: "0 0 2rem", fontSize: "1rem" };

const marketSection = {
  border: "1px solid #e5e7eb",
  borderRadius: "1rem",
  padding: "1.5rem",
  background: "#fff",
  boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
  marginBottom: "1.5rem",
};
const sectionHeader = {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
  marginBottom: "1.25rem",
};
const flagStyle = { fontSize: "1.4rem" };
const marketTitle = { margin: 0, fontSize: "1.2rem", fontWeight: 700 };

const signalCard = {
  border: "1.5px solid",
  borderRadius: "0.75rem",
  padding: "1.5rem",
  marginBottom: "1rem",
};
const signalLabel = {
  margin: 0,
  fontSize: "0.8rem",
  color: "#6b7280",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};
const signalValue = { margin: "0.4rem 0 0.2rem", fontSize: "2.2rem", fontWeight: 700 };
const confidenceLabel = { margin: "0 0 0.75rem", fontSize: "1rem", color: "#374151" };
const confBarBg = {
  height: "8px",
  background: "rgba(0,0,0,0.08)",
  borderRadius: "999px",
  overflow: "hidden",
};
const confBarFill = {
  height: "100%",
  borderRadius: "999px",
  transition: "width 0.6s ease",
};

const explanationCard = {
  background: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: "0.75rem",
  padding: "1rem 1.1rem",
  marginBottom: "0.75rem",
};
const sectionTitle = { margin: "0 0 0.5rem", fontSize: "0.85rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" };
const explanationText = { margin: 0, color: "#374151", lineHeight: 1.65, fontSize: "0.95rem" };
const contextCard = {
  background: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: "0.75rem",
  padding: "1rem 1.1rem",
};
const contextText = { margin: 0, fontSize: "0.9rem", color: "#4b5563" };
const updatedAt = { margin: "0.6rem 0 0", fontSize: "0.82rem", color: "#9ca3af" };
const buttonStyle = {
  display: "inline-block",
  padding: "0.6rem 1.2rem",
  borderRadius: "8px",
  textDecoration: "none",
  color: "#fff",
  background: "#1565c0",
  fontWeight: 600,
};