from pathlib import Path
import argparse
import json
import os
import platform
import queue
import subprocess
import sys
import threading
import time

SENSOR_ROOT = Path(__file__).resolve().parent
LAB_ROOT = SENSOR_ROOT.parent
COLLECTOR_ROOT = LAB_ROOT / "collector"

SURICATA_EXE = Path(os.getenv("SURICATA_EXE", r"C:\Program Files\Suricata\suricata.exe"))
SURICATA_CONFIG = Path(os.getenv("SURICATA_CONFIG", r"C:\Program Files\Suricata\suricata.yaml"))
SURICATA_EVE = Path(os.getenv("SURICATA_EVE_PATH", r"C:\Program Files\Suricata\log\eve.json"))
COLLECTOR_MAIN = COLLECTOR_ROOT / "app" / "main.py"

CAPTURE_INTERFACE = "192.168.56.1"
BACKEND_URL = os.getenv(
    "FANOS_SURICATA_URL",
    f"{os.getenv('FANOS_BACKEND_URL', 'http://127.0.0.1:8000').rstrip('/')}/api/v1/suricata/events",
)
SENSOR_ID = os.getenv("FANOS_SENSOR_ID", "demo-sensor-01")
CAPTURE_INTERFACE = os.getenv("FANOS_CAPTURE_INTERFACE", CAPTURE_INTERFACE)

CHECK_INTERVAL = 2
RESTART_DELAY = 3
_CONTROL_EOF = object()


def start_suricata():
    print("Starting Suricata...")

    command = [
        str(SURICATA_EXE),
        "-c",
        str(SURICATA_CONFIG),
        "-i",
        CAPTURE_INTERFACE,
    ]

    process = subprocess.Popen(
        command,
        cwd=str(SURICATA_EXE.parent),
        creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
    )

    print(f"Suricata PID      : {process.pid}")
    return process


def start_collector():
    print("Starting Collector...")

    env = os.environ.copy()

    env["SURICATA_EVE_PATH"] = str(SURICATA_EVE)
    env["FANOS_SURICATA_URL"] = BACKEND_URL
    env["FANOS_SURICATA_TOKEN"] = os.getenv(
        "FANOS_SURICATA_TOKEN", os.getenv("SURICATA_INGEST_TOKEN", "")
    )
    env["SURICATA_SENSOR_ID"] = SENSOR_ID

    process = subprocess.Popen(
        [sys.executable, "-m", "app.main"],
        cwd=str(COLLECTOR_ROOT),
        env=env,
        creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
    )

    print(f"Collector PID     : {process.pid}")
    return process


def stop_process(process, name):
    if process and process.poll() is None:
        print(f"Stopping {name}...")

        process.terminate()

        try:
            process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            print(f"{name} did not stop gracefully. Killing...")
            process.kill()

    print(f"{name}          : STOPPED")


def _write_control_status(state, status_path):
    status_path = Path(status_path)
    status_path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "desired_state": state["desired_state"],
        "service_status": state["service_status"],
        "suricata_status": state["suricata_status"],
        "collector_status": state["collector_status"],
        "suricata_pid": state["suricata"].pid if state["suricata"] and state["suricata"].poll() is None else None,
        "collector_pid": state["collector"].pid if state["collector"] and state["collector"].poll() is None else None,
        "restart_count": state["restart_count"],
        "last_error": state["last_error"],
        "timestamp": time.time(),
    }
    temporary = status_path.with_suffix(status_path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload), encoding="utf-8")
    temporary.replace(status_path)


def _read_control_commands(commands):
    try:
        for line in sys.stdin:
            try:
                request = json.loads(line)
            except (json.JSONDecodeError, TypeError):
                continue
            command = request.get("command") if isinstance(request, dict) else None
            if command in {"START", "STOP", "RESTART"}:
                commands.put(command)
    finally:
        commands.put(_CONTROL_EOF)


