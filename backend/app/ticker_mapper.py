"""Map common company names to Yahoo Finance ticker symbols (NSE)."""

from __future__ import annotations

import re
from typing import Optional

# Common Indian stock names -> Yahoo Finance NSE tickers
COMPANY_TO_TICKER: dict[str, str] = {
    "reliance": "RELIANCE.NS",
    "reliance industries": "RELIANCE.NS",
    "ril": "RELIANCE.NS",
    "tcs": "TCS.NS",
    "tata consultancy": "TCS.NS",
    "tata consultancy services": "TCS.NS",
    "infosys": "INFY.NS",
    "infy": "INFY.NS",
    "hdfc": "HDFCBANK.NS",
    "hdfc bank": "HDFCBANK.NS",
    "hdfcbank": "HDFCBANK.NS",
    "icici": "ICICIBANK.NS",
    "icici bank": "ICICIBANK.NS",
    "sbi": "SBIN.NS",
    "state bank": "SBIN.NS",
    "bharti airtel": "BHARTIARTL.NS",
    "airtel": "BHARTIARTL.NS",
    "bharti": "BHARTIARTL.NS",
    "itc": "ITC.NS",
    "kotak": "KOTAKBANK.NS",
    "kotak bank": "KOTAKBANK.NS",
    "lt": "LT.NS",
    "larsen": "LT.NS",
    "larsen and toubro": "LT.NS",
    "hul": "HINDUNILVR.NS",
    "hindustan unilever": "HINDUNILVR.NS",
    "unilever": "HINDUNILVR.NS",
    "asian paints": "ASIANPAINT.NS",
    "bajaj finance": "BAJFINANCE.NS",
    "wipro": "WIPRO.NS",
    "axis bank": "AXISBANK.NS",
    "maruti": "MARUTI.NS",
    "maruti suzuki": "MARUTI.NS",
    "titan": "TITAN.NS",
    "nestle": "NESTLEIND.NS",
    "ultracemco": "ULTRACEMCO.NS",
    "ultra tech": "ULTRACEMCO.NS",
}


def get_ticker(company_name: str) -> Optional[str]:
    """
    Return Yahoo Finance ticker for a company name, or None if not found.
    """
    if not company_name or not isinstance(company_name, str):
        return None
    key = company_name.strip().lower()
    return COMPANY_TO_TICKER.get(key)


def detect_stock_from_question(question: str) -> tuple[Optional[str], Optional[str]]:
    """
    Detect stock/company name from a natural language question.
    Returns (display_name, ticker_symbol) or (None, None) if not detected.
    """
    if not question or not isinstance(question, str):
        return None, None

    text = question.lower().strip()
    # Try exact key match first
    for name, ticker in COMPANY_TO_TICKER.items():
        if name in text:
            display = name.title() if " " in name else name.upper()
            if "reliance" in name and "reliance" in text:
                display = "Reliance"
            elif "tcs" in name or "tata consultancy" in name:
                display = "TCS"
            elif "infosys" in name or "infy" in name:
                display = "Infosys"
            elif "hdfc" in name:
                display = "HDFC Bank"
            return display, ticker

    # Optional: simple word extraction for unknown names (e.g. single word)
    words = re.findall(r"\b[a-z]+\b", text)
    for w in words:
        if len(w) > 2 and w in COMPANY_TO_TICKER:
            display = w.title() if len(COMPANY_TO_TICKER[w]) > 6 else w.upper()
            return display, COMPANY_TO_TICKER[w]

    return None, None
