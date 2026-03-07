import Link from "next/link";
import { useState } from "react";
import { askTradingAssistant } from "../services/api";
import ReactMarkdown from "react-markdown";

// ── helpers ──────────────────────────────────────────────────────────────────
function parseAnalysis(raw = "") {
  // Normalise bullet chars and extract structured sections
  const text = raw.replace(/• /g, "\n- ");

  const sections = {
    marketOverview: [],
    stockIndicators: [],
    shortTermOutlook: "",
    signal: "",
    signalEmoji: "",
    reason: "",
    confidence: null,
    rawFallback: text,
  };

  // Extract confidence score
  const confMatch = text.match(/Confidence Score[:\s]+(\d+)%/i);
  if (confMatch) sections.confidence = parseInt(confMatch[1], 10);

  // Extract signal line (e.g. "🟡 Hold / Wait for clearer signals")
  const signalMatch = text.match(/AI Market Signal\s*([\s\S]*?)(?=\n|Reason)/i);
  if (signalMatch) {
    const raw = signalMatch[1].trim();
    sections.signal = raw;
    if (raw.includes("🟢") || raw.toLowerCase().includes("buy") || raw.toLowerCase().includes("bullish")) sections.signalEmoji = "buy";
    else if (raw.includes("🔴") || raw.toLowerCase().includes("sell") || raw.toLowerCase().includes("bearish")) sections.signalEmoji = "sell";
    else sections.signalEmoji = "hold";
  }

  // Extract reason
  const reasonMatch = text.match(/Reason\s+([\s\S]*?)(?=Confidence Score|$)/i);
  if (reasonMatch) sections.reason = reasonMatch[1].trim();

  // Extract Market Overview bullets
  const moMatch = text.match(/Market Overview\s+([\s\S]*?)(?=Stock Indicators|$)/i);
  if (moMatch) {
    sections.marketOverview = moMatch[1]
      .split("\n")
      .map(l => l.replace(/^[-*]\s*/, "").trim())
      .filter(Boolean);
  }

  // Extract Stock Indicators bullets
  const siMatch = text.match(/Stock Indicators\s+([\s\S]*?)(?=Short-Term Outlook|$)/i);
  if (siMatch) {
    sections.stockIndicators = siMatch[1]
      .split("\n")
      .map(l => l.replace(/^[-*]\s*/, "").trim())
      .filter(Boolean);
  }

  // Extract Short-Term Outlook
  const soMatch = text.match(/Short-Term Outlook\s+([\s\S]*?)(?=AI Market Signal|$)/i);
  if (soMatch) sections.shortTermOutlook = soMatch[1].trim();

  return sections;
}

const SIGNAL_CONFIG = {
  buy:  { label: "Buy",  bg: "#dcfce7", color: "#15803d", border: "#86efac", dot: "#22c55e" },
  sell: { label: "Sell", bg: "#fee2e2", color: "#b91c1c", border: "#fca5a5", dot: "#ef4444" },
  hold: { label: "Hold / Wait", bg: "#fef9c3", color: "#854d0e", border: "#fde047", dot: "#eab308" },
};

