# FANOS XGBoost Training Contract Recovery & Production Verification

## 1. Verified Production Model Specification
- **Model Name:** `16D_CHAMPION`
- **Model Version:** `FANOS_V3`
- **Model Artifact:** `backend/models/fanos_v3_xgboost_rare_improved.json`
- **Algorithm:** XGBoost (Booster native JSON)
- **Objective:** `multi:softprob`
- **Boosted Rounds:** 3,210
- **Feature Count:** 70
- **Class Count:** 15
- **Random State:** 42

### Training Splits
- **TRAIN:** 1,765,695 samples
- **VALIDATION:** 378,363 samples
- **TEST:** 378,364 samples (Held out, not used in training)

### Verified Audit Performance (16D_CHAMPION)
- **Accuracy:** 0.9986890930 (99.87%)
- **Macro Precision:** 0.9016564276 (90.17%)
- **Macro Recall:** 0.9090848723 (90.91%)
- **Macro F1:** 0.9027210607 (90.27%)
- **Weighted F1:** 0.9987226292 (99.87%)
- **Rare attack Macro F1:** 0.7613760716 (76.14%)

---

## 2. Exact 70-Feature Positional Order (Canonical Schema)
| Index | Feature Name | Index | Feature Name |
|:---|:---|:---|:---|
| 0 | Destination Port | 35 | Bwd Packets/s |
| 1 | Flow Duration | 36 | Min Packet Length |
| 2 | Total Fwd Packets | 37 | Max Packet Length |
| 3 | Total Backward Packets | 38 | Packet Length Mean |
| 4 | Total Length of Fwd Packets | 39 | Packet Length Std |
| 5 | Total Length of Bwd Packets | 40 | Packet Length Variance |
| 6 | Fwd Packet Length Max | 41 | FIN Flag Count |
| 7 | Fwd Packet Length Min | 42 | SYN Flag Count |
| 8 | Fwd Packet Length Mean | 43 | RST Flag Count |
| 9 | Fwd Packet Length Std | 44 | PSH Flag Count |
| 10 | Bwd Packet Length Max | 45 | ACK Flag Count |
| 11 | Bwd Packet Length Min | 46 | URG Flag Count |
| 12 | Bwd Packet Length Mean | 47 | CWE Flag Count |
| 13 | Bwd Packet Length Std | 48 | ECE Flag Count |
| 14 | Flow Bytes/s | 49 | Down/Up Ratio |
| 15 | Flow Packets/s | 50 | Average Packet Size |
| 16 | Flow IAT Mean | 51 | Avg Fwd Segment Size |
| 17 | Flow IAT Std | 52 | Avg Bwd Segment Size |
| 18 | Flow IAT Max | 53 | Fwd Header Length.1 |
| 19 | Flow IAT Min | 54 | Subflow Fwd Packets |
| 20 | Fwd IAT Total | 55 | Subflow Fwd Bytes |
| 21 | Fwd IAT Mean | 56 | Subflow Bwd Packets |
| 22 | Fwd IAT Std | 57 | Subflow Bwd Bytes |
| 23 | Fwd IAT Max | 58 | Init_Win_bytes_forward |
| 24 | Fwd IAT Min | 59 | Init_Win_bytes_backward |
| 25 | Bwd IAT Total | 60 | act_data_pkt_fwd |
| 26 | Bwd IAT Mean | 61 | min_seg_size_forward |
| 27 | Bwd IAT Std | 62 | Active Mean |
| 28 | Bwd IAT Max | 63 | Active Std |
| 29 | Bwd IAT Min | 64 | Active Max |
| 30 | Fwd PSH Flags | 65 | Active Min |
| 31 | Fwd URG Flags | 66 | Idle Mean |
| 32 | Fwd Header Length | 67 | Idle Std |
| 33 | Bwd Header Length | 68 | Idle Max |
| 34 | Fwd Packets/s | 69 | Idle Min |

---

## 3. Verified 15-Class Mapping (0–14)
| Class ID | Human-Readable Label | SOC Display Name |
|:---|:---|:---|
| 0 | `BENIGN` | Normal |
| 1 | `Bot` | Botnet / C&C |
| 2 | `DDoS` | DDoS |
| 3 | `DoS GoldenEye` | DoS GoldenEye |
| 4 | `DoS Hulk` | DoS Hulk |
| 5 | `DoS Slowhttptest` | DoS Slowhttptest |
| 6 | `DoS slowloris` | DoS Slowloris |
| 7 | `FTP-Patator` | FTP Brute Force |
| 8 | `Heartbleed` | Heartbleed |
| 9 | `Infiltration` | Infiltration |
| 10 | `PortScan` | Port Scan |
| 11 | `SSH-Patator` | SSH Brute Force |
| 12 | `Web Attack - Brute Force` | Brute Force |
| 13 | `Web Attack - Sql Injection` | SQL Injection |
| 14 | `Web Attack - XSS` | XSS |

---

## 4. Pipeline Integration Architecture
```
Suricata eve.json
       ↓
FANOS Suricata Collector
       ↓
Backend (/api/v1/suricata/events)
       ↓
Network-flow / CICIDS-style feature extraction (feature_extractor.py)
       ↓
EXACT 70-feature vector validation (validate_feature_vector)
       ↓
FANOS V3 16D_CHAMPION XGBoost (model_loader.py)
       ↓
Class_ID 0–14 (argmax) & Confidence (max probability)
       ↓
Risk Engine / Correlation / Response (risk_engine.py, correlation_engine.py)
       ↓
SOC Dashboard & Security Events Database
```
