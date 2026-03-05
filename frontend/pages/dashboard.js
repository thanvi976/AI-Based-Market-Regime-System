import { useEffect, useMemo, useState } from "react";
import MarketChart from "../components/MarketChart";
import MarketRegimeCard from "../components/MarketRegimeCard";
import RiskMeter from "../components/RiskMeter";
import { fetchMarketData, fetchMarketRisk } from "../services/api";

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
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setError("");
      const [riskResult, marketResult] = await Promise.all([fetchMarketRisk(), fetchMarketData()]);
      setRisk(riskResult);
      setMarketData(marketResult);
    } catch (err) {
      setError(err.message || "Failed to load data");
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => clearInterval(interval);
  }, []);

  const priceSeries = useMemo(
    () => buildSeries(marketData, "sp500_close", 0),
    [marketData]
  );
  const volatilitySeries = useMemo(
    () => buildSeries(risk, "volatility", 0),
    [risk]
  );

  return (
    <main style={wrap}>
      <h1>Market Intelligence Dashboard</h1>
      {error ? <p style={{ color: "#d32f2f" }}>{error}</p> : null}
      <section style={cardGrid}>
        <MarketRegimeCard
          regime={risk?.market_regime}
          crashProbability={risk?.crash_probability}
        />
        <RiskMeter score={risk?.risk_score || 0} />
      </section>
      <section style={{ marginTop: "1rem" }}>
        <MarketChart priceSeries={priceSeries} volatilitySeries={volatilitySeries} />
      </section>
    </main>
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
