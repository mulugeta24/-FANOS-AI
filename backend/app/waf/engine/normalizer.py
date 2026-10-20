"""
Safe input normalization module.
Handles multi-stage percent decoding, unicode normalization, null-byte stripping,
path canonicalization, and bounded input processing to prevent evasion attacks and ReDoS.
"""
import re
import unicodedata
import urllib.parse
from typing import Dict, Optional, Tuple

from app.waf.constants import DEFAULT_RECURSIVE_DECODE_LIMIT


class SafeNormalizer:
    """Safe normalizer for incoming HTTP requests."""

    def __init__(self, max_decode_depth: int = DEFAULT_RECURSIVE_DECODE_LIMIT):
        self.max_decode_depth = max_decode_depth

    def decode_recursively(self, val: str) -> str:
        """
        Recursively URL-decodes a string up to max_decode_depth times.
        Prevents evasion via nested encoding (e.g., %252e%252e%252f -> %2e%2e%2f -> ../).
        """
        if not val or not isinstance(val, str):
            return ""

        current = val
        for _ in range(self.max_decode_depth):
            try:
                decoded = urllib.parse.unquote(current)
            except Exception:
                break
            if decoded == current:
                break
            current = decoded
        return current

    def clean_text(self, val: str, max_len: Optional[int] = None) -> str:
        """
        Cleans, decodes, normalizes unicode, removes null bytes, and bounds length.
        """
        if not val:
            return ""

        # Safe length bounding first
        if max_len and len(val) > max_len:
            val = val[:max_len]

        # Recursive URL decoding
        decoded = self.decode_recursively(val)

        # Remove null bytes
        decoded = decoded.replace("\x00", "").replace("%00", "")

        # Unicode NFKC normalization
        try:
            normalized = unicodedata.normalize("NFKC", decoded)
        except Exception:
            normalized = decoded

        return normalized

    def normalize_path(self, path: str) -> str:
        """
        Canonicalizes URL paths:
        - Decodes percent-encoded characters
        - Replaces backslashes with forward slashes
        - Collapses duplicate slashes
        """
        if not path:
            return "/"

        cleaned = self.clean_text(path, max_len=4096)

        # If a full URL is passed, safely extract the path component
        if cleaned.startswith(("http://", "https://")):
            try:
                parsed = urllib.parse.urlsplit(cleaned)
                cleaned = parsed.path or "/"
            except Exception:
                pass

        # Convert backslashes
        cleaned = cleaned.replace("\\", "/")
        # Collapse multiple slashes
        cleaned = re.sub(r"/+", "/", cleaned)

        if not cleaned.startswith("/"):
            cleaned = "/" + cleaned

        return cleaned

    def normalize_query_params(self, params: Dict[str, str]) -> Dict[str, str]:
        """Normalizes all keys and values in query parameters."""
        normalized = {}
        for k, v in params.items():
            clean_k = self.clean_text(str(k), max_len=256)
            clean_v = self.clean_text(str(v), max_len=4096)
            normalized[clean_k] = clean_v
        return normalized

    def normalize_headers(self, headers: Dict[str, str]) -> Dict[str, str]:
        """
        Normalizes header names to lowercase and cleans values.
        """
        normalized = {}
        for k, v in headers.items():
            clean_k = str(k).strip().lower()
            clean_v = self.clean_text(str(v), max_len=8192)
            normalized[clean_k] = clean_v
        return normalized

    def normalize_body(self, body: Optional[str], max_len: int = 1048576) -> str:
        """Normalizes request body text safely within maximum size."""
        if not body:
            return ""
        return self.clean_text(body, max_len=max_len)


normalizer = SafeNormalizer()
