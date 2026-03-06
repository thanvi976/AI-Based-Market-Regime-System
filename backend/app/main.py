from __future__ import annotations

import asyncio

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.routes import router as api_router
from backend.app.api_route import router as ai_router
from backend.app.services.market_cache import refresh_market_cache
from backend.app.utils.logger import get_logger
from dotenv import load_dotenv
load_dotenv()  # loads .env from project root when you start the app

app = FastAPI(title="AI Market Regime & Crash Prediction System", version="1.0.0")
logger = get_logger(__name__)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)
app.include_router(ai_router)

REFRESH_SECONDS = 5 * 60
_market_refresh_task: asyncio.Task | None = None
_market_refresh_running = True


async def _market_refresh_loop() -> None:
    while _market_refresh_running:
        await asyncio.to_thread(refresh_market_cache)
        await asyncio.sleep(REFRESH_SECONDS)


@app.on_event("startup")
async def startup_event() -> None:
    global _market_refresh_task, _market_refresh_running
    _market_refresh_running = True
    await asyncio.to_thread(refresh_market_cache)
    _market_refresh_task = asyncio.create_task(_market_refresh_loop())
    logger.info("Market cache scheduler started")


@app.on_event("shutdown")
async def shutdown_event() -> None:
    global _market_refresh_task, _market_refresh_running
    _market_refresh_running = False
    if _market_refresh_task is not None:
        _market_refresh_task.cancel()
        try:
            await _market_refresh_task
        except asyncio.CancelledError:
            pass
        _market_refresh_task = None
    logger.info("Market cache scheduler stopped")


@app.get("/")
def health():
    return {"status": "ok", "service": app.title}
