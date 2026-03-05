
import os
import pandas as pd
import joblib
import matplotlib.pyplot as plt
import numpy as np

from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    classification_report
)

print("Starting model evaluation...\n")

# ---------------------------------------------------
# Resolve paths
# ---------------------------------------------------

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

dataset_path = os.path.join(BASE_DIR, "dataset", "historical_market_data.csv")
model_path = os.path.join(BASE_DIR, "models", "crash_model.pkl")

print("Dataset path:", dataset_path)
print("Model path:", model_path)

# ---------------------------------------------------
# Load dataset
# ---------------------------------------------------

print("\nLoading dataset...")
df = pd.read_csv(dataset_path)

print("Dataset loaded successfully")
print("Dataset size:", len(df))

# ---------------------------------------------------
# Detect date column automatically
# ---------------------------------------------------

date_col = None

for col in df.columns:
    if col.lower() in ["date", "datetime", "timestamp"]:
        date_col = col
        break

if date_col is None:
    raise ValueError("No date column found in dataset")

df[date_col] = pd.to_datetime(df[date_col])

print("Using date column:", date_col)

# ---------------------------------------------------
# Create crash label if missing
# ---------------------------------------------------

if "crash" not in df.columns:
    print("Creating crash labels from drawdown...")
    df["crash"] = (df["drawdown"] < -0.07).astype(int)

# ---------------------------------------------------
# Load trained model
# ---------------------------------------------------

print("\nLoading trained crash model...")
model = joblib.load(model_path)

print("Model loaded successfully")

# ---------------------------------------------------
# Get feature order from model
# ---------------------------------------------------

features = list(model.feature_names_in_)

print("\nModel expects features:")
print(features)

# Check missing features
missing = [f for f in features if f not in df.columns]

if missing:
    raise ValueError(f"Missing features in dataset: {missing}")

X = df[features]
y = df["crash"]

# ---------------------------------------------------
# Time based split
# ---------------------------------------------------

split_index = int(len(df) * 0.6)

X_train = X[:split_index]
X_test = X[split_index:]

y_train = y[:split_index]
y_test = y[split_index:]

dates_test = df[date_col].iloc[split_index:]

print("\nTrain size:", len(X_train))
print("Test size:", len(X_test))

# ---------------------------------------------------
# Run predictions
# ---------------------------------------------------

print("\nRunning predictions...")

proba = model.predict_proba(X_test)

# Safe probability extraction
if proba.shape[1] == 2:
    y_prob = proba[:, 1]
else:
    print("Warning: Model returned single probability column")
    y_prob = proba[:, 0]

# Crash probability threshold
threshold = 0.25
print("\nUsing crash probability threshold:", threshold)

y_pred = (y_prob >= threshold).astype(int)

# ---------------------------------------------------
# Evaluate model
# ---------------------------------------------------

print("\nModel Evaluation Metrics\n")

accuracy = accuracy_score(y_test, y_pred)
precision = precision_score(y_test, y_pred, zero_division=0)
recall = recall_score(y_test, y_pred, zero_division=0)
f1 = f1_score(y_test, y_pred, zero_division=0)

if len(set(y_test)) > 1:
    roc_auc = roc_auc_score(y_test, y_prob)
else:
    roc_auc = None

print("Accuracy:", round(accuracy, 4))
print("Precision:", round(precision, 4))
print("Recall:", round(recall, 4))
print("F1 Score:", round(f1, 4))
print("ROC AUC:", roc_auc if roc_auc else "Not computable")

print("\nClassification Report\n")
print(classification_report(y_test, y_pred, zero_division=0))

# ---------------------------------------------------
# Results dataframe
# ---------------------------------------------------

results = pd.DataFrame({
    "date": dates_test.values,
    "actual_crash": y_test.values,
    "predicted_crash": y_pred,
    "crash_probability": y_prob
})

# ---------------------------------------------------
# Crash analysis
# ---------------------------------------------------

correct_crashes = len(results[
    (results["actual_crash"] == 1) &
    (results["predicted_crash"] == 1)
])

missed_crashes = len(results[
    (results["actual_crash"] == 1) &
    (results["predicted_crash"] == 0)
])

false_alarms = len(results[
    (results["actual_crash"] == 0) &
    (results["predicted_crash"] == 1)
])

print("\nCrash Prediction Analysis")
print("Correct crash predictions:", correct_crashes)
print("Missed crashes:", missed_crashes)
print("False alarms:", false_alarms)

# ---------------------------------------------------
# Visualization
# ---------------------------------------------------

print("\nGenerating visualization...")

plt.figure(figsize=(14,6))

plt.plot(
    results["date"],
    results["crash_probability"],
    label="Predicted Crash Probability"
)

plt.plot(
    results["date"],
    results["actual_crash"],
    label="Actual Crash",
    alpha=0.5
)

plt.scatter(
    results["date"][results["actual_crash"] == 1],
    results["crash_probability"][results["actual_crash"] == 1],
    color="red",
    label="Crash Events"
)

plt.axhline(
    y=threshold,
    linestyle="--",
    label="Crash Threshold"
)

plt.title("Crash Prediction vs Actual Market Crashes")

plt.xlabel("Date")
plt.ylabel("Crash Probability")

plt.legend()
plt.grid(True)

plt.show()

print("\nModel testing complete.")