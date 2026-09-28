"""Development bridge between FANOS Backend and the local Sensor Manager."""
from __future__ import annotations

import json
import logging
import os
import re
import subprocess
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen


SENSOR_ROOT = Path(__file__).resolve().parent
PROGRAM_DATA_ROOT = Path(os.getenv("PROGRAMDATA", r"C:\ProgramData")) / "FANOS"
DEFAULT_CONFIG_PATH = PROGRAM_DATA_ROOT / "config" / "sensor-service.env"
DEFAULT_LOG_PATH = PROGRAM_DATA_ROOT / "logs" / "sensor-service.log"
ALLOWED_COMMANDS = {"START", "STOP", "RESTART"}
POLL_SECONDS = float(os.getenv("FANOS_SENSOR_POLL_SECONDS", "1"))
HEARTBEAT_SECONDS = float(os.getenv("FANOS_SENSOR_HEARTBEAT_SECONDS", "5"))
COMMAND_TIMEOUT_SECONDS = float(os.getenv("FANOS_SENSOR_COMMAND_TIMEOUT_SECONDS", "60"))


class BackendError(RuntimeError):
    pass


class JsonFormatter(logging.Formatter):
    def format(self, record):
        entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "message": record.getMessage(),
        }
        for field in ("sensor_id", "command", "status", "component"):
            value = getattr(record, field, None)
            if value is not None:
                entry[field] = value
        return json.dumps(entry, separators=(",", ":"))


logger = logging.getLogger("fanos.sensor_service")
logger.setLevel(logging.INFO)
logger.propagate = False


