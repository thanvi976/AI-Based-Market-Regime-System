"""API route for AI Trading Assistant: POST /ai/trading-assistant."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/ai", tags=["ai"])


class TradingAssistantRequest(BaseModel):
    question: str


def compute_signal(price: float | None, ma20: float | None, momentum: float | None) -> str:
    """Compute BUY/HOLD/SELL from price, MA20, and 5d momentum. Returns HOLD if any input is missing."""
    if price is None or ma20 is None or momentum is None:
        return "HOLD"
    if price > ma20 and momentum > 0:
        return "BUY"
    if price < ma20 and momentum < 0:
        return "SELL"
    return "HOLD"


def get_market_data_for_assistant(ticker: str | None = None) -> dict:
    """Fetch market data — India risk for Indian stocks, US risk for US stocks."""
    is_indian = ticker and (ticker.endswith(".NS") or ticker.endswith(".BO"))

    if is_indian:
        # ── India market risk ─────────────────────────────────────────────────
        from app.services.market_cache import get_cached_data
        from app.services.risk_score import calculate_risk_score

        df = get_cached_data()
        if df is None or df.empty:
            return {}

        india_df = df[df["nifty_close"].diff().fillna(1) != 0].copy()
        india_df["returns"] = india_df["nifty_close"].pct_change()
        india_df["volatility"] = india_df["returns"].rolling(20).std()
        india_df["momentum"] = india_df["nifty_close"].pct_change(10)
        india_df["trend_strength"] = india_df["nifty_close"].pct_change(50)
        india_df = india_df.fillna(0)

        latest = india_df.tail(1).iloc[0]
        volatility = float(latest["volatility"])
        momentum = float(latest["momentum"])
        trend_strength = float(latest["trend_strength"])
        india_vix = float(latest.get("india_vix_close", 15))

        crash_probability = max(0.0, min(1.0, (india_vix / 100) + max(0.0, -momentum) * 3.5))

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

        return {
            "market_regime": market_regime,
            "crash_probability": round(crash_probability, 4),
            "risk_score": risk_score,
            "volatility": round(volatility, 6),
            "trend_strength": round(trend_strength, 4),
            "momentum": round(momentum, 4),
        }

    else:
        # ── US market risk ────────────────────────────────────────────────────
        from app.services.market_cache import get_cached_data
        from app.services.prediction_service import generate_market_prediction

        df = get_cached_data()
        if df is None or df.empty:
            return {}
        result = generate_market_prediction(raw_data=df)
        return {
            "market_regime": result.market_regime,
            "crash_probability": result.crash_probability,
            "risk_score": result.risk_score,
            "volatility": result.volatility,
            "trend_strength": result.trend_strength,
            "momentum": result.momentum,
        }


def run_trading_assistant(question: str) -> dict:
    """Detect stock, fetch stock + market data, call Gemini, return response payload."""
    from app.ticker_mapper import detect_stock_from_question
    from app.services.stock_service import get_stock_data
    from app.services.ai_assistant import ask_trading_ai

    display_name, ticker = detect_stock_from_question(question)
    stock_data_dict = None
    price = None
    currency = None
    stock_label = display_name or "N/A"

    if ticker:
        stock_info = get_stock_data(ticker)
        if stock_info:
            cp = stock_info.get("current_price")
            ma20 = stock_info.get("ma20")
            momentum_5d = stock_info.get("momentum_5d")
            market = "Indian Market" if (ticker.endswith(".NS") or ticker.endswith(".BO")) else "US Market"
            currency = stock_info.get("currency", "INR")
            computed_signal = compute_signal(cp, ma20, momentum_5d)
            stock_data_dict = {
                "display_name": stock_label,
                "symbol": ticker,
                "current_price": round(cp, 2) if cp is not None else None,
                "momentum_5d": momentum_5d,
                "ma20": ma20,
                "volume": stock_info.get("volume"),
                "volume_trend": stock_info.get("volume_trend"),
                "currency": currency,
                "market": market,
                "signal": computed_signal,
            }
            price = cp

    # ── Pass ticker so correct market data is fetched ─────────────────────────
    market_data = get_market_data_for_assistant(ticker=ticker)
    analysis = ask_trading_ai(question=question, stock_data=stock_data_dict, market_data=market_data)

    return {
        "stock": stock_label,
        "price": price,
        "currency": currency,
        "analysis": analysis,
    }


@router.post("/trading-assistant")
def trading_assistant(request: TradingAssistantRequest):
    """
    POST /ai/trading-assistant
    Body: { "question": "Can I invest in Reliance now?" }
    Response: { "stock": "Reliance", "price": 3000, "analysis": "..." }
    """
    question = (request.question or "").strip()
    if not question:
        raise HTTPException(status_code=400, detail="question is required")

    try:
        return run_trading_assistant(question)
    except Exception as exc:
        from app.utils.logger import get_logger
        get_logger(__name__).exception("trading_assistant failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc