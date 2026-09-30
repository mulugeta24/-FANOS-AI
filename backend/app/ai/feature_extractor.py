"""
FANOS Feature Extractor
=======================
Converts a normalized Suricata / FANOS network security event into the
canonical 70-feature float32 vector expected by the verified FANOS V3 16D_CHAMPION XGBoost model.

Canonical 70-Feature Schema (Positional Contract):
==================================================
 00 Destination Port
 01 Flow Duration
 02 Total Fwd Packets
 03 Total Backward Packets
 04 Total Length of Fwd Packets
 05 Total Length of Bwd Packets
 06 Fwd Packet Length Max
 07 Fwd Packet Length Min
 08 Fwd Packet Length Mean
 09 Fwd Packet Length Std
 10 Bwd Packet Length Max
 11 Bwd Packet Length Min
 12 Bwd Packet Length Mean
 13 Bwd Packet Length Std
 14 Flow Bytes/s
 15 Flow Packets/s
 16 Flow IAT Mean
 17 Flow IAT Std
 18 Flow IAT Max
 19 Flow IAT Min
 20 Fwd IAT Total
 21 Fwd IAT Mean
 22 Fwd IAT Std
 23 Fwd IAT Max
 24 Fwd IAT Min
 25 Bwd IAT Total
 26 Bwd IAT Mean
 27 Bwd IAT Std
 28 Bwd IAT Max
 29 Bwd IAT Min
 30 Fwd PSH Flags
 31 Fwd URG Flags
 32 Fwd Header Length
 33 Bwd Header Length
 34 Fwd Packets/s
 35 Bwd Packets/s
 36 Min Packet Length
 37 Max Packet Length
 38 Packet Length Mean
 39 Packet Length Std
 40 Packet Length Variance
 41 FIN Flag Count
 42 SYN Flag Count
 43 RST Flag Count
 44 PSH Flag Count
 45 ACK Flag Count
 46 URG Flag Count
 47 CWE Flag Count
 48 ECE Flag Count
 49 Down/Up Ratio
 50 Average Packet Size
 51 Avg Fwd Segment Size
 52 Avg Bwd Segment Size
 53 Fwd Header Length.1
 54 Subflow Fwd Packets
 55 Subflow Fwd Bytes
 56 Subflow Bwd Packets
 57 Subflow Bwd Bytes
 58 Init_Win_bytes_forward
 59 Init_Win_bytes_backward
 60 act_data_pkt_fwd
 61 min_seg_size_forward
 62 Active Mean
 63 Active Std
 64 Active Max
 65 Active Min
 66 Idle Mean
 67 Idle Std
 68 Idle Max
 69 Idle Min
"""
from __future__ import annotations

import logging
import math
from typing import Any, List, Dict

import numpy as np

logger = logging.getLogger("fanos.ai.features")

NUM_FEATURES = 70

CANONICAL_FEATURES: List[str] = [
    "Destination Port",
    "Flow Duration",
    "Total Fwd Packets",
    "Total Backward Packets",
    "Total Length of Fwd Packets",
    "Total Length of Bwd Packets",
    "Fwd Packet Length Max",
    "Fwd Packet Length Min",
    "Fwd Packet Length Mean",
    "Fwd Packet Length Std",
    "Bwd Packet Length Max",
    "Bwd Packet Length Min",
    "Bwd Packet Length Mean",
    "Bwd Packet Length Std",
    "Flow Bytes/s",
    "Flow Packets/s",
    "Flow IAT Mean",
    "Flow IAT Std",
    "Flow IAT Max",
    "Flow IAT Min",
    "Fwd IAT Total",
    "Fwd IAT Mean",
    "Fwd IAT Std",
    "Fwd IAT Max",
    "Fwd IAT Min",
    "Bwd IAT Total",
    "Bwd IAT Mean",
    "Bwd IAT Std",
    "Bwd IAT Max",
    "Bwd IAT Min",
    "Fwd PSH Flags",
    "Fwd URG Flags",
    "Fwd Header Length",
    "Bwd Header Length",
    "Fwd Packets/s",
    "Bwd Packets/s",
    "Min Packet Length",
    "Max Packet Length",
    "Packet Length Mean",
    "Packet Length Std",
    "Packet Length Variance",
    "FIN Flag Count",
    "SYN Flag Count",
    "RST Flag Count",
    "PSH Flag Count",
    "ACK Flag Count",
    "URG Flag Count",
    "CWE Flag Count",
    "ECE Flag Count",
    "Down/Up Ratio",
    "Average Packet Size",
    "Avg Fwd Segment Size",
    "Avg Bwd Segment Size",
    "Fwd Header Length.1",
    "Subflow Fwd Packets",
    "Subflow Fwd Bytes",
    "Subflow Bwd Packets",
    "Subflow Bwd Bytes",
    "Init_Win_bytes_forward",
    "Init_Win_bytes_backward",
    "act_data_pkt_fwd",
    "min_seg_size_forward",
    "Active Mean",
    "Active Std",
    "Active Max",
    "Active Min",
    "Idle Mean",
    "Idle Std",
    "Idle Max",
    "Idle Min",
]

