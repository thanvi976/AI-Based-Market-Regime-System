import pandas as pd
from pandas_datareader import data as pdr
from ta.momentum import RSIIndicator
from ta.trend import MACD

print("Downloading market data from Stooq...")

start = "2010-01-01"

symbols = {
    "sp500": "SPY.US",
    "nasdaq": "QQQ.US",
    "dow_jones": "DIA.US",
    "vix": "VIXY.US"
}

data = {}

for name, symbol in symbols.items():
    print("Downloading", symbol)
    df = pdr.DataReader(symbol, "stooq", start=start)
    df = df.sort_index()
    data[name] = df

# ------------------------------------------------
# Align all datasets on common dates
# ------------------------------------------------

df = pd.DataFrame(index=data["sp500"].index)

df["sp500_close"] = data["sp500"]["Close"]
df["nasdaq_close"] = data["nasdaq"]["Close"]
df["dow_jones_close"] = data["dow_jones"]["Close"]
df["vix_close"] = data["vix"]["Close"]

df["sp500_volume"] = data["sp500"]["Volume"]
df["nasdaq_volume"] = data["nasdaq"]["Volume"]
df["dow_jones_volume"] = data["dow_jones"]["Volume"]
df["vix_volume"] = data["vix"]["Volume"]

# Forward fill missing values
df = df.fillna(method="ffill")

print("Computing indicators...")

# Returns
df["returns"] = df["sp500_close"].pct_change(fill_method=None)

# Volatility
df["volatility"] = df["returns"].rolling(10).std()

# Moving averages
df["ma50"] = df["sp500_close"].rolling(50).mean()
df["ma200"] = df["sp500_close"].rolling(200).mean()

# RSI
rsi = RSIIndicator(df["sp500_close"], window=14)
df["rsi"] = rsi.rsi()

# MACD
macd = MACD(df["sp500_close"])
df["macd"] = macd.macd()
df["macd_signal"] = macd.macd_signal()
df["macd_hist"] = macd.macd_diff()

# Momentum
df["momentum_10"] = df["sp500_close"].pct_change(10, fill_method=None)

# Trend strength
df["trend_strength"] = df["ma50"] - df["ma200"]

# Volume
df["volume"] = df["sp500_volume"]

# Drawdown
rolling_max = df["sp500_close"].cummax()
df["drawdown"] = (df["sp500_close"] - rolling_max) / rolling_max

print("Generating crash labels...")

df["crash"] = (df["drawdown"] < -0.07).astype(int)

# Remove early rows where indicators are undefined
df = df.dropna()

print("Final dataset size:", len(df))

df.to_csv("dataset/historical_market_data.csv", index=True)

print("Dataset saved to dataset/historical_market_data.csv")