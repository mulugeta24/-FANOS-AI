"""Backend-only FANOS sensor lifecycle control API.

This phase stores desired state changes and command records, but it does not
trigger direct Suricata process execution. Actual process control is delegated
to the sensor service in the next phase.
"""
from __future__ import annotations

import hmac
from datetime import datetime, timedelta, timezone
from typing import Literal, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import Principal, get_current_principal, require_admin
from app.core.config import get_settings
from app.db.base import get_async_session
from app.models.security import SensorAuditLog, SensorCommand, SensorLifecycle

router = APIRouter(prefix="/sensors", tags=["Sensors"])
settings = get_settings()
HEARTBEAT_STALE_AFTER_SECONDS = 30


class SensorStatusResponse(BaseModel):
    sensor_id: str
    desired_state: str
    status: str
    suricata_status: str
    collector_status: str
    service_status: str
    last_heartbeat: Optional[datetime] = None
    last_seen: Optional[datetime] = None
    restart_count: int = 0
    last_error: Optional[str] = None
    message: Optional[str] = None


class SensorCommandResponse(BaseModel):
    sensor_id: str
    command: str
    desired_state: str
    status: str
    message: str


class SensorCommandDelivery(BaseModel):
    command_id: str
    command: Literal["START", "STOP", "RESTART"]
    desired_state: Literal["RUNNING", "STOPPED"]


class SensorCommandResult(BaseModel):
    status: Literal["COMPLETED", "FAILED"]
    message: str = Field(default="", max_length=256)


class SensorHeartbeat(BaseModel):
    sensor_id: str = Field(min_length=1, max_length=128)
    desired_state: Literal["RUNNING", "STOPPED"]
    service_status: Literal["ONLINE", "OFFLINE", "ERROR"]
    suricata_status: Literal["STARTING", "ONLINE", "STOPPING", "OFFLINE", "ERROR"]
    collector_status: Literal["STARTING", "ONLINE", "STOPPING", "OFFLINE", "ERROR", "IDLE"]
    timestamp: datetime
    suricata_pid: Optional[int] = None
    collector_pid: Optional[int] = None
    restart_count: int = Field(default=0, ge=0)
    last_error: Optional[str] = Field(default=None, max_length=2000)


class SensorHeartbeatResponse(BaseModel):
    sensor_id: str
    desired_state: str
    status: str


def require_sensor_service(
    token: Optional[str] = Header(default=None, alias="X-FANOS-Sensor-Token"),
) -> None:
    expected = settings.FANOS_SENSOR_TOKEN
    if not expected:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Sensor service authentication is not configured",
        )
    if not token or not hmac.compare_digest(token, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid sensor service credentials",
        )


async def _get_sensor_lifecycle(
    sensor_id: str,
    session: AsyncSession,
) -> SensorLifecycle:
    result = await session.execute(
        select(SensorLifecycle).where(SensorLifecycle.sensor_id == sensor_id).limit(1)
    )
    lifecycle = result.scalar_one_or_none()
    if lifecycle is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sensor not found")
    return lifecycle


def _normalize_desired_state(value: Optional[str]) -> str:
    if value is None:
        return "STOPPED"
    return str(value).upper()


@router.get("/{sensor_id}/status", response_model=SensorStatusResponse)
async def get_sensor_status(
    sensor_id: str,
    principal: Principal = Depends(get_current_principal),
    session: AsyncSession = Depends(get_async_session),
):
    del principal
    lifecycle = await _get_sensor_lifecycle(sensor_id, session)
    heartbeat_stale = (
        lifecycle.last_heartbeat is None
        or lifecycle.last_heartbeat
        < datetime.now(timezone.utc) - timedelta(seconds=HEARTBEAT_STALE_AFTER_SECONDS)
    )
    return SensorStatusResponse(
        sensor_id=lifecycle.sensor_id,
        desired_state=lifecycle.desired_state,
        status="OFFLINE" if heartbeat_stale else lifecycle.status,
        suricata_status=lifecycle.suricata_status,
        collector_status=lifecycle.collector_status,
        service_status="OFFLINE" if heartbeat_stale else lifecycle.service_status,
        last_heartbeat=lifecycle.last_heartbeat,
        last_seen=lifecycle.last_seen,
        restart_count=lifecycle.restart_count,
        last_error=lifecycle.last_error,
        message="Sensor lifecycle state retrieved",
    )


