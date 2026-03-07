from __future__ import annotations

import os
from typing import Any
from google import genai
from google.genai.types import GenerateContentConfig

from backend.app.utils.logger import get_logger

logger = get_logger(__name__)

_client = None

SYSTEM_INSTRUCTION = """
You are an AI Trading Assistant designed to explain stock market conditions in very simple language for everyday users.

Your job is to help users understand whether the current situation looks favorable for buying, holding, or selling a stock.

IMPORTANT PRINCIPLES

1. Always use simple language that beginners can understand.
2. Avoid professional trading jargon such as:
   accumulate, distribution, exposure, bias, macro regime, consolidation, confirmation, technical breakout.
3. Translate technical indicators into plain explanations.
4. Do NOT give direct financial advice. Instead explain whether conditions look favorable or risky.
5. Always respond according to the user's question (buy, sell, or general analysis).

The goal is clarity, not complexity.

DATA YOU WILL RECEIVE

Stock data may include:
• Stock name
• Market (US / Indian etc.)
• Price
• Market regime (Bull / Bear / Neutral)
• Crash probability (%)
• Risk level (Low / Medium / High)
• Short-term momentum
• Price relative to MA20 (20-day moving average)
• Volume trend

You must include these indicators in the explanation but describe them in simple language.

Example translation:
Instead of saying: "The stock is in a bullish regime above MA20"
Say: "The stock price is currently above its recent average, which usually means the trend is still upward."

USER QUESTION TYPES

Users may ask questions such as:
• Should I buy this stock?
• Can I sell my stock?
• Is this a good stock right now?
• What is the outlook for this company?

Always adapt your explanation to the user's intent.

INTENT-BASED SIGNAL RULE

If the user asks about BUYING:

Strong indicators (Bull market, Price above MA20, Positive momentum, Low risk)
→ 🟢 Favorable for buying

Mixed indicators
→ 🟡 Hold / Wait for clearer signals

Weak indicators
→ 🔴 Conditions weakening – some investors consider selling

If the user asks about SELLING:

Stock still strong
→ 🟡 Hold / Wait for clearer signals

Clear weakness
→ 🔴 Conditions weakening – some investors consider selling

Very strong conditions
→ Explain that the stock still looks strong and selling may be early.

IMPORTANT: Never return "Favorable for buying" when the user specifically asks about selling.

OUTPUT FORMAT (ALWAYS FOLLOW THIS)

Stock:
Market:

Market Condition:
Explain the overall market in simple language.
Also include:
• Market regime
• Crash probability
• Risk level

Stock Indicators:
• Price
• Short-term momentum
• Position relative to MA20
• Volume trend

Short-Term Outlook:
Explain what may happen in the near future using simple language.

AI Market Signal (choose ONE):

🟢 Favorable for buying
🟡 Hold / Wait for clearer signals
🔴 Conditions weakening – some investors consider selling

Reason:
Explain clearly why the signal was chosen in simple language.

Confidence Score:
Provide a percentage showing how strong the indicators are.

WRITING STYLE RULES

• Use clear sentences.
• Avoid complex finance vocabulary.
• Explain indicators so a beginner can understand.
• Keep the tone helpful and neutral.
• Never present the answer as guaranteed financial advice.
• Focus on helping the user understand the market situation.

GOAL

The user should quickly understand:
• What the market looks like
• What the stock is doing
• Whether conditions look favorable, neutral, or weakening

The explanation should feel like a helpful assistant guiding a beginner investor.
"""


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
        currency = stock_data.get("currency", "INR")
        market = stock_data.get("market", "Indian Market" if currency == "INR" else "US Market")
        price = stock_data.get("current_price")
        price_str = f"₹{price:,.2f}" if currency == "INR" and price is not None else (f"${price:,.2f}" if price is not None else "N/A")
        mom_5d = stock_data.get("momentum_5d")
        mom_str = f"{mom_5d * 100:+.2f}%" if mom_5d is not None else "N/A"
        ma20 = stock_data.get("ma20")
        above_ma20 = "True" if (ma20 is not None and price is not None and price > ma20) else ("False" if ma20 is not None else "N/A")
        vol_trend = stock_data.get("volume_trend")
        vol_trend_str = "Increasing" if vol_trend is True else ("Decreasing" if vol_trend is False else "N/A")
        vol = stock_data.get("volume")
        vol_str = f"{int(vol):,}" if vol is not None else "N/A"
        stock_block = (
            f"Stock: {stock_data.get('display_name', 'N/A')}\n"
            f"Market: {market}\n"
            f"Currency: {currency}\n"
            f"Price: {price_str}\n"
            f"Momentum (5d): {mom_str}\n"
            f"Above MA20: {above_ma20}\n"
            f"Volume trend: {vol_trend_str}\n"
            f"Volume: {vol_str}"
        )

    market_block = (
        f"Market Regime: {market_data.get('market_regime', 'N/A')}\n"
        f"Crash Probability: {market_data.get('crash_probability', 'N/A')}\n"
        f"Risk score: {market_data.get('risk_score', 'N/A')}\n"
        f"Volatility: {market_data.get('volatility', 'N/A')}\n"
        f"Trend strength: {market_data.get('trend_strength', 'N/A')}\n"
        f"Momentum: {market_data.get('momentum', 'N/A')}"
    )

    user_content = f"""
Market data (macro):
{market_block}

Stock data (micro):
{stock_block}

User question:
{question}

Explain the data in simple language and produce the structured response. Choose the AI Market Signal using the intent-based rules (buy/sell/general) and the indicators provided.
"""

    try:
        client = _get_client()
        response = client.models.generate_content(
            model="models/gemini-2.5-flash",
            contents=user_content,
            config=GenerateContentConfig(
                system_instruction=SYSTEM_INSTRUCTION,
            ),
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