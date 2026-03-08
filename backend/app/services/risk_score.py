from __future__ import annotations

from app.utils.helpers import clamp


def calculate_risk_score(
    volatility: float,
    crash_probability: float,
    momentum: float,
    trend_strength: float,
) -> int:
    # Weighted score; positive momentum/trend reduce aggregate risk.
    vol_component = clamp(volatility * 100, 0, 100) * 0.35
    crash_component = clamp(crash_probability * 100, 0, 100) * 0.45
    momentum_component = clamp((0.05 - momentum) * 1000, 0, 100) * 0.10
    trend_component = clamp((-trend_strength) * 200, 0, 100) * 0.10

    score = vol_component + crash_component + momentum_component + trend_component
    return int(round(clamp(score, 0, 100)))
