"""
Settings API endpoints.
Provides safe configuration retrieval and validated updates.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.base import get_db
from app.waf.models import User, WAFSettingModel
from app.waf.schemas.settings import WAFSettingsOut, WAFSettingsUpdate
from app.waf.security.auth import get_current_user, require_admin
from app.waf.services.audit_service import audit_service

router = APIRouter(prefix="/settings", tags=["Settings"])
settings = get_settings()


@router.get("", response_model=WAFSettingsOut)
async def get_settings_safe(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """Returns safe WAF runtime configurations (no secrets or keys exposed)."""
    stmt = select(WAFSettingModel)
    res = await session.execute(stmt)
    records = {r.key: r.value for r in res.scalars().all()}

    return WAFSettingsOut(
        waf_mode=records.get("waf_mode", settings.WAF_MODE),
        block_threshold=int(records.get("block_threshold", settings.BLOCK_THRESHOLD)),
        monitor_threshold=int(records.get("monitor_threshold", settings.MONITOR_THRESHOLD)),
        max_body_size_bytes=int(records.get("max_body_size_bytes", settings.MAX_REQUEST_BODY_SIZE_BYTES)),
        max_uri_length=int(records.get("max_uri_length", settings.MAX_URI_LENGTH)),
        allowlist_ips=["127.0.0.1", "::1"],
        monitored_paths=["/api/*", "/login", "/admin/*"],
    )


@router.patch("", response_model=WAFSettingsOut)
async def update_settings(
    update_in: WAFSettingsUpdate,
    current_user: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """Updates runtime WAF settings (Admin only)."""
    updates = update_in.model_dump(exclude_unset=True)

    for k, v in updates.items():
        stmt = select(WAFSettingModel).where(WAFSettingModel.key == k)
        res = await session.execute(stmt)
        record = res.scalar_one_or_none()
        if record:
            record.value = str(v)
        else:
            session.add(WAFSettingModel(key=k, value=str(v)))

        # Also update in-memory settings
        if hasattr(settings, k.upper()):
            setattr(settings, k.upper(), v)

    await session.commit()

    try:
        await audit_service.log_action(
            username=current_user.username,
            action="SETTINGS_UPDATED",
            session=session,
            details=updates,
        )
    except Exception:
        pass

    return await get_settings_safe(session)
