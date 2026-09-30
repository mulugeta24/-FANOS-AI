"""
FANOS AI Model Loader
=====================
Safely loads the verified FANOS V3 main XGBoost booster (16D_CHAMPION, native JSON format)
once at startup and exposes a deterministic status and inference interface.

The model is loaded as a singleton; subsequent imports return the same
instance with no additional disk I/O.
"""
from __future__ import annotations

import logging
import os
import time
from pathlib import Path
from typing import Optional, List, Dict, Any

import numpy as np

logger = logging.getLogger("fanos.ai.loader")

# ── Canonical FANOS V3 Model Metadata ──────────────────────────────
MODEL_NAME = "16D_CHAMPION"
MODEL_VERSION = "FANOS_V3"
MODEL_ARTIFACT = "fanos_v3_xgboost_rare_improved.json"

NUM_FEATURES = 70
NUM_CLASSES = 15

# ── Verified Class_ID Mapping (0–14) ───────────────────────────────
# Exact class ID mapping for FANOS V3 16D_CHAMPION.
# Do NOT reorder these classes.
CLASS_LABELS: List[str] = [
    "BENIGN",                     # 0
    "Bot",                        # 1
    "DDoS",                       # 2
    "DoS GoldenEye",              # 3
    "DoS Hulk",                   # 4
    "DoS Slowhttptest",           # 5
    "DoS slowloris",              # 6
    "FTP-Patator",                # 7
    "Heartbleed",                 # 8
    "Infiltration",               # 9
    "PortScan",                   # 10
    "SSH-Patator",                # 11
    "Web Attack - Brute Force",   # 12
    "Web Attack - Sql Injection", # 13
    "Web Attack - XSS",           # 14
]

# Canonical 0-14 Class ID mapping dictionary
CLASS_ID_MAPPING: Dict[int, str] = {
    0: "BENIGN",
    1: "Bot",
    2: "DDoS",
    3: "DoS GoldenEye",
    4: "DoS Hulk",
    5: "DoS Slowhttptest",
    6: "DoS slowloris",
    7: "FTP-Patator",
    8: "Heartbleed",
    9: "Infiltration",
    10: "PortScan",
    11: "SSH-Patator",
    12: "Web Attack - Brute Force",
    13: "Web Attack - Sql Injection",
    14: "Web Attack - XSS",
}

# Friendly display names mapped from raw class label
_DISPLAY_NAMES: Dict[str, str] = {
    "BENIGN":                        "Normal",
    "Bot":                           "Botnet / C&C",
    "DDoS":                          "DDoS",
    "DoS GoldenEye":                 "DoS GoldenEye",
    "DoS Hulk":                      "DoS Hulk",
    "DoS Slowhttptest":              "DoS Slowhttptest",
    "DoS slowloris":                 "DoS Slowloris",
    "FTP-Patator":                   "FTP Brute Force",
    "Heartbleed":                    "Heartbleed",
    "Infiltration":                  "Infiltration",
    "PortScan":                      "Port Scan",
    "SSH-Patator":                   "SSH Brute Force",
    "Web Attack - Brute Force":      "Brute Force",
    "Web Attack - Sql Injection":    "SQL Injection",
    "Web Attack - XSS":              "XSS",
}


