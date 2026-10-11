"""
FANOS AI — Suricata-Native Flow Model Training Pipeline
=========================================================
Trains a genuine 25-feature XGBoost multiclass model directly on
CIC-IDS2017 benchmark telemetry, using ONLY features that live
Suricata EVE summary flow telemetry genuinely supplies.

15 Target Classes:
  0: BENIGN
  1: Bot
  2: DDoS
  3: DoS GoldenEye
  4: DoS Hulk
  5: DoS Slowhttptest
  6: DoS slowloris
  7: FTP-Patator
  8: Heartbleed
  9: Infiltration
 10: PortScan
 11: SSH-Patator
 12: Web Attack - Brute Force
 13: Web Attack - Sql Injection
 14: Web Attack - XSS
"""

import os
import sys
import glob
import json
import time
import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score, precision_recall_fscore_support

sys.stdout.reconfigure(encoding="utf-8")

# ── 1. The 25 Genuine Suricata Flow Features ─────────────────────────
SURICATA_NATIVE_FEATURES = [
    "Destination Port",
    "Flow Duration",
    "Total Fwd Packets",
    "Total Backward Packets",
    "Total Length of Fwd Packets",
    "Total Length of Bwd Packets",
    "Fwd Packet Length Mean",
    "Bwd Packet Length Mean",
    "Flow Bytes/s",
    "Flow Packets/s",
    "Fwd Packets/s",
    "Bwd Packets/s",
    "Fwd Header Length",
    "Bwd Header Length",
    "Packet Length Mean",
    "Average Packet Size",
    "Down/Up Ratio",
    "FIN Flag Count",
    "SYN Flag Count",
    "RST Flag Count",
    "PSH Flag Count",
    "ACK Flag Count",
    "URG Flag Count",
    "CWE Flag Count",
    "ECE Flag Count",
]

