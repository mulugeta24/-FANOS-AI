import asyncio
import json
import sys
from datetime import datetime, timezone
from io import StringIO
from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException
from fastapi import FastAPI
import httpx
from pydantic import ValidationError

SENSOR_DIR = Path(__file__).resolve().parents[4] / "suricata-lab" / "sensor"
sys.path.insert(0, str(SENSOR_DIR))

import sensor_manager
import sensor_service
from app.api.v1 import sensors


class FakeResult:
    def __init__(self, value):
        self.value = value

    def scalar_one_or_none(self):
        return self.value


class FakeSession:
    def __init__(self, value):
        self.value = value
        self.commits = 0

    async def execute(self, statement):
        if isinstance(self.value, list):
            return FakeResult(self.value.pop(0))
        return FakeResult(self.value)

    async def commit(self):
        self.commits += 1


def test_sensor_service_token_is_required_and_compared(monkeypatch):
    monkeypatch.setattr(sensors.settings, "FANOS_SENSOR_TOKEN", "bridge-test-secret")
    assert sensors.require_sensor_service("bridge-test-secret") is None
    with pytest.raises(HTTPException) as error:
        sensors.require_sensor_service("wrong-secret")
    assert error.value.status_code == 401


def test_heartbeat_route_requires_sensor_token_and_returns_actual_status(monkeypatch):
    monkeypatch.setattr(sensors.settings, "FANOS_SENSOR_TOKEN", "bridge-test-secret")
    lifecycle = SimpleNamespace(
        sensor_id="demo-sensor-01",
        desired_state="RUNNING",
        status="STARTING",
        service_status="STARTING",
        suricata_status="STARTING",
        collector_status="STARTING",
        suricata_pid=None,
        collector_pid=None,
        restart_count=0,
        last_heartbeat=None,
        last_seen=None,
        last_error=None,
    )
    app = FastAPI()
    app.include_router(sensors.router, prefix="/api/v1")

    async def provide_session():
        yield FakeSession(lifecycle)

    from app.db.base import get_async_session

    app.dependency_overrides[get_async_session] = provide_session

    async def exercise():
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as client:
            payload = {
                "sensor_id": "demo-sensor-01",
                "desired_state": "RUNNING",
                "service_status": "ONLINE",
                "suricata_status": "ONLINE",
                "collector_status": "OFFLINE",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
            denied = await client.post(
                "/api/v1/sensors/demo-sensor-01/heartbeat",
                json=payload,
                headers={"X-FANOS-Sensor-Token": "wrong-secret"},
            )
            accepted = await client.post(
                "/api/v1/sensors/demo-sensor-01/heartbeat",
                json=payload,
                headers={"X-FANOS-Sensor-Token": "bridge-test-secret"},
            )
            return denied, accepted

    denied, accepted = asyncio.run(exercise())
    assert denied.status_code == 401
    assert accepted.status_code == 200
    assert accepted.json()["status"] == "STARTING"


def test_command_poll_claims_and_acknowledges_only_allowlisted_command(monkeypatch):
    monkeypatch.setattr(sensors.settings, "FANOS_SENSOR_TOKEN", "bridge-test-secret")
    lifecycle = SimpleNamespace(
        sensor_id="demo-sensor-01",
        desired_state="RUNNING",
        status="STARTING",
    )
    command = SimpleNamespace(
        id=uuid4(),
        sensor_id="demo-sensor-01",
        command="RESTART",
        status="PENDING",
        result="accepted",
        processed_at=None,
    )
    sessions = [FakeSession([lifecycle, command]), FakeSession([lifecycle, command])]
    app = FastAPI()
    app.include_router(sensors.router, prefix="/api/v1")

    async def provide_session():
        yield sessions.pop(0)

    from app.db.base import get_async_session

    app.dependency_overrides[get_async_session] = provide_session

    async def exercise():
        headers = {"X-FANOS-Sensor-Token": "bridge-test-secret"}
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as client:
            delivery = await client.get(
                "/api/v1/sensors/demo-sensor-01/commands/next", headers=headers
            )
            result = await client.post(
                f"/api/v1/sensors/demo-sensor-01/commands/{command.id}/result",
                json={"status": "COMPLETED", "message": "RESTART confirmed"},
                headers=headers,
            )
            return delivery, result

    delivery, result = asyncio.run(exercise())
    assert delivery.status_code == 200
    assert delivery.json()["command"] == "RESTART"
    assert command.status == "COMPLETED"
    assert result.status_code == 200


def test_heartbeat_only_reports_online_when_both_children_are_running():
    lifecycle = SimpleNamespace(
        sensor_id="demo-sensor-01",
        desired_state="RUNNING",
        status="STARTING",
        service_status="STARTING",
        suricata_status="STARTING",
        collector_status="STARTING",
        suricata_pid=None,
        collector_pid=None,
        restart_count=0,
        last_heartbeat=None,
        last_seen=None,
        last_error=None,
    )
    session = FakeSession(lifecycle)
    heartbeat = sensors.SensorHeartbeat(
        sensor_id="demo-sensor-01",
        desired_state="RUNNING",
        service_status="ONLINE",
        suricata_status="ONLINE",
        collector_status="OFFLINE",
        timestamp=datetime.now(timezone.utc),
        suricata_pid=1234,
    )

    response = asyncio.run(
        sensors.report_sensor_heartbeat("demo-sensor-01", heartbeat, None, session)
    )

    assert response.status == "STARTING"
    assert lifecycle.suricata_status == "ONLINE"
    assert lifecycle.status != "ONLINE"

    heartbeat.collector_status = "ONLINE"
    heartbeat.collector_pid = 5678
    response = asyncio.run(
        sensors.report_sensor_heartbeat("demo-sensor-01", heartbeat, None, session)
    )
    assert response.status == "ONLINE"
    assert lifecycle.collector_pid == 5678


def test_backend_rejects_sensor_id_mismatch():
    heartbeat = sensors.SensorHeartbeat(
        sensor_id="another-sensor",
        desired_state="STOPPED",
        service_status="ONLINE",
        suricata_status="OFFLINE",
        collector_status="OFFLINE",
        timestamp=datetime.now(timezone.utc),
    )

    with pytest.raises(HTTPException) as error:
        asyncio.run(
            sensors.report_sensor_heartbeat(
                "demo-sensor-01", heartbeat, None, FakeSession(None)
            )
        )
    assert error.value.status_code == 400


def test_status_does_not_keep_an_unresponsive_sensor_online():
    lifecycle = SimpleNamespace(
        sensor_id="demo-sensor-01",
        desired_state="RUNNING",
        status="ONLINE",
        suricata_status="ONLINE",
        collector_status="ONLINE",
        service_status="ONLINE",
        last_heartbeat=None,
        last_seen=None,
        restart_count=0,
        last_error=None,
    )

    response = asyncio.run(
        sensors.get_sensor_status(
            "demo-sensor-01", SimpleNamespace(username="admin"), FakeSession(lifecycle)
        )
    )

    assert response.status == "OFFLINE"
    assert response.service_status == "OFFLINE"


def test_command_delivery_rejects_non_allowlisted_command():
    with pytest.raises(ValidationError):
        sensors.SensorCommandDelivery(
            command_id="command-1",
            command="RUN_POWERSHELL",
            desired_state="RUNNING",
        )


class FakeProcess:
    next_pid = 100

    def __init__(self):
        self.pid = FakeProcess.next_pid
        FakeProcess.next_pid += 1
        self.returncode = None

    def poll(self):
        return self.returncode

    def terminate(self):
        self.returncode = 0

    def wait(self, timeout=None):
        self.returncode = 0
        return 0

    def kill(self):
        self.returncode = -9


class FakeManagerInput:
    def __init__(self, status_path, commands):
        self.status_path = Path(status_path)
        self.commands = commands

    def write(self, line):
        command = json.loads(line)["command"]
        self.commands.append(command)
        running = command in {"START", "RESTART"}
        state = {
            "desired_state": "RUNNING" if running else "STOPPED",
            "service_status": "ONLINE",
            "suricata_status": "ONLINE" if running else "OFFLINE",
            "collector_status": "ONLINE" if running else "OFFLINE",
            "suricata_pid": 101 if running else None,
            "collector_pid": 102 if running else None,
            "restart_count": 0,
            "last_error": None,
        }
        self.status_path.write_text(json.dumps(state), encoding="utf-8")

    def flush(self):
        pass

    def close(self):
        pass


def test_sensor_service_forwards_only_lifecycle_commands(monkeypatch, tmp_path):
    commands = []

    def fake_popen(command, **kwargs):
        process = FakeProcess()
        process.stdin = FakeManagerInput(kwargs["env"]["FANOS_SENSOR_STATUS_FILE"], commands)
        return process

    monkeypatch.setenv("LOCALAPPDATA", str(tmp_path))
    monkeypatch.setenv("FANOS_SENSOR_STATUS_FILE", str(tmp_path / "manager-status.json"))
    monkeypatch.setattr(sensor_service.subprocess, "Popen", fake_popen)
    manager = sensor_service.SensorManagerProcess("demo-sensor-01", "http://backend")
    manager.start()

    assert manager.execute("START")[0] is True
    assert manager.execute("STOP")[0] is True
    assert manager.execute("RESTART")[0] is True
    assert manager.execute("RUN_POWERSHELL")[0] is False
    assert commands == ["START", "STOP", "RESTART"]


def test_controlled_manager_supports_commands_and_stops_children_on_exit(monkeypatch, tmp_path):
    launches = {"suricata": 0, "collector": 0}

    def start_suricata():
        launches["suricata"] += 1
        return FakeProcess()

    def start_collector():
        launches["collector"] += 1
        return FakeProcess()

    status_path = tmp_path / "manager-status.json"
    monkeypatch.setenv("FANOS_SENSOR_STATUS_FILE", str(status_path))
    monkeypatch.setattr(sensor_manager.sys, "stdin", StringIO(
        '{"command":"START"}\n'
        '{"command":"STOP"}\n'
        '{"command":"RESTART"}\n'
        '{"command":"RUN_POWERSHELL"}\n'
    ))
    monkeypatch.setattr(sensor_manager, "start_suricata", start_suricata)
    monkeypatch.setattr(sensor_manager, "start_collector", start_collector)
    monkeypatch.setattr(sensor_manager.time, "sleep", lambda _: None)

    assert sensor_manager.controlled_main() == 0
    assert launches == {"suricata": 2, "collector": 2}
    state = json.loads(status_path.read_text(encoding="utf-8"))
    assert state["desired_state"] == "STOPPED"
    assert state["service_status"] == "OFFLINE"
    assert state["suricata_status"] == "OFFLINE"
    assert state["collector_status"] == "OFFLINE"


def test_manager_recovers_crashes_only_while_desired_state_is_running(monkeypatch):
    clock = {"now": 100.0}
    launches = []
    dead_process = FakeProcess()
    dead_process.returncode = 1
    state = {
        "desired_state": "STOPPED",
        "service_status": "ONLINE",
        "suricata_status": "ERROR",
        "collector_status": "OFFLINE",
        "suricata": dead_process,
        "collector": None,
        "restart_count": 0,
        "last_error": None,
    }
    retries = {"suricata": 0, "collector": 0}

    def start_suricata():
        launches.append("suricata")
        return FakeProcess()

    monkeypatch.setattr(sensor_manager.time, "monotonic", lambda: clock["now"])
    monkeypatch.setattr(sensor_manager.time, "sleep", lambda _: None)
    monkeypatch.setattr(sensor_manager, "start_suricata", start_suricata)

    sensor_manager._recover_controlled_services(state, retries)
    assert launches == []

    state["desired_state"] = "RUNNING"
    sensor_manager._recover_controlled_services(state, retries)
    assert launches == []
    clock["now"] = retries["suricata"]
    sensor_manager._recover_controlled_services(state, retries)
    assert launches == ["suricata"]
    assert state["suricata_status"] == "ONLINE"


def test_service_does_not_pass_its_token_to_sensor_manager(monkeypatch, tmp_path):
    captured = {}

    def fake_popen(command, **kwargs):
        captured["command"] = command
        captured["environment"] = kwargs["env"]
        return FakeProcess()

    monkeypatch.setenv("FANOS_SENSOR_TOKEN", "private-bridge-token")
    monkeypatch.setenv("LOCALAPPDATA", str(tmp_path))
    monkeypatch.setattr(sensor_service.subprocess, "Popen", fake_popen)

    manager = sensor_service.SensorManagerProcess("demo-sensor-01", "http://backend")
    manager.start()

    assert captured["command"][-1] == "--service-control"
    assert all(key.upper() != "FANOS_SENSOR_TOKEN" for key in captured["environment"])
    assert "private-bridge-token" not in repr(captured["environment"])


def test_sensor_service_refuses_arbitrary_manager_commands():
    manager = sensor_service.SensorManagerProcess("demo-sensor-01", "http://backend")
    assert manager.send("RUN_POWERSHELL") is False
    assert manager.send("START") is False