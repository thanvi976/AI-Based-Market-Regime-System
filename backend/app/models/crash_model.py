from __future__ import annotations

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier

from app.config import CRASH_FORWARD_WINDOW, CRASH_MODEL_PATH, CRASH_THRESHOLD, RANDOM_STATE
from app.features.feature_engineering import feature_matrix
from app.utils.logger import get_logger

logger = get_logger(__name__)


def build_crash_labels(df: pd.DataFrame, price_col: str = "sp500_close") -> pd.Series:
    future_min = (
        df[price_col]
        .rolling(window=CRASH_FORWARD_WINDOW, min_periods=CRASH_FORWARD_WINDOW)
        .min()
        .shift(-CRASH_FORWARD_WINDOW + 1)
    )
    forward_return = (future_min / df[price_col]) - 1
    return (forward_return <= CRASH_THRESHOLD).astype(int).fillna(0)


def train_crash_model(features_df: pd.DataFrame) -> RandomForestClassifier:
    X = feature_matrix(features_df)
    y = build_crash_labels(features_df)
    model = RandomForestClassifier(
        n_estimators=300,
        max_depth=8,
        min_samples_leaf=5,
        random_state=RANDOM_STATE,
    )
    model.fit(X, y)
    return model


def save_crash_model(model: RandomForestClassifier) -> None:
    CRASH_MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, CRASH_MODEL_PATH)
    logger.info("Saved crash model to %s", CRASH_MODEL_PATH)


def load_crash_model() -> RandomForestClassifier:
    if not CRASH_MODEL_PATH.exists():
        raise FileNotFoundError(f"Crash model not found: {CRASH_MODEL_PATH}")
    return joblib.load(CRASH_MODEL_PATH)
