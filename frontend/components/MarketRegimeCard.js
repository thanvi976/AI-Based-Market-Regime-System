export default function MarketRegimeCard({ regime, crashProbability }) {
  const percentage = Math.round((crashProbability || 0) * 100);

  return (
    <div style={cardStyle}>
      <h3>Market Regime</h3>
      <p style={{ fontSize: "1.25rem", margin: "0.2rem 0" }}>{regime || "Unknown"}</p>
      <p style={{ margin: 0 }}>Crash Probability: {percentage}%</p>
    </div>
  );
}

const cardStyle = {
  border: "1px solid #ddd",
  borderRadius: "12px",
  padding: "1rem",
  background: "#fff",
};