@router.post("/{sensor_id}/start", response_model=SensorCommandResponse)
async def start_sensor(
    sensor_id: str,
    _: Principal = Depends(require_admin),
    session: AsyncSession = Depends(get_async_session),
):
    lifecycle = await _get_sensor_lifecycle(sensor_id, session)
    if lifecycle.desired_state == "REVOKED":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sensor is revoked and cannot be started")

    previous_state = lifecycle.desired_state
    lifecycle.desired_state = "RUNNING"
    lifecycle.status = "STARTING"
    lifecycle.service_status = "STARTING"
    lifecycle.suricata_status = "STARTING"
    lifecycle.collector_status = "STARTING"
    lifecycle.last_seen = datetime.now(timezone.utc)

    command = SensorCommand(
        sensor_id=lifecycle.sensor_id,
        command="START",
        requested_by="admin",
        status="PENDING",
        result="accepted",
    )
    session.add(command)

    log_entry = SensorAuditLog(
        sensor_id=lifecycle.sensor_id,
        admin_user="admin",
        action="ADMIN_START_SENSOR",
        previous_desired_state=previous_state,
        new_desired_state="RUNNING",
        result="ACCEPTED",
        details="Sensor start command accepted by backend; actual Suricata process control occurs in the sensor service phase.",
    )
    session.add(log_entry)
    await session.commit()

    return SensorCommandResponse(
        sensor_id=lifecycle.sensor_id,
        command="START",
        desired_state=lifecycle.desired_state,
        status=lifecycle.status,
        message="Sensor start command accepted",
    )


@router.post("/{sensor_id}/stop", response_model=SensorCommandResponse)
async def stop_sensor(
    sensor_id: str,
    _: Principal = Depends(require_admin),
    session: AsyncSession = Depends(get_async_session),
):
    lifecycle = await _get_sensor_lifecycle(sensor_id, session)
    previous_state = lifecycle.desired_state
    lifecycle.desired_state = "STOPPED"
    lifecycle.status = "STOPPING"
    lifecycle.service_status = "STOPPING"
    lifecycle.suricata_status = "STOPPING"
    lifecycle.collector_status = "STOPPING"
    lifecycle.last_seen = datetime.now(timezone.utc)

    command = SensorCommand(
        sensor_id=lifecycle.sensor_id,
        command="STOP",
        requested_by="admin",
        status="PENDING",
        result="accepted",
    )
    session.add(command)

    log_entry = SensorAuditLog(
        sensor_id=lifecycle.sensor_id,
        admin_user="admin",
        action="ADMIN_STOP_SENSOR",
        previous_desired_state=previous_state,
        new_desired_state="STOPPED",
        result="ACCEPTED",
        details="Sensor stop command accepted by backend; actual Suricata process control occurs in the sensor service phase.",
    )
    session.add(log_entry)
    await session.commit()

    return SensorCommandResponse(
        sensor_id=lifecycle.sensor_id,
        command="STOP",
        desired_state=lifecycle.desired_state,
        status=lifecycle.status,
        message="Sensor stop command accepted",
    )


@router.post("/{sensor_id}/restart", response_model=SensorCommandResponse)
async def restart_sensor(
    sensor_id: str,
    _: Principal = Depends(require_admin),
    session: AsyncSession = Depends(get_async_session),
):
    lifecycle = await _get_sensor_lifecycle(sensor_id, session)
    if lifecycle.desired_state == "REVOKED":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sensor is revoked and cannot be restarted")

    previous_state = lifecycle.desired_state
    lifecycle.desired_state = "RUNNING"
    lifecycle.status = "STARTING"
    lifecycle.service_status = "STARTING"
    lifecycle.suricata_status = "STARTING"
    lifecycle.collector_status = "STARTING"
    lifecycle.last_seen = datetime.now(timezone.utc)

    command = SensorCommand(
        sensor_id=lifecycle.sensor_id,
        command="RESTART",
        requested_by="admin",
        status="PENDING",
        result="accepted",
    )
    session.add(command)

    log_entry = SensorAuditLog(
        sensor_id=lifecycle.sensor_id,
        admin_user="admin",
        action="ADMIN_RESTART_SENSOR",
        previous_desired_state=previous_state,
        new_desired_state="RUNNING",
        result="ACCEPTED",
        details="Sensor restart command accepted by backend; actual Suricata process control occurs in the sensor service phase.",
    )
    session.add(log_entry)
    await session.commit()

    return SensorCommandResponse(
        sensor_id=lifecycle.sensor_id,
        command="RESTART",
        desired_state=lifecycle.desired_state,
        status=lifecycle.status,
        message="Sensor restart command accepted",
    )