def _start_controlled_component(state, name):
    process_key = "suricata" if name == "Suricata" else "collector"
    status_key = f"{process_key}_status"
    starter = start_suricata if process_key == "suricata" else start_collector
    state[status_key] = "STARTING"
    state["last_error"] = None
    try:
        process = starter()
        time.sleep(2)
        if process.poll() is not None:
            state[process_key] = None
            state[status_key] = "ERROR"
            state["last_error"] = f"{name} exited with code {process.returncode}"
            return False
        state[process_key] = process
        state[status_key] = "ONLINE"
        return True
    except OSError as exc:
        state[process_key] = None
        state[status_key] = "ERROR"
        state["last_error"] = f"Could not start {name}: {exc.__class__.__name__}"
        return False


def _start_controlled_services(state, retries):
    if state["suricata"] is None:
        started = _start_controlled_component(state, "Suricata")
        retries["suricata"] = 0 if started else time.monotonic() + RESTART_DELAY
    if state["suricata"] is not None and state["collector"] is None:
        started = _start_controlled_component(state, "Collector")
        retries["collector"] = 0 if started else time.monotonic() + RESTART_DELAY


def _stop_controlled_services(state, retries):
    state["service_status"] = "ONLINE"
    state["suricata_status"] = "STOPPING"
    state["collector_status"] = "STOPPING"
    retries["suricata"] = 0
    retries["collector"] = 0
    stop_process(state["collector"], "Collector")
    stop_process(state["suricata"], "Suricata")
    state["collector"] = None
    state["suricata"] = None
    state["collector_status"] = "OFFLINE"
    state["suricata_status"] = "OFFLINE"
    state["last_error"] = None


def _recover_controlled_services(state, retries):
    if state["desired_state"] != "RUNNING":
        return
    now = time.monotonic()
    for name in ("suricata", "collector"):
        process = state[name]
        if process is not None and process.poll() is not None:
            state[name] = None
            state[f"{name}_status"] = "ERROR"
            state["last_error"] = f"{name.title()} exited with code {process.returncode}"
            retries[name] = now + RESTART_DELAY
            state["restart_count"] += 1
    if state["suricata"] is None and now >= retries["suricata"]:
        _start_controlled_component(state, "Suricata")
        retries["suricata"] = time.monotonic() + RESTART_DELAY if state["suricata"] is None else 0
    if state["suricata"] is not None and state["collector"] is None and now >= retries["collector"]:
        _start_controlled_component(state, "Collector")
        retries["collector"] = time.monotonic() + RESTART_DELAY if state["collector"] is None else 0


def controlled_main():
    status_path = os.getenv(
        "FANOS_SENSOR_STATUS_FILE",
        str(SENSOR_ROOT / "runtime" / "manager-status.json"),
    )
    state = {
        "desired_state": "STOPPED",
        "service_status": "ONLINE",
        "suricata_status": "OFFLINE",
        "collector_status": "OFFLINE",
        "suricata": None,
        "collector": None,
        "restart_count": 0,
        "last_error": None,
    }
    retries = {"suricata": 0, "collector": 0}
    commands = queue.Queue()
    threading.Thread(target=_read_control_commands, args=(commands,), daemon=True).start()
    _write_control_status(state, status_path)
    print(f"Controlled Sensor Manager ready for {SENSOR_ID}")

    try:
        while True:
            try:
                command = commands.get(timeout=CHECK_INTERVAL)
            except queue.Empty:
                command = None

            if command is _CONTROL_EOF:
                break
            if command == "STOP":
                state["desired_state"] = "STOPPED"
                _stop_controlled_services(state, retries)
            elif command == "START":
                state["desired_state"] = "RUNNING"
                _start_controlled_services(state, retries)
            elif command == "RESTART":
                state["desired_state"] = "RUNNING"
                _stop_controlled_services(state, retries)
                state["suricata_status"] = "STARTING"
                state["collector_status"] = "STARTING"
                _start_controlled_services(state, retries)

            _recover_controlled_services(state, retries)
            _write_control_status(state, status_path)
    except KeyboardInterrupt:
        pass
    finally:
        state["desired_state"] = "STOPPED"
        _stop_controlled_services(state, retries)
        state["service_status"] = "OFFLINE"
        _write_control_status(state, status_path)
    return 0


