import asyncio

from app.api.v1.infrastructure import (
    ZeekEventIngestion,
    create_security_event_from_zeek,
    router,
)


class FakeSession:
    def __init__(self) -> None:
        self.added = None

    def add(self, value) -> None:
        self.added = value

    async def commit(self) -> None:
        pass

    async def refresh(self, value) -> None:
        pass


def test_zeek_event_is_normalized_and_persisted_as_security_event() -> None:
    session = FakeSession()
    event = ZeekEventIngestion(
        log_type="conn",
        record={
            "ts": "2026-09-23T15:44:07Z",
            "id.orig_h": "192.168.56.103",
            "id.resp_h": "192.168.56.102",
            "proto": "tcp",
        },
    )

    security_event = asyncio.run(create_security_event_from_zeek(event, session))

    assert security_event is session.added
    assert security_event.sensor_source == "zeek"
    assert security_event.attack_type == "network_connection"
    assert security_event.source_ip == "192.168.56.103"
    assert security_event.target == "192.168.56.102"
    assert '"source": "zeek"' in security_event.raw_payload


def test_zeek_ingestion_route_is_registered() -> None:
    routes = {
        (route.path, method)
        for route in router.routes
        for method in route.methods
    }

    assert ("/infrastructure/sensors/zeek/events", "POST") in routes