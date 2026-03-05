import { useEffect, useMemo, useState } from "react";
import MarketChart from "../components/MarketChart";
import { fetchMarketData, fetchMarketHistory, fetchMarketRisk } from "../services/api";

const REFRESH_MS = 5 * 60 * 1000;

function buildSeries(point, key, fallback = 0) {
  if (!point) {
    return [];
  }
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
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setError("");
      const [riskResult, marketResult] = await Promise.all([fetchMarketRisk(), fetchMarketData()]);
      setRisk(riskResult);
      setMarketData(marketResult);

      // Keep existing chart functionality by falling back if history endpoint is unavailable.
      try {
        const historyResult = await fetchMarketHistory();
        setHistoryData(historyResult);
      } catch {
        setHistoryData(null);
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

  const priceSeries = useMemo(() => {
    const dates = historyData?.dates;
    const prices = historyData?.prices;
    if (Array.isArray(dates) && Array.isArray(prices) && dates.length === prices.length && dates.length > 0) {
      return dates.map((date, idx) => ({
        label: date,
        value: Number(prices[idx] || 0),
      }));
    }
    return buildSeries(marketData, "sp500_close", 0);
  }, [historyData, marketData]);
  const volatilitySeries = useMemo(() => {
    const dates = historyData?.dates;
    const vol = historyData?.volatility;
  
    if (
      Array.isArray(dates) &&
      Array.isArray(vol) &&
      dates.length === vol.length
    ) {
      return dates.map((date, idx) => ({
        label: new Date(date).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit"
        }),
        value: Number(vol[idx])
      }));
    }
  
    return buildSeries(risk, "volatility", 0);
  }, [historyData, risk]);

  const volatilityValue = Number(risk?.volatility || 0);
  const volatilityLabel =
    volatilityValue < 0.003 ? "Low" : volatilityValue < 0.01 ? "Medium" : "High";
  const crashPercent = Math.round(Number(risk?.crash_probability || 0) * 100);
  const regime = risk?.market_regime || "Neutral";
  const regimeColor = regime.includes("Bull")
    ? "#2e7d32"
    : regime.includes("Bear")
      ? "#c62828"
      : "#f9a825";
  const riskScoreRaw = Number(risk?.risk_score || 0);
  const riskScoreTen = riskScoreRaw;
  const marketAnalysis = `The market is currently in a ${regime} regime with ${volatilityLabel.toLowerCase()} volatility and a risk score of ${riskScoreTen}/10. Crash probability is currently ${crashPercent}%, indicating ${crashPercent < 20 ? "stable" : crashPercent < 50 ? "moderately risky" : "high-risk"} market conditions.`;

  return (
    <main style={wrap}>
      <h1>Market Intelligence Dashboard</h1>
      {error ? <p style={{ color: "#d32f2f" }}>{error}</p> : null}
      <section style={cardGrid}>
        <InsightCard
          title="Market Regime"
          value={regime}
          valueColor={regimeColor}
        />
        <InsightCard
          title="Crash Probability"
          value={`${crashPercent}%`}
        />
        <InsightCard
          title="Risk Score"
          value={`${riskScoreTen} / 10`}
        />
        <InsightCard
          title="Volatility"
          value={volatilityLabel}
        />
      </section>
      <section style={analysisPanel}>
        <h2 style={sectionTitle}>Market Analysis</h2>
        <p style={{ margin: 0, color: "#374151", lineHeight: 1.6 }}>{marketAnalysis}</p>
      </section>
      <section style={{ marginTop: "1rem" }}>
        <MarketChart priceSeries={priceSeries} volatilitySeries={volatilitySeries} />
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

const wrap = {
  maxWidth: "1100px",
  margin: "1.5rem auto",
  padding: "0 1rem",
  fontFamily: "Arial, sans-serif",
};

const cardGrid = {
  display: "grid",
  gap: "1rem",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
};

const insightCard = {
  border: "1px solid #e5e7eb",
  borderRadius: "0.75rem",
  padding: "1rem",
  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
  background: "#fff",
};

const cardTitle = {
  margin: 0,
  fontSize: "0.9rem",
  color: "#6b7280",
};

const cardValue = {
  margin: "0.5rem 0 0",
  fontWeight: 700,
  fontSize: "1.45rem",
};

const analysisPanel = {
  marginTop: "1rem",
  border: "1px solid #e5e7eb",
  borderRadius: "0.75rem",
  padding: "1rem",
  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
  background: "#fff",
};

const sectionTitle = {
  margin: "0 0 0.5rem",
  fontSize: "1.1rem",
};
