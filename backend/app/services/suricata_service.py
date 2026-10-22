"""
Suricata & Telemetry Collector Process Controller Service
=========================================================
Provides direct programmatic control to start, pause, stop, and inspect
the local Suricata engine and the FANOS EVE telemetry collector without
requiring manual terminal commands.
"""
from __future__ import annotations

import json
import logging
import os
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.security import SecurityEvent, SensorLifecycle

logger = logging.getLogger("fanos.services.suricata")
settings = get_settings()

WORKSPACE = Path(r"c:\Fanos Aii")
SURICATA_LAB = WORKSPACE / "suricata-lab"
COLLECTOR_DIR = SURICATA_LAB / "collector"
LOGS_DIR = SURICATA_LAB / "logs"
PID_FILE = SURICATA_LAB / "collector.pid"
STATE_FILE = SURICATA_LAB / "collector-state.json"
COLLECTOR_LOG = LOGS_DIR / "collector.log"
COLLECTOR_ERR_LOG = LOGS_DIR / "collector-error.log"

DEFAULT_SURICATA_EXE = Path(os.getenv("SURICATA_EXE", r"C:\Program Files\Suricata\suricata.exe"))
DEFAULT_SURICATA_CONFIG = Path(os.getenv("SURICATA_CONFIG", r"C:\Program Files\Suricata\suricata.yaml"))
DEFAULT_SURICATA_EVE = Path(os.getenv("SURICATA_EVE_PATH", r"C:\Program Files\Suricata\log\eve.json"))
DEFAULT_INTERFACE = os.getenv("FANOS_CAPTURE_INTERFACE", "192.168.56.1")
DEFAULT_SENSOR_ID = os.getenv("SURICATA_SENSOR_ID", "windows-suricata-01")


def _is_pid_alive(pid: int) -> bool:
    """Check if process with given PID is running on Windows."""
    if not pid or pid <= 0:
        return False
    try:
        res = subprocess.run(
            ["tasklist", "/fi", f"PID eq {pid}", "/fo", "csv", "/nh"],
            capture_output=True,
            text=True,
            timeout=3,
        )
        return str(pid) in res.stdout
    except Exception as exc:
        logger.debug("tasklist PID check error for %s: %s", pid, exc)
        return False


def _find_suricata_process() -> Optional[int]:
    """Find running suricata.exe PID on Windows."""
    try:
        res = subprocess.run(
            ["tasklist", "/fi", "IMAGENAME eq suricata.exe", "/fo", "csv", "/nh"],
            capture_output=True,
            text=True,
            timeout=3,
        )
        for line in res.stdout.splitlines():
            parts = [p.strip(' "') for p in line.split(",")]
            if len(parts) >= 2 and parts[0].lower() == "suricata.exe":
                try:
                    return int(parts[1])
                except ValueError:
                    continue
    except Exception as exc:
        logger.debug("Failed to detect suricata.exe: %s", exc)
    return None


def _find_collector_pid() -> Optional[int]:
    """Read collector PID from file and verify it is running."""
    if not PID_FILE.exists():
        return None
    try:
        content = PID_FILE.read_text(encoding="utf-8").strip()
        pid = int(content)
        if _is_pid_alive(pid):
            return pid
        # Stale PID file
        try:
            PID_FILE.unlink(missing_ok=True)
        except OSError:
            pass
    except Exception:
        pass
    return None


