"""
ML URL Detector Service
=======================
Loads and executes the trained XGBoost multi-class URL classification model.
Preserves exact 17-feature schema, ordering, and label encoding.
Multi-class outputs: benign, defacement, malicious, phishing.
"""
from __future__ import annotations

import os
import re
import pickle
import threading
from typing import Dict, List, Tuple, Any, Optional
from urllib.parse import urlparse
from app.core.logging import log

SUSPICIOUS_KEYWORDS = ['login', 'secure', 'bank', 'update', 'confirm', 'account']
SUSPICIOUS_TLDS = ['zip', 'country', 'xyz', 'info', 'top']

FEATURE_NAMES = [
    "URL_LENGTH",
    "NUMBER_SPECIAL_CHARACTERS",
    "HAS_IP",
    "HAS_AT",
    "HAS_HTTPS",
    "NUM_SUBDOMAINS",
    "DOMAIN_LENGTH",
    "NUM_DIGITS",
    "NUM_HYPHENS",
    "NUM_DOTS",
    "SUSPICIOUS_KEYWORDS",
    "SUSPICIOUS_TLD",
    "HAS_IP_IN_PATH",
    "PATH_LENGTH",
    "QUERY_LENGTH",
    "IS_LONG_URL",
    "IS_SHORT_DOMAIN",
]


class URLDetector:
    """Thread-safe singleton service for ML URL classification."""

    _instance: Optional[URLDetector] = None
    _lock = threading.Lock()

    def __init__(self, model_path: Optional[str] = None, label_encoder_path: Optional[str] = None):
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        if model_path is None:
            model_path = os.path.join(base_dir, "models", "url_classifier", "ml_model.pkl")
        if label_encoder_path is None:
            label_encoder_path = os.path.join(base_dir, "models", "url_classifier", "label_encoder.pkl")

        self.model_path = model_path
        self.label_encoder_path = label_encoder_path
        self.model = None
        self.label_encoder = None
        self.is_ready = False
        self.classes: List[str] = []
        self._load_model()

    @classmethod
    def get_instance(cls) -> URLDetector:
        with cls._lock:
            if cls._instance is None:
                cls._instance = cls()
            return cls._instance

    def _load_model(self) -> None:
        try:
            if os.path.exists(self.model_path) and os.path.exists(self.label_encoder_path):
                with open(self.model_path, "rb") as f:
                    self.model = pickle.load(f)
                with open(self.label_encoder_path, "rb") as f:
                    self.label_encoder = pickle.load(f)
                self.classes = list(self.label_encoder.classes_)
                self.is_ready = True
                log.info("ML URL Detector loaded successfully", model_path=self.model_path, classes=self.classes)
            else:
                log.warning("ML URL Detector files not found", model=self.model_path, le=self.label_encoder_path)
                self.is_ready = False
        except Exception as e:
            log.error("Failed to load ML URL Detector", error=str(e))
            self.is_ready = False

    def extract_features(self, url: str) -> Tuple[List[float], Dict[str, Any]]:
        """
        Extract exact 17 features from URL for the ML model.
        Returns both ordered feature list and named feature dictionary.
        """
        raw_url = url.strip()
        if not raw_url.startswith(('http://', 'https://')):
            raw_url = 'http://' + raw_url

        try:
            parsed = urlparse(raw_url)
        except Exception:
            parsed = urlparse('http://' + raw_url)

        domain = parsed.netloc or ""
        path = parsed.path or ""
        query = parsed.query or ""

        url_length = len(raw_url)
        num_special_chars = len(re.findall(r'[^a-zA-Z0-9]', raw_url))
        has_ip = 1 if re.search(r'(\d{1,3}\.){3}\d{1,3}', domain) else 0
        has_at = 1 if '@' in raw_url else 0
        has_https = 1 if parsed.scheme == 'https' else 0
        num_subdomains = max(0, len(domain.split('.')) - 2)
        domain_length = len(domain)
        num_digits = len(re.findall(r'\d', raw_url))
        num_hyphens = raw_url.count('-')
        num_dots = raw_url.count('.')
        suspicious_keywords_cnt = sum(raw_url.lower().count(k) for k in SUSPICIOUS_KEYWORDS)

        tld = domain.split('.')[-1].lower() if len(domain.split('.')) > 1 else ''
        suspicious_tld = 1 if tld in SUSPICIOUS_TLDS else 0
        has_ip_in_path = 1 if re.search(r'(\d{1,3}\.){3}\d{1,3}', path + query) else 0

        path_length = len(path)
        query_length = len(query)
        is_long_url = 1 if len(raw_url) > 75 else 0
        is_short_domain = 1 if len(domain) < 5 else 0

        features_dict: Dict[str, Any] = {
            "URL_LENGTH": url_length,
            "NUMBER_SPECIAL_CHARACTERS": num_special_chars,
            "HAS_IP": has_ip,
            "HAS_AT": has_at,
            "HAS_HTTPS": has_https,
            "NUM_SUBDOMAINS": num_subdomains,
            "DOMAIN_LENGTH": domain_length,
            "NUM_DIGITS": num_digits,
            "NUM_HYPHENS": num_hyphens,
            "NUM_DOTS": num_dots,
            "SUSPICIOUS_KEYWORDS": suspicious_keywords_cnt,
            "SUSPICIOUS_TLD": suspicious_tld,
            "HAS_IP_IN_PATH": has_ip_in_path,
            "PATH_LENGTH": path_length,
            "QUERY_LENGTH": query_length,
            "IS_LONG_URL": is_long_url,
            "IS_SHORT_DOMAIN": is_short_domain,
        }

        # Exact ordering corresponding to training vector
        ordered_features = [
            features_dict["URL_LENGTH"],
            features_dict["NUMBER_SPECIAL_CHARACTERS"],
            features_dict["HAS_IP"],
            features_dict["HAS_AT"],
            features_dict["HAS_HTTPS"],
            features_dict["NUM_SUBDOMAINS"],
            features_dict["DOMAIN_LENGTH"],
            features_dict["NUM_DIGITS"],
            features_dict["NUM_HYPHENS"],
            features_dict["NUM_DOTS"],
            features_dict["SUSPICIOUS_KEYWORDS"],
            features_dict["SUSPICIOUS_TLD"],
            features_dict["HAS_IP_IN_PATH"],
            features_dict["PATH_LENGTH"],
            features_dict["QUERY_LENGTH"],
            features_dict["IS_LONG_URL"],
            features_dict["IS_SHORT_DOMAIN"],
        ]

        return ordered_features, features_dict

    def predict(self, url: str) -> Dict[str, Any]:
        """
        Predict URL category with probabilities and confidence.
        """
        if not self.is_ready or self.model is None or self.label_encoder is None:
            raise RuntimeError("ML URL Detector model is not initialized or failed to load")

        ordered_features, features_dict = self.extract_features(url)
        prediction = self.model.predict([ordered_features])[0]
        probabilities = self.model.predict_proba([ordered_features])[0]

        label = str(self.label_encoder.inverse_transform([prediction])[0])
        confidence = float(max(probabilities))

        prob_dict: Dict[str, float] = {}
        for i, class_label in enumerate(self.label_encoder.classes_):
            prob_dict[str(class_label)] = round(float(probabilities[i]), 4)

        return {
            "label": label,
            "confidence": round(confidence, 4),
            "probabilities": prob_dict,
            "features": features_dict,
            "feature_vector": ordered_features,
            "model_version": "XGBoost-17D-URL-Classifier-V1",
        }


url_detector = URLDetector.get_instance()
