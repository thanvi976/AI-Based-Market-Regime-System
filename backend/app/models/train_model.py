from __future__ import annotations

import pandas as pd
from pathlib import Path

from backend.app.models.crash_model import train_crash_model, save_crash_model
from backend.app.models.regime_model import train_regime_model, save_regime_model

DATASET_PATH = Path("dataset/historical_market_data.csv")


def load_dataset() -> pd.DataFrame:

    print("Loading dataset...")

    data = pd.read_csv(DATASET_PATH)

    print("Dataset size:", len(data))

    if "crash" not in data.columns:
        print("Creating crash labels")

        data["crash"] = (data["drawdown"] < -0.05).astype(int)

    print("\nCrash distribution:")
    print(data["crash"].value_counts())

    return data


def train_and_persist_models():

    data = load_dataset()

    print("\nTraining crash model...")
    crash_model = train_crash_model(data)

    print("Training regime model...")
    regime_model = train_regime_model(data)

    save_crash_model(crash_model)
    save_regime_model(regime_model)

    print("\nModels saved successfully")


if __name__ == "__main__":
    train_and_persist_models()