from pathlib import Path

from app.services.zeek.parser import ZeekParser


def write_log(path: Path, fields: str, rows: list[str], separator: str = r"\x09") -> None:
    path.write_text(
        "\n".join([f"#separator {separator}", f"#fields {fields}", *rows]) + "\n",
        encoding="utf-8",
    )


def test_parser_reads_conn_record_and_unknown_field(tmp_path: Path) -> None:
    path = tmp_path / "conn.log"
    write_log(path, "ts\tuid\tid.orig_h\tcustom_field", ["1.0\tC1\t10.0.0.1\tvalue"])

    assert ZeekParser().parse_file(path) == [
        {"ts": "1.0", "uid": "C1", "id.orig_h": "10.0.0.1", "custom_field": "value"}
    ]


def test_parser_reads_dns_record(tmp_path: Path) -> None:
    path = tmp_path / "dns.log"
    write_log(path, "ts\tuid\tquery\tqtype_name", ["2.0\tD1\texample.test\tA"])

    assert ZeekParser().parse_file(path)[0]["query"] == "example.test"


def test_parser_handles_missing_empty_and_missing_fields(tmp_path: Path) -> None:
    parser = ZeekParser()
    assert parser.parse_file(tmp_path / "missing.log") == []
    empty = tmp_path / "empty.log"
    empty.write_text("", encoding="utf-8")
    assert parser.parse_file(empty) == []
    no_fields = tmp_path / "no-fields.log"
    no_fields.write_text("#open now\n1\tvalue\n", encoding="utf-8")
    assert parser.parse_file(no_fields) == []


def test_parser_skips_malformed_row_and_preserves_empty_and_unset_values(tmp_path: Path) -> None:
    path = tmp_path / "conn.log"
    write_log(path, "ts\tuid\tempty_field\tunset_field", ["1\tC1\t\t-", "bad-row"])

    assert ZeekParser().parse_file(path) == [
        {"ts": "1", "uid": "C1", "empty_field": "", "unset_field": "-"}
    ]


def test_parser_handles_permission_error(tmp_path: Path, monkeypatch) -> None:
    path = tmp_path / "restricted.log"
    path.write_text("#fields ts\n1\n", encoding="utf-8")

    def raise_permission_error(*args, **kwargs):
        raise PermissionError("denied")

    monkeypatch.setattr(Path, "open", raise_permission_error)
    assert ZeekParser().parse_file(path) == []