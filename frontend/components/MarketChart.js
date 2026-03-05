import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function MarketChart({ priceSeries = [], volatilitySeries = [] }) {
  const labels = priceSeries.map((item) => item.label);

  const priceData = {
    labels,
    datasets: [
      {
        label: "S&P500",
        data: priceSeries.map((item) => item.value),
        borderColor: "#1976d2",
        backgroundColor: "rgba(25,118,210,0.25)",
        tension: 0.2,
      },
    ],
  };

  const volData = {
    labels: volatilitySeries.map((item) => item.label),
    datasets: [
      {
        label: "Volatility",
        data: volatilitySeries.map((item) => item.value),
        borderColor: "#d32f2f",
        backgroundColor: "rgba(211,47,47,0.25)",
        tension: 0.2,
      },
    ],
  };

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <div style={panel}>
        <h3>S&P500 Trend (30 Days)</h3>
        <Line data={priceData} />
      </div>
      <div style={panel}>
        <h3>Market Volatility Trend</h3>
        <Line data={volData} />
      </div>
    </div>
  );
}

const panel = {
  border: "1px solid #ddd",
  borderRadius: "12px",
  padding: "1rem",
  background: "#fff",
};
