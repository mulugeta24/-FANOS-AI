"""
Prevention API — blocked IPs, sessions, WAF, prevention status.
"""
import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query, status

from app.schemas.security import (
    BlockIPRequest,
    BlockedIPOut,
    PreventionStatus,
    ResponseActionOut,
)

router = APIRouter(prefix="/prevention", tags=["Prevention"])


def _ts(mins: int) -> datetime:
    return datetime.now(timezone.utc) - timedelta(minutes=mins)


# ── In-memory store (replace with DB in production) ────────────
_blocked_ips: List[BlockedIPOut] = [
    BlockedIPOut(id=uuid.uuid4(), ip_address="192.168.56.10", reason="SQL Injection",   blocked_by="FANOS AI", is_active=True, created_at=_ts(2)),
    BlockedIPOut(id=uuid.uuid4(), ip_address="192.168.56.21", reason="Brute Force",     blocked_by="FANOS AI", is_active=True, created_at=_ts(8)),
    BlockedIPOut(id=uuid.uuid4(), ip_address="192.168.56.31", reason="Port Scan",       blocked_by="FANOS AI", is_active=True, created_at=_ts(15)),
    BlockedIPOut(id=uuid.uuid4(), ip_address="172.16.0.88",   reason="Cmd Injection",   blocked_by="FANOS AI", is_active=True, created_at=_ts(20)),
    BlockedIPOut(id=uuid.uuid4(), ip_address="10.0.0.44",     reason="XSS",             blocked_by="FANOS AI", is_active=True, created_at=_ts(17)),
]

_response_actions: List[ResponseActionOut] = [
    ResponseActionOut(id=uuid.uuid4(), action="Blocked IP",          target="192.168.56.10",   reason="SQL Injection",   automated=True, created_at=_ts(2)),
    ResponseActionOut(id=uuid.uuid4(), action="Blocked Session",     target="Session #84921",  reason="Brute Force",     automated=True, created_at=_ts(5)),
    ResponseActionOut(id=uuid.uuid4(), action="WAF Rule Triggered",  target="Rule CRS-942100", reason="SQL Injection",   automated=True, created_at=_ts(8)),
    ResponseActionOut(id=uuid.uuid4(), action="Firewall Rule Added", target="192.168.56.31",   reason="Port Scan",       automated=True, created_at=_ts(12)),
    ResponseActionOut(id=uuid.uuid4(), action="Blocked IP",          target="172.16.0.88",     reason="Cmd Injection",   automated=True, created_at=_ts(20)),
]


@router.get("/status", response_model=PreventionStatus)
async def get_prevention_status() -> PreventionStatus:
    active = sum(1 for ip in _blocked_ips if ip.is_active)
    return PreventionStatus(
        active_blocking=True,
        blocked_ips=active,
        blocked_sessions=23,
        waf_blocks=47,
        firewall_actions=31,
        auto_response=True,
    )


@router.get("/blocked-ips", response_model=List[BlockedIPOut])
async def get_blocked_ips(
    active_only: bool = Query(default=True),
    limit: int = Query(default=50, le=500),
) -> List[BlockedIPOut]:
    ips = _blocked_ips if not active_only else [i for i in _blocked_ips if i.is_active]
    return ips[:limit]


@router.post("/blocked-ips", response_model=BlockedIPOut, status_code=status.HTTP_201_CREATED)
async def block_ip(body: BlockIPRequest) -> BlockedIPOut:
    # Check for duplicates
    for ip in _blocked_ips:
        if ip.ip_address == body.ip_address and ip.is_active:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"{body.ip_address} is already blocked.",
            )
    entry = BlockedIPOut(
        id=uuid.uuid4(),
        ip_address=body.ip_address,
        reason=body.reason,
        blocked_by="SOC Operator",
        is_active=True,
        created_at=datetime.now(timezone.utc),
    )
    _blocked_ips.append(entry)
    return entry


@router.delete("/blocked-ips/{ip_address}", status_code=status.HTTP_204_NO_CONTENT)
async def unblock_ip(ip_address: str) -> None:
    for ip in _blocked_ips:
        if ip.ip_address == ip_address and ip.is_active:
            ip.is_active = False
            return
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="IP not found or already unblocked.")


@router.get("/actions", response_model=List[ResponseActionOut])
async def get_response_actions(
    limit: int = Query(default=10, le=100),
) -> List[ResponseActionOut]:
    return sorted(_response_actions, key=lambda a: a.created_at, reverse=True)[:limit]
