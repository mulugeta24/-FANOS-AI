"""
Domain management and onboarding API endpoints.
Provides domain registration, DNS verification, origin health probes, and domain-specific policies.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import get_db
from app.waf.models import User
from app.waf.schemas.domain import (
    AttackSimulationRequest,
    AttackSimulationResponse,
    DomainCreate,
    DomainOut,
    DomainUpdate,
    DomainVerifyRequest,
    DomainVerifyResponse,
    LabCatalogItem,
    OriginHealthOut,
    TrafficTestResponse,
)
from app.waf.schemas.event import PaginatedEvents
from app.waf.security.auth import get_current_user
from app.waf.services.domain_service import domain_service
from app.waf.services.event_service import event_service

router = APIRouter(prefix="/domains", tags=["Domain Management"])


@router.get("", response_model=List[DomainOut])
async def list_domains(
    tenant_id: Optional[str] = Query(None, description="Filter by tenant ID"),
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lists all registered domains within the user's organization."""
    # Organization/tenant scoping
    if current_user.role == "admin":
        effective_tenant = None if tenant_id in (None, "all") else tenant_id
    else:
        effective_tenant = getattr(current_user, "tenant_id", None) or "org-default"
    return await domain_service.list_domains(session=session, tenant_id=effective_tenant)


