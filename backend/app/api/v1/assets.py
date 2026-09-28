"""Organization-scoped asset inventory and monitoring approval API."""
import re
import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import Principal, get_current_principal, require_admin
from app.db.base import get_async_session
from app.models.security import Asset, Organization
from app.schemas.security import AssetCreate, AssetOut, AssetUpdate

router = APIRouter(tags=["Assets"])

_ALLOWED_ASSET_TYPES = {"SERVER", "WEBSITE", "API", "NETWORK", "ENDPOINT", "DATABASE", "CLOUD", "OTHER"}
_ALLOWED_ENVIRONMENTS = {"LAB", "DEVELOPMENT", "STAGING", "PRODUCTION"}


class OrganizationCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=128)


class OrganizationOut(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    is_active: bool

    model_config = {"from_attributes": True}


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    if not slug:
        raise HTTPException(status_code=400, detail="Organization name must contain letters or numbers")
    return slug


async def _organization_for_principal(
    organization_id: uuid.UUID,
    principal: Principal,
    session: AsyncSession,
) -> Organization:
    organization = await session.get(Organization, organization_id)
    if organization is None or not organization.is_active:
        raise HTTPException(status_code=404, detail="Organization not found")
    if principal.role == "admin":
        return organization
    if not principal.organization:
        raise HTTPException(status_code=403, detail="Your account is not assigned to an organization")
    allowed = {principal.organization.lower(), organization.name.lower(), organization.slug.lower()}
    if organization.slug.lower() not in allowed and organization.name.lower() not in allowed:
        raise HTTPException(status_code=403, detail="Organization access denied")
    return organization


async def _asset_scope(principal: Principal, session: AsyncSession):
    query = select(Asset).where(Asset.organization_id.is_not(None))
    if principal.role != "admin":
        if not principal.organization:
            raise HTTPException(status_code=403, detail="Your account is not assigned to an organization")
        query = query.join(Organization).where(
            (func.lower(Organization.slug) == principal.organization.lower())
            | (func.lower(Organization.name) == principal.organization.lower())
        )
    return query


@router.post("/organizations", response_model=OrganizationOut, status_code=status.HTTP_201_CREATED)
async def create_organization(
    body: OrganizationCreate,
    _: Principal = Depends(require_admin),
    session: AsyncSession = Depends(get_async_session),
):
    slug = _slugify(body.name)
    existing = await session.execute(select(Organization).where(Organization.slug == slug))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Organization already exists")
    organization = Organization(name=body.name.strip(), slug=slug)
    session.add(organization)
    await session.commit()
    await session.refresh(organization)
    return organization


@router.get("/organizations", response_model=List[OrganizationOut])
async def list_organizations(
    _: Principal = Depends(require_admin),
    session: AsyncSession = Depends(get_async_session),
):
    result = await session.execute(select(Organization).where(Organization.is_active.is_(True)).order_by(Organization.name))
    return list(result.scalars().all())


@router.post("/assets", response_model=AssetOut, status_code=status.HTTP_201_CREATED)
async def create_asset(
    body: AssetCreate,
    principal: Principal = Depends(get_current_principal),
    session: AsyncSession = Depends(get_async_session),
):
    if body.asset_type.upper() not in _ALLOWED_ASSET_TYPES:
        raise HTTPException(status_code=422, detail="Unsupported asset type")
    if body.environment.upper() not in _ALLOWED_ENVIRONMENTS:
        raise HTTPException(status_code=422, detail="Unsupported environment")
    organization = await _organization_for_principal(body.organization_id, principal, session)
    asset = Asset(
        organization_id=organization.id,
        name=body.name.strip(),
        asset_type=body.asset_type.upper(),
        ip_address=str(body.ip_address),
        hostname=body.hostname,
        description=body.description,
        environment=body.environment.upper(),
        status="PENDING",
        monitoring_enabled=False,
        sensor_id=body.sensor_id,
    )
    session.add(asset)
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise HTTPException(status_code=409, detail="An asset with this IP already exists for the organization") from exc
    await session.refresh(asset)
    return asset


@router.get("/assets", response_model=List[AssetOut])
async def list_assets(
    status_filter: Optional[str] = Query(default=None, alias="status"),
    organization_id: Optional[uuid.UUID] = Query(default=None),
    principal: Principal = Depends(get_current_principal),
    session: AsyncSession = Depends(get_async_session),
):
    query = await _asset_scope(principal, session)
    if organization_id:
        if principal.role != "admin":
            await _organization_for_principal(organization_id, principal, session)
        query = query.where(Asset.organization_id == organization_id)
    if status_filter:
        query = query.where(Asset.status == status_filter.upper())
    result = await session.execute(query.order_by(Asset.created_at.desc()))
    return list(result.scalars().all())


@router.get("/assets/{asset_id}", response_model=AssetOut)
async def get_asset(
    asset_id: uuid.UUID,
    principal: Principal = Depends(get_current_principal),
    session: AsyncSession = Depends(get_async_session),
):
    result = await session.execute((await _asset_scope(principal, session)).where(Asset.id == asset_id))
    asset = result.scalar_one_or_none()
    if asset is None:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset


@router.patch("/assets/{asset_id}", response_model=AssetOut)
async def update_asset(
    asset_id: uuid.UUID,
    body: AssetUpdate,
    principal: Principal = Depends(get_current_principal),
    session: AsyncSession = Depends(get_async_session),
):
    result = await session.execute((await _asset_scope(principal, session)).where(Asset.id == asset_id))
    asset = result.scalar_one_or_none()
    if asset is None:
        raise HTTPException(status_code=404, detail="Asset not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(asset, field, value.upper() if field == "environment" and value else value)
    await session.commit()
    await session.refresh(asset)
    return asset


@router.post("/assets/{asset_id}/approve", response_model=AssetOut)
async def approve_asset(
    asset_id: uuid.UUID,
    _: Principal = Depends(require_admin),
    session: AsyncSession = Depends(get_async_session),
):
    asset = await session.get(Asset, asset_id)
    if asset is None:
        raise HTTPException(status_code=404, detail="Asset not found")
    asset.status = "MONITORING"
    asset.monitoring_enabled = True
    await session.commit()
    await session.refresh(asset)
    return asset


@router.post("/assets/{asset_id}/pause", response_model=AssetOut)
async def pause_asset(
    asset_id: uuid.UUID,
    _: Principal = Depends(require_admin),
    session: AsyncSession = Depends(get_async_session),
):
    asset = await session.get(Asset, asset_id)
    if asset is None:
        raise HTTPException(status_code=404, detail="Asset not found")
    asset.status = "PAUSED"
    asset.monitoring_enabled = False
    await session.commit()
    await session.refresh(asset)
    return asset
