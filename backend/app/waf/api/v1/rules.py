"""
WAF Rules Management API endpoints.
Provides viewing, toggling, editing, and custom rule creation.
"""
import json
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import get_db
from app.waf.engine.detectors.custom import validate_regex_safety
from app.waf.models import User, WAFRuleModel
from app.waf.rules.models import WAFRule
from app.waf.rules.registry import rule_registry
from app.waf.schemas.rule import RuleCreate, RuleOut, RuleUpdate
from app.waf.security.auth import get_current_user, require_admin
from app.waf.services.audit_service import audit_service

router = APIRouter(prefix="/rules", tags=["Rules"])


@router.get("", response_model=List[RuleOut])
async def list_rules(
    category: Optional[str] = Query(None, description="Filter by category"),
    enabled_only: bool = Query(False, description="Filter only enabled rules"),
    current_user: User = Depends(get_current_user),
):
    """Lists all registered WAF rules (built-in and custom)."""
    rules = rule_registry.get_all_rules()
    if category:
        rules = [r for r in rules if r.category.lower() == category.lower()]
    if enabled_only:
        rules = [r for r in rules if r.enabled]

    return [
        RuleOut(
            id=r.id,
            name=r.name,
            category=r.category,
            severity=r.severity,
            action=r.action,
            description=r.description,
            enabled=r.enabled,
            is_custom=r.is_custom,
            pattern=r.pattern,
            target_locations=r.target_locations,
            tags=r.tags,
        )
        for r in rules
    ]


@router.post("", response_model=RuleOut, status_code=status.HTTP_201_CREATED)
async def create_custom_rule(
    rule_in: RuleCreate,
    current_user: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """Creates a custom user-defined WAF detection rule (Admin only)."""
    # Validate regex safety and ReDoS resistance
    try:
        validate_regex_safety(rule_in.pattern)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )

    rule_id = f"CUST-{uuid.uuid4().hex[:6].upper()}"

    new_rule = WAFRule(
        id=rule_id,
        name=rule_in.name,
        category=rule_in.category,
        severity=rule_in.severity,
        action=rule_in.action,
        description=rule_in.description,
        enabled=rule_in.enabled,
        is_custom=True,
        pattern=rule_in.pattern,
        target_locations=rule_in.target_locations,
        tags=rule_in.tags,
    )

    # Add to in-memory registry
    rule_registry.add_custom_rule(new_rule)

    # Persist to database
    db_model = WAFRuleModel(
        id=new_rule.id,
        name=new_rule.name,
        category=new_rule.category,
        severity=new_rule.severity.value,
        action=new_rule.action.value,
        description=new_rule.description,
        enabled=new_rule.enabled,
        is_custom=True,
        pattern=new_rule.pattern,
        target_locations_json=json.dumps(new_rule.target_locations),
        tags_json=json.dumps(new_rule.tags),
    )
    session.add(db_model)
    await session.commit()

    try:
        await audit_service.log_action(
            username=current_user.username,
            action="RULE_CREATED",
            session=session,
            details={"rule_id": new_rule.id, "name": new_rule.name, "severity": new_rule.severity.value},
        )
    except Exception:
        pass

    return RuleOut(
        id=new_rule.id,
        name=new_rule.name,
        category=new_rule.category,
        severity=new_rule.severity,
        action=new_rule.action,
        description=new_rule.description,
        enabled=new_rule.enabled,
        is_custom=new_rule.is_custom,
        pattern=new_rule.pattern,
        target_locations=new_rule.target_locations,
        tags=new_rule.tags,
    )


@router.patch("/{rule_id}", response_model=RuleOut)
async def update_rule(
    rule_id: str,
    update_in: RuleUpdate,
    current_user: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """Updates an existing WAF rule (Admin only)."""
    if update_in.pattern is not None:
        try:
            validate_regex_safety(update_in.pattern)
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=str(e),
            )

    updated = rule_registry.update_rule(
        rule_id,
        name=update_in.name,
        severity=update_in.severity,
        action=update_in.action,
        description=update_in.description,
        enabled=update_in.enabled,
        pattern=update_in.pattern,
        target_locations=update_in.target_locations,
        tags=update_in.tags,
    )

    if not updated:
        raise HTTPException(status_code=404, detail="Rule not found")


    # Update DB representation
    stmt = select(WAFRuleModel).where(WAFRuleModel.id == rule_id)
    res = await session.execute(stmt)
    db_rule = res.scalar_one_or_none()
    if db_rule:
        if update_in.name is not None:
            db_rule.name = update_in.name
        if update_in.severity is not None:
            db_rule.severity = update_in.severity.value
        if update_in.action is not None:
            db_rule.action = update_in.action.value
        if update_in.description is not None:
            db_rule.description = update_in.description
        if update_in.enabled is not None:
            db_rule.enabled = update_in.enabled
        if update_in.pattern is not None:
            db_rule.pattern = update_in.pattern
        if update_in.target_locations is not None:
            db_rule.target_locations_json = json.dumps(update_in.target_locations)
        if update_in.tags is not None:
            db_rule.tags_json = json.dumps(update_in.tags)
        await session.commit()

    try:
        await audit_service.log_action(
            username=current_user.username,
            action="RULE_UPDATED",
            session=session,
            details={"rule_id": rule_id, "enabled": update_in.enabled, "severity": update_in.severity.value if update_in.severity else None},
        )
    except Exception:
        pass

    return RuleOut(
        id=updated.id,
        name=updated.name,
        category=updated.category,
        severity=updated.severity,
        action=updated.action,
        description=updated.description,
        enabled=updated.enabled,
        is_custom=updated.is_custom,
        pattern=updated.pattern,
        target_locations=updated.target_locations,
        tags=updated.tags,
    )


@router.delete("/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_custom_rule(
    rule_id: str,
    current_user: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """Deletes a custom WAF rule (built-in rules cannot be deleted, only disabled)."""
    success = rule_registry.delete_rule(rule_id)
    if not success:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete rule. Either rule does not exist or it is a protected built-in rule.",
        )

    stmt = select(WAFRuleModel).where(WAFRuleModel.id == rule_id)
    res = await session.execute(stmt)
    db_rule = res.scalar_one_or_none()
    if db_rule:
        await session.delete(db_rule)
        await session.commit()

    try:
        await audit_service.log_action(
            username=current_user.username,
            action="RULE_DELETED",
            session=session,
            details={"rule_id": rule_id},
        )
    except Exception:
        pass

    return None
