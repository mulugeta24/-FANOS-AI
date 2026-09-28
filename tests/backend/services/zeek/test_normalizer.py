from app.services.zeek.normalizer import ZeekNormalizer


def test_conn_normalization_maps_fields_and_types() -> None:
    event = ZeekNormalizer().normalize(
        {
            "ts": "2026-09-23T15:44:07Z",
            "uid": "C1",
            "id.orig_h": "192.168.56.103",
            "id.orig_p": "12345",
            "id.resp_h": "192.168.56.102",
            "id.resp_p": "443",
            "proto": "tcp",
            "service": "ssl",
            "duration": "1.25",
            "orig_bytes": "1000",
            "resp_bytes": "5000",
            "conn_state": "SF",
            "history": "ShAD",
            "orig_pkts": "5",
            "resp_pkts": "8",
            "custom": "retained",
        },
        "conn",
    )

    assert event["event_type"] == "network_connection"
    assert event["source_port"] == 12345
    assert event["destination_port"] == 443
    assert event["duration"] == 1.25
    assert event["bytes_sent"] == 1000
    assert event["metadata"]["custom"] == "retained"
    assert event["metadata"]["connection_state"] == "SF"


def test_normalizer_maps_supported_event_types() -> None:
    normalizer = ZeekNormalizer()
    expected = {
        "conn": "network_connection",
        "dns": "dns_activity",
        "dhcp": "dhcp_activity",
        "http": "http_activity",
        "ssl": "tls_activity",
        "weird": "zeek_anomaly",
        "other": "zeek_event",
    }

    for log_type, event_type in expected.items():
        assert normalizer.normalize({"ts": "1", "id.resp_p": "443"}, log_type)["event_type"] == event_type


def test_normalizer_converts_unset_and_invalid_values_to_none() -> None:
    event = ZeekNormalizer().normalize(
        {"id.orig_p": "-", "id.resp_p": "invalid", "duration": "-", "orig_bytes": "bad"},
        "conn",
    )

    assert event["source_port"] is None
    assert event["destination_port"] is None
    assert event["duration"] is None
    assert event["bytes_sent"] is None


def test_normalizer_handles_missing_fields() -> None:
    event = ZeekNormalizer().normalize({}, "dns")

    assert event["source"] == "zeek"
    assert event["timestamp"] is None
    assert event["destination_ip"] is None
    assert event["metadata"]["zeek_log_type"] == "dns"