class SuricataProcessService:
    """Manages the lifecycle of Suricata and the EVE JSON Collector."""

    @staticmethod
    async def get_status(session: Optional[AsyncSession] = None) -> Dict[str, Any]:
        """Inspect running state, collector activity, and telemetry metrics."""
        suricata_pid = _find_suricata_process()
        suricata_running = suricata_pid is not None

        collector_pid = _find_collector_pid()
        collector_running = collector_pid is not None

        eve_path = DEFAULT_SURICATA_EVE
        eve_exists = eve_path.exists()
        eve_size_bytes = eve_path.stat().st_size if eve_exists else 0
        eve_mtime = (
            datetime.fromtimestamp(eve_path.stat().st_mtime, timezone.utc).isoformat()
            if eve_exists
            else None
        )

        # Determine overall mode
        if collector_running:
            mode = "LIVE"
        elif suricata_running:
            mode = "PAUSED"
        else:
            mode = "OFFLINE"

        # Query metrics if session is provided
        events_24h = 0
        alerts_24h = 0
        last_event_time = None
        if session:
            try:
                cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
                base = select(func.count(SecurityEvent.id)).where(
                    SecurityEvent.sensor_source.in_(["suricata", "suricata-flow"]),
                    SecurityEvent.created_at >= cutoff,
                )
                events_24h = (await session.execute(base)).scalar() or 0
                alerts_24h = (
                    await session.execute(base.where(SecurityEvent.status == "ALERT"))
                ).scalar() or 0

                latest = (
                    await session.execute(
                        select(SecurityEvent.created_at)
                        .where(SecurityEvent.sensor_source.in_(["suricata", "suricata-flow"]))
                        .order_by(SecurityEvent.created_at.desc())
                        .limit(1)
                    )
                ).scalar_one_or_none()
                if latest:
                    last_event_time = latest.isoformat()
            except Exception as exc:
                logger.warning("Error fetching Suricata event metrics: %s", exc)

        return {
            "mode": mode,
            "is_live": mode == "LIVE",
            "is_paused": mode == "PAUSED",
            "suricata_running": suricata_running,
            "suricata_pid": suricata_pid,
            "collector_running": collector_running,
            "collector_pid": collector_pid,
            "interface": DEFAULT_INTERFACE,
            "sensor_id": DEFAULT_SENSOR_ID,
            "ruleset": "Emerging Threats & FANOS Custom Ruleset v7.0",
            "eve_path": str(eve_path),
            "eve_exists": eve_exists,
            "eve_size_bytes": eve_size_bytes,
            "eve_size_mb": round(eve_size_bytes / (1024 * 1024), 2),
            "eve_last_modified": eve_mtime,
            "events_24h": events_24h,
            "alerts_24h": alerts_24h,
            "last_event_time": last_event_time,
            "message": (
                "Suricata and Collector active (LIVE streaming)"
                if mode == "LIVE"
                else "Collector paused - click OnLive to resume streaming"
                if mode == "PAUSED"
                else "Suricata and Collector offline - click OnLive to start"
            ),
        }

    @staticmethod
    async def start(
        session: Optional[AsyncSession] = None, tail_recent: bool = True
    ) -> Dict[str, Any]:
        """
        Start or resume Suricata and the EVE Telemetry Collector in LIVE mode.
        If Suricata is not running, launches it.
        Then launches the Python collector process in the background.
        """
        LOGS_DIR.mkdir(parents=True, exist_ok=True)

        # 1. Start Suricata if needed
        suricata_pid = _find_suricata_process()
        if not suricata_pid:
            if DEFAULT_SURICATA_EXE.exists() and DEFAULT_SURICATA_CONFIG.exists():
                try:
                    cmd = [
                        str(DEFAULT_SURICATA_EXE),
                        "-c",
                        str(DEFAULT_SURICATA_CONFIG),
                        "-i",
                        DEFAULT_INTERFACE,
                    ]
                    proc = subprocess.Popen(
                        cmd,
                        cwd=str(DEFAULT_SURICATA_EXE.parent),
                        creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
                    )
                    suricata_pid = proc.pid
                    logger.info("Started Suricata engine PID %s", suricata_pid)
                    time.sleep(1)
                except Exception as exc:
                    logger.warning("Could not launch Suricata binary directly: %s", exc)

        # 2. Start Collector if not already running
        collector_pid = _find_collector_pid()
        if not collector_pid:
            py_exe = (
                r"c:\Fanos Aii\backend\.venv\Scripts\python.exe"
                if Path(r"c:\Fanos Aii\backend\.venv\Scripts\python.exe").exists()
                else sys.executable
            )

            env = os.environ.copy()
            env["SURICATA_EVE_PATH"] = str(DEFAULT_SURICATA_EVE)
            env["SURICATA_COLLECTOR_STATE"] = str(STATE_FILE)
            env["SURICATA_SENSOR_ID"] = DEFAULT_SENSOR_ID
            env["FANOS_SURICATA_URL"] = "http://127.0.0.1:8000"
            token = settings.SURICATA_INGEST_TOKEN or os.getenv("FANOS_SURICATA_TOKEN", "")
            env["FANOS_SURICATA_TOKEN"] = token
            env["SURICATA_INGEST_TOKEN"] = token
            env["PYTHONPATH"] = str(COLLECTOR_DIR)
            if tail_recent and not STATE_FILE.exists():
                env["SURICATA_TAIL_ONLY"] = "true"

            try:
                log_out = open(COLLECTOR_LOG, "a", encoding="utf-8")
                log_err = open(COLLECTOR_ERR_LOG, "a", encoding="utf-8")
                proc = subprocess.Popen(
                    [py_exe, "-m", "app.main"],
                    cwd=str(COLLECTOR_DIR),
                    env=env,
                    stdout=log_out,
                    stderr=log_err,
                    creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
                )
                collector_pid = proc.pid
                PID_FILE.write_text(str(collector_pid), encoding="utf-8")
                logger.info("Started Suricata EVE Collector PID %s", collector_pid)
            except Exception as exc:
                logger.error("Failed to start collector: %s", exc)
                return {
                    "success": False,
                    "mode": "ERROR",
                    "error": str(exc),
                    "message": f"Failed to start collector: {exc}",
                }

        # 3. Update DB SensorLifecycle if session provided
        if session:
            try:
                res = await session.execute(
                    select(SensorLifecycle).where(SensorLifecycle.sensor_id == DEFAULT_SENSOR_ID)
                )
                sensor = res.scalar_one_or_none()
                now = datetime.now(timezone.utc)
                if sensor:
                    sensor.desired_state = "RUNNING"
                    sensor.status = "ONLINE"
                    sensor.suricata_status = "ONLINE" if suricata_pid else "OFFLINE"
                    sensor.collector_status = "ONLINE"
                    sensor.last_seen = now
                    sensor.last_heartbeat = now
                else:
                    sensor = SensorLifecycle(
                        sensor_id=DEFAULT_SENSOR_ID,
                        desired_state="RUNNING",
                        status="ONLINE",
                        service_status="ONLINE",
                        suricata_status="ONLINE" if suricata_pid else "OFFLINE",
                        collector_status="ONLINE",
                        last_seen=now,
                        last_heartbeat=now,
                    )
                    session.add(sensor)
                await session.commit()
            except Exception as exc:
                logger.warning("Could not update SensorLifecycle DB: %s", exc)

        return {
            "success": True,
            "mode": "LIVE",
            "is_live": True,
            "suricata_pid": suricata_pid,
            "collector_pid": collector_pid,
            "message": "Suricata and Telemetry Collector started successfully in LIVE mode",
        }

    @staticmethod
    async def pause(session: Optional[AsyncSession] = None) -> Dict[str, Any]:
        """
        Pause telemetry ingestion by terminating the collector process.
        Suricata can stay running in the background while ingestion is paused.
        """
        collector_pid = _find_collector_pid()
        if collector_pid:
            try:
                subprocess.run(
                    ["taskkill", "/f", "/pid", str(collector_pid)],
                    capture_output=True,
                    timeout=5,
                )
            except Exception as exc:
                logger.warning("Error stopping collector PID %s: %s", collector_pid, exc)
            try:
                PID_FILE.unlink(missing_ok=True)
            except OSError:
                pass

        if session:
            try:
                res = await session.execute(
                    select(SensorLifecycle).where(SensorLifecycle.sensor_id == DEFAULT_SENSOR_ID)
                )
                sensor = res.scalar_one_or_none()
                if sensor:
                    sensor.desired_state = "STOPPED"
                    sensor.collector_status = "OFFLINE"
                    sensor.status = "PAUSED"
                    await session.commit()
            except Exception as exc:
                logger.warning("Could not update SensorLifecycle DB on pause: %s", exc)

        return {
            "success": True,
            "mode": "PAUSED",
            "is_live": False,
            "is_paused": True,
            "message": "Suricata Telemetry Collector has been paused (ingestion suspended)",
        }

    @staticmethod
    async def stop(
        session: Optional[AsyncSession] = None, stop_suricata: bool = False
    ) -> Dict[str, Any]:
        """
        Completely stop the Collector (and optionally Suricata process).
        """
        await SuricataProcessService.pause(session)

        suricata_pid = _find_suricata_process()
        if stop_suricata and suricata_pid:
            try:
                subprocess.run(
                    ["taskkill", "/f", "/pid", str(suricata_pid)],
                    capture_output=True,
                    timeout=5,
                )
            except Exception as exc:
                logger.warning("Error killing suricata.exe PID %s: %s", suricata_pid, exc)

        if session:
            try:
                res = await session.execute(
                    select(SensorLifecycle).where(SensorLifecycle.sensor_id == DEFAULT_SENSOR_ID)
                )
                sensor = res.scalar_one_or_none()
                if sensor:
                    sensor.desired_state = "STOPPED"
                    sensor.status = "OFFLINE"
                    sensor.suricata_status = "OFFLINE" if stop_suricata else sensor.suricata_status
                    sensor.collector_status = "OFFLINE"
                    await session.commit()
            except Exception as exc:
                logger.warning("Could not update SensorLifecycle DB on stop: %s", exc)

        return {
            "success": True,
            "mode": "OFFLINE",
            "is_live": False,
            "message": "Suricata and Telemetry Collector are OFFLINE",
        }

    @staticmethod
    def get_logs(limit: int = 80) -> List[str]:
        """Retrieve recent lines from the collector log."""
        if not COLLECTOR_LOG.exists():
            return ["Collector log file not found. Click 'OnLive' to start the collector."]
        try:
            lines = COLLECTOR_LOG.read_text(encoding="utf-8", errors="replace").splitlines()
            return lines[-limit:] if lines else ["Collector log is currently empty."]
        except Exception as exc:
            return [f"Error reading collector log: {exc}"]
