import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import MarketChart from "../components/MarketChart";
import {
  fetchIndiaHistory,
  fetchIndiaMarket,
  fetchMarketData,
  fetchMarketHistory,
  fetchMarketRisk,
} from "../services/api";

const REFRESH_MS = 5 * 60 * 1000;

// ── fetch daily history directly (no api.js change needed) ───────────────────
async function fetchMarketHistoryDaily() {
  const res = await fetch("http://localhost:8000/market-history-daily");
  if (!res.ok) throw new Error("Failed to fetch US daily history");
  return res.json();
}

async function fetchIndiaHistoryDaily() {
  const res = await fetch("http://localhost:8000/india-history-daily");
  if (!res.ok) throw new Error("Failed to fetch India daily history");
  return res.json();
}

function buildSeries(point, key, fallback = 0) {
  if (!point) return [];
  const now = new Date();
  return Array.from({ length: 20 }).map((_, idx) => {
    const ts = new Date(now.getTime() - (19 - idx) * 5 * 60 * 1000);
    return {
      label: ts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      value: idx === 19 ? Number(point[key] || fallback) : fallback,
    };
  });
}

export default function DashboardPage() {
  const [risk, setRisk] = useState(null);
  const [marketData, setMarketData] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [indiaData, setIndiaData] = useState(null);
  const [indiaHistory, setIndiaHistory] = useState(null);
  const [usDailyHistory, setUsDailyHistory] = useState(null);
  const [indiaDailyHistory, setIndiaDailyHistory] = useState(null);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setError("");
      const [riskResult, marketResult] = await Promise.all([
        fetchMarketRisk(),
        fetchMarketData(),
      ]);
      setRisk(riskResult);
      setMarketData(marketResult);

      try {
        const historyResult = await fetchMarketHistory();
        setHistoryData(historyResult);
      } catch {
        setHistoryData(null);
      }

      try {
        const [indiaResult, indiaHistoryResult] = await Promise.all([
          fetchIndiaMarket(),
          fetchIndiaHistory(),
        ]);
        setIndiaData(indiaResult);
        setIndiaHistory(indiaHistoryResult);
      } catch {
        setIndiaData(null);
        setIndiaHistory(null);
      }

      try {
        const [usDailyResult, indiaDailyResult] = await Promise.all([
          fetchMarketHistoryDaily(),
          fetchIndiaHistoryDaily(),
        ]);
        setUsDailyHistory(usDailyResult);
        setIndiaDailyHistory(indiaDailyResult);
      } catch {
        setUsDailyHistory(null);
        setIndiaDailyHistory(null);
      }
    } catch (err) {
      setError(err.message || "Failed to load data");
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => clearInterval(interval);
  }, []);

  // ── US intraday series ─────────────────────────────────────────────────────
  const priceSeries = useMemo(() => {
    const dates = historyData?.dates;
    const prices = historyData?.prices;
    if (Array.isArray(dates) && Array.isArray(prices) && dates.length === prices.length && dates.length > 0) {
      return dates.map((date, idx) => ({ label: date, value: Number(prices[idx] || 0) }));
    }
    return buildSeries(marketData, "sp500_close", 0);
  }, [historyData, marketData]);

  const volatilitySeries = useMemo(() => {
    const dates = historyData?.dates;
    const vol = historyData?.volatility;
    if (Array.isArray(dates) && Array.isArray(vol) && dates.length === vol.length) {
      return dates.map((date, idx) => ({ label: date, value: Number(vol[idx]) }));
    }
    return buildSeries(risk, "volatility", 0);
  }, [historyData, risk]);

  // ── US 30-day series ───────────────────────────────────────────────────────
  const sp500DailySeries = useMemo(() => {
    const dates = usDailyHistory?.dates;
    const prices = usDailyHistory?.prices;
    if (!dates || !prices || dates.length !== prices.length) return [];
    return dates.map((d, i) => ({ label: d, value: Number(prices[i]) }));
  }, [usDailyHistory]);

  // ── FIX: US VIX 30-day series ─────────────────────────────────────────────
  const vixDailySeries = useMemo(() => {
    const dates = usDailyHistory?.dates;
    const vix = usDailyHistory?.vix;
    if (!dates || !vix || dates.length !== vix.length) return [];
    return dates.map((d, i) => ({ label: d, value: Number(vix[i]) }));
  }, [usDailyHistory]);

  // ── India intraday series ──────────────────────────────────────────────────
  const niftySeries = useMemo(() => {
    const dates = indiaHistory?.dates;
    const prices = indiaHistory?.nifty_prices;
    if (!dates || !prices || dates.length !== prices.length) return [];
    return dates.map((date, i) => ({ label: date, value: Number(prices[i]) }));
  }, [indiaHistory]);

  const indiaVixSeries = useMemo(() => {
    const dates = indiaHistory?.dates;
    const vix = indiaHistory?.india_vix;
    if (!dates || !vix || dates.length !== vix.length) return [];
    return dates.map((date, i) => ({ label: date, value: Number(vix[i]) }));
  }, [indiaHistory]);

  // ── India 30-day series ────────────────────────────────────────────────────
  const niftyDailySeries = useMemo(() => {
    const dates = indiaDailyHistory?.dates;
    const prices = indiaDailyHistory?.nifty_prices;
    if (!dates || !prices || dates.length !== prices.length) return [];
    return dates.map((d, i) => ({ label: d, value: Number(prices[i]) }));
  }, [indiaDailyHistory]);

  const indiaVixDailySeries = useMemo(() => {
    const dates = indiaDailyHistory?.dates;
    const vix = indiaDailyHistory?.india_vix;
    if (!dates || !vix || dates.length !== vix.length) return [];
    return dates.map((d, i) => ({ label: d, value: Number(vix[i]) }));
  }, [indiaDailyHistory]);

  // ── derived values ─────────────────────────────────────────────────────────
  const volatilityValue = Number(risk?.volatility || 0);
  const volatilityLabel = volatilityValue < 0.003 ? "Low" : volatilityValue < 0.01 ? "Medium" : "High";
  const crashPercent = Math.round(Number(risk?.crash_probability || 0) * 100);
  const regime = risk?.market_regime || "Neutral";
  const regimeColor = regime.includes("Bull") ? "#2e7d32" : regime.includes("Bear") ? "#c62828" : "#f9a825";
  const riskScoreTen = (Number(risk?.risk_score || 0) / 10).toFixed(1);
  const marketAnalysis = `The market is currently in a ${regime} regime with ${volatilityLabel.toLowerCase()} volatility and a risk score of ${riskScoreTen}/10. Crash probability is currently ${crashPercent}%, indicating ${crashPercent < 20 ? "stable" : crashPercent < 50 ? "moderately risky" : "high-risk"} market conditions.`;

  return (
    <main style={wrap}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
        <h1 style={{ margin: 0 }}>Market Intelligence Dashboard</h1>
        <Link href="/signal" style={signalLink}>Market Signal →</Link>
      </div>

      {error ? <p style={{ color: "#d32f2f" }}>{error}</p> : null}

      <section style={riskSection}>
        <div style={riskSectionHeader}>
          <span style={marketFlag}>🇺🇸</span>
          <h2 style={marketTitle}>US Market Risk</h2>
        </div>
        <section style={cardGrid}>
          <InsightCard title="Market Regime" value={regime} valueColor={regimeColor} />
          <InsightCard title="Crash Probability" value={`${crashPercent}%`} />
          <InsightCard title="Risk Score" value={`${riskScoreTen} / 10`} />
          <InsightCard title="Volatility" value={volatilityLabel} />
        </section>
        <section style={analysisPanel}>
          <h2 style={sectionTitle}>Market Analysis</h2>
          <p style={{ margin: 0, color: "#374151", lineHeight: 1.6 }}>{marketAnalysis}</p>
        </section>
      </section>

      {/* ── US Market ── */}
      <section style={marketSection}>
        <div style={marketSectionHeader}>
          <span style={marketFlag}>🇺🇸</span>
          <h2 style={marketTitle}>US Market</h2>
        </div>
        <div style={chartGrid}>
          <div style={chartBox}>
            <p style={chartLabel}>Intraday (5 min)</p>
            <MarketChart
              priceChartTitle="S&P 500 Trend"
              volChartTitle="Market Volatility"
              priceSeries={priceSeries}
              volatilitySeries={volatilitySeries}
            />
          </div>
          <div style={chartBox}>
            <p style={chartLabel}>Last 30 Days</p>
            <MarketChart
              priceChartTitle="S&P 500 (30-Day)"
              volChartTitle="VIX (30-Day)"
              priceSeries={sp500DailySeries}
              volatilitySeries={vixDailySeries}
            />
          </div>
        </div>
      </section>

      {/* ── Indian Market ── */}
      <section style={marketSection}>
        <div style={marketSectionHeader}>
          <span style={marketFlag}>🇮🇳</span>
          <h2 style={marketTitle}>Indian Market</h2>
        </div>
        <div style={chartGrid}>
          <div style={chartBox}>
            <p style={chartLabel}>Intraday (5 min, IST)</p>
            <MarketChart
              priceChartTitle="NIFTY 50 Trend"
              volChartTitle="India VIX"
              priceSeries={niftySeries}
              volatilitySeries={indiaVixSeries}
            />
          </div>
          <div style={chartBox}>
            <p style={chartLabel}>Last 30 Days</p>
            <MarketChart
              priceChartTitle="NIFTY 50 (30-Day)"
              volChartTitle="India VIX (30-Day)"
              priceSeries={niftyDailySeries}
              volatilitySeries={indiaVixDailySeries}
            />
          </div>
        </div>
      </section>
    </main>
  );
}