// ── component ─────────────────────────────────────────────────────────────────
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

  const parsed = result ? parseAnalysis(result.analysis) : null;
  const sig = parsed ? SIGNAL_CONFIG[parsed.signalEmoji] || SIGNAL_CONFIG.hold : null;
  const currSymbol = result?.currency === "USD" ? "$" : "₹";

  return (
    <main style={styles.wrap}>
      {/* ── Nav ─────────────────────────────────────────────────── */}
      <nav style={styles.nav}>
        <Link href="/" style={styles.navLink}>Home</Link>
        <Link href="/dashboard" style={styles.navLink}>Dashboard</Link>
        <Link href="/signal" style={styles.navLink}>Signal</Link>
      </nav>

      {/* ── Header ──────────────────────────────────────────────── */}
      <header style={styles.header}>
        <div style={styles.headerIcon}>📈</div>
        <div>
          <h1 style={styles.pageTitle}>AI Trading Assistant</h1>
          <p style={styles.subtitle}>
            Get market insight on any stock — price, conditions & short-term outlook.{" "}
            <span style={{ color: "#9ca3af" }}>Not financial advice.</span>
          </p>
        </div>
      </header>

      {/* ── Search form ─────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.inputWrap}>
          <span style={styles.inputIcon}>🔍</span>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. Can I invest in Reliance now?"
            style={styles.input}
            disabled={loading}
          />
        </div>
        <button type="submit" disabled={loading} style={styles.button}>
          {loading ? (
            <><span style={styles.spinner} />Analyzing…</>
          ) : "Ask AI"}
        </button>
      </form>

      {error && (
        <div style={styles.errorBox}>
          ⚠️ {error}
        </div>
      )}

      {/* ── Result ──────────────────────────────────────────────── */}
      {result && parsed && (
        <div style={styles.resultWrap}>

          {/* Stock header row */}
          <div style={styles.stockHeader}>
            <div>
              <div style={styles.stockName}>{result.stock}</div>
              {result.price != null && (
                <div style={styles.stockPrice}>
                  {currSymbol}{Number(result.price).toLocaleString()}
                  <span style={styles.stockExchange}>{result.currency === "USD" ? "NASDAQ/NYSE" : "NSE/BSE"}</span>
                </div>
              )}
            </div>
            {/* Signal badge */}
            <div style={{ ...styles.signalBadge, background: sig.bg, color: sig.color, borderColor: sig.border }}>
              <span style={{ ...styles.signalDot, background: sig.dot }} />
              {parsed.signal || sig.label}
            </div>
          </div>

          {/* Confidence bar */}
          {parsed.confidence !== null && (
            <div style={styles.confRow}>
              <span style={styles.confLabel}>AI Confidence</span>
              <div style={styles.confBarBg}>
                <div style={{ ...styles.confBarFill, width: `${parsed.confidence}%`, background: sig.dot }} />
              </div>
              <span style={{ ...styles.confPct, color: sig.color }}>{parsed.confidence}%</span>
            </div>
          )}

          <div style={styles.divider} />

          {/* Two-column info grid */}
          <div style={styles.grid}>
            {/* Market Overview */}
            {parsed.marketOverview.length > 0 && (
              <div style={styles.card}>
                <div style={styles.cardTitle}>
                  <span style={styles.cardIcon}>🌐</span> Market Overview
                </div>
                <ul style={styles.list}>
                  {parsed.marketOverview.map((item, i) => (
                    <li key={i} style={styles.listItem}>
                      <span style={styles.bullet} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Stock Indicators */}
            {parsed.stockIndicators.length > 0 && (
              <div style={styles.card}>
                <div style={styles.cardTitle}>
                  <span style={styles.cardIcon}>📊</span> Stock Indicators
                </div>
                <ul style={styles.list}>
                  {parsed.stockIndicators.map((item, i) => (
                    <li key={i} style={styles.listItem}>
                      <span style={styles.bullet} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Short-term outlook */}
          {parsed.shortTermOutlook && (
            <div style={styles.outlookBox}>
              <div style={styles.cardTitle}><span style={styles.cardIcon}>🔭</span> Short-Term Outlook</div>
              <p style={styles.outlookText}>{parsed.shortTermOutlook}</p>
            </div>
          )}

          {/* Reason */}
          {parsed.reason && (
            <div style={{ ...styles.reasonBox, borderLeftColor: sig.dot }}>
              <div style={styles.reasonLabel}>Why this signal?</div>
              <p style={styles.reasonText}>{parsed.reason}</p>
            </div>
          )}

          {/* Fallback: if parsing yielded nothing, render raw markdown */}
          {!parsed.marketOverview.length && !parsed.stockIndicators.length && !parsed.shortTermOutlook && (
            <div style={styles.rawBox}>
              <ReactMarkdown
                components={{
                  h3: ({ node, ...p }) => <h3 style={styles.mdH3} {...p} />,
                  ul: ({ node, ...p }) => <ul style={styles.mdUl} {...p} />,
                  li: ({ node, ...p }) => <li style={styles.mdLi} {...p} />,
                  p:  ({ node, ...p }) => <p  style={styles.mdP}  {...p} />,
                  strong: ({ node, ...p }) => <strong style={{ color: "#1565c0" }} {...p} />,
                }}
              >
                {parsed.rawFallback}
              </ReactMarkdown>
            </div>
          )}

          <p style={styles.disclaimer}>
            ⚠️ This analysis is AI-generated and for informational purposes only. Always do your own research before investing.
          </p>
        </div>
      )}

      <p style={{ marginTop: "2rem" }}>
        <Link href="/dashboard" style={styles.linkBtn}>View Dashboard →</Link>
      </p>
    </main>
  );
}

// ── styles ────────────────────────────────────────────────────────────────────
const styles = {
  wrap: {
    maxWidth: "780px",
    margin: "0 auto",
    padding: "2rem 1.25rem 4rem",
    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
    color: "#111827",
  },
  nav: {
    display: "flex",
    gap: "1.25rem",
    marginBottom: "2rem",
  },
  navLink: {
    color: "#6b7280",
    textDecoration: "none",
    fontSize: "0.9rem",
    fontWeight: 500,
    letterSpacing: "0.01em",
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    gap: "1rem",
    marginBottom: "1.75rem",
  },
  headerIcon: {
    fontSize: "2rem",
    lineHeight: 1,
    marginTop: "0.1rem",
  },
  pageTitle: {
    fontSize: "1.75rem",
    fontWeight: 700,
    margin: "0 0 0.3rem",
    letterSpacing: "-0.02em",
  },
  subtitle: {
    fontSize: "0.95rem",
    color: "#4b5563",
    margin: 0,
  },
  form: {
    display: "flex",
    gap: "0.75rem",
    marginBottom: "1.5rem",
    flexWrap: "wrap",
  },
  inputWrap: {
    flex: 1,
    minWidth: "220px",
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  inputIcon: {
    position: "absolute",
    left: "0.85rem",
    fontSize: "1rem",
    pointerEvents: "none",
  },
  input: {
    width: "100%",
    padding: "0.75rem 1rem 0.75rem 2.5rem",
    fontSize: "0.95rem",
    border: "1.5px solid #d1d5db",
    borderRadius: "10px",
    outline: "none",
    background: "#f9fafb",
    boxSizing: "border-box",
  },
  button: {
    display: "flex",
    alignItems: "center",
    gap: "0.4rem",
    padding: "0.75rem 1.6rem",
    fontSize: "0.95rem",
    fontWeight: 600,
    color: "#fff",
    background: "linear-gradient(135deg,#1d4ed8,#1565c0)",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    whiteSpace: "nowrap",
    boxShadow: "0 2px 8px rgba(21,101,192,0.35)",
  },
  spinner: {
    display: "inline-block",
    width: "14px",
    height: "14px",
    border: "2px solid rgba(255,255,255,0.4)",
    borderTopColor: "#fff",
    borderRadius: "50%",
    animation: "spin 0.7s linear infinite",
  },
  errorBox: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#b91c1c",
    borderRadius: "10px",
    padding: "0.85rem 1rem",
    fontSize: "0.9rem",
    marginBottom: "1rem",
  },

  // Result wrapper
  resultWrap: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "16px",
    padding: "1.75rem",
    boxShadow: "0 4px 24px rgba(0,0,0,0.07)",
    marginTop: "0.5rem",
  },

  // Stock header
  stockHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: "1rem",
    marginBottom: "1rem",
  },
  stockName: {
    fontSize: "1.35rem",
    fontWeight: 700,
    letterSpacing: "-0.01em",
  },
  stockPrice: {
    fontSize: "1.6rem",
    fontWeight: 700,
    color: "#111827",
    display: "flex",
    alignItems: "baseline",
    gap: "0.5rem",
    marginTop: "0.1rem",
  },
  stockExchange: {
    fontSize: "0.75rem",
    fontWeight: 400,
    color: "#9ca3af",
    letterSpacing: "0.05em",
    textTransform: "uppercase",
  },
  signalBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.45rem",
    padding: "0.45rem 1rem",
    borderRadius: "999px",
    border: "1.5px solid",
    fontSize: "0.88rem",
    fontWeight: 700,
    letterSpacing: "0.01em",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  signalDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    display: "inline-block",
    flexShrink: 0,
  },

  // Confidence bar
  confRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    marginBottom: "1.25rem",
  },
  confLabel: {
    fontSize: "0.8rem",
    color: "#6b7280",
    fontWeight: 500,
    whiteSpace: "nowrap",
    minWidth: "100px",
  },
  confBarBg: {
    flex: 1,
    height: "8px",
    background: "#f3f4f6",
    borderRadius: "999px",
    overflow: "hidden",
  },
  confBarFill: {
    height: "100%",
    borderRadius: "999px",
    transition: "width 0.6s ease",
  },
  confPct: {
    fontSize: "0.85rem",
    fontWeight: 700,
    minWidth: "36px",
    textAlign: "right",
  },

  divider: {
    height: "1px",
    background: "#f3f4f6",
    margin: "0 0 1.25rem",
  },

  // Two-column grid
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "1rem",
    marginBottom: "1rem",
  },
  card: {
    background: "#f9fafb",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "1rem 1.1rem",
  },
  cardTitle: {
    fontSize: "0.82rem",
    fontWeight: 700,
    color: "#374151",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: "0.75rem",
    display: "flex",
    alignItems: "center",
    gap: "0.35rem",
  },
  cardIcon: {
    fontSize: "0.95rem",
  },
  list: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "flex",
    flexDirection: "column",
    gap: "0.55rem",
  },
  listItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: "0.6rem",
    fontSize: "0.9rem",
    color: "#374151",
    lineHeight: 1.5,
  },
  bullet: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    background: "#93c5fd",
    flexShrink: 0,
    marginTop: "0.45rem",
  },

  // Outlook
  outlookBox: {
    background: "#f0f9ff",
    border: "1px solid #bae6fd",
    borderRadius: "12px",
    padding: "1rem 1.1rem",
    marginBottom: "1rem",
  },
  outlookText: {
    margin: 0,
    fontSize: "0.92rem",
    color: "#0c4a6e",
    lineHeight: 1.65,
  },

  // Reason
  reasonBox: {
    borderLeft: "3px solid",
    paddingLeft: "1rem",
    marginBottom: "1.25rem",
  },
  reasonLabel: {
    fontSize: "0.78rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "#6b7280",
    marginBottom: "0.35rem",
  },
  reasonText: {
    margin: 0,
    fontSize: "0.92rem",
    color: "#374151",
    lineHeight: 1.65,
  },

  // Raw markdown fallback
  rawBox: {
    fontSize: "0.92rem",
    color: "#374151",
    lineHeight: 1.65,
  },
  mdH3: {
    fontSize: "0.95rem",
    fontWeight: 700,
    color: "#111827",
    marginTop: "1rem",
    marginBottom: "0.3rem",
    borderBottom: "1px solid #e5e7eb",
    paddingBottom: "0.2rem",
  },
  mdUl: { paddingLeft: "1.2rem", margin: "0.25rem 0 0.75rem" },
  mdLi: { marginBottom: "0.4rem", lineHeight: 1.6 },
  mdP:  { marginBottom: "0.7rem" },

  disclaimer: {
    marginTop: "1.25rem",
    padding: "0.75rem 1rem",
    background: "#fffbeb",
    border: "1px solid #fde68a",
    borderRadius: "8px",
    fontSize: "0.8rem",
    color: "#92400e",
    lineHeight: 1.5,
  },

  linkBtn: {
    display: "inline-block",
    padding: "0.6rem 1.25rem",
    borderRadius: "8px",
    textDecoration: "none",
    color: "#1565c0",
    background: "#eff6ff",
    fontWeight: 600,
    fontSize: "0.9rem",
    border: "1px solid #bfdbfe",
  },
};