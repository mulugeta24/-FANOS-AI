"""
WAF Security Events API
=======================
Ingestion and query endpoints for FANOS WAF events.
"""
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import APIRouter, HTTPException, status, Depends, Query, Header
from pydantic import BaseModel, Field
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.base import get_async_session
from app.models.security import SecurityEvent
from app.schemas.security import SecurityEventOut
from app.ai.engine import ai_engine
from app.ai.rule_engine import rule_engine
from app.ai.risk_engine import risk_engine, RiskContext
from app.core.logging import log

router = APIRouter(prefix="/waf", tags=["WAF Events"])
logger = logging.getLogger("fanos.api.waf")


# ──────────────────────────────────────────────────────────────
# Schemas
# ──────────────────────────────────────────────────────────────
class WAFEventIngestion(BaseModel):
    """WAF event from the WAF log collector/forwarder."""
    event_id: str
    timestamp: str
    request_id: str = ""
    source_ip: str
    http_method: str = ""
    request_uri: str = ""
    host: str = ""
    user_agent: str = ""
    rule_id: str = ""
    rule_message: str = ""
    rule_source: str = "OWASP_CRS"
    severity: str = "INFO"
    anomaly_score: int = 0
    action: str = "LOG"
    status_code: int = 0
    tags: List[str] = Field(default_factory=list)


class WAFEventStats(BaseModel):
    """WAF event statistics."""
    total_events: int
    blocked: int
    logged: int
    critical: int
    high: int
    medium: int
    low: int


# ──────────────────────────────────────────────────────────────
# Helper: Map WAF event to FANOS attack type
# ──────────────────────────────────────────────────────────────
def map_waf_to_attack_type(waf_event: WAFEventIngestion) -> str:
    """
    Map WAF tags/rule message to FANOS attack type classification.
    """
    tags = [t.lower() for t in waf_event.tags]
    message = waf_event.rule_message.lower()
    
    # Check tags first (most reliable)
    if "attack-sqli" in tags or "sql" in tags:
        return "SQL Injection"
    if "attack-xss" in tags or "xss" in tags:
        return "XSS"
    if "attack-rce" in tags or "command" in tags:
        return "Command Injection"
    if "attack-lfi" in tags or "traversal" in tags:
        return "Path Traversal"
    if "attack-ssrf" in tags:
        return "SSRF"
    if "attack-file-upload" in tags:
        return "File Upload Attack"
    if "attack-protocol" in tags:
        return "Protocol Violation"
    
    # Check rule message
    if any(kw in message for kw in ["sql", "injection", "union", "select"]):
        return "SQL Injection"
    if any(kw in message for kw in ["xss", "script", "javascript"]):
        return "XSS"
    if any(kw in message for kw in ["command", "exec", "shell"]):
        return "Command Injection"
    if any(kw in message for kw in ["traversal", "path", "../"]):
        return "Path Traversal"
    if any(kw in message for kw in ["ssrf", "metadata"]):
        return "SSRF"
    if any(kw in message for kw in ["upload", "file"]):
        return "File Upload Attack"
    
    return "Web Attack"


# ──────────────────────────────────────────────────────────────
# Helper: Create SecurityEvent from WAF event
# ──────────────────────────────────────────────────────────────
async def create_security_event_from_waf(
    waf_event: WAFEventIngestion,
    session: AsyncSession,
) -> SecurityEvent:
    """
    Convert WAF event to SecurityEvent and persist to database.
    
    Process:
    1. Map WAF event to FANOS attack type
    2. Run through Rule Engine for additional detection
    3. Compute risk score via Risk Engine
    4. Create SecurityEvent record
    """
    # Map attack type
    attack_type = map_waf_to_attack_type(waf_event)
    
    # Run Rule Engine on request URI + message (payload proxy)
    payload = f"{waf_event.request_uri} {waf_event.rule_message}"
    rule_match = rule_engine.evaluate(payload)
    
    # Compute risk score
    risk_ctx = RiskContext(
        ai_confidence=float(waf_event.anomaly_score) if waf_event.anomaly_score > 0 else 80.0,
        ai_attack_type=attack_type,
        rule_match=rule_match,
        source_ip=waf_event.source_ip,
        target_path=waf_event.request_uri,
        method=waf_event.http_method,
        is_authenticated=False,  # TODO: extract from request headers if available
        asset_criticality=7,  # WAF-protected assets are critical by default
    )
    risk_score = risk_engine.compute(risk_ctx)
    severity = risk_engine.severity_from_risk(risk_score)
    
    # Determine status based on WAF action
    if waf_event.action == "BLOCK" or waf_event.status_code == 403:
        event_status = "BLOCKED"
    elif waf_event.severity in ("CRITICAL", "HIGH"):
        event_status = "ALERT"
    else:
        event_status = "MONITORED"
    
    # Create SecurityEvent
    security_event = SecurityEvent(
        severity=severity,
        attack_type=attack_type,
        source_ip=waf_event.source_ip,
        target=f"{waf_event.host}{waf_event.request_uri}" if waf_event.host else waf_event.request_uri,
        ai_confidence=float(waf_event.anomaly_score) if waf_event.anomaly_score > 0 else 85.0,
        risk_score=risk_score,
        status=event_status,
        raw_payload=waf_event.model_dump_json(),
        sensor_source="waf",
        created_at=datetime.fromisoformat(waf_event.timestamp.replace("Z", "+00:00")),
    )
    
    session.add(security_event)
    await session.commit()
    await session.refresh(security_event)
    
    logger.info(
        "Created SecurityEvent from WAF: %s | %s | %s | risk=%d",
        security_event.id,
        attack_type,
        waf_event.source_ip,
        risk_score,
    )
    
    return security_event