CLASS_NAMES = {
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


def map_label(raw: str) -> int:
    s = str(raw).strip()
    if s == "BENIGN": return 0
    if s == "Bot": return 1
    if s == "DDoS": return 2
    if "GoldenEye" in s: return 3
    if "Hulk" in s: return 4
    if "Slowhttptest" in s: return 5
    if "slowloris" in s: return 6
    if "FTP-Patator" in s: return 7
    if "Heartbleed" in s: return 8
    if "Infiltration" in s or "Infilteration" in s: return 9
    if "PortScan" in s: return 10
    if "SSH-Patator" in s: return 11
    if "Brute" in s: return 12
    if "Sql" in s: return 13
    if "XSS" in s: return 14
    raise ValueError(f"Unknown label: {raw}")


def load_and_preprocess_dataset(data_dir: str):
    print("=" * 80)
    print("  LOADING & PREPROCESSING CIC-IDS2017 FOR SURICATA-NATIVE TRAINING")
    print("=" * 80)

    files = sorted(glob.glob(os.path.join(data_dir, "*.csv")))
    if not files:
        raise FileNotFoundError(f"No CSV files found in {data_dir}")

    dfs = []
    total_raw_rows = 0

    for fpath in files:
        fname = os.path.basename(fpath)
        print(f"Reading {fname}...")
        df = pd.read_csv(fpath, low_memory=False)
        total_raw_rows += len(df)

        # Standardize column names (strip whitespace)
        df.columns = [c.strip() for c in df.columns]

        # Extract Label
        label_col = [c for c in df.columns if "label" in c.lower()][0]
        y_raw = df[label_col].dropna()
        valid_idx = y_raw.index

        # Keep only required 25 features + Label
        available_features = [col for col in SURICATA_NATIVE_FEATURES if col in df.columns]
        if len(available_features) != len(SURICATA_NATIVE_FEATURES):
            missing = set(SURICATA_NATIVE_FEATURES) - set(df.columns)
            raise ValueError(f"Missing required features in {fname}: {missing}")

        sub_df = df.loc[valid_idx, SURICATA_NATIVE_FEATURES].copy()
        sub_df["Class_ID"] = y_raw.apply(map_label).astype(np.int32)
        dfs.append(sub_df)

    full_df = pd.concat(dfs, ignore_index=True)
    print(f"\nTotal records concatenated: {len(full_df):,} (from {total_raw_rows:,} raw rows)")

    # Clean non-finite values (NaN / Inf)
    print("Cleaning non-finite values...")
    feature_cols = SURICATA_NATIVE_FEATURES

    # Replace inf with nan and convert to float32
    full_df[feature_cols] = full_df[feature_cols].replace([np.inf, -np.inf], np.nan)
    before_clean = len(full_df)
    full_df = full_df.dropna(subset=feature_cols).reset_index(drop=True)
    dropped = before_clean - len(full_df)
    print(f"Dropped {dropped:,} non-finite rows. Remaining clean samples: {len(full_df):,}")

    # Inspect class distributions
    print("\nClass distribution in clean dataset:")
    counts = full_df["Class_ID"].value_counts().sort_index()
    for cid, cnt in counts.items():
        print(f"  [{cid:02d}] {CLASS_NAMES[cid]:28s}: {cnt:,} samples")

    return full_df


def prepare_balanced_splits(df: pd.DataFrame, max_samples_per_class: int = 150000, random_state: int = 42):
    """
    Subsamples abundant classes (BENIGN, DoS Hulk, PortScan, DDoS) to avoid
    massive memory bottlenecks and class imbalance, while retaining 100%
    of all rare attack samples.
    """
    print("\n" + "=" * 80)
    print("  STRATIFIED SUBSAMPLING & DATA PARTITIONING")
    print("=" * 80)

    sampled_dfs = []
    for cid in range(15):
        class_df = df[df["Class_ID"] == cid]
        if len(class_df) > max_samples_per_class:
            sampled_df = class_df.sample(n=max_samples_per_class, random_state=random_state)
            print(f"  Class {cid:2d} ({CLASS_NAMES[cid]:25s}): Subsampled {len(class_df):,} -> {max_samples_per_class:,}")
        else:
            sampled_df = class_df
            print(f"  Class {cid:2d} ({CLASS_NAMES[cid]:25s}): Retained 100% ({len(class_df):,} samples)")
        sampled_dfs.append(sampled_df)

    balanced_df = pd.concat(sampled_dfs, ignore_index=True).sample(frac=1.0, random_state=random_state).reset_index(drop=True)
    print(f"\nBalanced dataset size: {len(balanced_df):,} samples")

    X = balanced_df[SURICATA_NATIVE_FEATURES].astype(np.float32).values
    y = balanced_df["Class_ID"].values

    # Stratified 70% Train, 15% Val, 15% Test
    X_train, X_temp, y_train, y_temp = train_test_split(
        X, y, test_size=0.30, random_state=random_state, stratify=y
    )
    X_val, X_test, y_val, y_test = train_test_split(
        X_temp, y_temp, test_size=0.50, random_state=random_state, stratify=y_temp
    )

    print(f"Train samples:      {len(X_train):,}")
    print(f"Validation samples: {len(X_val):,}")
    print(f"Test samples:       {len(X_test):,}")

    # Compute controlled class weights (clipped at 40.0)
    class_counts = pd.Series(y_train).value_counts().to_dict()
    total_train = len(y_train)
    n_classes = 15

    class_weights = {}
    print("\nControlled Class Weights:")
    for cid in range(n_classes):
        cnt = class_counts.get(cid, 1)
        # Standard balanced weight: total_train / (n_classes * cnt)
        raw_w = total_train / (n_classes * cnt)
        clipped_w = min(raw_w, 40.0)
        class_weights[cid] = float(clipped_w)
        print(f"  [{cid:02d}] {CLASS_NAMES[cid]:28s}: Count={cnt:7,d} | Weight={clipped_w:6.2f}")

    sample_weights = np.array([class_weights[cid] for cid in y_train], dtype=np.float32)

    return (X_train, y_train, sample_weights), (X_val, y_val), (X_test, y_test), class_weights


def train_model(train_data, val_data, output_model_path: str):
    X_train, y_train, sample_weights = train_data
    X_val, y_val = val_data

    print("\n" + "=" * 80)
    print("  TRAINING SURICATA-NATIVE XGBOOST MODEL (25 FEATURES, 15 CLASSES)")
    print("=" * 80)

    dtrain = xgb.DMatrix(X_train, label=y_train, weight=sample_weights, feature_names=SURICATA_NATIVE_FEATURES)
    dval = xgb.DMatrix(X_val, label=y_val, feature_names=SURICATA_NATIVE_FEATURES)

    params = {
        "objective": "multi:softprob",
        "num_class": 15,
        "max_depth": 8,
        "learning_rate": 0.08,
        "subsample": 0.8,
        "colsample_bytree": 0.8,
        "tree_method": "hist",
        "eval_metric": ["mlogloss", "merror"],
        "random_state": 42,
    }

    t0 = time.time()
    booster = xgb.train(
        params=params,
        dtrain=dtrain,
        num_boost_round=300,
        evals=[(dtrain, "train"), (dval, "val")],
        early_stopping_rounds=30,
        verbose_eval=25,
    )
    duration = time.time() - t0
    print(f"\nTraining completed in {duration:.1f} seconds! Best iteration: {booster.best_iteration}")

    # Save model
    os.makedirs(os.path.dirname(output_model_path), exist_ok=True)
    booster.save_model(output_model_path)
    print(f"Model saved to: {output_model_path} ({os.path.getsize(output_model_path)/(1024*1024):.2f} MB)")

    return booster


def evaluate_model(booster, test_data, class_weights, output_manifest_path: str):
    X_test, y_test = test_data

    print("\n" + "=" * 80)
    print("  TEST DATASET EVALUATION (HELD-OUT 15% SAMPLES)")
    print("=" * 80)

    dtest = xgb.DMatrix(X_test, label=y_test, feature_names=SURICATA_NATIVE_FEATURES)
    probs = booster.predict(dtest)
    preds = np.argmax(probs, axis=1)

    acc = accuracy_score(y_test, preds)
    macro_p, macro_r, macro_f1, _ = precision_recall_fscore_support(y_test, preds, average="macro", zero_division=0)
    weight_p, weight_r, weight_f1, _ = precision_recall_fscore_support(y_test, preds, average="weighted", zero_division=0)

    print(f"\nOverall Test Accuracy:     {acc * 100:.2f}%")
    print(f"Macro Precision:           {macro_p:.4f}")
    print(f"Macro Recall:              {macro_r:.4f}")
    print(f"Macro F1-Score:            {macro_f1:.4f}")
    print(f"Weighted F1-Score:         {weight_f1:.4f}")

    p_per, r_per, f1_per, sup_per = precision_recall_fscore_support(y_test, preds, labels=list(range(15)), zero_division=0)

    print("\nPer-Class Performance on Test Traffic:")
    print("-" * 80)
    print(f"{'ID':2s} | {'Class Name':28s} | {'Precision':9s} | {'Recall':8s} | {'F1-Score':8s} | {'Support':7s}")
    print("-" * 80)

    class_metrics = {}
    for cid in range(15):
        name = CLASS_NAMES[cid]
        p = float(p_per[cid])
        r = float(r_per[cid])
        f1 = float(f1_per[cid])
        sup = int(sup_per[cid])
        class_metrics[name] = {"precision": p, "recall": r, "f1": f1, "support": sup}
        print(f"{cid:02d} | {name:28s} | {p:9.4f} | {r:8.4f} | {f1:8.4f} | {sup:7,d}")
    print("-" * 80)

    # Feature Importance
    scores_gain = booster.get_score(importance_type="gain")
    sorted_gain = sorted(scores_gain.items(), key=lambda x: x[1], reverse=True)
    print("\nTop 15 Feature Importances (Gain):")
    for feat, gain in sorted_gain[:15]:
        print(f"  {feat:28s}: {gain:10.2f}")

    # Save manifest
    manifest = {
        "model_name": "SURICATA_FLOW_NATIVE_V1",
        "model_version": "FANOS_V3_NATIVE",
        "description": "Suricata-native network flow intrusion detection model trained on genuine EVE telemetry features.",
        "num_features": len(SURICATA_NATIVE_FEATURES),
        "num_classes": 15,
        "features": SURICATA_NATIVE_FEATURES,
        "classes": CLASS_NAMES,
        "test_metrics": {
            "accuracy": float(acc),
            "macro_precision": float(macro_p),
            "macro_recall": float(macro_r),
            "macro_f1": float(macro_f1),
            "weighted_precision": float(weight_p),
            "weighted_recall": float(weight_r),
            "weighted_f1": float(weight_f1),
            "per_class": class_metrics,
        },
        "feature_importance_gain": dict(sorted_gain),
        "class_weights": class_weights,
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }

    with open(output_manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    print(f"\nManifest saved to: {output_manifest_path}")

    return manifest


def main():
    data_dir = "ml/MachineLearningCVE"
    model_path = "backend/models/fanos_v3_suricata_flow_native.json"
    manifest_path = "backend/models/fanos_v3_suricata_flow_native_manifest.json"

    df = load_and_preprocess_dataset(data_dir)
    train_data, val_data, test_data, class_weights = prepare_balanced_splits(df)
    booster = train_model(train_data, val_data, model_path)
    evaluate_model(booster, test_data, class_weights, manifest_path)


if __name__ == "__main__":
    main()
