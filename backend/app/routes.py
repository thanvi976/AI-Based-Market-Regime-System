from __future__ import annotations

from fastapi import APIRouter, HTTPException

from backend.app.services.market_cache import get_cached_data, get_cached_timestamp
from backend.app.services.prediction_service import generate_market_prediction
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
