from pathlib import Path

RULES_PATH = Path(__file__).resolve().parents[1] / "rules" / "local.rules"


def test_nmap_scan_rule_present() -> None:
    text = RULES_PATH.read_text(encoding="utf-8")

    assert "sid:1000004" in text
    assert "NMAP" in text.upper() or "nmap" in text.lower()
    assert "flags:S" in text
