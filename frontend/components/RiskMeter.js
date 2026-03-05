export default function RiskMeter({ score = 0 }) {
  const color = score >= 70 ? "#d32f2f" : score >= 40 ? "#f57c00" : "#2e7d32";

  return (
    <div style={meterWrap}>
      <h3>Market Risk Score</h3>
      <div style={barWrap}>
        <div style={{ ...barFill, width: `${score}%`, background: color }} />
      </div>
      <p style={{ marginTop: "0.5rem" }}>{score} / 100</p>
    </div>
  );
}

const meterWrap = {
  border: "1px solid #ddd",
  borderRadius: "12px",
  padding: "1rem",
  background: "#fff",
};

const barWrap = {
  width: "100%",
  height: "14px",
  borderRadius: "999px",
  overflow: "hidden",
  background: "#eceff1",
};

const barFill = {
  height: "100%",
  transition: "all 0.25s ease",
};