# Protocol → numeric mapping (consistent with CIC-FlowMeter)
_PROTO_MAP: Dict[str, float] = {
    "TCP":   6.0,
    "UDP":   17.0,
    "ICMP":  1.0,
    "SCTP":  132.0,
    "GRE":   47.0,
    "ESP":   50.0,
    "AH":    51.0,
    "OTHER": 0.0,
}

# Severity (Suricata 1–4) → heuristic flow-duration proxy (µs)
_SEVERITY_DURATION_US: Dict[int, float] = {
    1: 50000.0,   # CRITICAL — short burst attack
    2: 100000.0,  # HIGH
    3: 200000.0,  # MEDIUM
    4: 500000.0,  # LOW — background noise
}

# Port → heuristic service weight (affects packet-size estimates)
_PORT_SERVICE_SIZES: Dict[int, tuple[float, float]] = {
    80:   (500.0, 800.0),    # HTTP
    443:  (500.0, 1200.0),   # HTTPS
    22:   (100.0, 200.0),    # SSH
    21:   (80.0,  120.0),    # FTP
    25:   (300.0, 200.0),    # SMTP
    53:   (60.0,  120.0),    # DNS
    3306: (200.0, 800.0),    # MySQL
    8080: (500.0, 800.0),    # HTTP-alt
    8443: (500.0, 1200.0),   # HTTPS-alt
    3389: (200.0, 1500.0),   # RDP
    445:  (150.0, 600.0),    # SMB
    139:  (150.0, 600.0),    # NetBIOS
    6379: (80.0,  200.0),    # Redis
    5432: (200.0, 600.0),    # PostgreSQL
}
_DEFAULT_SERVICE = (300.0, 400.0)


def validate_feature_vector(vec: np.ndarray | List[float]) -> np.ndarray:
    """
    Validates that a feature vector adheres to the exact FANOS V3 contract:
    - Must have exactly 70 features
    - Must contain only numeric values
    - Must not contain NaN or Inf values
    """
    if not isinstance(vec, np.ndarray):
        try:
            vec = np.array(vec, dtype=np.float32)
        except Exception as e:
            raise ValueError(f"Feature vector could not be converted to numeric array: {e}")

    if not np.issubdtype(vec.dtype, np.number):
        raise ValueError(f"Feature vector must contain numeric values, got dtype {vec.dtype}")

    if vec.ndim == 1:
        if vec.shape[0] != NUM_FEATURES:
            raise ValueError(f"Feature count mismatch: expected exactly {NUM_FEATURES} features, got {vec.shape[0]}")
    elif vec.ndim == 2:
        if vec.shape[1] != NUM_FEATURES:
            raise ValueError(f"Feature count mismatch: expected exactly {NUM_FEATURES} features, got {vec.shape[1]}")
    else:
        raise ValueError(f"Feature vector must be 1D or 2D, got {vec.ndim} dimensions")

    if np.isnan(vec).any():
        raise ValueError("Feature vector contains NaN values")

    if np.isinf(vec).any():
        raise ValueError("Feature vector contains infinite values")

    return vec.astype(np.float32)