# ──────────────────────────────────────────────────────────────
# POST: Ingest WAF Event
# ──────────────────────────────────────────────────────────────
@router.post(
    "/events",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Ingest WAF Security Event",
)
async def ingest_waf_event(
    event: WAFEventIngestion,
    x_fanos_source: Optional[str] = Header(None),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Ingest a WAF security event from the FANOS WAF log collector.
    
    This endpoint:
    1. Validates the WAF event
    2. Maps it to FANOS attack type
    3. Runs it through Rule Engine
    4. Computes risk score via Risk Engine
    5. Persists as SecurityEvent in database
    6. Returns 202 Accepted (async processing)
    """
    try:
        security_event = await create_security_event_from_waf(event, session)
        return {
            "status": "accepted",
            "event_id": str(security_event.id),
            "waf_event_id": event.event_id,
            "attack_type": security_event.attack_type,
            "risk_score": security_event.risk_score,
            "severity": security_event.severity,
        }
    except Exception as e:
        logger.error("Failed to ingest WAF event %s: %s", event.event_id, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process WAF event: {str(e)}",
        )


# ──────────────────────────────────────────────────────────────
# POST: Batch Ingest
# ──────────────────────────────────────────────────────────────
@router.post(
    "/events/batch",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Batch Ingest WAF Events",
)
async def ingest_waf_events_batch(
    events: List[WAFEventIngestion],
    session: AsyncSession = Depends(get_async_session),
):
    """
    Batch ingest multiple WAF events.
    """
    processed = []
    failed = []
    
    for event in events:
        try:
            security_event = await create_security_event_from_waf(event, session)
            processed.append({
                "event_id": str(security_event.id),
                "waf_event_id": event.event_id,
                "status": "success",
            })
        except Exception as e:
            logger.error("Failed to ingest WAF event %s: %s", event.event_id, e)
            failed.append({
                "waf_event_id": event.event_id,
                "error": str(e),
            })
    
    return {
        "status": "completed",
        "processed": len(processed),
        "failed": len(failed),
        "details": {
            "processed": processed,
            "failed": failed,
        }
    }


# ──────────────────────────────────────────────────────────────
# GET: WAF Raw Events (Legacy Ingest Stream)
# ──────────────────────────────────────────────────────────────
@router.get(
    "/raw-events",
    response_model=List[SecurityEventOut],
    summary="Get WAF Security Events",
)
async def get_waf_events(
    limit: int = Query(default=50, le=500),
    severity: Optional[str] = Query(default=None),
    hours: int = Query(default=24, le=168),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Query WAF security events from the database.
    """
    try:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
        
        query = (
            select(SecurityEvent)
            .where(SecurityEvent.sensor_source == "waf")
            .where(SecurityEvent.created_at >= cutoff)
            .order_by(SecurityEvent.created_at.desc())
            .limit(limit)
        )

        
        if severity:
            query = query.where(SecurityEvent.severity == severity.upper())
        
        result = await session.execute(query)
        events = result.scalars().all()
        
        logger.info("Fetched %d WAF events (hours=%d, severity=%s)", len(events), hours, severity)
        return list(events)
    
    except Exception as e:
        logger.error("Failed to fetch WAF events: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database query failed: {str(e)}",
        )


# ──────────────────────────────────────────────────────────────
# GET: WAF Raw Stats
# ──────────────────────────────────────────────────────────────
@router.get(
    "/raw-stats",
    response_model=WAFEventStats,
    summary="Get WAF Statistics",
)
async def get_waf_stats(
    hours: int = Query(default=24, le=168),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get WAF event statistics for the dashboard.
    """
    try:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
        
        # Total events
        total_query = (
            select(func.count(SecurityEvent.id))
            .where(SecurityEvent.sensor_source == "waf")
            .where(SecurityEvent.created_at >= cutoff)
        )
        total_result = await session.execute(total_query)
        total = total_result.scalar() or 0
        
        # Blocked events
        blocked_query = (
            select(func.count(SecurityEvent.id))
            .where(SecurityEvent.sensor_source == "waf")
            .where(SecurityEvent.status == "BLOCKED")
            .where(SecurityEvent.created_at >= cutoff)
        )
        blocked_result = await session.execute(blocked_query)
        blocked = blocked_result.scalar() or 0
        
        # Severity counts
        severity_counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
        for sev in severity_counts.keys():
            sev_query = (
                select(func.count(SecurityEvent.id))
                .where(SecurityEvent.sensor_source == "waf")
                .where(SecurityEvent.severity == sev)
                .where(SecurityEvent.created_at >= cutoff)
            )
            sev_result = await session.execute(sev_query)
            severity_counts[sev] = sev_result.scalar() or 0
        
        logger.info("Computed WAF stats: total=%d, blocked=%d", total, blocked)
        
        return WAFEventStats(
            total_events=total,
            blocked=blocked,
            logged=total - blocked,
            critical=severity_counts["CRITICAL"],
            high=severity_counts["HIGH"],
            medium=severity_counts["MEDIUM"],
            low=severity_counts["LOW"],
        )
    
    except Exception as e:
        logger.error("Failed to compute WAF stats: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Stats computation failed: {str(e)}",
        )


# ──────────────────────────────────────────────────────────────
# WAF Configuration Management
# ──────────────────────────────────────────────────────────────
class WAFConfigUpdate(BaseModel):
    """ModSecurity configuration update request."""
    rule_engine: Optional[str] = Field(None, pattern="^(on|DetectionOnly|off)$")
    audit_engine: Optional[str] = Field(None, pattern="^(RelevantOnly|on|off)$")
    paranoia_level: Optional[int] = Field(None, ge=1, le=4)
    anomaly_inbound: Optional[int] = Field(None, ge=1, le=100)
    anomaly_outbound: Optional[int] = Field(None, ge=1, le=100)
    req_body_access: Optional[bool] = None
    resp_body_access: Optional[bool] = None


class WAFConfig(BaseModel):
    """Current ModSecurity configuration."""
    rule_engine: str
    audit_engine: str
    paranoia_level: int
    anomaly_inbound: int
    anomaly_outbound: int
    req_body_access: bool
    resp_body_access: bool
    backend: str
    port: int
    container_status: str


class WAFCustomRule(BaseModel):
    """FANOS custom rule definition."""
    id: str
    name: str
    enabled: bool
    severity: str
    category: str
    description: str


class WAFRuleToggle(BaseModel):
    """Toggle custom rule on/off."""
    rule_id: str
    enabled: bool


@router.get(
    "/config",
    response_model=WAFConfig,
    summary="Get WAF Configuration",
)
async def get_waf_config():
    """
    Get current WAF ModSecurity configuration from docker-compose.yml environment variables.
    """
    try:
        import subprocess
        
        # Read docker-compose environment for WAF service
        result = subprocess.run(
            ["docker", "inspect", "fanos-waf", "--format", "{{json .Config.Env}}"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        
        if result.returncode != 0:
            # WAF container not running - return default config
            return WAFConfig(
                rule_engine="on",
                audit_engine="RelevantOnly",
                paranoia_level=1,
                anomaly_inbound=5,
                anomaly_outbound=4,
                req_body_access=True,
                resp_body_access=True,
                backend="http://waf-test-app:80",
                port=8080,
                container_status="stopped",
            )
        
        # Parse environment variables
        import json
        env_vars = json.loads(result.stdout.strip())
        env_dict = {var.split("=", 1)[0]: var.split("=", 1)[1] for var in env_vars if "=" in var}
        
        return WAFConfig(
            rule_engine=env_dict.get("MODSEC_RULE_ENGINE", "on"),
            audit_engine=env_dict.get("MODSEC_AUDIT_ENGINE", "RelevantOnly"),
            paranoia_level=int(env_dict.get("BLOCKING_PARANOIA", "1")),
            anomaly_inbound=int(env_dict.get("ANOMALY_INBOUND", "5")),
            anomaly_outbound=int(env_dict.get("ANOMALY_OUTBOUND", "4")),
            req_body_access=env_dict.get("MODSEC_REQ_BODY_ACCESS", "on") == "on",
            resp_body_access=env_dict.get("MODSEC_RESP_BODY_ACCESS", "on") == "on",
            backend=env_dict.get("BACKEND", "http://waf-test-app:80"),
            port=int(env_dict.get("PORT", "8080")),
            container_status="running",
        )
    
    except subprocess.TimeoutExpired:
        logger.error("Docker inspect timeout")
        raise HTTPException(status_code=500, detail="WAF container check timeout")
    except Exception as e:
        logger.error("Failed to get WAF config: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Config retrieval failed: {str(e)}")


@router.put(
    "/config",
    summary="Update WAF Configuration",
)
async def update_waf_config(config: WAFConfigUpdate):
    """
    Update ModSecurity configuration by modifying docker-compose.yml and restarting WAF container.
    
    **Note:** This endpoint modifies docker-compose.yml and requires docker restart.
    In production, use environment file or ConfigMap injection instead.
    """
    try:
        import yaml
        from pathlib import Path
        
        compose_file = Path("c:/Fanos Aii/docker-compose.yml")
        
        # Read docker-compose.yml
        with open(compose_file, "r", encoding="utf-8") as f:
            compose_data = yaml.safe_load(f)
        
        # Update WAF service environment variables
        waf_env = compose_data["services"]["waf"]["environment"]
        
        if config.rule_engine is not None:
            waf_env["MODSEC_RULE_ENGINE"] = config.rule_engine
        if config.audit_engine is not None:
            waf_env["MODSEC_AUDIT_ENGINE"] = config.audit_engine
        if config.paranoia_level is not None:
            waf_env["BLOCKING_PARANOIA"] = str(config.paranoia_level)
        if config.anomaly_inbound is not None:
            waf_env["ANOMALY_INBOUND"] = str(config.anomaly_inbound)
        if config.anomaly_outbound is not None:
            waf_env["ANOMALY_OUTBOUND"] = str(config.anomaly_outbound)
        if config.req_body_access is not None:
            waf_env["MODSEC_REQ_BODY_ACCESS"] = "on" if config.req_body_access else "off"
        if config.resp_body_access is not None:
            waf_env["MODSEC_RESP_BODY_ACCESS"] = "on" if config.resp_body_access else "off"
        
        # Write back to docker-compose.yml
        with open(compose_file, "w", encoding="utf-8") as f:
            yaml.safe_dump(compose_data, f, default_flow_style=False, sort_keys=False)
        
        logger.info("Updated docker-compose.yml with new WAF configuration")
        
        return {
            "status": "updated",
            "message": "Configuration saved to docker-compose.yml",
            "restart_required": True,
            "restart_command": "docker compose restart waf",
        }
    
    except Exception as e:
        logger.error("Failed to update WAF config: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Config update failed: {str(e)}")


@router.post(
    "/restart",
    summary="Restart WAF Container",
)
async def restart_waf():
    """
    Restart the FANOS WAF Docker container to apply configuration changes.
    """
    try:
        import subprocess
        
        logger.info("Restarting WAF container...")
        
        result = subprocess.run(
            ["docker", "compose", "restart", "waf"],
            capture_output=True,
            text=True,
            timeout=30,
            cwd="c:/Fanos Aii",
        )
        
        if result.returncode == 0:
            return {
                "status": "success",
                "message": "WAF container restarted successfully",
                "output": result.stdout,
            }
        else:
            raise HTTPException(
                status_code=500,
                detail=f"Restart failed: {result.stderr}",
            )
    
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=500, detail="Restart timeout (>30s)")
    except Exception as e:
        logger.error("Failed to restart WAF: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Restart failed: {str(e)}")


@router.get(
    "/custom-rules",
    response_model=List[WAFCustomRule],
    summary="Get FANOS Custom Rules",
)
async def get_custom_rules():
    """
    Get list of FANOS custom WAF rules from fanos-rules.conf.
    """
    try:
        from pathlib import Path
        
        rules_file = Path("c:/Fanos Aii/security-engines/waf/config/crs/fanos-rules.conf")
        
        if not rules_file.exists():
            return []
        
        rules = []
        with open(rules_file, "r", encoding="utf-8") as f:
            content = f.read()
            
            # Parse SecRule definitions (simplified parser)
            import re
            rule_pattern = r'SecRule[^\n]+id:(\d+)[^\n]+msg:\'([^\']+)\'[^\n]+tag:\'([^\']+)\'[^\n]+severity:\'([^\']+)\''
            
            matches = re.findall(rule_pattern, content)
            
            rule_metadata = {
                "9500001": ("SQL Injection", "Time-based blind SQLi"),
                "9500002": ("SQL Injection", "Stacked queries / UNION injection"),
                "9500003": ("SQL Injection", "NoSQL injection (MongoDB)"),
                "9500010": ("XSS", "DOM-based XSS via protocol handlers"),
                "9500011": ("XSS", "Event handler injection"),
                "9500012": ("XSS", "Dangerous HTML elements"),
                "9500020": ("Command Injection", "OS command injection with chaining"),
                "9500021": ("Command Injection", "Command substitution"),
                "9500030": ("Path Traversal", "Sensitive file access"),
                "9500031": ("Path Traversal", "Encoded path traversal"),
                "9500040": ("SSRF", "Cloud metadata endpoint access"),
                "9500041": ("SSRF", "Internal network targeting"),
                "9500050": ("File Upload", "Dangerous file extensions"),
                "9500051": ("File Upload", "Webshell signatures"),
                "9500060": ("Protocol Violation", "Dangerous HTTP methods"),
                "9500070": ("Protocol Violation", "X-Forwarded-For spoofing"),
                "9500071": ("Protocol Violation", "Blank Host header"),
                "9500072": ("Protocol Violation", "Suspicious IP headers"),
                "9500080": ("Protocol Violation", "Null byte injection"),
                "9500081": ("Protocol Violation", "Oversized request URI"),
                "9500082": ("Protocol Violation", "Double URL-encoding evasion"),
            }
            
            for rule_id, msg, tag, severity in matches:
                category, description = rule_metadata.get(rule_id, ("Unknown", msg))
                
                rules.append(WAFCustomRule(
                    id=rule_id,
                    name=description,
                    enabled=True,  # All rules active by default
                    severity=severity.upper(),
                    category=category,
                    description=msg,
                ))
        
        logger.info("Loaded %d custom rules from fanos-rules.conf", len(rules))
        return rules
    
    except Exception as e:
        logger.error("Failed to load custom rules: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Rule loading failed: {str(e)}")


@router.post(
    "/custom-rules/toggle",
    summary="Enable/Disable Custom Rule",
)
async def toggle_custom_rule(toggle: WAFRuleToggle):
    """
    Enable or disable a FANOS custom rule.
    
    **Implementation:** Comments out the SecRule line in fanos-rules.conf.
    Requires WAF restart to take effect.
    """
    try:
        from pathlib import Path
        
        rules_file = Path("c:/Fanos Aii/security-engines/waf/config/crs/fanos-rules.conf")
        
        with open(rules_file, "r", encoding="utf-8") as f:
            lines = f.readlines()
        
        # Find and toggle the rule
        rule_found = False
        for i, line in enumerate(lines):
            if f"id:{toggle.rule_id}" in line:
                if toggle.enabled:
                    # Remove comment if present
                    if line.strip().startswith("#"):
                        lines[i] = line.lstrip("#")
                        rule_found = True
                else:
                    # Add comment if not present
                    if not line.strip().startswith("#"):
                        lines[i] = "# " + line
                        rule_found = True
        
        if not rule_found:
            raise HTTPException(status_code=404, detail=f"Rule {toggle.rule_id} not found")
        
        # Write back
        with open(rules_file, "w", encoding="utf-8") as f:
            f.writelines(lines)
        
        action = "enabled" if toggle.enabled else "disabled"
        logger.info("Rule %s %s", toggle.rule_id, action)
        
        return {
            "status": "success",
            "message": f"Rule {toggle.rule_id} {action}",
            "restart_required": True,
        }
    
    except Exception as e:
        logger.error("Failed to toggle rule: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Rule toggle failed: {str(e)}")
