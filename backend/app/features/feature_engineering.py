from __future__ import annotations

import pandas as pd

from backend.app.features.indicators import compute_drawdown, compute_macd, compute_rsi


BASE_PRICE_COL = "sp500_close"
BASE_VOLUME_COL = "sp500_volume"
VIX_COL = "vix_close"

FEATURE_COLUMNS = [
    "returns",
    "volatility",
    "rsi",
    "macd",
    "macd_signal",
    "macd_hist",
    "ma50",
    "ma200",
    "volume",
    "drawdown",
    "momentum_10",
    "trend_strength",
    "vix_close",    # ← added: direct fear gauge
    "vix_ma10",     # ← added: VIX 10-day average
    "vix_spike",    # ← added: how much VIX is above its own average
]


def add_market_features(df: pd.DataFrame) -> pd.DataFrame:
    output = df.copy()

    output["returns"] = output[BASE_PRICE_COL].pct_change()
    output["volatility"] = output["returns"].rolling(20).std()
    output["ma50"] = output[BASE_PRICE_COL].rolling(50).mean()
    output["ma200"] = output[BASE_PRICE_COL].rolling(200).mean()
    output["rsi"] = compute_rsi(output[BASE_PRICE_COL], period=14)

    macd_df = compute_macd(output[BASE_PRICE_COL])
    output = pd.concat([output, macd_df], axis=1)

    output["drawdown"] = compute_drawdown(output[BASE_PRICE_COL])
    output["volume"] = output.get(BASE_VOLUME_COL, pd.Series(index=output.index))
    output["momentum_10"] = output[BASE_PRICE_COL].pct_change(10)
    output["trend_strength"] = output["ma50"] - output["ma200"]

    # ── VIX features ──────────────────────────────────────────────────────────
    if VIX_COL in output.columns:
        output["vix_close"] = output[VIX_COL]
    else:
        output["vix_close"] = 20.0  # neutral fallback if VIX unavailable

    output["vix_ma10"] = output["vix_close"].rolling(10).mean()
    output["vix_spike"] = (output["vix_close"] / output["vix_ma10"].replace(0, 1)) - 1

    output = output.replace([pd.NA], 0).fillna(0)
    return output


def feature_matrix(df: pd.DataFrame) -> pd.DataFrame:
    missing = [col for col in FEATURE_COLUMNS if col not in df.columns]
    if missing:
        raise ValueError(f"Missing required feature columns: {missing}")
    return df[FEATURE_COLUMNS].copy()