def configure_logging(log_path: str | os.PathLike | None = None) -> None:
    logger.handlers.clear()
    formatter = JsonFormatter()
    if log_path:
        path = Path(log_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        handler = logging.FileHandler(path, encoding="utf-8")
    else:
        handler = logging.StreamHandler()
    handler.setFormatter(formatter)
    logger.addHandler(handler)


def load_service_environment(config_path: str | os.PathLike | None = None) -> Path:
    path = Path(config_path or os.getenv("FANOS_SENSOR_CONFIG", DEFAULT_CONFIG_PATH))
    if not path.exists():
        return path
    for raw_line in path.read_text(encoding="utf-8-sig").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()
        if key and key.isidentifier():
            os.environ.setdefault(key, value)
    return path


class BackendClient:
    def __init__(self, backend_url: str, sensor_id: str, token: str):
        self.backend_url = backend_url.rstrip("/")
        self.sensor_id = quote(sensor_id, safe="")
        self.token = token
        self.sensor_id_value = sensor_id

    def request(self, method: str, path: str, payload: dict | None = None):
        data = None if payload is None else json.dumps(payload).encode("utf-8")
        headers = {"X-FANOS-Sensor-Token": self.token}
        if data is not None:
            headers["Content-Type"] = "application/json"
        request = Request(
            f"{self.backend_url}/api/v1/sensors/{self.sensor_id}{path}",
            data=data,
            headers=headers,
            method=method,
        )
        try:
            with urlopen(request, timeout=10) as response:
                body = response.read()
        except HTTPError as exc:
            raise BackendError(f"Backend returned HTTP {exc.code}") from None
        except (URLError, TimeoutError, OSError):
            raise BackendError("Backend is unavailable") from None
        if not body:
            return None
        try:
            return json.loads(body.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            raise BackendError("Backend returned an invalid response") from None

    def next_command(self):
        return self.request("GET", "/commands/next")

    def command_result(self, command_id: str, success: bool, message: str):
        safe_id = quote(command_id, safe="")
        return self.request(
            "POST",
            f"/commands/{safe_id}/result",
            {
                "status": "COMPLETED" if success else "FAILED",
                "message": message[:256],
            },
        )

    def heartbeat(self, state: dict):
        payload = {
            "sensor_id": self.sensor_id_value,
            "desired_state": state["desired_state"],
            "service_status": state["service_status"],
            "suricata_status": state["suricata_status"],
            "collector_status": state["collector_status"],
            "suricata_pid": state.get("suricata_pid"),
            "collector_pid": state.get("collector_pid"),
            "restart_count": state.get("restart_count", 0),
            "last_error": state.get("last_error"),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        return self.request("POST", "/heartbeat", payload)


class SensorManagerProcess:
    def __init__(self, sensor_id: str, backend_url: str):
        state_root = Path(os.getenv("LOCALAPPDATA", str(SENSOR_ROOT / "runtime")))
        safe_sensor_id = re.sub(r"[^A-Za-z0-9_.-]", "_", sensor_id)
        self.status_path = Path(
            os.getenv(
                "FANOS_SENSOR_STATUS_FILE",
                str(state_root / "FANOS" / "Sensor" / safe_sensor_id / "manager-status.json"),
            )
        )
        self.sensor_id = sensor_id
        self.backend_url = backend_url
        self.process: subprocess.Popen | None = None
        self.write_lock = threading.Lock()
        self.log_handle = None

    def start(self):
        environment = os.environ.copy()
        for key in tuple(environment):
            if key.upper() == "FANOS_SENSOR_TOKEN":
                environment.pop(key, None)
        environment["FANOS_SENSOR_ID"] = self.sensor_id
        environment["FANOS_BACKEND_URL"] = self.backend_url
        environment["FANOS_SENSOR_STATUS_FILE"] = str(self.status_path)
        self.status_path.parent.mkdir(parents=True, exist_ok=True)
        manager_log = self.status_path.with_name("sensor-manager.log")
        self.log_handle = manager_log.open("a", encoding="utf-8")
        self.process = subprocess.Popen(
            [sys.executable, "-u", str(SENSOR_ROOT / "sensor_manager.py"), "--service-control"],
            cwd=str(SENSOR_ROOT),
            env=environment,
            stdin=subprocess.PIPE,
            stdout=self.log_handle,
            stderr=subprocess.STDOUT,
            text=True,
            encoding="utf-8",
            bufsize=1,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        )
        logger.info("Sensor Manager started", extra={"sensor_id": self.sensor_id})

    def ensure_running(self):
        if self.process is None or self.process.poll() is not None:
            self.start()
            return True
        return False

    def snapshot(self):
        manager_running = self.process is not None and self.process.poll() is None
        empty_state = {
            "desired_state": "STOPPED",
            "service_status": "ONLINE" if manager_running else "OFFLINE",
            "suricata_status": "OFFLINE",
            "collector_status": "OFFLINE",
            "suricata_pid": None,
            "collector_pid": None,
            "restart_count": 0,
            "last_error": None,
        }
        try:
            state = json.loads(self.status_path.read_text(encoding="utf-8"))
        except (OSError, ValueError, TypeError):
            return empty_state
        for key, value in empty_state.items():
            state.setdefault(key, value)
        if not manager_running:
            state["service_status"] = "OFFLINE"
            state["suricata_status"] = "OFFLINE"
            state["collector_status"] = "OFFLINE"
            state["suricata_pid"] = None
            state["collector_pid"] = None
        return state

    def send(self, command: str) -> bool:
        if command not in ALLOWED_COMMANDS or self.process is None or self.process.poll() is not None:
            return False
        try:
            with self.write_lock:
                self.process.stdin.write(json.dumps({"command": command}) + "\n")
                self.process.stdin.flush()
            return True
        except (OSError, ValueError, AttributeError):
            return False

    def execute(self, command: str) -> tuple[bool, str]:
        if not self.send(command):
            return False, "Sensor Manager is not accepting commands"
        desired = "STOPPED" if command == "STOP" else "RUNNING"
        deadline = time.monotonic() + COMMAND_TIMEOUT_SECONDS
        while time.monotonic() < deadline:
            state = self.snapshot()
            children_stopped = (
                state["suricata_status"] == "OFFLINE"
                and state["collector_status"] in {"OFFLINE", "IDLE"}
            )
            children_running = (
                state["suricata_status"] == "ONLINE"
                and state["collector_status"] == "ONLINE"
            )
            if state["desired_state"] == desired and (children_stopped if desired == "STOPPED" else children_running):
                return True, f"{command} confirmed by Sensor Manager"
            if state.get("last_error"):
                return False, state["last_error"]
            if self.process is None or self.process.poll() is not None:
                return False, "Sensor Manager exited while processing command"
            time.sleep(0.25)
        return False, f"Timed out waiting for {command} health confirmation"

    def close(self):
        if self.process is None or self.process.poll() is not None:
            return
        self.send("STOP")
        try:
            self.process.wait(timeout=25)
        except subprocess.TimeoutExpired:
            logger.error("Sensor Manager did not exit after STOP", extra={"sensor_id": self.sensor_id})
            self.process.terminate()
        finally:
            if self.log_handle is not None:
                self.log_handle.close()
                self.log_handle = None


class SensorServiceWorker:
    def __init__(self, stop_event: threading.Event | None = None):
        self.stop_event = stop_event or threading.Event()

    def run(self):
        sensor_id = os.getenv("FANOS_SENSOR_ID", "demo-sensor-01").strip()
        backend_url = os.getenv("FANOS_BACKEND_URL", "http://127.0.0.1:8000").strip()
        sensor_token = os.getenv("FANOS_SENSOR_TOKEN", "")
        if not sensor_id:
            raise RuntimeError("FANOS_SENSOR_ID is required")
        if not sensor_token:
            raise RuntimeError("FANOS_SENSOR_TOKEN must be set in the service environment")

        client = BackendClient(backend_url, sensor_id, sensor_token)
        manager = SensorManagerProcess(sensor_id, backend_url)
        manager.start()
        logger.info("FANOS Sensor Service started", extra={"sensor_id": sensor_id})
        last_heartbeat = 0.0

        try:
            while not self.stop_event.is_set():
                manager_restarted = manager.ensure_running()
                try:
                    command = client.next_command()
                    if isinstance(command, dict):
                        name = command.get("command")
                        command_id = command.get("command_id")
                        if name not in ALLOWED_COMMANDS or not isinstance(command_id, str):
                            logger.error("Rejected invalid backend command payload", extra={"sensor_id": sensor_id})
                        else:
                            logger.info("Sensor command received", extra={"sensor_id": sensor_id, "command": name})
                            succeeded, message = manager.execute(name)
                            client.command_result(command_id, succeeded, message)
                            logger.info(
                                "Sensor command completed",
                                extra={
                                    "sensor_id": sensor_id,
                                    "command": name,
                                    "status": "COMPLETED" if succeeded else "FAILED",
                                },
                            )
                            last_heartbeat = 0
                except BackendError as exc:
                    logger.warning(str(exc), extra={"sensor_id": sensor_id})

                now = time.monotonic()
                if now >= last_heartbeat or manager_restarted:
                    state = manager.snapshot()
                    try:
                        response = client.heartbeat(state)
                        last_heartbeat = now + HEARTBEAT_SECONDS
                        desired = response.get("desired_state") if isinstance(response, dict) else None
                        if desired in {"RUNNING", "STOPPED"} and desired != state["desired_state"]:
                            command = "START" if desired == "RUNNING" else "STOP"
                            logger.info(
                                "Reconciling manager to backend desired state",
                                extra={"sensor_id": sensor_id, "command": command},
                            )
                            manager.execute(command)
                            last_heartbeat = 0
                    except BackendError as exc:
                        logger.warning(str(exc), extra={"sensor_id": sensor_id})
                        last_heartbeat = now + HEARTBEAT_SECONDS

                self.stop_event.wait(POLL_SECONDS)
        finally:
            logger.info("FANOS Sensor Service stopping", extra={"sensor_id": sensor_id})
            manager.close()


def run(stop_event: threading.Event | None = None):
    load_service_environment()
    configure_logging(os.getenv("FANOS_SENSOR_LOG", ""))
    SensorServiceWorker(stop_event).run()


def run_foreground():
    load_service_environment()
    configure_logging(os.getenv("FANOS_SENSOR_LOG", ""))
    SensorServiceWorker().run()


def _run_legacy():
    sensor_id = os.getenv("FANOS_SENSOR_ID", "demo-sensor-01").strip()
    backend_url = os.getenv("FANOS_BACKEND_URL", "http://127.0.0.1:8000").strip()
    sensor_token = os.getenv("FANOS_SENSOR_TOKEN", "")
    if not sensor_id:
        raise RuntimeError("FANOS_SENSOR_ID is required")
    if not sensor_token:
        raise RuntimeError("FANOS_SENSOR_TOKEN must be set in the service environment")

    client = BackendClient(backend_url, sensor_id, sensor_token)
    manager = SensorManagerProcess(sensor_id, backend_url)
    manager.start()
    logger.info("FANOS Sensor Service started", extra={"sensor_id": sensor_id})
    last_heartbeat = 0.0

    try:
        while True:
            manager_restarted = manager.ensure_running()
            try:
                command = client.next_command()
                if isinstance(command, dict):
                    name = command.get("command")
                    command_id = command.get("command_id")
                    if name not in ALLOWED_COMMANDS or not isinstance(command_id, str):
                        logger.error("Rejected invalid backend command payload", extra={"sensor_id": sensor_id})
                    else:
                        logger.info("Sensor command received", extra={"sensor_id": sensor_id, "command": name})
                        succeeded, message = manager.execute(name)
                        client.command_result(command_id, succeeded, message)
                        logger.info(
                            "Sensor command completed",
                            extra={
                                "sensor_id": sensor_id,
                                "command": name,
                                "status": "COMPLETED" if succeeded else "FAILED",
                            },
                        )
                        last_heartbeat = 0
            except BackendError as exc:
                logger.warning(str(exc), extra={"sensor_id": sensor_id})

            now = time.monotonic()
            if now >= last_heartbeat or manager_restarted:
                state = manager.snapshot()
                try:
                    response = client.heartbeat(state)
                    last_heartbeat = now + HEARTBEAT_SECONDS
                    desired = response.get("desired_state") if isinstance(response, dict) else None
                    if desired in {"RUNNING", "STOPPED"} and desired != state["desired_state"]:
                        command = "START" if desired == "RUNNING" else "STOP"
                        logger.info(
                            "Reconciling manager to backend desired state",
                            extra={"sensor_id": sensor_id, "command": command},
                        )
                        manager.execute(command)
                        last_heartbeat = 0
                except BackendError as exc:
                    logger.warning(str(exc), extra={"sensor_id": sensor_id})
                    last_heartbeat = now + HEARTBEAT_SECONDS

            time.sleep(POLL_SECONDS)
    except KeyboardInterrupt:
        logger.info("FANOS Sensor Service stopping", extra={"sensor_id": sensor_id})
    finally:
        manager.close()


if __name__ == "__main__":
    try:
        run_foreground()
    except RuntimeError as exc:
        logger.error(str(exc))
        raise SystemExit(2)