function InsightCard({ title, value, valueColor = "#111827" }) {
  return (
    <article style={insightCard}>
      <p style={cardTitle}>{title}</p>
      <p style={{ ...cardValue, color: valueColor }}>{value}</p>
    </article>
  );
}

// ── styles ────────────────────────────────────────────────────────────────────
const wrap = {
  maxWidth: "1200px",
  margin: "1.5rem auto",
  padding: "0 1rem",
  fontFamily: "Arial, sans-serif",
};
const cardGrid = {
  display: "grid",
  gap: "1rem",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  marginTop: "1rem",
};
const insightCard = {
  border: "1px solid #e5e7eb",
  borderRadius: "0.75rem",
  padding: "1rem",
  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  background: "#fff",
};
const cardTitle = { margin: 0, fontSize: "0.9rem", color: "#6b7280" };
const cardValue = { margin: "0.5rem 0 0", fontWeight: 700, fontSize: "1.45rem" };
const analysisPanel = {
  marginTop: "1rem",
  border: "1px solid #e5e7eb",
  borderRadius: "0.75rem",
  padding: "1rem",
  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  background: "#fff",
};
const sectionTitle = { margin: "0 0 0.5rem", fontSize: "1.1rem" };
const signalLink = { color: "#1565c0", textDecoration: "none", fontWeight: 600, fontSize: "0.95rem" };
const marketSection = {
  marginTop: "2rem",
  border: "1px solid #e5e7eb",
  borderRadius: "1rem",
  padding: "1.25rem",
  background: "#fff",
  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
};
const marketSectionHeader = {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
  marginBottom: "1rem",
};
const marketFlag = { fontSize: "1.4rem" };
const marketTitle = { margin: 0, fontSize: "1.2rem", fontWeight: 700 };
const chartGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(480px, 1fr))",
  gap: "1.5rem",
};
const chartBox = {
  minWidth: 0,
};
const chartLabel = {
  margin: "0 0 0.4rem",
  fontSize: "0.8rem",
  fontWeight: 600,
  color: "#6b7280",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};
const riskSection = {
  marginTop: "1.5rem",
  border: "1px solid #e5e7eb",
  borderRadius: "1rem",
  padding: "1.25rem",
  background: "#fff",
  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
};
const riskSectionHeader = {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
  marginBottom: "1rem",
};