class FANOSModelLoader:
    """
    Singleton that loads the verified FANOS V3 XGBoost booster (16D_CHAMPION) exactly once.

    Usage:
        loader = FANOSModelLoader.instance()
        loader.predict_proba(x_array)   # shape (1, 70) → (1, 15)
    """

    _instance: Optional["FANOSModelLoader"] = None

    # Public state
    status: str = "uninitialized"     # loaded | unavailable | error
    model_name: str = MODEL_NAME
    model_version: str = MODEL_VERSION
    artifact_name: str = MODEL_ARTIFACT
    error_detail: str = ""
    load_time_ms: float = 0.0

    def __init__(self) -> None:
        self._booster = None

    @classmethod
    def instance(cls) -> "FANOSModelLoader":
        if cls._instance is None:
            cls._instance = cls()
            cls._instance._load()
        return cls._instance

    # ── loading ─────────────────────────────────────────────────────────
    def _load(self) -> None:
        import xgboost as xgb

        model_path = self._resolve_path()
        logger.info("[ML] Loading %s (%s) from %s", self.model_name, self.model_version, model_path)

        if model_path is None or not model_path.exists():
            self.status = "unavailable"
            self.error_detail = f"Model artifact not found: {model_path}"
            logger.error("[ML] %s", self.error_detail)
            return

        t0 = time.perf_counter()
        try:
            booster = xgb.Booster()
            booster.load_model(str(model_path))

            # Validate feature count
            actual_features = booster.num_features()
            if actual_features != NUM_FEATURES:
                self.status = "error"
                self.error_detail = (
                    f"Feature schema mismatch: model expects {actual_features} "
                    f"features, runtime requires {NUM_FEATURES}"
                )
                logger.error("[ML] %s", self.error_detail)
                return

            self._booster = booster
            self.load_time_ms = (time.perf_counter() - t0) * 1000
            self.status = "loaded"
            logger.info(
                "[ML] Model %s (%s) loaded successfully in %.1f ms | features=%d | classes=%d",
                self.model_name, self.model_version, self.load_time_ms, actual_features, NUM_CLASSES,
            )
            logger.info("[ML] Verified 15-class mapping: %s", CLASS_ID_MAPPING)

        except Exception as exc:
            self.status = "error"
            self.error_detail = str(exc)
            logger.exception("[ML] Failed to load model: %s", exc)

    @staticmethod
    def _resolve_path() -> Optional[Path]:
        """
        Resolve model path checking configured environment variables and canonical locations:
        1. AI_MODEL_PATH environment variable
        2. backend/models/fanos_v3_xgboost_rare_improved.json
        3. backend/app/models/fanos_v3_xgboost_rare_improved.json
        """
        candidate_paths = []

        env_path = os.getenv("AI_MODEL_PATH")
        if env_path:
            candidate_paths.append(Path(env_path))

        # Standard relative candidate paths
        candidate_paths.extend([
            Path("models/fanos_v3_xgboost_rare_improved.json"),
            Path("app/models/fanos_v3_xgboost_rare_improved.json"),
            Path("backend/models/fanos_v3_xgboost_rare_improved.json"),
            Path("backend/app/models/fanos_v3_xgboost_rare_improved.json"),
        ])

        # Check directly from current working directory
        for p in candidate_paths:
            if p.is_absolute() and p.exists():
                return p
            if p.exists():
                return p.resolve()

        # Check relative to file's parent directories
        here = Path(__file__).resolve().parent
        for _ in range(5):
            for rel in candidate_paths:
                candidate = (here / rel).resolve()
                if candidate.exists():
                    return candidate
            here = here.parent

        # Fallback to env_path or default relative path
        return Path(env_path) if env_path else Path("models/fanos_v3_xgboost_rare_improved.json")

    # ── inference ────────────────────────────────────────────────────────
    def is_ready(self) -> bool:
        return self._booster is not None and self.status == "loaded"

    def predict_proba(self, x: np.ndarray | list) -> np.ndarray:
        """
        Run inference on x (shape: (N, 70)) and return probability matrix
        of shape (N, 15).

        Strict validations:
        - Model must be successfully loaded
        - Input must be numeric
        - Shape must have exactly 70 features per sample
        - Malformed/NaN/Inf input is rejected with ValueError

        Raises RuntimeError if model is not loaded.
        Raises ValueError if feature vector is malformed.
        """
        import xgboost as xgb

        if not self.is_ready():
            raise RuntimeError(
                f"FANOS V3 XGBoost model ({self.model_name}) is not loaded (status={self.status}). "
                f"Detail: {self.error_detail}"
            )

        # Convert to numpy array if needed
        if not isinstance(x, np.ndarray):
            try:
                x = np.array(x, dtype=np.float32)
            except Exception as e:
                raise ValueError(f"Input features could not be converted to numeric array: {e}")

        # Validate numeric type
        if not np.issubdtype(x.dtype, np.number):
            raise ValueError(f"Feature vector must be numeric, got dtype {x.dtype}")

        if x.ndim == 1:
            x = x.reshape(1, -1)

        if x.ndim != 2:
            raise ValueError(f"Expected 2D feature matrix (N, 70) or 1D vector (70,), got {x.ndim}D array")

        if x.shape[1] != NUM_FEATURES:
            raise ValueError(
                f"Feature count mismatch: expected exactly {NUM_FEATURES} features, got {x.shape[1]}"
            )

        if np.isnan(x).any():
            raise ValueError("Feature vector contains NaN values")

        if np.isinf(x).any():
            raise ValueError("Feature vector contains infinite values")

        dmat = xgb.DMatrix(x.astype(np.float32))
        raw = self._booster.predict(dmat)          # shape (N, 15)

        # XGBoost softprob returns flat (N*C,) when N==1 in some versions
        if raw.ndim == 1:
            raw = raw.reshape(-1, NUM_CLASSES)

        if raw.shape[1] != NUM_CLASSES:
            raise ValueError(f"Expected {NUM_CLASSES} class probabilities, got {raw.shape[1]}")

        return raw

    def get_status_dict(self) -> dict:
        return {
            "model_name":       self.model_name,
            "model_version":    self.model_version,
            "artifact_name":    self.artifact_name,
            "status":           self.status,
            "num_features":     NUM_FEATURES,
            "num_classes":      NUM_CLASSES,
            "class_labels":     CLASS_LABELS,
            "class_id_mapping": CLASS_ID_MAPPING,
            "load_time_ms":     round(self.load_time_ms, 2),
            "error_detail":     self.error_detail if self.status != "loaded" else None,
        }


# ── Class-level helpers (exported) ───────────────────────────────────

def label_for(class_idx: int) -> str:
    """Return raw class label for a class index (0-14)."""
    if 0 <= class_idx < len(CLASS_LABELS):
        return CLASS_LABELS[class_idx]
    return "Unknown"


def display_name_for(raw_label: str) -> str:
    """Return human-friendly display name."""
    return _DISPLAY_NAMES.get(raw_label, raw_label)


def is_malicious(class_idx: int) -> bool:
    """True for any non-BENIGN class (1-14)."""
    return class_idx != 0


# ── Module-level singleton ────────────────────────────────────────────
model_loader = FANOSModelLoader.instance()
