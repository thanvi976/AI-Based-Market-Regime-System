from __future__ import annotations

from datetime import datetime, timedelta, timezone
from threading import Lock

import pandas as pd

from app.config import DEFAULT_INTERVAL, DEFAULT_PERIOD, MARKET_CACHE_TTL_MINUTES
from app.data.market_data import get_live_market_data
from app.utils.logger import get_logger

logger = get_logger(__name__)

# ── 5-min intraday cache (for charts) ─────────────────────────────────────────
_cache_lock = Lock()
_cached_market_data: pd.DataFrame | None = None
_cached_at: datetime | None = None

# ── daily cache (for ML predictions) ──────────────────────────────────────────
_daily_cache_lock = Lock()
_cached_daily_data: pd.DataFrame | None = None
_cached_daily_at: datetime | None = None
_DAILY_CACHE_TTL_MINUTES = 60  # refresh daily data once per hour


def update_cache(data: pd.DataFrame) -> None:
    global _cached_market_data, _cached_at
    with _cache_lock:
        _cached_market_data = data.copy()
        _cached_at = datetime.now(timezone.utc)


def get_cached_data(max_age_minutes: int = MARKET_CACHE_TTL_MINUTES) -> pd.DataFrame | None:
    with _cache_lock:
        if _cached_market_data is None or _cached_at is None:
            return None
        if datetime.now(timezone.utc) - _cached_at > timedelta(minutes=max_age_minutes):
            return None
        return _cached_market_data.copy()


def get_cached_timestamp() -> str | None:
    with _cache_lock:
        return _cached_at.isoformat() if _cached_at else None


def update_daily_cache(data: pd.DataFrame) -> None:
    global _cached_daily_data, _cached_daily_at
    with _daily_cache_lock:
        _cached_daily_data = data.copy()
        _cached_daily_at = datetime.now(timezone.utc)


def get_cached_daily_data() -> pd.DataFrame | None:
    with _daily_cache_lock:
        if _cached_daily_data is None or _cached_daily_at is None:
            return None
        if datetime.now(timezone.utc) - _cached_daily_at > timedelta(minutes=_DAILY_CACHE_TTL_MINUTES):
            return None
        return _cached_daily_data.copy()


def refresh_market_cache(period: str = DEFAULT_PERIOD, interval: str = DEFAULT_INTERVAL) -> None:
    try:
        data = get_live_market_data(period=period, interval=interval)
        if data.empty:
            logger.warning("Market cache refresh returned empty dataset; keeping previous cache")
            return
        update_cache(data)
        logger.info("Market cache refreshed with %s rows", len(data))
    except Exception as exc:
        logger.warning("Market cache refresh failed: %s", exc)


def refresh_daily_cache() -> None:
    """Fetch 1-year daily bars for ML prediction — matches training data scale."""
    try:
        data = get_live_market_data(period="1y", interval="1d")
        if data.empty:
            logger.warning("Daily cache refresh returned empty dataset; keeping previous cache")
            return
        update_daily_cache(data)
        logger.info("Daily prediction cache refreshed with %s rows", len(data))
    except Exception as exc:
        logger.warning("Daily cache refresh failed: %s", exc)