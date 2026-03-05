from __future__ import annotations

from dataclasses import dataclass

import pandas as pd

from backend.app.config import DEFAULT_INTERVAL, DEFAULT_PERIOD
from backend.app.data.market_data import get_live_market_data
from backend.app.features.feature_engineering import add_market_features, feature_matrix
from backend.app.models.crash_model import load_crash_model
from backend.app.models.regime_model import cluster_to_label, load_regime_model
from backend.app.models.train_model import train_and_persist_models
from backend.app.services.risk_score import calculate_risk_score
from backend.app.utils.helpers import to_float
from backend.app.utils.logger import get_logger

logger = get_logger(__name__)


@dataclass
class PredictionResult:
    market_regime: str
    crash_probability: float
    risk_score: int
    volatility: float
    trend_strength: float
    momentum: float


def _ensure_models():
    try:
        crash_model = load_crash_model()
        regime_model = load_regime_model()
        return crash_model, regime_model
    except FileNotFoundError:
        logger.warning("Model files missing; training initial models.")
        try:
            train_and_persist_models()
            return load_crash_model(), load_regime_model()
        except Exception as exc:
            logger.warning("Model bootstrap failed, using heuristic mode: %s", exc)
            return None, None


def generate_market_prediction(raw_data: pd.DataFrame | None = None) -> PredictionResult:
    crash_model, regime_model = _ensure_models()
    raw = raw_data if raw_data is not None else get_live_market_data(period=DEFAULT_PERIOD, interval=DEFAULT_INTERVAL)
    featured = add_market_features(raw)
    X = feature_matrix(featured)

    latest_features = X.tail(1)
    latest_row = featured.tail(1).iloc[0]

    volatility = to_float(latest_row["volatility"])
    trend_strength = to_float(latest_row["trend_strength"])
    momentum = to_float(latest_row["momentum_10"])

    if crash_model is not None and regime_model is not None:
        probabilities = crash_model.predict_proba(latest_features)[0]
        classes = list(getattr(crash_model, "classes_", []))
        if 1 in classes:
            crash_probability = to_float(probabilities[classes.index(1)])
        else:
            crash_probability = 0.0

        cluster_id = int(regime_model.predict(latest_features)[0])
        label_map = cluster_to_label(regime_model, X.tail(250))
        market_regime = label_map.get(cluster_id, "Sideways")
    else:
        # Heuristic fallback if models cannot be loaded/trained.
        crash_probability = max(0.0, min(1.0, volatility * 2.2 + max(0.0, -momentum) * 3.5))
        if volatility > 0.025:
            market_regime = "High Volatility"
        elif trend_strength > 0.015:
            market_regime = "Bull Market"
        elif trend_strength < -0.015:
            market_regime = "Bear Market"
        else:
            market_regime = "Sideways"

    risk_score = calculate_risk_score(
        volatility=volatility,
        crash_probability=crash_probability,
        momentum=momentum,
        trend_strength=trend_strength,
    )

    return PredictionResult(
        market_regime=market_regime,
        crash_probability=round(crash_probability, 4),
        risk_score=risk_score,
        volatility=round(volatility, 4),
        trend_strength=round(trend_strength, 4),
        momentum=round(momentum, 4),
    )
