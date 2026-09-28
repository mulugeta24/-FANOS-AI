from pathlib import Path

from app.services.zeek.collector import ZeekCollector


def write_log(path: Path, fields: str, rows: list[str]) -> None:
    path.write_text(
        "\n".join([r"#separator \x09", f"#fields {fields}", *rows]) + "\n",
        encoding="utf-8",
    )


def test_collector_collects_existing_logs_and_skips_missing_logs(tmp_path: Path) -> None:
    write_log(
        tmp_path / "conn.log",
        "ts\tuid\tid.orig_h\tid.orig_p\tid.resp_h\tid.resp_p\tproto",
        ["1\tC1\t10.0.0.1\t1234\t10.0.0.2\t443\ttcp"],
    )
    write_log(
        tmp_path / "dns.log",
        "ts\tuid\tid.orig_h\tid.resp_h\tid.resp_p\tquery",
        ["2\tD1\t10.0.0.1\t10.0.0.2\t5355\texample.test"],
    )

    collector = ZeekCollector(tmp_path)
    events = collector.collect()

    assert [event["event_type"] for event in events] == ["network_connection", "dns_activity"]
    assert collector.last_stats["files_discovered"] == 2
    assert collector.last_stats["records_parsed"] == 2
    assert collector.last_stats["per_log"]["dhcp.log"]["status"] == "not_found"


def test_collector_handles_malformed_logs_and_empty_directory(tmp_path: Path) -> None:
    write_log(tmp_path / "conn.log", "ts\tuid", ["1\tC1", "malformed"])
    collector = ZeekCollector(tmp_path)

    assert len(collector.collect()) == 1

    empty_collector = ZeekCollector(tmp_path / "does-not-exist")
    assert empty_collector.collect() == []
    assert empty_collector.last_stats["files_discovered"] == 0


def test_collector_rejects_unsupported_log_request(tmp_path: Path) -> None:
    assert ZeekCollector(tmp_path).collect_log("packet_filter.log") == []