from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[2]
MODEL_DIR = BASE_DIR / "models"
DATASET_DIR = BASE_DIR / "dataset"

# Major index proxies used for market signal aggregation (US + India).
MARKET_SYMBOLS = {
    "sp500": "SPY",
    "nasdaq": "QQQ",
    "dow_jones": "DIA",
    "vix": "VIXY",
    "nifty": "^NSEI",
    "sensex": "^BSESN",
    "india_vix": "^INDIAVIX",
}
MARKET_FALLBACK_SYMBOLS = {}

DEFAULT_INTERVAL = "5m"
DEFAULT_PERIOD = "5d"
HISTORICAL_PERIOD = "5y"
FETCH_RETRIES = 2
MARKET_CACHE_TTL_MINUTES = 5

RANDOM_STATE = 42
CRASH_FORWARD_WINDOW = 10
CRASH_THRESHOLD = -0.08

CRASH_MODEL_PATH = MODEL_DIR / "crash_model.pkl"
REGIME_MODEL_PATH = MODEL_DIR / "regime_model.pkl"
