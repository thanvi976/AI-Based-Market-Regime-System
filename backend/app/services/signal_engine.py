"""
Market Signal Engine: BUY / HOLD / RISK ALERT / AVOID with confidence and explanation.
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass
class SignalResult:
    signal: str
    confidence: int
    explanation: str


def generate_signal(
    *,
    crash_probability: float,
    trend_strength: float,
    momentum: float,
    volatility: float,
    risk_score: int = 0,
    market_regime: str = "",
) -> SignalResult:
    crash_probability = float(crash_probability or 0)
    trend_strength = float(trend_strength or 0)
    momentum = float(momentum or 0)
    volatility = float(volatility or 0)
    risk_score = int(risk_score or 0)

    if crash_probability > 0.6:
        confidence = min(95, int(70 + crash_probability * 25))
        return SignalResult(
            signal="RISK ALERT",
            confidence=min(confidence, 95),
            explanation=(
                "Volatility spike detected with increasing crash probability. "
                "Market conditions may be unstable. Consider reducing exposure or hedging."
            ),
        )

    if trend_strength > 0 and momentum > 0 and volatility < 0.003:
        base = abs(trend_strength + momentum) * 1200
        confidence = min(95, max(60, int(base)))
        return SignalResult(
            signal="BUY",
            confidence=confidence,
            explanation=(
                "Positive trend strength and momentum indicate strong market movement. "
                "Volatility remains low and crash probability is minimal. "
                "Market conditions favor long positions."
            ),
        )

    if trend_strength > 0:
        base = abs(trend_strength + momentum) * 800
        confidence = min(95, max(50, int(base)))
        return SignalResult(
            signal="HOLD",
            confidence=confidence,
            explanation=(
                f"Bull market regime with moderate risk (score {risk_score}/100). "
                "Trend is positive; consider holding existing positions. "
                "Monitor volatility and crash probability for changes."
            ),
        )

    if trend_strength < -0.01 or risk_score > 60:
        base = abs(trend_strength) * 500 + (risk_score * 0.3)
        confidence = min(95, max(55, int(base)))
        return SignalResult(
            signal="AVOID",
            confidence=confidence,
            explanation=(
                "Negative or weak trend with elevated risk. "
                "Market conditions do not favor new long positions. "
                "Consider defensive positioning or waiting for clearer signals."
            ),
        )

    base = abs(trend_strength + momentum) * 600
    confidence = min(95, max(45, int(base)))
    return SignalResult(
        signal="HOLD",
        confidence=confidence,
        explanation=(
            "Market conditions are neutral. "
            "Moderate volatility and trend strength suggest holding current positions. "
            "No strong directional signal."
        ),
    )
