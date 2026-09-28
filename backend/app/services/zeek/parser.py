"""Safe parser for Zeek's tab-separated log format."""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any

from app.core.logging import log


class ZeekParser:
    """Parse Zeek metadata and records without executing or evaluating input."""

    def parse_file(self, file_path: str | Path) -> list[dict[str, str]]:
        """Return records from one Zeek log, skipping invalid records safely."""
        path = Path(file_path).expanduser()
        if not path.exists():
            log.warning("Zeek log does not exist", log_file=path.name)
            return []
        if not path.is_file():
            log.warning("Zeek log path is not a file", log_file=str(path))
            return []

        try:
            with path.open("r", encoding="utf-8", errors="replace") as log_file:
                return self._parse_lines(log_file, path.name)
        except PermissionError:
            log.error("Unable to read Zeek log because of permission error", log_file=path.name)
        except OSError as exc:
            log.error("Unable to read Zeek log", log_file=path.name, error=str(exc))
        return []

    def _parse_lines(self, lines: Any, log_name: str) -> list[dict[str, str]]:
        fields: list[str] | None = None
        separator = "\t"
        records: list[dict[str, str]] = []

        for line_number, raw_line in enumerate(lines, start=1):
            line = raw_line.rstrip("\r\n")
            if not line:
                continue
            if line.startswith("#"):
                if line.startswith("#separator "):
                    separator = self._decode_separator(line.split(" ", 1)[1])
                elif line.startswith("#fields "):
                    fields = line[len("#fields ") :].split(separator)
                continue

            if fields is None:
                log.warning(
                    "Zeek record skipped because #fields is missing",
                    log_file=log_name,
                    line_number=line_number,
                )
                continue

            values = line.split(separator)
            if len(values) != len(fields):
                log.warning(
                    "Malformed Zeek record skipped",
                    log_file=log_name,
                    line_number=line_number,
                    expected_fields=len(fields),
                    actual_fields=len(values),
                )
                continue
            records.append(dict(zip(fields, values)))

        if fields is None:
            log.warning("Zeek log has no #fields header", log_file=log_name)
        log.info("Parsed Zeek records", log_file=log_name, record_count=len(records))
        return records

    @staticmethod
    def _decode_separator(value: str) -> str:
        """Decode Zeek's escaped separator without interpreting arbitrary input."""
        if value == r"\x09":
            return "\t"
        match = re.fullmatch(r"\\x([0-9a-fA-F]{2})", value)
        if match:
            return chr(int(match.group(1), 16))
        return value[:1] or "\t"