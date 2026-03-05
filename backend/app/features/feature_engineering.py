from __future__ import annotations

import pandas as pd

from backend.app.features.indicators import compute_drawdown, compute_macd, compute_rsi


BASE_PRICE_COL = "sp500_close"
BASE_VOLUME_COL = "sp500_volume"

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
    output["trend_strength"] = (output["ma50"] / output["ma200"]) - 1

    output = output.replace([pd.NA], 0).fillna(0)
    return output


def feature_matrix(df: pd.DataFrame) -> pd.DataFrame:
    missing = [col for col in FEATURE_COLUMNS if col not in df.columns]
    if missing:
        raise ValueError(f"Missing required feature columns: {missing}")
    return df[FEATURE_COLUMNS].copy()
