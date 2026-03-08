from __future__ import annotations

import logging
import time

import pandas as pd
import yfinance as yf

from app.config import FETCH_RETRIES, MARKET_FALLBACK_SYMBOLS
from app.utils.logger import get_logger

logger = get_logger(__name__)
logging.getLogger("yfinance").setLevel(logging.CRITICAL)
REQUIRED_COLUMNS = ["Datetime", "Open", "High", "Low", "Close", "Volume"]


def _normalize_history_frame(data: pd.DataFrame) -> pd.DataFrame:
    if data is None or data.empty:
        return pd.DataFrame(columns=REQUIRED_COLUMNS)

    frame = data.copy()
    if isinstance(frame.columns, pd.MultiIndex):
        frame.columns = frame.columns.get_level_values(0)

    frame = frame.reset_index()
    if "Date" in frame.columns and "Datetime" not in frame.columns:
        frame = frame.rename(columns={"Date": "Datetime"})
    if "index" in frame.columns and "Datetime" not in frame.columns:
        frame = frame.rename(columns={"index": "Datetime"})

    for col in REQUIRED_COLUMNS:
        if col not in frame.columns:
            frame[col] = 0
    return frame[REQUIRED_COLUMNS].copy()


def _fetch_with_retries(
    symbol: str,
    period: str,
    interval: str,
    max_attempts: int = FETCH_RETRIES,
) -> pd.DataFrame:
    for attempt in range(1, max_attempts + 1):
        try:
            ticker = yf.Ticker(symbol)
            data = ticker.history(period=period, interval=interval, auto_adjust=True)
            normalized = _normalize_history_frame(data)
            if not normalized.empty:
                return normalized
        except Exception as exc:  # pragma: no cover - network/runtime branch
            if attempt == max_attempts:
                logger.warning("Fetch failed for %s (interval=%s): %s", symbol, interval, exc)
        if attempt < max_attempts:
            time.sleep(1)

    logger.warning("No data for %s after %s attempts (interval=%s)", symbol, max_attempts, interval)
    return pd.DataFrame(columns=REQUIRED_COLUMNS)


def fetch_symbol_data(
    symbol: str,
    period: str = "5d",
    interval: str = "5m",
) -> pd.DataFrame:
    frame = _fetch_with_retries(symbol=symbol, period=period, interval=interval)
    if frame.empty and interval == "5m":
        logger.info("Using fallback interval=1d for %s", symbol)
        frame = _fetch_with_retries(symbol=symbol, period=period, interval="1d")
    return frame


def fetch_multiple_symbols(
    symbols: dict[str, str],
    period: str,
    interval: str,
) -> dict[str, pd.DataFrame]:
    output: dict[str, pd.DataFrame] = {}
    for alias, ticker in symbols.items():
        candidates = [ticker, *MARKET_FALLBACK_SYMBOLS.get(alias, [])]
        selected_frame = pd.DataFrame(columns=REQUIRED_COLUMNS)
        for candidate in candidates:
            selected_frame = fetch_symbol_data(candidate, period=period, interval=interval)
            if not selected_frame.empty:
                if candidate != ticker:
                    logger.info("Using fallback ticker %s for alias %s", candidate, alias)
                break

        if selected_frame.empty:
            logger.warning("Skipping alias %s because all tickers returned empty data", alias)
        else:
            output[alias] = selected_frame

        # Add spacing between remote API calls to reduce upstream rate limiting.
        time.sleep(1)
    return output
