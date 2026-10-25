"""
Admin Service Requests API
Dedicated administrative management for customer security service requests.
Allows SOC administrators to view, filter, review, approve, reject, and track request lifecycles.
"""
from datetime import datetime, timezone
import uuid
import json
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import Principal, require_admin
from app.db.base import get_async_session
from app.models.security import User, Asset, ServiceRequest, RequestAsset, RequestHistory
from app.schemas.customer import (
    ServiceRequestOut,
    ServiceRequestDetailOut,
    RequestAssetOut,
    RequestHistoryOut,
    AdminReviewRequest,
    AdminStatusUpdatePayload,
)

router = APIRouter(prefix="/admin", tags=["Admin Service Requests"])


@router.get("/service-requests", response_model=List[ServiceRequestOut])
async def admin_list_service_requests(
    email: Optional[str] = Query(default=None, description="Filter by customer email"),
    search: Optional[str] = Query(default=None, description="Search by request number, domain, or customer"),
    service: Optional[str] = Query(default=None, description="Filter by service name or category"),
    status: Optional[str] = Query(default=None, description="Filter by request status"),
    admin: Principal = Depends(require_admin),
    session: AsyncSession = Depends(get_async_session),
) -> List[ServiceRequestOut]:
    """
    List all customer service requests across the platform.
    Requires administrator or security analyst credentials.
    Supports multi-parameter filtering: email, search, service, and status.
    """
    query = select(ServiceRequest)

    if email:
        clean_email = email.strip().lower()
        query = query.where(func.lower(ServiceRequest.customer_email).contains(clean_email))

    if search:
        s = f"%{search.strip().lower()}%"
        query = query.where(
            func.lower(ServiceRequest.request_number).like(s)
            | func.lower(ServiceRequest.customer_name).like(s)
            | func.lower(ServiceRequest.username).like(s)
            | func.lower(ServiceRequest.target_spec).like(s)
            | func.lower(ServiceRequest.asset_name).like(s)
        )

    if service:
        srv = f"%{service.strip().lower()}%"
        query = query.where(
            func.lower(ServiceRequest.service_type).like(srv)
            | func.lower(ServiceRequest.service_category).like(srv)
        )

    if status:
        query = query.where(func.lower(ServiceRequest.status) == status.strip().lower())

    query = query.order_by(desc(ServiceRequest.created_at))
    res = await session.execute(query)
    items = list(res.scalars().all())
    return items


@router.get("/service-requests/{request_id}", response_model=ServiceRequestDetailOut)
async def admin_get_service_request(
    request_id: str,
    admin: Principal = Depends(require_admin),
    session: AsyncSession = Depends(get_async_session),
) -> ServiceRequestDetailOut:
    """
    Retrieve single service request details including submitted assets and request history.
    Accessible only by administrators.
    """
    req_obj = None
    try:
        u_id = uuid.UUID(request_id)
        req_obj = await session.get(ServiceRequest, u_id)
    except (ValueError, TypeError):
        pass

    if not req_obj:
        res = await session.execute(
            select(ServiceRequest).where(
                (func.lower(ServiceRequest.request_number) == request_id.strip().lower())
            )
        )
        req_obj = res.scalar_one_or_none()

    if not req_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Service request '{request_id}' not found",
        )

    # Fetch associated assets
    res_assets = await session.execute(
        select(RequestAsset).where(RequestAsset.request_id == req_obj.id).order_by(RequestAsset.created_at.asc())
    )
    assets = list(res_assets.scalars().all())

    # Fetch history
    res_hist = await session.execute(
        select(RequestHistory).where(RequestHistory.request_id == req_obj.id).order_by(RequestHistory.created_at.asc())
    )
    history = list(res_hist.scalars().all())

    # Parse service configuration if available
    service_config = None
    if assets and assets[0].asset_data:
        try:
            service_config = json.loads(assets[0].asset_data)
        except Exception:
            service_config = {"raw": assets[0].asset_data}

    out_data = {
        "id": req_obj.id,
        "request_number": req_obj.request_number,
        "user_id": req_obj.user_id,
        "customer_id": req_obj.customer_id or req_obj.user_id,
        "username": req_obj.username,
        "customer_name": req_obj.customer_name,
        "customer_email": req_obj.customer_email,
        "organization_name": req_obj.organization_name,
        "organization_type": req_obj.organization_type,
        "service_type": req_obj.service_type,
        "service_category": req_obj.service_category,
        "asset_id": req_obj.asset_id,
        "asset_name": req_obj.asset_name,
        "target_spec": req_obj.target_spec,
        "priority": req_obj.priority,
        "status": req_obj.status,
        "request_type": req_obj.request_type,
        "description": req_obj.description,
        "admin_notes": req_obj.admin_notes,
        "assigned_to": req_obj.assigned_to,
        "created_at": req_obj.created_at,
        "updated_at": req_obj.updated_at,
        "resolved_at": req_obj.resolved_at,
        "assets": assets,
        "history": history,
        "service_configuration": service_config,
    }
    return ServiceRequestDetailOut(**out_data)