def main():
    print("=" * 60)
    print("FANOS SENSOR MANAGER")
    print("=" * 60)

    print(f"Platform          : {platform.system()} {platform.release()}")
    print(f"Python            : {sys.version.split()[0]}")
    print(f"Sensor            : {SENSOR_ROOT}")
    print(f"Suricata          : {SURICATA_EXE}")
    print(f"Suricata Config   : {SURICATA_CONFIG}")
    print(f"EVE JSON          : {SURICATA_EVE}")
    print(f"Collector         : {COLLECTOR_MAIN}")
    print(f"Capture Interface : {CAPTURE_INTERFACE}")
    print(f"Backend URL       : {BACKEND_URL}")
    print("-" * 60)

    if not SURICATA_EXE.exists():
        print("ERROR: Suricata executable not found")
        return 1

    if not SURICATA_CONFIG.exists():
        print("ERROR: Suricata configuration not found")
        return 1

    if not SURICATA_EVE.parent.exists():
        print("ERROR: Suricata log directory not found")
        return 1

    if not COLLECTOR_MAIN.exists():
        print("ERROR: Collector application not found")
        return 1

    print("Suricata          : OK")
    print("Configuration     : OK")
    print("EVE directory     : OK")
    print("Collector         : OK")
    print()

    suricata = None
    collector = None

    try:
        suricata = start_suricata()

        time.sleep(3)

        if suricata.poll() is not None:
            print(f"ERROR: Suricata failed with exit code {suricata.returncode}")
            return 1

        print("Suricata          : RUNNING")
        print()

        collector = start_collector()

        time.sleep(3)

        if collector.poll() is not None:
            print(f"ERROR: Collector failed with exit code {collector.returncode}")
            stop_process(suricata, "Suricata")
            return 1

        print("Collector         : RUNNING")
        print()
        print("Sensor Manager    : RUNNING")
        print("Auto-Recovery     : ENABLED")
        print("=" * 60)

        while True:

            # -------------------------------------------------
            # SURICATA HEALTH CHECK
            # -------------------------------------------------
            if suricata.poll() is not None:

                exit_code = suricata.returncode

                print()
                print("WARNING: Suricata stopped.")
                print(f"Exit code         : {exit_code}")
                print("Auto-Recovery     : Restarting Suricata...")

                time.sleep(RESTART_DELAY)

                suricata = start_suricata()

                time.sleep(3)

                if suricata.poll() is None:
                    print("Suricata          : RECOVERED")
                else:
                    print(
                        "ERROR: Suricata restart failed "
                        f"(exit code {suricata.returncode})"
                    )

            # -------------------------------------------------
            # COLLECTOR HEALTH CHECK
            # -------------------------------------------------
            if collector.poll() is not None:

                exit_code = collector.returncode

                print()
                print("WARNING: Collector stopped.")
                print(f"Exit code         : {exit_code}")
                print("Auto-Recovery     : Restarting Collector...")

                time.sleep(RESTART_DELAY)

                collector = start_collector()

                time.sleep(3)

                if collector.poll() is None:
                    print("Collector         : RECOVERED")
                else:
                    print(
                        "ERROR: Collector restart failed "
                        f"(exit code {collector.returncode})"
                    )

            time.sleep(CHECK_INTERVAL)

    except KeyboardInterrupt:
        print()
        print("Stopping FANOS Sensor...")

    finally:
        stop_process(collector, "Collector")
        stop_process(suricata, "Suricata")

    print("Sensor Manager    : STOPPED")
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--service-control", action="store_true")
    options = parser.parse_args()
    raise SystemExit(controlled_main() if options.service_control else main())
