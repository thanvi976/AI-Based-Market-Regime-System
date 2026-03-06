"""Fetch real-time stock data using yfinance (price, momentum, volume)."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone

import yfinance as yf

from backend.app.utils.logger import get_logger

logger = get_logger(__name__)


@dataclass
class StockData:
    current_price: float
    momentum: float
    volume: int | None = None
    currency: str = "INR"
    last_updated: str | None = None


def get_stock_data(symbol: str) -> StockData | None:
    """
    Fetch 1-minute interval data for the current trading day and derive
    current price, recent momentum, and volume. Falls back to 1d data if
    1m is unavailable (e.g. outside market hours or no intraday data).
    """
    if not symbol or not symbol.strip():
        return None

    symbol = symbol.strip().upper()
    try:
        ticker = yf.Ticker(symbol)
        # Prefer 1m for "current trading day"; yfinance allows 1m for last 7 days
        hist_1m = ticker.history(period="1d", interval="1m", auto_adjust=True)
        if hist_1m is not None and not hist_1m.empty:
            return _from_intraday(hist_1m, symbol)
        # Fallback: 1d or 5d daily data
        hist_1d = ticker.history(period="5d", interval="1d", auto_adjust=True)
        if hist_1d is not None and not hist_1d.empty:
            return _from_daily(hist_1d, symbol)
        # Last resort: info for current/last price
        info = ticker.info
        price = _safe_float(info.get("currentPrice") or info.get("regularMarketPrice") or info.get("previousClose"))
        if price is None:
            logger.warning("No price data for symbol %s", symbol)
            return None
        return StockData(
            current_price=price,
            momentum=0.0,
            volume=_safe_int(info.get("volume") or info.get("regularMarketVolume")),
            currency=info.get("currency", "INR"),
            last_updated=datetime.now(timezone.utc).isoformat(),
        )
    except Exception as exc:
        logger.exception("get_stock_data failed for %s: %s", symbol, exc)
        return None


def _from_intraday(hist, symbol: str) -> StockData:
    close = hist["Close"]
    current_price = float(close.iloc[-1])
    volume = int(hist["Volume"].iloc[-1]) if "Volume" in hist.columns else None
    # Momentum: % change over last 5 candles if available, else last 2
    n = min(5, len(close) - 1)
    if n > 0:
        momentum = (current_price - float(close.iloc[-1 - n])) / float(close.iloc[-1 - n])
    else:
        momentum = 0.0
    return StockData(
        current_price=current_price,
        momentum=round(momentum, 6),
        volume=volume,
        last_updated=close.index[-1].isoformat() if hasattr(close.index[-1], "isoformat") else str(close.index[-1]),
    )


def _from_daily(hist, symbol: str) -> StockData:
    close = hist["Close"]
    current_price = float(close.iloc[-1])
    volume = int(hist["Volume"].iloc[-1]) if "Volume" in hist.columns else None
    # Momentum: 1-day % change
    if len(close) >= 2:
        momentum = (current_price - float(close.iloc[-2])) / float(close.iloc[-2])
    else:
        momentum = 0.0
    return StockData(
        current_price=current_price,
        momentum=round(momentum, 6),
        volume=volume,
        last_updated=close.index[-1].isoformat() if hasattr(close.index[-1], "isoformat") else str(close.index[-1]),
    )


def _safe_float(value) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _safe_int(value) -> int | None:
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None
