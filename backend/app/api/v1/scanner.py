"""
FastAPI Web Security Scanner Router
===================================
Provides RESTful endpoints for initiating, monitoring, and managing authorized
web application security assessments with SSRF protection.
"""
from __future__ import annotations

import uuid
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

import app.services.scanner
from app.core.auth import Principal, get_current_principal
from app.core.config import get_settings
from app.services.scanner.target_validation.validator import validate_target, extract_domain
from app.services.scanner.orchestration.scanner_orchestrator import launch_scan_job_async, cancel_job_execution
from app.services.scanner.models import (
    create_scan_job, get_scan_job, list_scan_jobs,
    get_scan_assets, get_scan_urls, get_scan_endpoints, get_scan_technologies,
    get_scan_findings, get_finding_by_id, update_finding_status
)
from app.services.scanner.reporting.json_report import generate_json_report
from app.core.logging import log

settings = get_settings()
router = APIRouter(prefix="/scanner", tags=["Web Security Scanner"])


# ── Authorization & SSRF Policy Helpers ─────────────────────────
def _enforce_private_scan_policy(requested_allow_private: bool, principal: Principal) -> bool:
    """
    Enforces server-side administrator policy on private-target scanning.
    - Disallowed by default for all users.
    - If client requested allow_private=True:
        * Must have role == 'admin'
        * Server setting SCANNER_ALLOW_PRIVATE_TARGETS must be True
      Otherwise raises 403 Forbidden.
    """
    if not requested_allow_private:
        return False

    if principal.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Private-network scanning requires administrator privileges.",
        )

    if not getattr(settings, "SCANNER_ALLOW_PRIVATE_TARGETS", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Private-network scanning is disabled by server configuration.",
        )

    return True


def _verify_job_access(job_id: str, principal: Principal) -> Dict[str, Any]:
    """
    Retrieves a scan job and verifies that the principal has permission to access it.
    - Administrators can access any job.
    - Non-administrators can only access jobs they created (job['user_id'] == principal.username).
    Raises 404 if not found, or 403 if unauthorized.
    """
    job = get_scan_job(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scan job '{job_id}' not found",
        )
    if principal.role != "admin" and job.get("user_id") != principal.username:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this scan job.",
        )
    return job


# ── Schemas ────────────────────────────────────────────────────
class ValidateTargetRequest(BaseModel):
    target_url: str = Field(..., description="Target URL to pre-validate")
    allow_private: bool = Field(False, description="Allow internal IP ranges for authorized lab tests")


class ValidateTargetResponse(BaseModel):
    valid: bool
    normalized_url: Optional[str] = None
    domain: Optional[str] = None
    resolved_ips: Optional[List[str]] = None
    scheme: Optional[str] = None
    error: Optional[str] = None


class StartScanRequest(BaseModel):
    target_url: str = Field(..., description="Target URL to scan")
    allow_private: bool = Field(False, description="Allow private / localhost addresses for authorized testing")
    authorized_by: str = Field("Security Operator", description="Operator name or authorization reference")
    scope_config: Optional[Dict[str, Any]] = None


# ── Endpoints ──────────────────────────────────────────────────
@router.post("/validate-target", response_model=ValidateTargetResponse)
async def check_target(
    payload: ValidateTargetRequest,
    principal: Principal = Depends(get_current_principal),
) -> ValidateTargetResponse:
    """Pre-validates a target URL and enforces strict SSRF protections."""
    target_url = payload.target_url.strip()
    if not target_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Target URL is required",
        )

    effective_allow_private = _enforce_private_scan_policy(payload.allow_private, principal)
    res = validate_target(target_url, allow_private=effective_allow_private)
    return ValidateTargetResponse(
        valid=res.get("valid", False),
        normalized_url=res.get("normalized_url"),
        domain=res.get("domain"),
        resolved_ips=res.get("resolved_ips"),
        scheme=res.get("scheme"),
        error=res.get("error"),
    )


