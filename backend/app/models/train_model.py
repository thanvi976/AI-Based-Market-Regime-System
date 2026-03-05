from __future__ import annotations

import pandas as pd

from backend.app.config import DATASET_DIR, HISTORICAL_PERIOD
from backend.app.data.market_data import get_live_market_data
from backend.app.features.feature_engineering import add_market_features
from backend.app.models.crash_model import save_crash_model, train_crash_model
from backend.app.models.regime_model import save_regime_model, train_regime_model
from backend.app.utils.logger import get_logger

logger = get_logger(__name__)


def fetch_training_data() -> pd.DataFrame:
    # Daily candles are used for training to maximize long-history stability.
    raw = get_live_market_data(period=HISTORICAL_PERIOD, interval="1d")
    data = add_market_features(raw)
    return data


def save_dataset_csv(data: pd.DataFrame) -> None:
    DATASET_DIR.mkdir(parents=True, exist_ok=True)
    path = DATASET_DIR / "historical_market_data.csv"
    data.to_csv(path, index=False)
    logger.info("Saved dataset to %s", path)


def train_and_persist_models() -> None:
    data = fetch_training_data()
    save_dataset_csv(data)

    crash_model = train_crash_model(data)
    regime_model = train_regime_model(data)

    save_crash_model(crash_model)
    save_regime_model(regime_model)
    logger.info("Model training complete.")


if __name__ == "__main__":
    train_and_persist_models()
