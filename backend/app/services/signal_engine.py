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

    # ── Normalise trend_strength to a -1 … +1 scale ───────────────────────────
    # trend_strength is now ma50 - ma200 (e.g. 21.2 for US, or a % for India).
    # Clamp to ±100 then divide so all confidence maths stay in a sane range.
    trend_norm = max(-1.0, min(1.0, trend_strength / 100.0))
    momentum_norm = max(-1.0, min(1.0, momentum * 10.0))

    # ── Regime label for explanations ─────────────────────────────────────────
    regime_label = market_regime if market_regime else (
        "Bull Market" if trend_norm > 0 else "Bear Market"
    )

    # ── RISK ALERT: crash probability > 60% ───────────────────────────────────
    if crash_probability > 0.6:
        confidence = min(95, int(70 + crash_probability * 25))
        return SignalResult(
            signal="RISK ALERT",
            confidence=confidence,
            explanation=(
                f"High crash probability detected ({int(crash_probability * 100)}%) in a "
                f"{regime_label} environment. Market conditions may be unstable. "
                "Consider reducing exposure or hedging existing positions."
            ),
        )

    # ── AVOID: Bear market + negative momentum + elevated risk ────────────────
    if (
        "Bear" in regime_label
        and momentum < -0.01
        and (crash_probability > 0.2 or risk_score > 40)
    ):
        base = 55 + int(crash_probability * 40) + max(0, (risk_score - 40) // 2)
        confidence = min(95, base)
        return SignalResult(
            signal="AVOID",
            confidence=confidence,
            explanation=(
                f"{regime_label} with negative momentum ({momentum * 100:+.1f}%) "
                f"and {int(crash_probability * 100)}% crash probability. "
                "Market conditions do not favour new long positions. "
                "Consider defensive positioning or waiting for clearer signals."
            ),
        )

    # ── BUY: positive trend + positive momentum + low volatility + low crash ──
    if (
        trend_norm > 0
        and momentum > 0.005
        and volatility < 0.008       # daily scale threshold (was 0.003 for 5-min)
        and crash_probability < 0.2
    ):
        base = 60 + int(trend_norm * 20) + int(momentum_norm * 15)
        confidence = min(95, base)
        return SignalResult(
            signal="BUY",
            confidence=confidence,
            explanation=(
                f"{regime_label} with positive momentum ({momentum * 100:+.1f}%). "
                "Trend is strong, volatility is low and crash probability is minimal. "
                "Market conditions favour long positions."
            ),
        )

    # ── HOLD (positive lean): trend positive but mixed signals ────────────────
    if trend_norm > 0:
        base = 50 + int(trend_norm * 15) + max(0, int(momentum_norm * 10))
        confidence = min(95, base)
        return SignalResult(
            signal="HOLD",
            confidence=confidence,
            explanation=(
                f"{regime_label} with moderate risk (score {risk_score}/100). "
                f"Trend is positive but momentum is {momentum * 100:+.1f}%. "
                "Consider holding existing positions and monitoring for clearer signals."
            ),
        )

    # ── AVOID: deeply negative trend ──────────────────────────────────────────
    if trend_norm < -0.1 or risk_score > 60:
        base = 55 + int(abs(trend_norm) * 20) + max(0, (risk_score - 60) // 2)
        confidence = min(95, base)
        return SignalResult(
            signal="AVOID",
            confidence=confidence,
            explanation=(
                f"{regime_label} with elevated risk score ({risk_score}/100). "
                "Market conditions do not favour new long positions. "
                "Consider defensive positioning or waiting for clearer signals."
            ),
        )

    # ── HOLD (neutral): everything else ───────────────────────────────────────
    base = 45 + int(abs(trend_norm) * 10)
    confidence = min(95, base)
    return SignalResult(
        signal="HOLD",
        confidence=confidence,
        explanation=(
            f"Market conditions are neutral ({regime_label}). "
            f"Momentum is {momentum * 100:+.1f}% with moderate volatility. "
            "No strong directional signal — hold current positions."
        ),
    )