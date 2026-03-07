"""Map company names to Yahoo Finance tickers (Indian NSE/BSE and US NASDAQ/NYSE)."""

from __future__ import annotations

import re
from typing import Optional

# Indian stocks: key -> (display_name, ticker)
INDIAN_STOCKS: dict[str, tuple[str, str]] = {
    "reliance industries": ("Reliance Industries", "RELIANCE.NS"),
    "reliance": ("Reliance", "RELIANCE.NS"),
    "ril": ("RIL", "RELIANCE.NS"),
    "tata consultancy services": ("TCS", "TCS.NS"),
    "tata consultancy": ("TCS", "TCS.NS"),
    "tcs": ("TCS", "TCS.NS"),
    "infosys": ("Infosys", "INFY.NS"),
    "infy": ("Infosys", "INFY.NS"),
    "hdfc bank": ("HDFC Bank", "HDFCBANK.NS"),
    "hdfc": ("HDFC Bank", "HDFCBANK.NS"),
    "hdfcbank": ("HDFC Bank", "HDFCBANK.NS"),
    "icici bank": ("ICICI Bank", "ICICIBANK.NS"),
    "icici": ("ICICI Bank", "ICICIBANK.NS"),
    "state bank": ("SBI", "SBIN.NS"),
    "sbi": ("SBI", "SBIN.NS"),
    "bharti airtel": ("Bharti Airtel", "BHARTIARTL.NS"),
    "airtel": ("Bharti Airtel", "BHARTIARTL.NS"),
    "bharti": ("Bharti Airtel", "BHARTIARTL.NS"),
    "itc": ("ITC", "ITC.NS"),
    "kotak bank": ("Kotak Bank", "KOTAKBANK.NS"),
    "kotak": ("Kotak Bank", "KOTAKBANK.NS"),
    "larsen and toubro": ("L&T", "LT.NS"),
    "larsen": ("L&T", "LT.NS"),
    "lt": ("L&T", "LT.NS"),
    "hindustan unilever": ("HUL", "HINDUNILVR.NS"),
    "hul": ("HUL", "HINDUNILVR.NS"),
    "unilever": ("HUL", "HINDUNILVR.NS"),
    "asian paints": ("Asian Paints", "ASIANPAINT.NS"),
    "bajaj finance": ("Bajaj Finance", "BAJFINANCE.NS"),
    "wipro": ("Wipro", "WIPRO.NS"),
    "axis bank": ("Axis Bank", "AXISBANK.NS"),
    "maruti suzuki": ("Maruti Suzuki", "MARUTI.NS"),
    "maruti": ("Maruti", "MARUTI.NS"),
    "titan": ("Titan", "TITAN.NS"),
    "nestle": ("Nestle India", "NESTLEIND.NS"),
    "ultra tech": ("UltraTech Cement", "ULTRACEMCO.NS"),
    "ultracemco": ("UltraTech Cement", "ULTRACEMCO.NS"),
    "swiggy": ("Swiggy", "SWIGGY.NS"),
    "zomato": ("Zomato", "ZOMATO.NS"),
}

# US stocks: key -> (display_name, ticker)
US_STOCKS: dict[str, tuple[str, str]] = {
    "apple": ("Apple", "AAPL"),
    "tesla": ("Tesla", "TSLA"),
    "microsoft": ("Microsoft", "MSFT"),
    "amazon": ("Amazon", "AMZN"),
    "google": ("Alphabet", "GOOGL"),
    "alphabet": ("Alphabet", "GOOGL"),
    "nvidia": ("NVIDIA", "NVDA"),
    "netflix": ("Netflix", "NFLX"),
    "amd": ("AMD", "AMD"),
    "intel": ("Intel", "INTC"),
    "meta": ("Meta", "META"),
    "facebook": ("Meta", "META"),
    "jpmorgan": ("JPMorgan Chase", "JPM"),
    "jp morgan": ("JPMorgan Chase", "JPM"),
    "berkshire": ("Berkshire Hathaway", "BRK-B"),
    "johnson & johnson": ("Johnson & Johnson", "JNJ"),
    "johnson and johnson": ("Johnson & Johnson", "JNJ"),
    "visa": ("Visa", "V"),
    "walmart": ("Walmart", "WMT"),
    "procter & gamble": ("Procter & Gamble", "PG"),
    "coca cola": ("Coca-Cola", "KO"),
    "pepsi": ("PepsiCo", "PEP"),
    "disney": ("Walt Disney", "DIS"),
    "walt disney": ("Walt Disney", "DIS"),
    "adobe": ("Adobe", "ADBE"),
    "salesforce": ("Salesforce", "CRM"),
    "oracle": ("Oracle", "ORCL"),
    "cisco": ("Cisco", "CSCO"),
    "ibm": ("IBM", "IBM"),
    "qualcomm": ("Qualcomm", "QCOM"),
    "broadcom": ("Broadcom", "AVGO"),
}

# Combined flat map for get_ticker: key -> ticker (first occurrence wins for display)
COMPANY_TO_TICKER: dict[str, str] = {
    **{k: v[1] for k, v in INDIAN_STOCKS.items()},
    **{k: v[1] for k, v in US_STOCKS.items()},
}


def get_ticker(company_name: str) -> Optional[str]:
    """Return Yahoo Finance ticker for a company name, or None if not found."""
    if not company_name or not isinstance(company_name, str):
        return None
    key = company_name.strip().lower()
    return COMPANY_TO_TICKER.get(key)


def detect_stock_from_question(question: str) -> tuple[Optional[str], Optional[str]]:
    """
    Detect stock from question. Returns (display_name, ticker_symbol) or (None, None).
    Order: 1) Indian names, 2) US names, 3) regex for uppercase ticker [A-Z]{2,5}.
    """
    if not question or not isinstance(question, str):
        return None, None

    text = question.lower().strip()

    # 1) Search Indian names first (longest match)
    for key in sorted(INDIAN_STOCKS.keys(), key=len, reverse=True):
        if key in text:
            display_name, ticker = INDIAN_STOCKS[key]
            return display_name, ticker

    # 2) Search US names (longest match)
    for key in sorted(US_STOCKS.keys(), key=len, reverse=True):
        if key in text:
            display_name, ticker = US_STOCKS[key]
            return display_name, ticker

    # 3) Try to extract uppercase ticker [A-Z]{2,5} (e.g. NFLX, AMD)
    match = re.search(r"\b([A-Z]{2,5})\b", question.strip())
    if match:
        ticker = match.group(1).upper()
        return ticker, ticker

    return None, None
