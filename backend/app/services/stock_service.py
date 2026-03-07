"""Fetch stock data and compute stock-specific indicators using yfinance."""

from __future__ import annotations

import time
from typing import Any

import yfinance as yf

from backend.app.utils.logger import get_logger

logger = get_logger(__name__)

RETRY_DELAY_SECONDS = 2


def _currency(symbol: str) -> str:
    return "INR" if symbol.endswith(".NS") or symbol.endswith(".BO") else "USD"


def _fallback(symbol: str) -> dict[str, Any]:
    """Safe fallback when Yahoo returns no data or an error."""
    return {
        "display_name": symbol,
        "current_price": None,
        "momentum_5d": None,
        "ma20": None,
        "volume": None,
        "volume_trend": None,
        "currency": _currency(symbol),
    }


def _from_history(hist, symbol: str) -> dict[str, Any]:
    """Compute stock indicators from 1mo daily history. Never raises."""
    try:
        if hist is None or hist.empty or len(hist) < 1:
            return _fallback(symbol)

        data = hist
        close = data["Close"]
        latest = data.iloc[-1]
        current_price = float(latest["Close"])

        # 5-day return (need at least 6 rows: current + 5 back)
        momentum_5d = None
        if len(data) >= 6:
            close_5_ago = float(data.iloc[-5]["Close"])
            if close_5_ago and close_5_ago != 0:
                momentum_5d = round((current_price - close_5_ago) / close_5_ago, 6)

        # 20-day moving average (use available rows if < 20)
        ma20 = None
        rolling = close.rolling(20, min_periods=1).mean()
        if len(rolling) > 0 and not (rolling.isna().all()):
            ma20 = float(rolling.iloc[-1])

        # Volume and volume trend: latest volume > mean volume = increasing
        volume = None
        volume_trend = None
        if "Volume" in data.columns:
            vol_series = data["Volume"].dropna()
            if len(vol_series) > 0:
                try:
                    volume = float(vol_series.iloc[-1])
                except (TypeError, ValueError):
                    volume = None
                vol_mean = float(vol_series.mean())
                if volume is not None and vol_mean > 0:
                    volume_trend = volume > vol_mean

        return {
            "display_name": symbol,
            "current_price": current_price,
            "momentum_5d": momentum_5d,
            "ma20": ma20,
            "volume": volume,
            "volume_trend": volume_trend,
            "currency": _currency(symbol),
        }
    except Exception as exc:
        logger.error("Error parsing history for %s: %s", symbol, exc)
        return _fallback(symbol)


def get_stock_data(symbol: str) -> dict[str, Any] | None:
    """
    Fetch 1-month daily history and compute stock indicators.
    Uses only ticker.history(); retries once if empty; returns safe fallback on failure.
    Never raises.
    """
    if not symbol or not isinstance(symbol, str):
        return None

    symbol = symbol.strip().upper()

    def _fetch() -> dict[str, Any] | None:
        try:
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period="1mo", interval="1d", auto_adjust=True)
            if hist is not None and not hist.empty and len(hist) > 0:
                return _from_history(hist, symbol)
            return None
        except Exception as exc:
            logger.error("yfinance call failed for %s: %s", symbol, exc)
            return None

    try:
        result = _fetch()
        if result is not None:
            return result
        logger.warning("Yahoo returned no history for %s; retrying after %ss", symbol, RETRY_DELAY_SECONDS)
        time.sleep(RETRY_DELAY_SECONDS)
        result = _fetch()
        if result is not None:
            return result
        logger.warning("No data for %s after retry; returning fallback", symbol)
        return _fallback(symbol)
    except Exception as exc:
        logger.error("get_stock_data failed for %s: %s", symbol, exc)
        return _fallback(symbol)