@router.post("/service-requests/{request_id}/review", response_model=ServiceRequestDetailOut)
async def admin_review_service_request(
    request_id: str,
    body: AdminReviewRequest,
    admin: Principal = Depends(require_admin),
    session: AsyncSession = Depends(get_async_session),
) -> ServiceRequestDetailOut:
    """
    Approve or reject a customer security service request.
    Records administrator review notes and appends an immutable entry to RequestHistory.
    If approved, associated assets are marked APPROVED and protection is enabled.
    """
    req_obj = None
    try:
        u_id = uuid.UUID(request_id)
        req_obj = await session.get(ServiceRequest, u_id)
    except (ValueError, TypeError):
        pass

    if not req_obj:
        res = await session.execute(
            select(ServiceRequest).where(
                (func.lower(ServiceRequest.request_number) == request_id.strip().lower())
            )
        )
        req_obj = res.scalar_one_or_none()

    if not req_obj:
        raise HTTPException(status_code=404, detail="Service request not found")

    now = datetime.now(timezone.utc)
    previous_status = req_obj.status or "Pending Review"
    action = (body.action or "approve").strip().lower()

    if action in ("approve", "approved"):
        new_status = "Approved"
        review_notes = body.notes or body.admin_notes or "Approved by SOC Administrator. Security service deployment initiated."
    elif action in ("reject", "rejected"):
        new_status = "Rejected"
        review_notes = body.notes or body.admin_notes or "Service request rejected by platform administrator."
    else:
        raise HTTPException(status_code=400, detail="Action must be 'approve' or 'reject'")

    req_obj.status = new_status
    req_obj.admin_notes = review_notes
    req_obj.assigned_to = admin.username
    req_obj.resolved_at = now
    req_obj.updated_at = now

    # Append to request history
    history_entry = RequestHistory(
        id=uuid.uuid4(),
        request_id=req_obj.id,
        customer_id=req_obj.customer_id or req_obj.user_id,
        previous_status=previous_status,
        new_status=new_status,
        changed_by=admin.username,
        notes=review_notes,
        created_at=now,
    )
    session.add(history_entry)

    # If approved, update corresponding Asset and WAF domain if applicable
    if new_status == "Approved" and req_obj.asset_id:
        try:
            asset = await session.get(Asset, req_obj.asset_id)
            if asset:
                asset.status = "APPROVED"
                asset.monitoring_enabled = True
                asset.updated_at = now

                clean_dom = (asset.hostname or asset.target_url or "").replace("https://", "").replace("http://", "").split("/")[0]
                if clean_dom:
                    from app.waf.models.database import Domain as WafDomain
                    import secrets
                    res_dom = await session.execute(select(WafDomain).where(WafDomain.domain_name == clean_dom))
                    existing_dom = res_dom.scalar_one_or_none()
                    if not existing_dom:
                        new_dom = WafDomain(
                            id=str(uuid.uuid4()),
                            tenant_id=str(req_obj.customer_id or req_obj.user_id or "default"),
                            domain_name=clean_dom,
                            origin_url=asset.ip_address or "http://127.0.0.1:8000",
                            environment=asset.environment or "production",
                            enforcement_mode="block",
                            verification_status="verified",
                            verification_token=secrets.token_hex(16),
                            verification_token_hash=secrets.token_hex(32),
                            verified_at=now,
                            is_active=True,
                            protection_status="PROTECTED",
                        )
                        session.add(new_dom)
                    else:
                        existing_dom.is_active = True
                        existing_dom.protection_status = "PROTECTED"
        except Exception as asset_err:
            print(f"[Admin Review] Asset sync notice: {asset_err}")

    await session.commit()
    await session.refresh(req_obj)

    # Reload assets and history
    res_assets = await session.execute(
        select(RequestAsset).where(RequestAsset.request_id == req_obj.id).order_by(RequestAsset.created_at.asc())
    )
    assets = list(res_assets.scalars().all())

    res_hist = await session.execute(
        select(RequestHistory).where(RequestHistory.request_id == req_obj.id).order_by(RequestHistory.created_at.asc())
    )
    history = list(res_hist.scalars().all())

    return ServiceRequestDetailOut(
        id=req_obj.id,
        request_number=req_obj.request_number,
        user_id=req_obj.user_id,
        customer_id=req_obj.customer_id or req_obj.user_id,
        username=req_obj.username,
        customer_name=req_obj.customer_name,
        customer_email=req_obj.customer_email,
        organization_name=req_obj.organization_name,
        organization_type=req_obj.organization_type,
        service_type=req_obj.service_type,
        service_category=req_obj.service_category,
        asset_id=req_obj.asset_id,
        asset_name=req_obj.asset_name,
        target_spec=req_obj.target_spec,
        priority=req_obj.priority,
        status=req_obj.status,
        request_type=req_obj.request_type,
        description=req_obj.description,
        admin_notes=req_obj.admin_notes,
        assigned_to=req_obj.assigned_to,
        created_at=req_obj.created_at,
        updated_at=req_obj.updated_at,
        resolved_at=req_obj.resolved_at,
        assets=assets,
        history=history,
    )