@router.post("/jobs")
async def start_scan_job(
    payload: StartScanRequest,
    principal: Principal = Depends(get_current_principal),
) -> Dict[str, Any]:
    """Launch an asynchronous security assessment against an authorized target."""
    effective_allow_private = _enforce_private_scan_policy(payload.allow_private, principal)

    validation = validate_target(payload.target_url, allow_private=effective_allow_private)
    if not validation.get("valid"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Target validation failed: {validation.get('error')}",
        )

    normalized_url = validation["normalized_url"]
    domain = validation["domain"]

    scope = payload.scope_config or {
        "max_depth": 2,
        "max_urls": 30,
        "rate_limit_rps": 5,
        "allow_subdomains": False,
        "allow_private": effective_allow_private,
    }
    scope["allow_private"] = effective_allow_private

    job_id = f"scan_{uuid.uuid4().hex[:12]}"
    authorized_by = principal.username

    try:
        job = create_scan_job(
            job_id=job_id,
            user_id=principal.username,
            target_url=normalized_url,
            target_domain=domain,
            scope_config=scope,
            authorized_by=authorized_by,
        )
        if not job:
            raise RuntimeError("Failed to create scan job in database")

        launch_scan_job_async(
            job_id=job_id,
            target_url=normalized_url,
            scope_config=scope,
            allow_private=effective_allow_private,
        )
        return {
            "job_id": job_id,
            "status": "pending",
            "message": "Scan job successfully queued and launched",
            "target": normalized_url,
        }
    except Exception as e:
        log.error("Failed to launch scan job", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not initialize scanner job: {str(e)}",
        )


@router.get("/jobs")
async def get_scan_jobs(
    limit: int = Query(20, ge=1, le=100),
    principal: Principal = Depends(get_current_principal),
) -> List[Dict[str, Any]]:
    """List recent web security assessment jobs."""
    try:
        user_filter = None if principal.role == "admin" else principal.username
        return list_scan_jobs(user_id=user_filter, limit=limit)
    except Exception as e:
        log.warning("Could not list scanner jobs from database", error=str(e))
        return []


@router.get("/jobs/{job_id}")
async def get_job_status(
    job_id: str,
    principal: Principal = Depends(get_current_principal),
) -> Dict[str, Any]:
    """Retrieve current progress, findings counts, and execution metrics of a scan job."""
    return _verify_job_access(job_id, principal)


@router.post("/jobs/{job_id}/cancel")
async def cancel_job(
    job_id: str,
    principal: Principal = Depends(get_current_principal),
) -> Dict[str, Any]:
    """Cancel a running scan job execution."""
    _verify_job_access(job_id, principal)
    success = cancel_job_execution(job_id)
    return {"job_id": job_id, "cancelled": success}


@router.get("/jobs/{job_id}/findings")
async def get_job_findings(
    job_id: str,
    severity: Optional[str] = None,
    principal: Principal = Depends(get_current_principal),
) -> List[Dict[str, Any]]:
    """Retrieve security findings discovered during an assessment."""
    _verify_job_access(job_id, principal)
    return get_scan_findings(job_id, severity=severity)


@router.get("/jobs/{job_id}/assets")
async def get_job_assets(
    job_id: str,
    principal: Principal = Depends(get_current_principal),
) -> List[Dict[str, Any]]:
    """Retrieve discovered domain assets, DNS records, and IP addresses."""
    _verify_job_access(job_id, principal)
    return get_scan_assets(job_id)


@router.get("/jobs/{job_id}/urls")
async def get_job_urls(
    job_id: str,
    principal: Principal = Depends(get_current_principal),
) -> List[Dict[str, Any]]:
    """Retrieve crawled application URLs."""
    _verify_job_access(job_id, principal)
    return get_scan_urls(job_id)


@router.get("/jobs/{job_id}/technologies")
async def get_job_technologies(
    job_id: str,
    principal: Principal = Depends(get_current_principal),
) -> List[Dict[str, Any]]:
    """Retrieve detected web technologies, server frameworks, and libraries."""
    _verify_job_access(job_id, principal)
    return get_scan_technologies(job_id)


@router.get("/jobs/{job_id}/report/json")
async def get_job_json_report(
    job_id: str,
    principal: Principal = Depends(get_current_principal),
) -> Dict[str, Any]:
    """Export complete structured assessment report in JSON format."""
    _verify_job_access(job_id, principal)
    return generate_json_report(job_id)


@router.get("/jobs/{job_id}/report/pdf")
async def get_job_pdf_report(
    job_id: str,
    principal: Principal = Depends(get_current_principal),
):
    """Generate and download executive-ready PDF web security assessment report."""
    job = _verify_job_access(job_id, principal)

    assets = get_scan_assets(job_id)
    technologies = get_scan_technologies(job_id)
    urls = get_scan_urls(job_id)
    findings = get_scan_findings(job_id)

    try:
        from app.services.scanner.reporting.pdf_report import generate_pdf_report
        pdf_buffer = generate_pdf_report(job, assets, technologies, urls, findings)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"PDF report generation is unavailable: {exc}",
        )
    pdf_buffer.seek(0)

    domain = (job.get("target_domain") or "target").replace(".", "_")
    filename = f"fanos_security_assessment_{domain}_{job_id[:8]}.pdf"

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )
