import Link from "next/link";
import { useState } from "react";
import { askTradingAssistant } from "../services/api";
import ReactMarkdown from "react-markdown";
export default function TradingAssistantPage() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const q = question.trim();
    if (!q) return;
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const data = await askTradingAssistant(q);
      setResult(data);
    } catch (err) {
      setError(err.message || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={wrap}>
      <nav style={nav}>
        <Link href="/" style={navLink}>Home</Link>
        <Link href="/dashboard" style={navLink}>Dashboard</Link>
        <Link href="/signal" style={navLink}>Signal</Link>
      </nav>

      <h1 style={pageTitle}>AI Trading Assistant</h1>
      <p style={subtitle}>
        Ask about a stock and get market insight (price, conditions, short-term outlook). Not financial advice.
      </p>

      <form onSubmit={handleSubmit} style={form}>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. Can I invest in Reliance now?"
          style={inputStyle}
          disabled={loading}
        />
        <button type="submit" disabled={loading} style={buttonStyle}>
          {loading ? "Analyzing…" : "Ask"}
        </button>
      </form>

      {error && <p style={errorStyle}>{error}</p>}

      {result && (
        <section style={resultCard}>
          <h2 style={sectionTitle}>Response</h2>
          <p style={meta}>
            Stock: <strong>{result.stock}</strong>
            {result.price != null && (
              <> · Price: <strong>{result.currency === "USD" ? "$" : "₹"}{Number(result.price).toLocaleString()}</strong></>
            )}
          </p>
          <div style={analysisBox}>
            <ReactMarkdown>{result.analysis}</ReactMarkdown>
          </div>
        </section>
      )}

      <p style={{ marginTop: "2rem" }}>
        <Link href="/dashboard" style={linkButton}>View Dashboard</Link>
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
const subtitle = { color: "#6b7280", margin: "0 0 1.5rem", fontSize: "1rem" };
const form = { display: "flex", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap" };
const inputStyle = {
  flex: "1",
  minWidth: "200px",
  padding: "0.75rem 1rem",
  fontSize: "1rem",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
};
const buttonStyle = {
  padding: "0.75rem 1.5rem",
  fontSize: "1rem",
  fontWeight: 600,
  color: "#fff",
  background: "#1565c0",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
};
const errorStyle = { color: "#c62828", marginBottom: "1rem" };
const resultCard = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: "1rem",
  padding: "1.5rem",
  boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
  marginTop: "1.5rem",
};
const sectionTitle = { margin: "0 0 0.75rem", fontSize: "1.1rem" };
const meta = { margin: "0 0 1rem", fontSize: "0.95rem", color: "#4b5563" };
const analysisBox = {
  lineHeight: 1.6,
  color: "#374151",
};
const linkButton = {
  display: "inline-block",
  padding: "0.6rem 1.2rem",
  borderRadius: "8px",
  textDecoration: "none",
  color: "#fff",
  background: "#1565c0",
  fontWeight: 600,
};
