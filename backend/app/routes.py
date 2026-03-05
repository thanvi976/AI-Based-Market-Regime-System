from __future__ import annotations

from fastapi import APIRouter, HTTPException

from backend.app.services.market_cache import get_cached_data, get_cached_timestamp
from backend.app.services.prediction_service import generate_market_prediction
from backend.app.services.signal_engine import generate_signal
from backend.app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter()


@router.get("/market-data")
def market_data():
    try:
        df = get_cached_data()

        if df is None or df.empty:
            raise HTTPException(status_code=503, detail="Market cache not ready")

        latest = df.tail(1).to_dict(orient="records")[0]

        return {
            "timestamp": latest.get("Datetime"),
            "updated_at": get_cached_timestamp(),
            "sp500_close": latest.get("sp500_close"),
            "nasdaq_close": latest.get("nasdaq_close"),
            "dow_jones_close": latest.get("dow_jones_close"),
            "vix_close": latest.get("vix_close"),
        }

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to fetch market data")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/market-risk")
def market_risk():
    try:
        df = get_cached_data()

        if df is None or df.empty:
            raise HTTPException(status_code=503, detail="Market cache not ready")

        result = generate_market_prediction(raw_data=df)

        return {
            "market_regime": result.market_regime,
            "crash_probability": result.crash_probability,
            "risk_score": result.risk_score,
            "volatility": result.volatility,
            "trend_strength": result.trend_strength,
            "momentum": result.momentum,
            "updated_at": get_cached_timestamp(),
        }

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to generate market risk")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/market-signal")
def market_signal():
    try:
        df = get_cached_data()
        if df is None or df.empty:
            raise HTTPException(status_code=503, detail="Market cache not ready")
        result = generate_market_prediction(raw_data=df)
        signal_result = generate_signal(
            crash_probability=result.crash_probability,
            trend_strength=result.trend_strength,
            momentum=result.momentum,
            volatility=result.volatility,
            risk_score=result.risk_score,
            market_regime=result.market_regime,
        )
        return {
            "signal": signal_result.signal,
            "confidence": signal_result.confidence,
            "explanation": signal_result.explanation,
            "market_regime": result.market_regime,
            "risk_score": result.risk_score,
            "volatility": result.volatility,
            "crash_probability": result.crash_probability,
            "updated_at": get_cached_timestamp(),
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to generate market signal")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/market-history")
def market_history():
    try:
        df = get_cached_data()

        if df is None or df.empty:
            raise HTTPException(status_code=503, detail="Market cache not ready")

        history = df.tail(30)

        returns = history["sp500_close"].pct_change().fillna(0)
        volatility = returns.abs()

        return {
            "dates": history["Datetime"].astype(str).tolist(),
            "prices": history["sp500_close"].tolist(),
            "volatility": volatility.tolist(),
            "updated_at": get_cached_timestamp(),
        }

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to fetch market history")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/india-market")
def india_market():
    try:
        df = get_cached_data()

        if df is None or df.empty:
            raise HTTPException(status_code=503, detail="Market cache not ready")

        latest = df.tail(1).to_dict(orient="records")[0]

        return {
            "timestamp": latest.get("Datetime"),
            "nifty_close": latest.get("nifty_close"),
            "sensex_close": latest.get("sensex_close"),
            "india_vix": latest.get("india_vix_close"),
            "updated_at": get_cached_timestamp(),
        }

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to fetch India market data")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/india-history")
def india_history():
    try:
        df = get_cached_data()

        if df is None or df.empty:
            raise HTTPException(status_code=503, detail="Market cache not ready")

        history = df.tail(30)

        def col_or_empty(name):
            if name in history.columns:
                return history[name].tolist()
            return [0.0] * len(history)

        return {
            "dates": history["Datetime"].astype(str).tolist(),
            "nifty_prices": col_or_empty("nifty_close"),
            "sensex_prices": col_or_empty("sensex_close"),
            "india_vix": col_or_empty("india_vix_close"),
            "updated_at": get_cached_timestamp(),
        }

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to fetch India history")
        raise HTTPException(status_code=500, detail=str(exc)) from exc