class FeatureExtractor:
    """
    Extracts the 70-feature CIC-IDS style vector from a FANOS / Suricata
    security event dictionary.

    The event dict is the SuricataEventIngestion payload or any dict with
    the canonical FANOS fields (destination_port, protocol, severity, etc.)
    or a full CIC-FlowMeter dictionary.
    """

    def extract(self, event: dict[str, Any]) -> np.ndarray:
        """
        Convert a FANOS/Suricata event dict to a float32 feature vector
        of shape (70,).

        Raises ValueError on structural input errors.
        """
        if not isinstance(event, dict):
            raise ValueError(f"Expected dict, got {type(event).__name__}")

        f = self._build(event)
        if len(f) != NUM_FEATURES:
            raise ValueError(f"Feature schema error: extracted {len(f)} features, expected {NUM_FEATURES}")

        vec = np.array(f, dtype=np.float32)
        validate_feature_vector(vec)
        logger.debug("[ML] Feature vector built: shape=%s, sum=%.4f", vec.shape, float(vec.sum()))
        return vec

    # ── Internal ─────────────────────────────────────────────────────────

    def _build(self, ev: dict[str, Any]) -> list[float]:
        """Assemble all 70 features in canonical positional order."""

        # If the event carries raw CIC-style flow features, extract directly
        if "flow_duration" in ev or "Flow Duration" in ev:
            return self._from_cic_dict(ev)

        # --- Basic event fields ------------------------------------------
        dst_port = float(self._get_int(ev, ["destination_port", "dest_port", "dst_port"], 0))
        proto_str = str(ev.get("protocol") or ev.get("proto") or "TCP").upper()
        severity_int = int(ev.get("severity", 3))   # Suricata 1–4

        # Severity → heuristic duration (µs)
        duration = _SEVERITY_DURATION_US.get(severity_int, 200000.0)

        # Port → heuristic packet sizes
        fwd_pkt_sz, bwd_pkt_sz = _PORT_SERVICE_SIZES.get(int(dst_port), _DEFAULT_SERVICE)

        # Suricata severity 1 (CRITICAL) → fewer packets, bigger impact
        # Suricata severity 4 (LOW)      → more packets, smaller individual size
        fwd_pkts = max(1, 5 - severity_int)          # 4, 3, 2, 1
        bwd_pkts = max(1, fwd_pkts - 1)              # 3, 2, 1, 0 → min 1
        total_fwd_len = fwd_pkts * fwd_pkt_sz
        total_bwd_len = bwd_pkts * bwd_pkt_sz

        # Packet length stats
        fwd_pkt_max = fwd_pkt_sz * 1.2
        fwd_pkt_min = fwd_pkt_sz * 0.8
        fwd_pkt_mean = fwd_pkt_sz
        fwd_pkt_std = fwd_pkt_sz * 0.1

        bwd_pkt_max = bwd_pkt_sz * 1.2
        bwd_pkt_min = bwd_pkt_sz * 0.8
        bwd_pkt_mean = bwd_pkt_sz
        bwd_pkt_std = bwd_pkt_sz * 0.1

        # Flow rate features
        flow_bytes_s = (total_fwd_len + total_bwd_len) / max(duration / 1e6, 1e-6)
        flow_pkts_s = (fwd_pkts + bwd_pkts) / max(duration / 1e6, 1e-6)

        # IAT (inter-arrival time) features
        iat_mean = duration / max(fwd_pkts + bwd_pkts - 1, 1)
        iat_std = iat_mean * 0.15
        iat_max = iat_mean * 1.5
        iat_min = iat_mean * 0.5

        fwd_iat_total = duration * 0.6
        fwd_iat_mean = fwd_iat_total / max(fwd_pkts - 1, 1)
        fwd_iat_std = fwd_iat_mean * 0.1
        fwd_iat_max = fwd_iat_mean * 1.3
        fwd_iat_min = fwd_iat_mean * 0.7

        bwd_iat_total = duration * 0.4
        bwd_iat_mean = bwd_iat_total / max(bwd_pkts - 1, 1)
        bwd_iat_std = bwd_iat_mean * 0.1
        bwd_iat_max = bwd_iat_mean * 1.3
        bwd_iat_min = bwd_iat_mean * 0.7

        # TCP flags
        is_tcp = proto_str == "TCP"
        fin_flag = 1.0 if is_tcp and severity_int >= 3 else 0.0
        syn_flag = 1.0 if is_tcp else 0.0
        rst_flag = 1.0 if is_tcp and severity_int == 1 else 0.0
        psh_flag = 1.0 if is_tcp else 0.0
        ack_flag = 1.0 if is_tcp else 0.0
        urg_flag = 0.0
        cwe_flag = 0.0
        ece_flag = 0.0

        fwd_psh = psh_flag
        fwd_urg = 0.0

        # Header lengths
        hdr_sz = 20.0 if is_tcp else 8.0
        fwd_hdr_len = fwd_pkts * hdr_sz
        bwd_hdr_len = bwd_pkts * hdr_sz

        # Per-direction rates
        fwd_pkts_s = fwd_pkts / max(duration / 1e6, 1e-6)
        bwd_pkts_s = bwd_pkts / max(duration / 1e6, 1e-6)

        # Global packet length stats
        all_pkt_sizes = [fwd_pkt_sz] * fwd_pkts + [bwd_pkt_sz] * bwd_pkts
        min_pkt = min(all_pkt_sizes)
        max_pkt = max(all_pkt_sizes)
        mean_pkt = sum(all_pkt_sizes) / len(all_pkt_sizes)
        var_pkt = sum((x - mean_pkt) ** 2 for x in all_pkt_sizes) / len(all_pkt_sizes)
        std_pkt = math.sqrt(var_pkt)

        # Down/Up ratio, average sizes
        down_up = bwd_pkts / max(fwd_pkts, 1)
        avg_pkt_size = mean_pkt
        avg_fwd_seg = fwd_pkt_mean
        avg_bwd_seg = bwd_pkt_mean

        # Subflow
        sub_fwd_pkts = float(fwd_pkts)
        sub_fwd_bytes = total_fwd_len
        sub_bwd_pkts = float(bwd_pkts)
        sub_bwd_bytes = total_bwd_len

        # Init window sizes (TCP)
        init_win_fwd = 8192.0 if is_tcp else 0.0
        init_win_bwd = 8192.0 if is_tcp and bwd_pkts > 0 else 0.0
        act_data_fwd = float(fwd_pkts)
        min_seg_fwd = hdr_sz

        # Active and Idle temporal metrics
        active_mean = 0.0
        active_std = 0.0
        active_max = 0.0
        active_min = 0.0
        idle_mean = 0.0
        idle_std = 0.0
        idle_max = 0.0
        idle_min = 0.0

        return [
            # 00-09
            dst_port,
            duration,
            float(fwd_pkts),
            float(bwd_pkts),
            total_fwd_len,
            total_bwd_len,
            fwd_pkt_max,
            fwd_pkt_min,
            fwd_pkt_mean,
            fwd_pkt_std,
            
            # 10-19
            bwd_pkt_max,
            bwd_pkt_min,
            bwd_pkt_mean,
            bwd_pkt_std,
            flow_bytes_s,
            flow_pkts_s,
            iat_mean,
            iat_std,
            iat_max,
            iat_min,
            
            # 20-29
            fwd_iat_total,
            fwd_iat_mean,
            fwd_iat_std,
            fwd_iat_max,
            fwd_iat_min,
            bwd_iat_total,
            bwd_iat_mean,
            bwd_iat_std,
            bwd_iat_max,
            bwd_iat_min,
            
            # 30-39
            fwd_psh,
            fwd_urg,
            fwd_hdr_len,
            bwd_hdr_len,
            fwd_pkts_s,
            bwd_pkts_s,
            min_pkt,
            max_pkt,
            mean_pkt,
            std_pkt,
            
            # 40-49
            var_pkt,
            fin_flag,
            syn_flag,
            rst_flag,
            psh_flag,
            ack_flag,
            urg_flag,
            cwe_flag,
            ece_flag,
            down_up,
            
            # 50-59
            avg_pkt_size,
            avg_fwd_seg,
            avg_bwd_seg,
            fwd_hdr_len,    # 53: Fwd Header Length.1 (CIC duplicate)
            sub_fwd_pkts,
            sub_fwd_bytes,
            sub_bwd_pkts,
            sub_bwd_bytes,
            init_win_fwd,
            init_win_bwd,
            
            # 60-69
            act_data_fwd,
            min_seg_fwd,
            active_mean,
            active_std,
            active_max,
            active_min,
            idle_mean,
            idle_std,
            idle_max,
            idle_min,
        ]

    def _from_cic_dict(self, ev: dict[str, Any]) -> list[float]:
        """
        Fast path: event already carries CIC-FlowMeter columns.
        Returns them in the exact canonical positional order.
        """
        def g(key: str, default: float = 0.0) -> float:
            try:
                val = ev.get(key)
                if val is None:
                    # check lowercase or underscore variants
                    val = ev.get(key.lower()) or ev.get(key.lower().replace(" ", "_"))
                if val is None:
                    return default
                return float(val)
            except (TypeError, ValueError):
                return default

        return [
            g("Destination Port"), g("Flow Duration"),
            g("Total Fwd Packets"), g("Total Backward Packets"),
            g("Total Length of Fwd Packets"), g("Total Length of Bwd Packets"),
            g("Fwd Packet Length Max"), g("Fwd Packet Length Min"),
            g("Fwd Packet Length Mean"), g("Fwd Packet Length Std"),
            
            g("Bwd Packet Length Max"), g("Bwd Packet Length Min"),
            g("Bwd Packet Length Mean"), g("Bwd Packet Length Std"),
            g("Flow Bytes/s"), g("Flow Packets/s"),
            g("Flow IAT Mean"), g("Flow IAT Std"),
            g("Flow IAT Max"), g("Flow IAT Min"),
            
            g("Fwd IAT Total"), g("Fwd IAT Mean"), g("Fwd IAT Std"),
            g("Fwd IAT Max"), g("Fwd IAT Min"),
            g("Bwd IAT Total"), g("Bwd IAT Mean"), g("Bwd IAT Std"),
            g("Bwd IAT Max"), g("Bwd IAT Min"),
            
            g("Fwd PSH Flags"), g("Fwd URG Flags"),
            g("Fwd Header Length"), g("Bwd Header Length"),
            g("Fwd Packets/s"), g("Bwd Packets/s"),
            g("Min Packet Length"), g("Max Packet Length"),
            g("Packet Length Mean"), g("Packet Length Std"),
            
            g("Packet Length Variance"),
            g("FIN Flag Count"), g("SYN Flag Count"), g("RST Flag Count"),
            g("PSH Flag Count"), g("ACK Flag Count"), g("URG Flag Count"),
            g("CWE Flag Count"), g("ECE Flag Count"),
            g("Down/Up Ratio"), 
            
            g("Average Packet Size"),
            g("Avg Fwd Segment Size"), g("Avg Bwd Segment Size"),
            g("Fwd Header Length.1", g("Fwd Header Length")),
            g("Subflow Fwd Packets"), g("Subflow Fwd Bytes"),
            g("Subflow Bwd Packets"), g("Subflow Bwd Bytes"),
            g("Init_Win_bytes_forward"), g("Init_Win_bytes_backward"),
            
            g("act_data_pkt_fwd"), g("min_seg_size_forward"),
            g("Active Mean"), g("Active Std"),
            g("Active Max"), g("Active Min"),
            g("Idle Mean"), g("Idle Std"),
            g("Idle Max"), g("Idle Min"),
        ]

    @staticmethod
    def _get_int(ev: dict[str, Any], keys: list[str], default: int) -> int:
        for k in keys:
            v = ev.get(k)
            if v is not None:
                try:
                    return int(v)
                except (TypeError, ValueError):
                    continue
        return default


# Module-level singleton
feature_extractor = FeatureExtractor()
