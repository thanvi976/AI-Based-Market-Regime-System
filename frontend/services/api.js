const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

export async function fetchMarketRisk() {
  const response = await fetch(`${API_BASE}/market-risk`);
  if (!response.ok) {
    throw new Error(`Failed to fetch market risk: ${response.status}`);
  }
  return response.json();
}

export async function fetchMarketData() {
  const response = await fetch(`${API_BASE}/market-data`);
  if (!response.ok) {
    throw new Error(`Failed to fetch market data: ${response.status}`);
  }
  return response.json();
}

export async function fetchMarketHistory() {
  const response = await fetch(`${API_BASE}/market-history`);
  if (!response.ok) {
    throw new Error(`Failed to fetch market history: ${response.status}`);
  }
  return response.json();
}

export async function fetchIndiaMarket() {
  const response = await fetch(`${API_BASE}/india-market`);
  if (!response.ok) {
    throw new Error(`Failed to fetch India market: ${response.status}`);
  }
  return response.json();
}

export async function fetchIndiaHistory() {
  const response = await fetch(`${API_BASE}/india-history`);
  if (!response.ok) {
    throw new Error(`Failed to fetch India history: ${response.status}`);
  }
  return response.json();
}
