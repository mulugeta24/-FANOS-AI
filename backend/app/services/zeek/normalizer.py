"""Convert Zeek records into extensible FANOS security events."""

from __future__ import annotations

from typing import Any, Mapping


class ZeekNormalizer:
    """Normalize records while retaining protocol-specific Zeek fields."""

    EVENT_TYPES = {
        "conn": "network_connection",
        "dns": "dns_activity",
        "dhcp": "dhcp_activity",
        "http": "http_activity",
        "ssl": "tls_activity",
        "weird": "zeek_anomaly",
    }

    COMMON_FIELDS = {
        "ts": "timestamp",
        "uid": "uid",
        "id.orig_h": "source_ip",
        "id.orig_p": "source_port",
        "id.resp_h": "destination_ip",
        "id.resp_p": "destination_port",
        "proto": "protocol",
        "service": "service",
    }
    CONN_FIELDS = {
        "duration": ("duration", float),
        "orig_bytes": ("bytes_sent", int),
        "resp_bytes": ("bytes_received", int),
        "conn_state": ("connection_state", str),
        "history": ("connection_history", str),
        "orig_pkts": ("packets_sent", int),
        "resp_pkts": ("packets_received", int),
    }

    def normalize(self, record: Mapping[str, Any], log_type: str) -> dict[str, Any]:
        """Normalize one raw Zeek record; invalid typed values become ``None``."""
        normalized: dict[str, Any] = {
            "source": "zeek",
            "event_type": self.EVENT_TYPES.get(log_type, "zeek_event"),
            "timestamp": self._clean(record.get("ts")),
            "uid": self._clean(record.get("uid")),
        }
        consumed = {"ts", "uid"}

        for zeek_name, fanos_name in self.COMMON_FIELDS.items():
            if zeek_name in consumed:
                continue
            normalized[fanos_name] = self._convert(
                record.get(zeek_name), int if zeek_name.endswith("_p") else str
            )
            consumed.add(zeek_name)

        if log_type == "conn":
            for zeek_name, (fanos_name, value_type) in self.CONN_FIELDS.items():
                normalized[fanos_name] = self._convert(record.get(zeek_name), value_type)
                consumed.add(zeek_name)

        metadata: dict[str, Any] = {"zeek_log_type": log_type}
        for zeek_name, value in record.items():
            if zeek_name not in consumed:
                metadata[zeek_name] = self._clean(value)
        if log_type == "conn":
            for _, (fanos_name, _) in self.CONN_FIELDS.items():
                metadata[fanos_name] = normalized[fanos_name]

        normalized["metadata"] = metadata
        return normalized

    def normalize_records(
        self, records: list[Mapping[str, Any]], log_type: str
    ) -> list[dict[str, Any]]:
        return [self.normalize(record, log_type) for record in records]

    @staticmethod
    def _clean(value: Any) -> Any:
        if value is None or value == "" or value == "-":
            return None
        return value

    @classmethod
    def _convert(cls, value: Any, value_type: type) -> Any:
        value = cls._clean(value)
        if value is None:
            return None
        try:
            return value_type(value)
        except (TypeError, ValueError, OverflowError):
            return None