@router.post("", response_model=DomainOut, status_code=status.HTTP_201_CREATED)
async def create_domain(
    data: DomainCreate,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Registers a new website / domain to be protected by FANOS WAF."""
    tenant_id = getattr(current_user, "tenant_id", "org-default") or "org-default"
    try:
        return await domain_service.create_domain(
            data=data,
            tenant_id=tenant_id,
            session=session,
            username=current_user.username,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/lab-catalog", response_model=List[LabCatalogItem])
async def get_lab_catalog(
    current_user: User = Depends(get_current_user),
):
    """Provides pre-configured demo training targets allowlisted for local lab environments."""
    return domain_service.get_lab_catalog()


@router.get("/{domain_id}", response_model=DomainOut)
async def get_domain(
    domain_id: str,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieves detailed configuration and DNS verification instructions for a domain."""
    domain = await domain_service.get_domain_out(domain_id, session)
    if not domain:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Domain not found.")
    if current_user.role != "admin" and domain.tenant_id != getattr(current_user, "tenant_id", None):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Domain not found.")
    return domain


@router.post("/{domain_id}/verify", response_model=DomainVerifyResponse)
async def verify_domain(
    domain_id: str,
    payload: DomainVerifyRequest = DomainVerifyRequest(),
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Triggers DNS TXT ownership verification for the domain.
    Expected DNS record: _fanos-waf-challenge.<domain>
    """
    if current_user.role != "admin":
        existing = await domain_service.get_domain(domain_id, session)
        if not existing or (existing.tenant_id != getattr(current_user, "tenant_id", None)):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Domain not found.")

    try:
        verified, message, verified_at = await domain_service.verify_domain(
            domain_id=domain_id,
            simulation_mode=payload.simulation_mode,
            session=session,
            username=current_user.username,
        )
        domain = await domain_service.get_domain(domain_id, session)
        return DomainVerifyResponse(
            domain_id=domain_id,
            domain_name=domain.domain_name if domain else "",
            verified=verified,
            verification_status="verified" if verified else "failed",
            message=message,
            verified_at=verified_at,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.patch("/{domain_id}", response_model=DomainOut)
async def update_domain(
    domain_id: str,
    updates: DomainUpdate,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Updates origin server URL, enforcement mode (monitor/block), or activation status."""
    if current_user.role != "admin":
        existing = await domain_service.get_domain(domain_id, session)
        if not existing or (existing.tenant_id != getattr(current_user, "tenant_id", None)):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Domain not found.")

    try:
        return await domain_service.update_domain(
            domain_id=domain_id,
            updates=updates,
            session=session,
            username=current_user.username,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/{domain_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_domain(
    domain_id: str,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Removes a registered domain configuration from FANOS WAF."""
    if current_user.role != "admin":
        existing = await domain_service.get_domain(domain_id, session)
        if not existing or (existing.tenant_id != getattr(current_user, "tenant_id", None)):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Domain not found.")

    try:
        await domain_service.delete_domain(domain_id=domain_id, session=session, username=current_user.username)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/{domain_id}/health", response_model=OriginHealthOut)
async def check_origin_health(
    domain_id: str,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Performs an active connectivity and latency probe against the domain's upstream origin."""
    if current_user.role != "admin":
        existing = await domain_service.get_domain(domain_id, session)
        if not existing or (existing.tenant_id != getattr(current_user, "tenant_id", None)):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Domain not found.")

    try:
        return await domain_service.check_origin_health(domain_id=domain_id, session=session)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/{domain_id}/events", response_model=PaginatedEvents)
async def get_domain_events(
    domain_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    decision: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    min_risk: Optional[int] = Query(None, ge=0, le=100),
    search: Optional[str] = Query(None),
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieves security events specifically logged for this domain."""
    effective_tenant = None if current_user.role == "admin" else getattr(current_user, "tenant_id", None)
    if current_user.role != "admin":
        existing = await domain_service.get_domain(domain_id, session)
        if not existing or (existing.tenant_id != effective_tenant):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Domain not found.")

    return await event_service.get_events(
        session=session,
        page=page,
        limit=limit,
        decision=decision,
        action=action,
        domain_id=domain_id,
        tenant_id=effective_tenant,
        min_risk=min_risk,
        search=search,
    )


@router.post("/{domain_id}/traffic-test", response_model=TrafficTestResponse)
async def run_domain_traffic_test(
    domain_id: str,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Executes a real non-destructive end-to-end HTTP traffic test through the reverse proxy pipeline.
    Verifies that the origin responds cleanly and unlocks the PROTECTION_ACTIVE status.
    """
    if current_user.role != "admin":
        existing = await domain_service.get_domain(domain_id, session)
        if not existing or (existing.tenant_id != getattr(current_user, "tenant_id", None)):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Domain not found.")

    try:
        return await domain_service.run_traffic_test(domain_id=domain_id, session=session, username=current_user.username)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/{domain_id}/simulate-attack", response_model=AttackSimulationResponse)
async def simulate_attack_on_domain(
    domain_id: str,
    payload: AttackSimulationRequest = AttackSimulationRequest(),
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Executes predefined, safe, non-destructive security test vectors against an authorized target.
    Verifies that the WAF blocks malicious attacks before they reach the origin in BLOCK mode,
    and logs real detection events tagged as is_test=True.
    """
    if current_user.role != "admin":
        existing = await domain_service.get_domain(domain_id, session)
        if not existing or (existing.tenant_id != getattr(current_user, "tenant_id", None)):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Domain not found.")

    try:
        return await domain_service.run_attack_simulation(
            domain_id=domain_id,
            test_case_ids=payload.test_case_ids,
            confirm_production_authorization=bool(payload.confirm_production_authorization),
            session=session,
            username=current_user.username,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{domain_id}/live-proxy-test", response_model=AttackSimulationResponse)
async def run_live_proxy_test_on_domain(
    domain_id: str,
    payload: AttackSimulationRequest = AttackSimulationRequest(),
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Executes genuine end-to-end live HTTP requests through the active reverse proxy.
    Physically verifies proxy interception, origin audit logs (0 origin requests for blocked attacks),
    and SOC event persistence.
    """
    if current_user.role != "admin":
        existing = await domain_service.get_domain(domain_id, session)
        if not existing or (existing.tenant_id != getattr(current_user, "tenant_id", None)):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Domain not found.")

    try:
        return await domain_service.run_live_proxy_test(
            domain_id=domain_id,
            test_case_ids=payload.test_case_ids,
            confirm_production_authorization=bool(payload.confirm_production_authorization),
            session=session,
            username=current_user.username,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

