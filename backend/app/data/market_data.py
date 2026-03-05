from __future__ import annotations

from datetime import datetime, timedelta, timezone

import numpy as np
import pandas as pd

from backend.app.config import DEFAULT_INTERVAL, DEFAULT_PERIOD, MARKET_SYMBOLS
from backend.app.data.data_fetcher import fetch_multiple_symbols
from backend.app.utils.logger import get_logger

logger = get_logger(__name__)


def _interval_to_delta(interval: str) -> timedelta:
    if interval.endswith("m"):
        return timedelta(minutes=int(interval[:-1]))
    if interval.endswith("h"):
        return timedelta(hours=int(interval[:-1]))
    return timedelta(days=1)


def _build_fallback_market_data(interval: str) -> pd.DataFrame:
    # Offline-safe synthetic market stream to keep API responsive when upstream data fails.
    steps = 320
    delta = _interval_to_delta(interval)
    now = datetime.now(timezone.utc)
    times = [now - delta * (steps - 1 - i) for i in range(steps)]

    rng = np.random.default_rng(42)
    base_returns = rng.normal(0.00015, 0.002, size=steps)
    prices = 5000 * np.cumprod(1 + base_returns)

    sp500 = prices
    nasdaq = prices * 1.2
    dow_jones = prices * 7.8
    vix = np.clip(18 + rng.normal(0, 1.8, size=steps).cumsum() * 0.05, 12, 45)
    volumes = rng.integers(1_500_000, 6_500_000, size=steps)
    nifty = prices * 0.24
    sensex = prices * 0.08
    india_vix_arr = np.clip(12 + rng.normal(0, 1.2, size=steps).cumsum() * 0.03, 10, 35)

    return pd.DataFrame(
        {
            "Datetime": times,
            "sp500_close": sp500,
            "sp500_volume": volumes,
            "nasdaq_close": nasdaq,
            "nasdaq_volume": (volumes * 1.1).astype(int),
            "dow_jones_close": dow_jones,
            "dow_jones_volume": (volumes * 0.8).astype(int),
            "vix_close": vix,
            "vix_volume": (volumes * 0.5).astype(int),
            "nifty_close": nifty,
            "nifty_volume": (volumes * 0.5).astype(int),
            "sensex_close": sensex,
            "sensex_volume": (volumes * 0.4).astype(int),
            "india_vix_close": india_vix_arr,
            "india_vix_volume": (volumes * 0.2).astype(int),
        }
    )


def get_live_market_data(
    period: str = DEFAULT_PERIOD,
    interval: str = DEFAULT_INTERVAL,
) -> pd.DataFrame:
    try:
        symbol_frames = fetch_multiple_symbols(MARKET_SYMBOLS, period=period, interval=interval)
    except Exception as exc:
        logger.warning("Falling back to synthetic market data: %s", exc)
        return _build_fallback_market_data(interval=interval)

    if not symbol_frames or "sp500" not in symbol_frames:
        logger.warning("Required symbols unavailable; using synthetic fallback data")
        return _build_fallback_market_data(interval=interval)

    merged: pd.DataFrame | None = None
    for alias, frame in symbol_frames.items():
        if frame.empty:
            logger.warning("Skipping empty frame for alias %s", alias)
            continue
        local = frame[["Datetime", "Close", "Volume"]].copy()
        local = local.rename(
            columns={
                "Close": f"{alias}_close",
                "Volume": f"{alias}_volume",
            }
        )
        merged = local if merged is None else merged.merge(local, on="Datetime", how="inner")

    if merged is None or merged.empty:
        logger.warning("Could not merge market data; using synthetic fallback data")
        return _build_fallback_market_data(interval=interval)

    merged = merged.sort_values("Datetime").reset_index(drop=True)
    return merged
