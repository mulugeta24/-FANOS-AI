"""
FastAPI Web Security Scanner Router
===================================
Provides RESTful endpoints for initiating, monitoring, and managing authorized
web application security assessments with SSRF protection.
"""
from __future__ import annotations

import uuid
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

import app.services.scanner
from app.services.scanner.target_validation.validator import validate_target, extract_domain
from app.services.scanner.orchestration.scanner_orchestrator import launch_scan_job_async, cancel_job_execution
from app.services.scanner.models import (
    create_scan_job, get_scan_job, list_scan_jobs,
    get_scan_assets, get_scan_urls, get_scan_endpoints, get_scan_technologies,
    get_scan_findings, get_finding_by_id, update_finding_status
)
from app.services.scanner.reporting.json_report import generate_json_report
from app.services.scanner.reporting.pdf_report import generate_pdf_report
from app.core.logging import log

router = APIRouter(prefix="/scanner", tags=["Web Security Scanner"])


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
async def check_target(payload: ValidateTargetRequest) -> ValidateTargetResponse:
    """Pre-validates a target URL and enforces strict SSRF protections."""
    target_url = payload.target_url.strip()
    if not target_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Target URL is required",
        )

    res = validate_target(target_url, allow_private=payload.allow_private)
    return ValidateTargetResponse(
        valid=res.get("valid", False),
        normalized_url=res.get("normalized_url"),
        domain=res.get("domain"),
        resolved_ips=res.get("resolved_ips"),
        scheme=res.get("scheme"),
        error=res.get("error"),
    )


@router.post("/jobs")
async def start_scan_job(payload: StartScanRequest) -> Dict[str, Any]:
    """Launch an asynchronous security assessment against an authorized target."""
    validation = validate_target(payload.target_url, allow_private=payload.allow_private)
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
        "allow_private": payload.allow_private,
    }

    job_id = f"scan_{uuid.uuid4().hex[:12]}"
    authorized_by = payload.authorized_by or "authorized_operator"

    try:
        job = create_scan_job(
            job_id=job_id,
            user_id=None,
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
            allow_private=payload.allow_private,
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
async def get_scan_jobs(limit: int = Query(20, ge=1, le=100)) -> List[Dict[str, Any]]:
    """List recent web security assessment jobs."""
    try:
        return list_scan_jobs(user_id=None, limit=limit)
    except Exception as e:
        log.warning("Could not list scanner jobs from database", error=str(e))
        return []


@router.get("/jobs/{job_id}")
async def get_job_status(job_id: str) -> Dict[str, Any]:
    """Retrieve current progress, findings counts, and execution metrics of a scan job."""
    job = get_scan_job(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scan job '{job_id}' not found",
        )
    return job


@router.post("/jobs/{job_id}/cancel")
async def cancel_job(job_id: str) -> Dict[str, Any]:
    """Cancel a running scan job execution."""
    success = cancel_job_execution(job_id)
    return {"job_id": job_id, "cancelled": success}


@router.get("/jobs/{job_id}/findings")
async def get_job_findings(job_id: str, severity: Optional[str] = None) -> List[Dict[str, Any]]:
    """Retrieve security findings discovered during an assessment."""
    return get_scan_findings(job_id, severity=severity)


@router.get("/jobs/{job_id}/assets")
async def get_job_assets(job_id: str) -> List[Dict[str, Any]]:
    """Retrieve discovered domain assets, DNS records, and IP addresses."""
    return get_scan_assets(job_id)


@router.get("/jobs/{job_id}/urls")
async def get_job_urls(job_id: str) -> List[Dict[str, Any]]:
    """Retrieve crawled application URLs."""
    return get_scan_urls(job_id)


@router.get("/jobs/{job_id}/technologies")
async def get_job_technologies(job_id: str) -> List[Dict[str, Any]]:
    """Retrieve detected web technologies, server frameworks, and libraries."""
    return get_scan_technologies(job_id)


@router.get("/jobs/{job_id}/report/json")
async def get_job_json_report(job_id: str) -> Dict[str, Any]:
    """Export complete structured assessment report in JSON format."""
    return generate_json_report(job_id)


@router.get("/jobs/{job_id}/report/pdf")
async def get_job_pdf_report(job_id: str):
    """Generate and download executive-ready PDF web security assessment report."""
    job = get_scan_job(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scan job '{job_id}' not found",
        )

    assets = get_scan_assets(job_id)
    technologies = get_scan_technologies(job_id)
    urls = get_scan_urls(job_id)
    findings = get_scan_findings(job_id)

    pdf_buffer = generate_pdf_report(job, assets, technologies, urls, findings)
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
