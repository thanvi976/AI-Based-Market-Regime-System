from __future__ import annotations

from fastapi import APIRouter, HTTPException
import pandas as pd

from backend.app.services.risk_score import calculate_risk_score


from backend.app.services.market_cache import get_cached_data, get_cached_timestamp
from backend.app.services.prediction_service import generate_market_prediction
from backend.app.services.signal_engine import generate_signal
from backend.app.data.data_fetcher import fetch_symbol_data
from backend.app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter()


# ── helpers ───────────────────────────────────────────────────────────────────

def _real_us_rows(df: pd.DataFrame) -> pd.DataFrame:
    """Rows where SP500 actually changed — genuine US trading hours only."""
    return df[df["sp500_close"].diff().fillna(1) != 0]


def _real_india_rows(df: pd.DataFrame) -> pd.DataFrame:
    """Rows where NIFTY actually changed — genuine Indian trading hours only."""
    return df[df["nifty_close"].diff().fillna(1) != 0]


def _to_et(series: pd.Series) -> pd.Series:
    """UTC-naive → Eastern Time label string (ET = UTC-5 standard)."""
    return (pd.to_datetime(series) - pd.Timedelta(hours=5)).dt.strftime("%d %b, %I:%M %p")


def _to_ist(series: pd.Series) -> pd.Series:
    """UTC-naive → IST label string (IST = UTC+5:30)."""
    return (pd.to_datetime(series) + pd.Timedelta(hours=5, minutes=30)).dt.strftime("%d %b, %I:%M %p")


