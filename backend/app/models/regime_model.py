from __future__ import annotations

import joblib
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans

from app.config import RANDOM_STATE, REGIME_MODEL_PATH
from app.features.feature_engineering import feature_matrix
from app.utils.logger import get_logger

logger = get_logger(__name__)

REGIME_LABELS = ["Bull Market", "Bear Market", "Sideways", "High Volatility"]


def train_regime_model(features_df: pd.DataFrame) -> KMeans:
    X = feature_matrix(features_df)
    model = KMeans(n_clusters=4, random_state=RANDOM_STATE, n_init=20)
    model.fit(X)
    return model


def save_regime_model(model: KMeans) -> None:
    REGIME_MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, REGIME_MODEL_PATH)
    logger.info("Saved regime model to %s", REGIME_MODEL_PATH)


def load_regime_model() -> KMeans:
    if not REGIME_MODEL_PATH.exists():
        raise FileNotFoundError(f"Regime model not found: {REGIME_MODEL_PATH}")
    return joblib.load(REGIME_MODEL_PATH)


def cluster_to_label(model: KMeans, feature_frame: pd.DataFrame) -> dict[int, str]:
    cluster_ids = model.predict(feature_frame)
    temp = feature_frame.copy()
    temp["cluster"] = cluster_ids

    # Heuristic mapping from cluster signatures to named regimes.
    stats = temp.groupby("cluster")[["returns", "volatility", "trend_strength"]].mean()

    labels = {}
    for cluster, row in stats.iterrows():
        ret = float(row["returns"])
        vol = float(row["volatility"])
        trend = float(row["trend_strength"])
        if vol > stats["volatility"].quantile(0.75):
            labels[int(cluster)] = "High Volatility"
        elif ret > 0 and trend > 0:
            labels[int(cluster)] = "Bull Market"
        elif ret < 0 and trend < 0:
            labels[int(cluster)] = "Bear Market"
        else:
            labels[int(cluster)] = "Sideways"

    for cluster in np.unique(cluster_ids):
        labels.setdefault(int(cluster), REGIME_LABELS[int(cluster) % len(REGIME_LABELS)])
    return labels
