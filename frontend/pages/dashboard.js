import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import MarketChart from "../components/MarketChart";
import {
  fetchIndiaHistory,
  fetchIndiaMarket,
  fetchIndiaRisk,
  fetchMarketData,
  fetchMarketHistory,
  fetchMarketRisk,
} from "../services/api";

const REFRESH_MS = 5 * 60 * 1000;

// ── fetch daily history directly ─────────────────────────────────────────────
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
  const [indiaRisk, setIndiaRisk] = useState(null);
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
        const [indiaResult, indiaHistoryResult, indiaRiskResult] = await Promise.all([
          fetchIndiaMarket(),
          fetchIndiaHistory(),
          fetchIndiaRisk(),
        ]);
        setIndiaData(indiaResult);
        setIndiaHistory(indiaHistoryResult);
        setIndiaRisk(indiaRiskResult);
      } catch {
        setIndiaData(null);
        setIndiaHistory(null);
        setIndiaRisk(null);
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

  // ── US derived values ──────────────────────────────────────────────────────
  const crashPercent = Math.round(Number(risk?.crash_probability || 0) * 100);
  const volatilityLabel = crashPercent >= 40 ? "High" : crashPercent >= 20 ? "Medium" : "Low";
  const regime = risk?.market_regime || "Neutral";
  const regimeColor = regime.includes("Bull") ? "var(--forest)" : regime.includes("Bear") ? "var(--rose)" : "var(--camel)";
  const crashColor = crashPercent >= 40 ? "var(--rose)" : crashPercent >= 20 ? "var(--camel)" : "var(--forest)";
  const riskScoreNum = Number(risk?.risk_score ?? 0) / 10;
  const riskScoreColor = riskScoreNum <= 3 ? "var(--forest)" : riskScoreNum <= 6 ? "var(--camel)" : "var(--rose)";
  const riskScoreTen = (Number(risk?.risk_score || 0) / 10).toFixed(1);
  const marketAnalysis = `The market is currently in a ${regime} regime with ${volatilityLabel.toLowerCase()} volatility and a risk score of ${riskScoreTen}/10. Crash probability is currently ${crashPercent}%, indicating ${crashPercent < 20 ? "stable" : crashPercent < 50 ? "moderately risky" : "high-risk"} market conditions.`;

  // ── India derived values ───────────────────────────────────────────────────
  const indiaCrashPercent = Math.round(Number(indiaRisk?.crash_probability || 0) * 100);
  const indiaVolatilityLabel = indiaCrashPercent >= 40 ? "High" : indiaCrashPercent >= 20 ? "Medium" : "Low";
  const indiaRegime = indiaRisk?.market_regime || "Neutral";
  const indiaRegimeColor = indiaRegime.includes("Bull") ? "var(--forest)" : indiaRegime.includes("Bear") ? "var(--rose)" : "var(--camel)";
  const indiaCrashColor = indiaCrashPercent >= 40 ? "var(--rose)" : indiaCrashPercent >= 20 ? "var(--camel)" : "var(--forest)";
  const indiaRiskScoreNum = Number(indiaRisk?.risk_score ?? 0) / 10;
  const indiaRiskScoreColor = indiaRiskScoreNum <= 3 ? "var(--forest)" : indiaRiskScoreNum <= 6 ? "var(--camel)" : "var(--rose)";
  const indiaRiskScoreTen = (Number(indiaRisk?.risk_score || 0) / 10).toFixed(1);
  const indiaAnalysis = `The Indian market is currently in a ${indiaRegime} regime with ${indiaVolatilityLabel.toLowerCase()} volatility and a risk score of ${indiaRiskScoreTen}/10. Crash probability is currently ${indiaCrashPercent}%, indicating ${indiaCrashPercent < 20 ? "stable" : indiaCrashPercent < 50 ? "moderately risky" : "high-risk"} market conditions.`;
  const volColor = volatilityLabel === "High" ? "var(--rose)" : volatilityLabel === "Medium" ? "var(--camel)" : "var(--forest)";
  const indiaVolColor = indiaVolatilityLabel === "High" ? "var(--rose)" : indiaVolatilityLabel === "Medium" ? "var(--camel)" : "var(--forest)";

  return (
    <>
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "white", borderBottom: "1px solid var(--border)",
        height: "56px", display: "flex", alignItems: "center",
        justifyContent: "space-between", padding: "0 1.5rem",
      }}>
        <Link href="/" style={{ fontFamily: "Playfair Display, serif", fontSize: "1.1rem", fontWeight: 700, textDecoration: "none", color: "var(--ink)" }}>
          KAIROS <span style={{ color: "var(--gold)", margin: "0 0.25rem" }}>·</span> Markets
        </Link>
        <div style={{ display: "flex", gap: "1.5rem" }}>
          
          <Link href="/trading-assistant" style={{ fontSize: "0.875rem", color: "var(--ink-muted)", textDecoration: "none" }}>Assistant</Link>
        </div>
      </nav>

      <main className="page-wrap" style={{ background: "var(--bg)", minHeight: "100vh", padding: "2rem 1.5rem 4rem", maxWidth: "1280px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
          <h1 style={{ margin: 0, fontFamily: "Playfair Display, serif", fontSize: "1.5rem", color: "var(--ink)" }}>Market Intelligence Dashboard</h1>
          <Link href="/signal" style={{ color: "var(--gold)", textDecoration: "none", fontWeight: 600, fontSize: "0.95rem" }}>Market Signal →</Link>
        </div>

        {error ? <p style={{ color: "var(--rose)", marginBottom: "1rem" }}>{error}</p> : null}

        

        

        {/* ── US Market Risk ── */}
        <section style={{ marginBottom: "2rem", background: "white", border: "1px solid var(--border)", borderRadius: "16px", padding: "1.5rem", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
            <span style={{
              width: "32px", height: "32px", background: "var(--navy)", color: "white",
              borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.65rem", fontWeight: 700, fontFamily: "DM Sans, sans-serif", letterSpacing: "0.05em",
            }}>US</span>
            <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: "1.15rem", fontWeight: 700, color: "var(--ink)" }}>
              US Market Risk
            </h2>
            <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
          </div>
          <div className="metric-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
            <InsightCard label="Market Regime" value={regime} valueColor={regimeColor} accentColor={regimeColor} />
            <InsightCard label="Crash Probability" value={`${crashPercent}%`} valueColor={crashColor} accentColor={crashColor} />
            <InsightCard label="Risk Score" value={`${riskScoreTen} / 10`} valueColor={riskScoreColor} accentColor={riskScoreColor} riskScore={riskScoreNum} />
            <InsightCard label="Volatility" value={volatilityLabel} valueColor={volColor} accentColor={volColor} />
          </div>
          <div style={{
            background: "white", border: "1px solid var(--border)", borderRadius: "12px",
            padding: "1.1rem 1.25rem", borderLeft: "3px solid var(--gold)",
          }}>
            <p style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--gold)", fontWeight: 500, marginBottom: "0.4rem", fontFamily: "DM Sans, sans-serif" }}>
              Market Analysis
            </p>
            <p style={{ fontSize: "0.95rem", color: "var(--ink-muted)", lineHeight: 1.7, margin: 0 }}>{marketAnalysis}</p>
          </div>
        </section>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem", margin: "2rem 0" }}>
          <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
          <span style={{ fontSize: "0.72rem", letterSpacing: "0.15em", color: "var(--ink-muted)", textTransform: "uppercase", fontFamily: "DM Sans, sans-serif", fontWeight: 500 }}>
            Indian Market
          </span>
          <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
        </div>

        {/* ── India Market Risk ── */}
        <section style={{ marginBottom: "2rem", background: "white", border: "1px solid var(--border)", borderRadius: "16px", padding: "1.5rem", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
            <span style={{
              width: "32px", height: "32px", background: "var(--navy)", color: "white",
              borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.65rem", fontWeight: 700, fontFamily: "DM Sans, sans-serif", letterSpacing: "0.05em",
            }}>IN</span>
            <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: "1.15rem", fontWeight: 700, color: "var(--ink)" }}>
              Indian Market Risk
            </h2>
            <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
          </div>
          <div className="metric-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
            <InsightCard label="Market Regime" value={indiaRegime} valueColor={indiaRegimeColor} accentColor={indiaRegimeColor} />
            <InsightCard label="Crash Probability" value={`${indiaCrashPercent}%`} valueColor={indiaCrashColor} accentColor={indiaCrashColor} />
            <InsightCard label="Risk Score" value={`${indiaRiskScoreTen} / 10`} valueColor={indiaRiskScoreColor} accentColor={indiaRiskScoreColor} riskScore={indiaRiskScoreNum} />
            <InsightCard label="Volatility" value={indiaVolatilityLabel} valueColor={indiaVolColor} accentColor={indiaVolColor} />
          </div>
          <div style={{
            background: "white", border: "1px solid var(--border)", borderRadius: "12px",
            padding: "1.1rem 1.25rem", borderLeft: "3px solid var(--gold)",
          }}>
            <p style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--gold)", fontWeight: 500, marginBottom: "0.4rem", fontFamily: "DM Sans, sans-serif" }}>
              Market Analysis
            </p>
            <p style={{ fontSize: "0.95rem", color: "var(--ink-muted)", lineHeight: 1.7, margin: 0 }}>{indiaAnalysis}</p>
          </div>
        </section>

        {/* ── US Market Charts ── */}
        <section style={{ marginBottom: "2rem", background: "white", border: "1px solid var(--border)", borderRadius: "16px", padding: "1.5rem", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
            <span style={{
              width: "32px", height: "32px", background: "var(--navy)", color: "white",
              borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.65rem", fontWeight: 700, fontFamily: "DM Sans, sans-serif", letterSpacing: "0.05em",
            }}>US</span>
            <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: "1.15rem", fontWeight: 700, color: "var(--ink)" }}>
              US Market
            </h2>
            <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
          </div>
          <div className="chart-pair" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(480px, 1fr))", gap: "1.5rem" }}>
            <div>
              <p style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--ink-muted)", fontWeight: 500, marginBottom: "0.5rem", fontFamily: "DM Sans, sans-serif" }}>
                Intraday · 5 Min
              </p>
              <div style={{ background: "white", border: "1px solid var(--border)", borderRadius: "12px", padding: "1rem", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", overflow: "hidden" }}>
                <MarketChart
                  priceChartTitle="S&P 500 Trend"
                  volChartTitle="Market Volatility"
                  priceSeries={priceSeries}
                  volatilitySeries={volatilitySeries}
                />
              </div>
            </div>
            <div>
              <p style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--ink-muted)", fontWeight: 500, marginBottom: "0.5rem", fontFamily: "DM Sans, sans-serif" }}>
                Last 30 Days
              </p>
              <div style={{ background: "white", border: "1px solid var(--border)", borderRadius: "12px", padding: "1rem", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", overflow: "hidden" }}>
                <MarketChart
                  priceChartTitle="S&P 500 (30-Day)"
                  volChartTitle="VIX (30-Day)"
                  priceSeries={sp500DailySeries}
                  volatilitySeries={vixDailySeries}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── Indian Market Charts ── */}
        <section style={{ marginBottom: "2rem", background: "white", border: "1px solid var(--border)", borderRadius: "16px", padding: "1.5rem", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
            <span style={{
              width: "32px", height: "32px", background: "var(--navy)", color: "white",
              borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.65rem", fontWeight: 700, fontFamily: "DM Sans, sans-serif", letterSpacing: "0.05em",
            }}>IN</span>
            <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: "1.15rem", fontWeight: 700, color: "var(--ink)" }}>
              Indian Market
            </h2>
            <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
          </div>
          <div className="chart-pair" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(480px, 1fr))", gap: "1.5rem" }}>
            <div>
              <p style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--ink-muted)", fontWeight: 500, marginBottom: "0.5rem", fontFamily: "DM Sans, sans-serif" }}>
                Intraday · 5 Min
              </p>
              <div style={{ background: "white", border: "1px solid var(--border)", borderRadius: "12px", padding: "1rem", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", overflow: "hidden" }}>
                <MarketChart
                  priceChartTitle="NIFTY 50 Trend"
                  volChartTitle="India VIX"
                  priceSeries={niftySeries}
                  volatilitySeries={indiaVixSeries}
                />
              </div>
            </div>
            <div>
              <p style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--ink-muted)", fontWeight: 500, marginBottom: "0.5rem", fontFamily: "DM Sans, sans-serif" }}>
                Last 30 Days
              </p>
              <div style={{ background: "white", border: "1px solid var(--border)", borderRadius: "12px", padding: "1rem", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", overflow: "hidden" }}>
                <MarketChart
                  priceChartTitle="NIFTY 50 (30-Day)"
                  volChartTitle="India VIX (30-Day)"
                  priceSeries={niftyDailySeries}
                  volatilitySeries={indiaVixDailySeries}
                />
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

function InsightCard({ label, value, valueColor = "var(--ink)", accentColor = "var(--gold)", riskScore }) {
  return (
    <div style={{
      background: "white",
      border: "1px solid var(--border)",
      borderRadius: "12px",
      padding: "1.25rem 1.1rem",
      boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: accentColor }} />
      <p style={{ fontSize: "0.72rem", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-muted)", marginBottom: "0.5rem", fontFamily: "DM Sans, sans-serif" }}>
        {label}
      </p>
      <p style={{ fontFamily: "Playfair Display, serif", fontSize: "1.55rem", fontWeight: 700, color: valueColor, lineHeight: 1, margin: 0 }}>
        {value}
      </p>
      {riskScore != null && (
        <div style={{ marginTop: "0.5rem", height: "4px", background: "var(--border)", borderRadius: "2px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${Math.min(100, (riskScore / 10) * 100)}%`, background: accentColor, borderRadius: "2px" }} />
        </div>
      )}
    </div>
  );
}