# ── basic endpoints ───────────────────────────────────────────────────────────

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
@router.get("/india-signal")
def india_signal():
    try:
        df = get_cached_data()
        if df is None or df.empty:
            raise HTTPException(status_code=503, detail="Market cache not ready")

        india_df = _real_india_rows(df).copy()
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

        signal_result = generate_signal(
            crash_probability=crash_probability,
            trend_strength=trend_strength,
            momentum=momentum,
            volatility=volatility,
            risk_score=risk_score,
            market_regime=market_regime,
        )

        return {
            "signal": signal_result.signal,
            "confidence": signal_result.confidence,
            "explanation": signal_result.explanation,
            "market_regime": market_regime,
            "risk_score": risk_score,
            "volatility": round(volatility, 6),
            "crash_probability": round(crash_probability, 4),
            "updated_at": get_cached_timestamp(),
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to generate India signal")
        raise HTTPException(status_code=500, detail=str(exc)) from exc

@router.get("/india-market")
def india_market():
    try:
        df = get_cached_data()
        if df is None or df.empty:
            raise HTTPException(status_code=503, detail="Market cache not ready")
        latest = _real_india_rows(df).tail(1).to_dict(orient="records")[0]
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


# ── chart endpoints ───────────────────────────────────────────────────────────

@router.get("/market-history")
def market_history():
    """US intraday — most recent trading day only, 5-min bars, timestamps in ET."""
    try:
        df = get_cached_data()
        if df is None or df.empty:
            raise HTTPException(status_code=503, detail="Market cache not ready")

        us_df = _real_us_rows(df)

        # Keep only the most recent trading date
        us_df = us_df.copy()
        us_df["_date"] = pd.to_datetime(us_df["Datetime"]).dt.date
        last_date = us_df["_date"].max()
        us_df = us_df[us_df["_date"] == last_date].drop(columns=["_date"])

        dates = _to_et(us_df["Datetime"]).tolist()
        prices = us_df["sp500_close"].tolist()
        volatility = us_df["sp500_close"].pct_change().fillna(0).abs().tolist()

        return {
            "dates": dates,
            "prices": prices,
            "volatility": volatility,
            "updated_at": get_cached_timestamp(),
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to fetch market history")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/market-history-daily")
def market_history_daily():
    """US 30-day — 1-day bars, date only labels."""
    try:
        spy = fetch_symbol_data("SPY", period="1mo", interval="1d")
        if spy.empty:
            raise HTTPException(status_code=503, detail="Could not fetch SPY daily data")

        dates = pd.to_datetime(spy["Datetime"]).dt.strftime("%d %b").tolist()
        prices = spy["Close"].tolist() if "Close" in spy.columns else spy["sp500_close"].tolist()

        vix = fetch_symbol_data("VIXY", period="1mo", interval="1d")
        vix_prices = vix["Close"].tolist() if not vix.empty and "Close" in vix.columns else [0.0] * len(prices)
        n = len(prices)
        vix_prices = vix_prices[:n] if len(vix_prices) >= n else vix_prices + [0.0] * (n - len(vix_prices))

        return {
            "dates": dates,
            "prices": prices,
            "vix": vix_prices,
            "updated_at": get_cached_timestamp(),
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to fetch US daily history")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/india-history")
def india_history():
    """India intraday — most recent trading day only, 5-min bars, timestamps in IST."""
    try:
        df = get_cached_data()
        if df is None or df.empty:
            raise HTTPException(status_code=503, detail="Market cache not ready")

        india_df = _real_india_rows(df).copy()

        # Convert to IST first, then filter to most recent trading date
        india_df["_ist_dt"] = pd.to_datetime(india_df["Datetime"]) + pd.Timedelta(hours=5, minutes=30)
        india_df["_date"] = india_df["_ist_dt"].dt.date
        last_date = india_df["_date"].max()
        india_df = india_df[india_df["_date"] == last_date]

        dates = india_df["_ist_dt"].dt.strftime("%d %b, %I:%M %p").tolist()
        india_df = india_df.drop(columns=["_ist_dt", "_date"])

        def col(name):
            return india_df[name].tolist() if name in india_df.columns else [0.0] * len(india_df)

        return {
            "dates": dates,
            "nifty_prices": col("nifty_close"),
            "sensex_prices": col("sensex_close"),
            "india_vix": col("india_vix_close"),
            "updated_at": get_cached_timestamp(),
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to fetch India history")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/india-history-daily")
def india_history_daily():
    """India 30-day — 1-day bars, date only labels."""
    try:
        nifty = fetch_symbol_data("^NSEI", period="1mo", interval="1d")
        if nifty.empty:
            raise HTTPException(status_code=503, detail="Could not fetch NIFTY daily data")

        dates = pd.to_datetime(nifty["Datetime"]).dt.strftime("%d %b").tolist()
        nifty_prices = nifty["Close"].tolist() if "Close" in nifty.columns else []
        n = len(nifty_prices)

        sensex = fetch_symbol_data("^BSESN", period="1mo", interval="1d")
        sensex_prices = sensex["Close"].tolist() if not sensex.empty and "Close" in sensex.columns else [0.0] * n
        sensex_prices = sensex_prices[:n] if len(sensex_prices) >= n else sensex_prices + [0.0] * (n - len(sensex_prices))

        india_vix = fetch_symbol_data("^INDIAVIX", period="1mo", interval="1d")
        vix_prices = india_vix["Close"].tolist() if not india_vix.empty and "Close" in india_vix.columns else [0.0] * n
        vix_prices = vix_prices[:n] if len(vix_prices) >= n else vix_prices + [0.0] * (n - len(vix_prices))

        return {
            "dates": dates,
            "nifty_prices": nifty_prices,
            "sensex_prices": sensex_prices,
            "india_vix": vix_prices,
            "updated_at": get_cached_timestamp(),
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to fetch India daily history")
        raise HTTPException(status_code=500, detail=str(exc)) from exc

@router.get("/india-risk")
def india_risk():
    try:
        df = get_cached_data()
        if df is None or df.empty:
            raise HTTPException(status_code=503, detail="Market cache not ready")

        india_df = _real_india_rows(df).copy()
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

        # Heuristic crash probability using India VIX + momentum
        crash_probability = max(0.0, min(1.0, (india_vix / 100) + max(0.0, -momentum) * 3.5))

        # Regime based on trend + volatility
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
            "updated_at": get_cached_timestamp(),
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to generate India risk")
        raise HTTPException(status_code=500, detail=str(exc)) from exc