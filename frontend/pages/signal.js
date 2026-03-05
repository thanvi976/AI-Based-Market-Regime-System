import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchMarketSignal } from "../services/api";

const REFRESH_MS = 5 * 60 * 1000;
const signalColors = { BUY: "#2e7d32", HOLD: "#1565c0", "RISK ALERT": "#c62828", AVOID: "#ef6c00" };

export default function SignalPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setError("");
      setData(await fetchMarketSignal());
    } catch (err) {
      setError(err.message || "Failed to load signal");
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => clearInterval(interval);
  }, []);

  if (error) {
    return (
      <main style={wrap}>
        <nav style={nav}>
          <Link href="/" style={navLink}>Home</Link>
          <Link href="/dashboard" style={navLink}>Dashboard</Link>
        </nav>
        <h1>Market Signal Engine</h1>
        <p style={{ color: "#c62828" }}>{error}</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main style={wrap}>
        <nav style={nav}>
          <Link href="/" style={navLink}>Home</Link>
          <Link href="/dashboard" style={navLink}>Dashboard</Link>
        </nav>
        <h1>Market Signal Engine</h1>
        <p>Loading signal...</p>
      </main>
    );
  }

  const signal = data.signal || "HOLD";
  const color = signalColors[signal] || "#374151";

  return (
    <main style={wrap}>
      <nav style={nav}>
        <Link href="/" style={navLink}>Home</Link>
        <Link href="/dashboard" style={navLink}>Dashboard</Link>
      </nav>

      <h1 style={pageTitle}>Market Signal Engine</h1>
      <p style={subtitle}>Actionable signal from AI market analysis</p>

      <section style={signalCard}>
        <p style={signalLabel}>Market Signal</p>
        <p style={{ ...signalValue, color }}>{signal}</p>
        <p style={confidenceLabel}>Confidence: {data.confidence ?? 0}%</p>
      </section>

      <section style={explanationCard}>
        <h2 style={sectionTitle}>Explanation</h2>
        <p style={explanationText}>{data.explanation}</p>
      </section>

      <section style={contextCard}>
        <h2 style={sectionTitle}>Underlying metrics</h2>
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
      </section>

      <p style={{ marginTop: "2rem" }}>
        <Link href="/dashboard" style={buttonStyle}>View full dashboard</Link>
      </p>
    </main>
  );
}

const wrap = {
  maxWidth: "720px",
  margin: "0 auto",
  padding: "2rem 1rem",
  fontFamily: "system-ui, -apple-system, sans-serif",
};
const nav = { marginBottom: "2rem", display: "flex", gap: "1rem" };
const navLink = { color: "#1565c0", textDecoration: "none", fontSize: "0.95rem" };
const pageTitle = { fontSize: "1.75rem", margin: "0 0 0.25rem" };
const subtitle = { color: "#6b7280", margin: "0 0 2rem", fontSize: "1rem" };
const signalCard = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: "1rem",
  padding: "2rem",
  boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
  marginBottom: "1.5rem",
};
const signalLabel = { margin: 0, fontSize: "0.9rem", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" };
const signalValue = { margin: "0.5rem 0", fontSize: "2.5rem", fontWeight: 700 };
const confidenceLabel = { margin: "0.5rem 0 0", fontSize: "1.1rem", color: "#374151" };
const explanationCard = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: "1rem",
  padding: "1.5rem",
  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  marginBottom: "1.5rem",
};
const sectionTitle = { margin: "0 0 0.75rem", fontSize: "1.1rem" };
const explanationText = { margin: 0, color: "#374151", lineHeight: 1.65 };
const contextCard = { background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "0.75rem", padding: "1.25rem", marginBottom: "1rem" };
const contextText = { margin: 0, fontSize: "0.95rem", color: "#4b5563" };
const updatedAt = { margin: "0.75rem 0 0", fontSize: "0.85rem", color: "#9ca3af" };
const buttonStyle = { display: "inline-block", padding: "0.6rem 1.2rem", borderRadius: "8px", textDecoration: "none", color: "#fff", background: "#1565c0", fontWeight: 600 };
