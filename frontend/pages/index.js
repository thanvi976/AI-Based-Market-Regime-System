import Link from "next/link";

export default function HomePage() {
  return (
    <main style={wrap}>
      <h1>AI Market Regime & Crash Prediction System</h1>
      <p>Live machine-learning risk analytics for major US market indices.</p>
      <div style={buttonRow}>
        <Link href="/signal" style={buttonStyle}>
          Market Signal
        </Link>
        <Link href="/dashboard" style={buttonStyleSecondary}>
          Open Dashboard
        </Link>
      </div>
    </main>
  );
}

const wrap = {
  maxWidth: "780px",
  margin: "4rem auto",
  padding: "0 1rem",
  fontFamily: "Arial, sans-serif",
};

const buttonRow = { display: "flex", gap: "1rem", marginTop: "1.5rem", flexWrap: "wrap" };
const buttonStyle = {
  display: "inline-block",
  padding: "0.7rem 1.2rem",
  borderRadius: "8px",
  textDecoration: "none",
  color: "#fff",
  background: "#1565c0",
  fontWeight: 600,
};
const buttonStyleSecondary = { ...buttonStyle, background: "#374151" };