@router.get(
    "/{sensor_id}/commands/next",
    response_model=Optional[SensorCommandDelivery],
)
async def get_next_sensor_command(
    sensor_id: str,
    _: None = Depends(require_sensor_service),
    session: AsyncSession = Depends(get_async_session),
):
    await _get_sensor_lifecycle(sensor_id, session)
    now = datetime.now(timezone.utc)
    result = await session.execute(
        select(SensorCommand)
        .where(
            SensorCommand.sensor_id == sensor_id,
            SensorCommand.command.in_(("START", "STOP", "RESTART")),
            or_(
                SensorCommand.status == "PENDING",
                and_(
                    SensorCommand.status == "PROCESSING",
                    SensorCommand.processed_at < now - timedelta(minutes=2),
                ),
            ),
        )
        .order_by(SensorCommand.created_at, SensorCommand.id)
        .with_for_update(skip_locked=True)
        .limit(1)
    )
    command = result.scalar_one_or_none()
    if command is None:
        return None

    command.status = "PROCESSING"
    command.processed_at = now
    await session.commit()
    return SensorCommandDelivery(
        command_id=str(command.id),
        command=command.command,
        desired_state="STOPPED" if command.command == "STOP" else "RUNNING",
    )


@router.post(
    "/{sensor_id}/commands/{command_id}/result",
    response_model=SensorHeartbeatResponse,
)
async def report_sensor_command_result(
    sensor_id: str,
    command_id: UUID,
    body: SensorCommandResult,
    _: None = Depends(require_sensor_service),
    session: AsyncSession = Depends(get_async_session),
):
    lifecycle = await _get_sensor_lifecycle(sensor_id, session)
    result = await session.execute(
        select(SensorCommand).where(
            SensorCommand.id == command_id,
            SensorCommand.sensor_id == sensor_id,
            SensorCommand.status == "PROCESSING",
        )
    )
    command = result.scalar_one_or_none()
    if command is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sensor command not found")

    command.status = body.status
    command.result = body.message
    command.processed_at = datetime.now(timezone.utc)
    if body.status == "FAILED":
        lifecycle.status = "ERROR"
        lifecycle.last_error = body.message or "Sensor command failed"
    await session.commit()
    return SensorHeartbeatResponse(
        sensor_id=sensor_id,
        desired_state=lifecycle.desired_state,
        status=lifecycle.status,
    )


@router.post(
    "/{sensor_id}/heartbeat",
    response_model=SensorHeartbeatResponse,
)
async def report_sensor_heartbeat(
    sensor_id: str,
    body: SensorHeartbeat,
    _: None = Depends(require_sensor_service),
    session: AsyncSession = Depends(get_async_session),
):
    if body.sensor_id != sensor_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Sensor ID does not match request path")

    lifecycle = await _get_sensor_lifecycle(sensor_id, session)
    lifecycle.service_status = body.service_status
    lifecycle.suricata_status = body.suricata_status
    lifecycle.collector_status = body.collector_status
    lifecycle.suricata_pid = body.suricata_pid
    lifecycle.collector_pid = body.collector_pid
    lifecycle.restart_count = body.restart_count
    lifecycle.last_heartbeat = datetime.now(timezone.utc)
    lifecycle.last_seen = lifecycle.last_heartbeat
    lifecycle.last_error = body.last_error

    component_error = body.service_status == "ERROR" or any(
        component == "ERROR"
        for component in (body.suricata_status, body.collector_status)
    )
    if component_error:
        lifecycle.status = "ERROR"
    elif lifecycle.desired_state == "RUNNING":
        lifecycle.status = (
            "ONLINE"
            if body.service_status == "ONLINE"
            and body.suricata_status == "ONLINE"
            and body.collector_status == "ONLINE"
            else "STARTING"
        )
    else:
        lifecycle.status = (
            "OFFLINE"
            if body.suricata_status == "OFFLINE"
            and body.collector_status in {"OFFLINE", "IDLE"}
            else "STOPPING"
        )

    await session.commit()
    return SensorHeartbeatResponse(
        sensor_id=sensor_id,
        desired_state=lifecycle.desired_state,
        status=lifecycle.status,
    )
