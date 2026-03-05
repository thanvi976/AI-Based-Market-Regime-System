from __future__ import annotations

import numpy as np


def to_float(value, default: float = 0.0) -> float:
    if value is None:
        return default
    try:
        if np.isnan(value):
            return default
    except TypeError:
        pass
    return float(value)


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))
