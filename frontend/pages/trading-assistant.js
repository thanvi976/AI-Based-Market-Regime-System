
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

// ── Kai: animated cat mascot ─────────────────────────────────────────────────
function KaiCat({ state = "idle" }) {
  return (
    <div style={{ width: "52px", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
      <svg viewBox="0 0 100 110" width="52" height="57" style={{ overflow: "visible" }}>

        {/* ── TAIL (behind body) ── */}
        <path
          d="M72,90 Q92,75 88,58 Q85,45 75,55"
          stroke="#C9A84C"
          strokeWidth="7"
          fill="none"
          strokeLinecap="round"
          style={{
            transformOrigin: "72px 90px",
            animation: state === "thinking"
              ? "kaiTailFast 0.35s ease-in-out infinite alternate"
              : "kaiTailWag 2.2s ease-in-out infinite alternate",
          }}
        />

        {/* ── BODY ── */}
        <ellipse cx="50" cy="82" rx="26" ry="22" fill="#D4A843" />

        {/* ── BELLY ── */}
        <ellipse cx="50" cy="86" rx="14" ry="13" fill="#E8C97A" />

        {/* ── HEAD ── */}
        <circle cx="50" cy="48" r="28" fill="#D4A843" />

        {/* ── EARS ── */}
        <polygon points="22,28 18,6 38,24" fill="#D4A843" />
        <polygon points="24,27 21,10 36,24" fill="#E8A0A0" />
        <polygon points="78,28 82,6 62,24" fill="#D4A843" />
        <polygon points="76,27 79,10 64,24" fill="#E8A0A0" />

        {/* ── FACE ── */}
        {state === "thinking" ? (
          <>
            <path d="M36,46 Q41,42 46,46" stroke="#2A1A08" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d="M54,46 Q59,42 64,46" stroke="#2A1A08" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </>
        ) : state === "bull" ? (
          <>
            <path d="M36,48 Q41,54 46,48" stroke="#2A1A08" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d="M54,48 Q59,54 64,48" stroke="#2A1A08" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </>
        ) : state === "bear" ? (
          <>
            <circle cx="41" cy="47" r="6" fill="#2A1A08" />
            <circle cx="59" cy="47" r="6" fill="#2A1A08" />
            <circle cx="43" cy="45" r="2" fill="white" />
            <circle cx="61" cy="45" r="2" fill="white" />
            <path d="M34,38 Q41,34 48,38" stroke="#8B3A3A" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M52,38 Q59,34 66,38" stroke="#8B3A3A" strokeWidth="2" fill="none" strokeLinecap="round" />
          </>
        ) : (
          <>
            <circle cx="41" cy="47" r="6.5" fill="#2A1A08" />
            <circle cx="59" cy="47" r="6.5" fill="#2A1A08" />
            <circle cx="43.5" cy="44.5" r="2.2" fill="white" />
            <circle cx="61.5" cy="44.5" r="2.2" fill="white" />
            <circle cx="44.8" cy="43.2" r="0.9" fill="white" opacity="0.6" />
            <circle cx="62.8" cy="43.2" r="0.9" fill="white" opacity="0.6" />
          </>
        )}

        {/* Nose */}
        <path d="M46,56 Q50,54 54,56 L50,60 Z" fill="#C47A7A" />

        {/* Mouth */}
        <path d="M44,61 Q50,66 56,61" stroke="#C47A7A" strokeWidth="1.8" fill="none" strokeLinecap="round" />

        {/* Whiskers */}
        <line x1="10" y1="52" x2="40" y2="55" stroke="#E8D5A3" strokeWidth="1.2" opacity="0.75" />
        <line x1="10" y1="58" x2="40" y2="58" stroke="#E8D5A3" strokeWidth="1.2" opacity="0.75" />
        <line x1="90" y1="52" x2="60" y2="55" stroke="#E8D5A3" strokeWidth="1.2" opacity="0.75" />
        <line x1="90" y1="58" x2="60" y2="58" stroke="#E8D5A3" strokeWidth="1.2" opacity="0.75" />

        {/* ── THINKING DOTS ── */}
        {state === "thinking" && (
          <g transform="translate(78, 10)">
            <circle cx="0" cy="0" r="3.5" fill="#C9A84C" style={{ animation: "kaiDot 1s ease-in-out infinite 0s" }} />
            <circle cx="10" cy="0" r="3.5" fill="#C9A84C" style={{ animation: "kaiDot 1s ease-in-out infinite 0.2s" }} />
            <circle cx="20" cy="0" r="3.5" fill="#C9A84C" style={{ animation: "kaiDot 1s ease-in-out infinite 0.4s" }} />
          </g>
        )}

      </svg>

      <span style={{
        fontSize: "0.62rem",
        fontFamily: "DM Sans, sans-serif",
        color: "#8C8070",
        letterSpacing: "0.1em",
        fontWeight: 500,
        textTransform: "uppercase",
      }}>Kai</span>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes kaiTailWag { from { transform: rotate(-10deg); } to { transform: rotate(10deg); } }
        @keyframes kaiTailFast { from { transform: rotate(-18deg); } to { transform: rotate(18deg); } }
        @keyframes kaiDot { 0%,100% { opacity: 0.2; transform: translateY(0px); } 50% { opacity: 1; transform: translateY(-5px); } }
      `}} />
    </div>
  );
}

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

  const badgeStyle = sig ? { buy: { bg: "#E8F5E9", color: "#2C4A3E", border: "#A5D6A7" }, sell: { bg: "#FDECEA", color: "#8B3A3A", border: "#FFAB91" }, hold: { bg: "#FFF8E7", color: "#C17F4A", border: "#FFE082" } }[parsed.signalEmoji] || { bg: sig.bg, color: sig.color, border: sig.border } : null;

  const kaiState = loading
    ? "thinking"
    : parsed?.signalEmoji === "buy"
      ? "bull"
      : parsed?.signalEmoji === "sell"
        ? "bear"
        : "idle";

  return (
    <main className="ta-page-pad" style={styles.wrap}>
      {/* ── Nav ─────────────────────────────────────────────────── */}
      <nav style={styles.nav}>
        <Link href="/" style={styles.navBrand}>KAIROS <span style={styles.navBrandDot}>·</span> Markets</Link>
        <div style={styles.navLinks}>
          <Link href="/" style={styles.navLink}>Home</Link>
          <Link href="/dashboard" style={styles.navLink}>Dashboard</Link>
          <Link href="/signal" style={styles.navLink}>Signal</Link>
        </div>
      </nav>

      {/* ── Header ──────────────────────────────────────────────── */}
      <header style={styles.header}>
        <h1 style={styles.pageTitle}>AI Trading Assistant</h1>
        <p style={styles.subtitle}>
          Get market insight on any stock — price, conditions & short-term outlook.{" "}
          <span style={styles.subtitleDisclaimer}>Not financial advice.</span>
        </p>
      </header>

      {/* ── Search form ─────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          maxWidth: "720px",
          margin: "2rem auto 0",
          padding: "0 1.5rem",
          paddingBottom: "1rem",
        }}>
          <KaiCat state={kaiState} />
          <div className="ta-input-wrap" style={{ flex: 1, ...styles.inputWrap }}>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. Can I invest in Reliance now?"
              style={styles.input}
              disabled={loading}
            />
            <button type="submit" disabled={loading} style={styles.button}>
              {loading ? (
                <><span style={styles.spinner} />Analyzing…</>
              ) : "Ask Kai"}
            </button>
          </div>
        </div>
      </form>

      {error && (
        <div style={styles.errorBox}>
          ⚠️ {error}
        </div>
      )}

      {/* ── Result ──────────────────────────────────────────────── */}
      {result && parsed && (
        <div style={styles.resultOuter}>
          <div style={styles.resultWrap}>

            {/* Stock header row */}
            <div className="ta-stock-header" style={styles.stockHeader}>
              <div style={styles.stockHeaderLeft}>
                <div style={styles.stockName}>{result.stock}</div>
                {result.price != null && (
                  <div style={styles.stockPrice}>
                    {currSymbol}{Number(result.price).toLocaleString()}
                    <span style={styles.stockExchange}>{result.currency === "USD" ? "NASDAQ/NYSE" : "NSE/BSE"}</span>
                  </div>
                )}
              </div>
              {/* Signal badge — theme colors from badgeStyle */}
              <div className="ta-signal-badge" style={{ ...styles.signalBadge, background: badgeStyle?.bg ?? sig?.bg, color: badgeStyle?.color ?? sig?.color, borderColor: badgeStyle?.border ?? sig?.border }}>
                
                {parsed.signal || sig.label}
              </div>
            </div>

            {/* Confidence bar */}
            {parsed.confidence !== null && (
              <div style={styles.confRow}>
                <span style={styles.confLabel}>AI Confidence</span>
                <div style={styles.confBarBg}>
                  <div style={{ ...styles.confBarFill, width: `${parsed.confidence}%`, background: badgeStyle?.color ?? sig?.dot }} />
                </div>
                <span style={{ ...styles.confPct, color: badgeStyle?.color ?? sig?.color }}>{parsed.confidence}%</span>
              </div>
            )}

            <div style={styles.divider} />

            {/* Two-column info grid */}
            <div className="ta-grid" style={styles.grid}>
              {/* Market Overview */}
              {parsed.marketOverview.length > 0 && (
                <div style={styles.card}>
                  <div style={styles.cardTitle}>Market Overview</div>
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
                  <div style={styles.cardTitle}>Stock Indicators</div>
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
                <div style={styles.outlookTitle}>Short-Term Outlook</div>
                <p style={styles.outlookText}>{parsed.shortTermOutlook}</p>
              </div>
            )}

            {/* Reason */}
            {parsed.reason && (
              <div style={styles.reasonBox}>
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
                    strong: ({ node, ...p }) => <strong style={styles.mdStrong} {...p} />,
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
        </div>
      )}

      <p style={styles.linkWrap}>
        <Link href="/dashboard" className="ta-link-btn" style={styles.linkBtn}>View Dashboard →</Link>
      </p>

      <style dangerouslySetInnerHTML={{ __html: `
        .ta-input-wrap:focus-within { border-color: #C9A84C !important; box-shadow: 0 0 0 3px rgba(201,168,76,0.12); }
        .ta-input-wrap input::placeholder { color: #8C8070; }
        .ta-link-btn:hover { background: #2a3d52 !important; color: #fff !important; }
        @media (max-width: 768px) {
          .ta-page-pad { padding-left: 1rem !important; padding-right: 1rem !important; }
          .ta-grid { grid-template-columns: 1fr !important; }
          .ta-stock-header { flex-direction: column !important; align-items: flex-start !important; }
          .ta-signal-badge { margin-top: 0.5rem !important; }
        }
      `}} />
    </main>
  );
}

// ── styles (Kairos theme: parchment, gold, navy) ─────────────────────────────
const styles = {
  wrap: {
    background: "#F8F5F0",
    minHeight: "100vh",
    fontFamily: "'DM Sans', sans-serif",
    padding: 0,
    margin: 0,
    color: "#1A1814",
  },
  nav: {
    background: "#fff",
    borderBottom: "1px solid #E8E2D9",
    height: "56px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 2rem",
  },
  navBrand: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "1.1rem",
    fontWeight: 700,
    textDecoration: "none",
    color: "#1A1814",
  },
  navBrandDot: { color: "#C9A84C" },
  navLinks: { display: "flex", gap: "1.5rem" },
  navLink: {
    color: "#6B6560",
    textDecoration: "none",
    fontSize: "0.875rem",
    fontFamily: "'DM Sans', sans-serif",
  },
  header: {
    maxWidth: "720px",
    margin: "0 auto",
    padding: "2.5rem 1.5rem 0",
  },
  pageTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "2rem",
    fontWeight: 700,
    fontStyle: "italic",
    color: "#1A1814",
    margin: "0 0 0.5rem",
  },
  subtitle: {
    fontSize: "0.95rem",
    color: "#6B6560",
    lineHeight: 1.6,
    margin: 0,
    fontFamily: "'DM Sans', sans-serif",
  },
  subtitleDisclaimer: { color: "#C9A84C" },
  form: {
    maxWidth: "720px",
    margin: "1.5rem auto 0",
    padding: "0 1.5rem",
  },
  inputWrap: {
    background: "#fff",
    border: "1.5px solid #E8E2D9",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    overflow: "hidden",
    transition: "border-color 0.2s",
  },
  input: {
    flex: 1,
    padding: "0.875rem 1rem",
    fontFamily: "'DM Sans', sans-serif",
    fontSize: "0.95rem",
    background: "transparent",
    border: "none",
    outline: "none",
    color: "#1A1814",
  },
  button: {
    background: "#1E2D40",
    color: "#fff",
    border: "none",
    padding: "0.875rem 1.5rem",
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 600,
    fontSize: "0.9rem",
    borderRadius: "0 10px 10px 0",
    cursor: "pointer",
    whiteSpace: "nowrap",
    display: "flex",
    alignItems: "center",
    gap: "0.4rem",
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
    background: "#FDECEA",
    border: "1px solid #FFAB91",
    color: "#8B3A3A",
    borderRadius: "10px",
    padding: "0.85rem 1rem",
    fontSize: "0.9rem",
    maxWidth: "720px",
    margin: "0.5rem auto 1rem",
  },

  resultOuter: {
    maxWidth: "720px",
    margin: "1.5rem auto",
    padding: "0 1.5rem",
  },
  resultWrap: {
    background: "#fff",
    border: "1px solid #E8E2D9",
    borderRadius: "16px",
    padding: "1.75rem",
    boxShadow: "0 4px 20px rgba(0,0,0,0.07)",
  },
  stockHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: "1rem",
    marginBottom: "1rem",
  },
  stockHeaderLeft: {},
  stockName: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "1.4rem",
    fontWeight: 700,
    color: "#1A1814",
  },
  stockPrice: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "1.75rem",
    fontWeight: 700,
    color: "#1A1814",
    display: "flex",
    alignItems: "baseline",
    flexWrap: "wrap",
    gap: "0.25rem",
    marginTop: "0.1rem",
  },
  stockExchange: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: "0.72rem",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    color: "#8C8070",
    marginLeft: "0.5rem",
  },
  signalBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.4rem",
    padding: "0.4rem 1rem",
    borderRadius: "999px",
    border: "1.5px solid",
    fontSize: "0.8rem",
    fontWeight: 700,
    fontFamily: "'DM Sans', sans-serif",
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
  confRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    marginBottom: "1rem",
  },
  confLabel: {
    fontSize: "0.8rem",
    color: "#6B6560",
    fontWeight: 500,
    fontFamily: "'DM Sans', sans-serif",
    whiteSpace: "nowrap",
    minWidth: "100px",
  },
  confBarBg: {
    flex: 1,
    height: "8px",
    background: "#E8E2D9",
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
    fontFamily: "'DM Sans', sans-serif",
    minWidth: "36px",
    textAlign: "right",
  },
  divider: {
    height: "1px",
    background: "#E8E2D9",
    margin: "1.25rem 0",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "1rem",
    marginBottom: "1rem",
  },
  card: {
    background: "#F8F5F0",
    border: "1px solid #E8E2D9",
    borderRadius: "12px",
    padding: "1rem 1.1rem",
  },
  cardTitle: {
    fontSize: "0.72rem",
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    color: "#C9A84C",
    fontWeight: 600,
    fontFamily: "'DM Sans', sans-serif",
    marginBottom: "0.75rem",
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
    color: "#1A1814",
    lineHeight: 1.6,
    fontFamily: "'DM Sans', sans-serif",
  },
  bullet: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    background: "#C9A84C",
    flexShrink: 0,
    marginTop: "0.45rem",
  },
  outlookBox: {
    background: "#F2EDE6",
    border: "1px solid #E8E2D9",
    borderRadius: "12px",
    padding: "1rem 1.1rem",
    marginBottom: "1rem",
  },
  outlookTitle: {
    fontSize: "0.72rem",
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    color: "#C9A84C",
    fontWeight: 600,
    fontFamily: "'DM Sans', sans-serif",
    marginBottom: "0.5rem",
  },
  outlookText: {
    margin: 0,
    fontSize: "0.92rem",
    color: "#1A1814",
    lineHeight: 1.7,
    fontFamily: "'DM Sans', sans-serif",
  },
  reasonBox: {
    borderLeft: "3px solid #C9A84C",
    paddingLeft: "1rem",
    margin: "1rem 0",
  },
  reasonLabel: {
    fontSize: "0.78rem",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    color: "#6B6560",
    fontFamily: "'DM Sans', sans-serif",
    marginBottom: "0.35rem",
  },
  reasonText: {
    margin: 0,
    fontSize: "0.92rem",
    color: "#1A1814",
    lineHeight: 1.65,
    fontFamily: "'DM Sans', sans-serif",
  },
  rawBox: {
    fontSize: "0.92rem",
    color: "#1A1814",
    lineHeight: 1.65,
    fontFamily: "'DM Sans', sans-serif",
  },
  mdH3: {
    fontSize: "0.95rem",
    fontWeight: 700,
    color: "#1A1814",
    marginTop: "1rem",
    marginBottom: "0.3rem",
    borderBottom: "1px solid #E8E2D9",
    paddingBottom: "0.2rem",
    fontFamily: "'Playfair Display', serif",
  },
  mdUl: { paddingLeft: "1.2rem", margin: "0.25rem 0 0.75rem" },
  mdLi: { marginBottom: "0.4rem", lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif" },
  mdP:  { marginBottom: "0.7rem", fontFamily: "'DM Sans', sans-serif" },
  mdStrong: { color: "#1E2D40" },
  disclaimer: {
    marginTop: "1.25rem",
    padding: "0.85rem 1rem",
    background: "#FFF8E7",
    border: "1px solid rgba(201,168,76,0.35)",
    borderRadius: "8px",
    fontSize: "0.82rem",
    color: "#8B6914",
    lineHeight: 1.55,
    fontFamily: "'DM Sans', sans-serif",
  },
  linkWrap: { marginTop: "2rem", padding: "0 1.5rem", maxWidth: "720px", marginLeft: "auto", marginRight: "auto" },
  linkBtn: {
    display: "inline-block",
    padding: "0.65rem 1.4rem",
    border: "none",
    borderRadius: "8px",
    fontFamily: "'DM Sans', sans-serif",
    fontSize: "0.875rem",
    fontWeight: 600,
    color: "#fff",
    background: "#1E2D40",
    textDecoration: "none",
    transition: "all 0.2s",
  },
};