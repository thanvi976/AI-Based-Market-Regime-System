

from __future__ import annotations

import os
from typing import Any
from google import genai

from backend.app.utils.logger import get_logger

logger = get_logger(__name__)

_client = None


def _get_client():
    global _client
    if _client is None:
        api_key = os.environ.get("GEMINI_API_KEY", "").strip()
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable is not set")

        _client = genai.Client(api_key=api_key)

    return _client


def ask_trading_ai(
    question: str,
    stock_data: dict[str, Any] | None,
    market_data: dict[str, Any],
) -> str:

    stock_block = "Not specified or could not be loaded."
    if stock_data:
        stock_block = (
            f"Stock: {stock_data.get('display_name', 'N/A')}\n"
            f"Current price: {stock_data.get('current_price', 'N/A')} {stock_data.get('currency', 'INR')}\n"
            f"Recent momentum: {stock_data.get('momentum', 'N/A')}"
        )

        if stock_data.get("volume") is not None:
            stock_block += f"\nVolume: {stock_data['volume']}"

    market_block = (
        f"Market regime: {market_data.get('market_regime', 'N/A')}\n"
        f"Crash probability: {market_data.get('crash_probability', 'N/A')}\n"
        f"Risk score: {market_data.get('risk_score', 'N/A')}\n"
        f"Volatility: {market_data.get('volatility', 'N/A')}\n"
        f"Trend strength: {market_data.get('trend_strength', 'N/A')}\n"
        f"Momentum: {market_data.get('momentum', 'N/A')}"
    )

    system_instruction = (
        "You are an AI trading assistant providing market insight only. "
        "Do NOT give direct financial advice or buy/sell recommendations. "
        "Explain current stock conditions, market regime, short-term outlook, "
        "and whether the environment appears favorable or risky."
    )

    user_content = (
        f"{system_instruction}\n\n"
        "Stock data:\n"
        f"{stock_block}\n\n"
        "Market conditions:\n"
        f"{market_block}\n\n"
        f"User question:\n{question}\n\n"
        "Provide concise market insight."
    )

    try:
        client = _get_client()

        response = client.models.generate_content(
            model="models/gemini-flash-latest",
            contents=user_content,
        )

        if not response or not response.text:
            return "The assistant could not generate a response."

        return response.text.strip()

    except ValueError as e:
        if "GEMINI_API_KEY" in str(e):
            logger.warning("Gemini API key not configured")
            return "Trading assistant is not configured (missing API key)."
        raise

    except Exception as exc:
        logger.exception("ask_trading_ai failed: %s", exc)
        return f"Unable to get AI analysis at the moment: {exc!s}"