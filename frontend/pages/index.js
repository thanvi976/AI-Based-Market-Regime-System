import Link from "next/link";

export default function HomePage() {
  return (
    <main style={wrap}>
      <h1>AI Market Regime & Crash Prediction System</h1>
      <p>Live machine-learning risk analytics for major US market indices.</p>
      <Link href="/dashboard" style={buttonStyle}>
        Open Dashboard
      </Link>
    </main>
  );
}

const wrap = {
  maxWidth: "780px",
  margin: "4rem auto",
  padding: "0 1rem",
  fontFamily: "Arial, sans-serif",
};

const buttonStyle = {
  display: "inline-block",
  marginTop: "1rem",
  padding: "0.7rem 1rem",
  borderRadius: "8px",
  textDecoration: "none",
  color: "#fff",
  background: "#1565c0",
};