@router.put("/service-requests/{request_id}/status", response_model=ServiceRequestDetailOut)
async def admin_update_service_request_status(
    request_id: str,
    body: AdminStatusUpdatePayload,
    admin: Principal = Depends(require_admin),
    session: AsyncSession = Depends(get_async_session),
) -> ServiceRequestDetailOut:
    """
    Update request status to Pending Review, Approved, Rejected, In Progress, or Completed.
    Appends audit log to RequestHistory.
    """
    req_obj = None
    try:
        u_id = uuid.UUID(request_id)
        req_obj = await session.get(ServiceRequest, u_id)
    except (ValueError, TypeError):
        pass

    if not req_obj:
        res = await session.execute(
            select(ServiceRequest).where(
                (func.lower(ServiceRequest.request_number) == request_id.strip().lower())
            )
        )
        req_obj = res.scalar_one_or_none()

    if not req_obj:
        raise HTTPException(status_code=404, detail="Service request not found")

    valid_statuses = {"pending review", "pending", "approved", "rejected", "in progress", "completed"}
    if body.status.strip().lower() not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail="Status must be one of: 'Pending Review', 'Approved', 'Rejected', 'In Progress', 'Completed'",
        )

    now = datetime.now(timezone.utc)
    previous_status = req_obj.status or "Pending Review"
    req_obj.status = body.status.strip()
    if body.notes:
        req_obj.admin_notes = body.notes.strip()
    req_obj.assigned_to = admin.username
    req_obj.updated_at = now
    if req_obj.status in ("Approved", "Rejected", "Completed"):
        req_obj.resolved_at = now

    history_entry = RequestHistory(
        id=uuid.uuid4(),
        request_id=req_obj.id,
        customer_id=req_obj.customer_id or req_obj.user_id,
        previous_status=previous_status,
        new_status=req_obj.status,
        changed_by=admin.username,
        notes=body.notes or f"Status updated to {req_obj.status}",
        created_at=now,
    )
    session.add(history_entry)

    await session.commit()
    await session.refresh(req_obj)

    res_assets = await session.execute(
        select(RequestAsset).where(RequestAsset.request_id == req_obj.id).order_by(RequestAsset.created_at.asc())
    )
    assets = list(res_assets.scalars().all())

    res_hist = await session.execute(
        select(RequestHistory).where(RequestHistory.request_id == req_obj.id).order_by(RequestHistory.created_at.asc())
    )
    history = list(res_hist.scalars().all())

    return ServiceRequestDetailOut(
        id=req_obj.id,
        request_number=req_obj.request_number,
        user_id=req_obj.user_id,
        customer_id=req_obj.customer_id or req_obj.user_id,
        username=req_obj.username,
        customer_name=req_obj.customer_name,
        customer_email=req_obj.customer_email,
        organization_name=req_obj.organization_name,
        organization_type=req_obj.organization_type,
        service_type=req_obj.service_type,
        service_category=req_obj.service_category,
        asset_id=req_obj.asset_id,
        asset_name=req_obj.asset_name,
        target_spec=req_obj.target_spec,
        priority=req_obj.priority,
        status=req_obj.status,
        request_type=req_obj.request_type,
        description=req_obj.description,
        admin_notes=req_obj.admin_notes,
        assigned_to=req_obj.assigned_to,
        created_at=req_obj.created_at,
        updated_at=req_obj.updated_at,
        resolved_at=req_obj.resolved_at,
        assets=assets,
        history=history,
    )
