"""
FastAPI Threat Detection Router
===============================
Provides RESTful endpoints for ML URL classification, VirusTotal threat intelligence,
scan history, reporting, and detection telemetry.
"""
from __future__ import annotations

import time
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field, HttpUrl
from fastapi import APIRouter, HTTPException, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from app.db.base import get_db
from app.models.threat_detection import URLScan, UserThreatReport
from app.services.threat_detection.url_detector import url_detector
from app.services.threat_detection.virustotal_service import virustotal_service
from app.core.logging import log

router = APIRouter(prefix="/threat-detection", tags=["URL Threat Detection"])

# Local fallback buffers if DB is offline
_IN_MEMORY_SCANS: List[Dict[str, Any]] = []
_IN_MEMORY_REPORTS: List[Dict[str, Any]] = []


# ── Schemas ────────────────────────────────────────────────────
class URLAnalyzeRequest(BaseModel):
    url: str = Field(..., description="Target URL to inspect", min_length=3, max_length=2048)
    skip_vt: bool = Field(False, description="Skip VirusTotal lookup for purely offline ML analysis")


class URLAnalyzeResponse(BaseModel):
    scan_id: Optional[int] = None
    url: str
    final_verdict: str
    verdict_reasoning: str
    ml_prediction: str
    ml_confidence: float
    ml_probabilities: Dict[str, float]
    vt_result: str
    vt_stats: Optional[Dict[str, int]] = None
    features: Dict[str, Any]
    timestamp: str
    source: str = "web"


class UserReportRequest(BaseModel):
    url: str
    user_verdict: str
    original_verdict: Optional[str] = None
    scan_id: Optional[int] = None
    notes: Optional[str] = None


class UserReportResponse(BaseModel):
    id: Optional[int] = None
    status: str
    message: str


class ThreatStatsResponse(BaseModel):
    total_scans: int
    benign: int
    phishing: int
    malware: int
    defacement: int
    suspicious: int
    vt_active: bool
    ml_status: bool


# ── Endpoints ──────────────────────────────────────────────────
@router.post("/analyze", response_model=URLAnalyzeResponse)
async def analyze_url(
    payload: URLAnalyzeRequest,
    session: Optional[AsyncSession] = Depends(get_db),
) -> URLAnalyzeResponse:
    """
    Analyze a URL using the 17-feature XGBoost model and VirusTotal Threat Intelligence.
    Returns structured verdict, confidence, probabilities, and lexical features.
    """
    raw_url = payload.url.strip()
    if not raw_url.startswith(('http://', 'https://')):
        raw_url = 'http://' + raw_url

    if not url_detector.is_ready:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ML URL classification engine is unavailable or model failed to load",
        )

    # 1. ML URL Inference (17 features)
    try:
        ml_res = url_detector.predict(raw_url)
    except Exception as e:
        log.error("ML URL prediction failed", url=raw_url, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"URL feature extraction or model inference failed: {str(e)}",
        )

    ml_label = ml_res["label"]
    ml_conf = ml_res["confidence"]
    ml_probs = ml_res["probabilities"]
    features = ml_res["features"]

    # 2. VirusTotal Intelligence (if not explicitly skipped)
    vt_result = "unavailable"
    vt_stats: Dict[str, int] = {}
    if not payload.skip_vt:
        try:
            vt_result, vt_stats = await virustotal_service.scan_url(raw_url)
        except Exception as e:
            log.warning("VirusTotal lookup failed", error=str(e))
            vt_result = "error"

    # 3. Hybrid Synthesis
    final_verdict, reasoning = virustotal_service.synthesize_verdict(
        vt_result=vt_result,
        ml_label=ml_label,
        ml_confidence=ml_conf,
        threshold=0.85,
    )

    # 4. Save to Database
    scan_id = None
    now_ts = int(time.time())
    iso_time = datetime.now(timezone.utc).isoformat()

    scan_record = {
        "url": raw_url,
        "final_verdict": final_verdict,
        "ml_prediction": ml_label,
        "ml_confidence": ml_conf,
        "vt_result": vt_result,
        "user_id": "operator",
        "timestamp": now_ts,
        "source": "web",
    }

    try:
        if session is not None:
            db_scan = URLScan(
                url=raw_url,
                final_verdict=final_verdict,
                ml_prediction=ml_label,
                ml_confidence=ml_conf,
                vt_result=vt_result,
                user_id="operator",
                timestamp=now_ts,
                source="web",
            )
            session.add(db_scan)
            await session.commit()
            await session.refresh(db_scan)
            scan_id = db_scan.id
    except Exception as e:
        log.warning("Could not persist URL scan to database, using memory buffer", error=str(e))
        scan_id = len(_IN_MEMORY_SCANS) + 1

    # Record in memory buffer for instant retrieval
    scan_record["id"] = scan_id or len(_IN_MEMORY_SCANS) + 1
    scan_record["verdict_reasoning"] = reasoning
    scan_record["ml_probabilities"] = ml_probs
    scan_record["features"] = features
    scan_record["vt_stats"] = vt_stats
    scan_record["iso_timestamp"] = iso_time
    _IN_MEMORY_SCANS.insert(0, scan_record)
    if len(_IN_MEMORY_SCANS) > 200:
        _IN_MEMORY_SCANS.pop()

    return URLAnalyzeResponse(
        scan_id=scan_id,
        url=raw_url,
        final_verdict=final_verdict,
        verdict_reasoning=reasoning,
        ml_prediction=ml_label,
        ml_confidence=ml_conf,
        ml_probabilities=ml_probs,
        vt_result=vt_result,
        vt_stats=vt_stats,
        features=features,
        timestamp=iso_time,
        source="web",
    )


@router.get("/scans")
async def get_recent_scans(
    limit: int = Query(50, ge=1, le=200),
    session: Optional[AsyncSession] = Depends(get_db),
) -> List[Dict[str, Any]]:
    """Retrieve recent URL scans ordered by timestamp descending."""
    try:
        if session is not None:
            stmt = select(URLScan).order_by(desc(URLScan.timestamp)).limit(limit)
            result = await session.execute(stmt)
            scans = result.scalars().all()
            if scans:
                return [
                    {
                        "id": s.id,
                        "url": s.url,
                        "final_verdict": s.final_verdict,
                        "ml_prediction": s.ml_prediction,
                        "ml_confidence": s.ml_confidence,
                        "vt_result": s.vt_result,
                        "timestamp": datetime.fromtimestamp(s.timestamp, tz=timezone.utc).isoformat() if s.timestamp else "",
                        "source": s.source,
                    }
                    for s in scans
                ]
    except Exception as e:
        log.warning("Database query failed for scans, using memory buffer", error=str(e))

    # Return memory buffer if DB empty or unavailable
    return [
        {
            "id": s.get("id"),
            "url": s.get("url"),
            "final_verdict": s.get("final_verdict"),
            "ml_prediction": s.get("ml_prediction"),
            "ml_confidence": s.get("ml_confidence"),
            "vt_result": s.get("vt_result"),
            "timestamp": s.get("iso_timestamp") or datetime.fromtimestamp(s.get("timestamp", 0), tz=timezone.utc).isoformat(),
            "source": s.get("source", "web"),
        }
        for s in _IN_MEMORY_SCANS[:limit]
    ]


@router.get("/scans/{scan_id}")
async def get_scan_details(
    scan_id: int,
    session: Optional[AsyncSession] = Depends(get_db),
) -> Dict[str, Any]:
    """Retrieve full details of a specific URL scan, including 17 features and probability vectors."""
    # Check in-memory buffer first
    for s in _IN_MEMORY_SCANS:
        if s.get("id") == scan_id:
            return s

    # Query DB
    try:
        if session is not None:
            stmt = select(URLScan).where(URLScan.id == scan_id)
            res = await session.execute(stmt)
            scan = res.scalar_one_or_none()
            if scan:
                # Reconstruct full 17 features and model probabilities
                features = {}
                probs = {}
                try:
                    ml_res = url_detector.predict(scan.url)
                    features = ml_res.get("features", {})
                    probs = ml_res.get("probabilities", {})
                except Exception:
                    pass

                return {
                    "id": scan.id,
                    "url": scan.url,
                    "final_verdict": scan.final_verdict,
                    "verdict_reasoning": f"Historical scan record from {datetime.fromtimestamp(scan.timestamp or 0, tz=timezone.utc).strftime('%Y-%m-%d %H:%M:%S')}",
                    "ml_prediction": scan.ml_prediction,
                    "ml_confidence": scan.ml_confidence,
                    "ml_probabilities": probs,
                    "vt_result": scan.vt_result,
                    "vt_stats": {},
                    "features": features,
                    "timestamp": datetime.fromtimestamp(scan.timestamp or 0, tz=timezone.utc).isoformat(),
                    "source": scan.source,
                }
    except Exception as e:
        log.warning("DB query for scan details failed", error=str(e))

    raise HTTPException(status_code=404, detail="Scan record not found")


@router.post("/report", response_model=UserReportResponse)
async def submit_user_report(
    payload: UserReportRequest,
    session: Optional[AsyncSession] = Depends(get_db),
) -> UserReportResponse:
    """Submit analyst feedback or user report on classification accuracy."""
    now_ts = int(time.time())
    report_dict = {
        "url": payload.url,
        "user_verdict": payload.user_verdict,
        "original_verdict": payload.original_verdict,
        "scan_id": payload.scan_id,
        "notes": payload.notes,
        "timestamp": now_ts,
        "iso_timestamp": datetime.now(timezone.utc).isoformat(),
    }

    report_id = None
    try:
        if session is not None:
            db_report = UserThreatReport(
                url=payload.url,
                user_verdict=payload.user_verdict,
                original_verdict=payload.original_verdict,
                scan_id=payload.scan_id,
                notes=payload.notes,
                timestamp=now_ts,
            )
            session.add(db_report)
            await session.commit()
            await session.refresh(db_report)
            report_id = db_report.id
    except Exception as e:
        log.error("Failed to store user report in DB", error=str(e))

    report_dict["id"] = report_id or (len(_IN_MEMORY_REPORTS) + 1)
    _IN_MEMORY_REPORTS.insert(0, report_dict)
    if len(_IN_MEMORY_REPORTS) > 200:
        _IN_MEMORY_REPORTS.pop()

    return UserReportResponse(
        id=report_dict["id"],
        status="success",
        message="Threat feedback recorded successfully",
    )


@router.get("/reports")
async def get_user_reports(
    limit: int = Query(50, ge=1, le=200),
    search: Optional[str] = None,
    session: Optional[AsyncSession] = Depends(get_db),
) -> List[Dict[str, Any]]:
    """Retrieve submitted analyst reports/disputes."""
    try:
        if session is not None:
            stmt = select(UserThreatReport).order_by(desc(UserThreatReport.timestamp)).limit(limit)
            if search:
                stmt = stmt.where(UserThreatReport.url.ilike(f"%{search}%"))
            res = await session.execute(stmt)
            reports = res.scalars().all()
            if reports:
                return [
                    {
                        "id": r.id,
                        "url": r.url,
                        "user_verdict": r.user_verdict,
                        "original_verdict": r.original_verdict,
                        "scan_id": r.scan_id,
                        "notes": r.notes,
                        "timestamp": datetime.fromtimestamp(r.timestamp, tz=timezone.utc).isoformat() if r.timestamp else "",
                    }
                    for r in reports
                ]
    except Exception as e:
        log.warning("Database query failed for reports, using memory buffer", error=str(e))

    results = _IN_MEMORY_REPORTS
    if search:
        s_lower = search.lower()
        results = [r for r in results if s_lower in r.get("url", "").lower()]
    return results[:limit]


@router.get("/stats", response_model=ThreatStatsResponse)
async def get_threat_stats(
    session: Optional[AsyncSession] = Depends(get_db),
) -> ThreatStatsResponse:
    """Retrieve aggregated URL threat statistics."""
    stats = {
        "total_scans": len(_IN_MEMORY_SCANS),
        "benign": sum(1 for s in _IN_MEMORY_SCANS if s.get("final_verdict") == "benign"),
        "phishing": sum(1 for s in _IN_MEMORY_SCANS if s.get("final_verdict") == "phishing"),
        "malware": sum(1 for s in _IN_MEMORY_SCANS if s.get("final_verdict") == "malware"),
        "defacement": sum(1 for s in _IN_MEMORY_SCANS if s.get("final_verdict") == "defacement"),
        "suspicious": sum(1 for s in _IN_MEMORY_SCANS if s.get("final_verdict") == "suspicious"),
    }

    try:
        if session is not None:
            # Query scans table
            total_stmt = select(func.count(URLScan.id))
            total_res = await session.execute(total_stmt)
            total = total_res.scalar() or 0

            if total > 0:
                stats["total_scans"] = total
                for label in ["benign", "phishing", "malware", "defacement", "suspicious"]:
                    stmt = select(func.count(URLScan.id)).where(URLScan.final_verdict == label)
                    res = await session.execute(stmt)
                    stats[label] = res.scalar() or 0
    except Exception as e:
        log.warning("Could not query DB stats, returning memory counts", error=str(e))

    return ThreatStatsResponse(
        total_scans=stats["total_scans"],
        benign=stats["benign"],
        phishing=stats["phishing"],
        malware=stats["malware"],
        defacement=stats["defacement"],
        suspicious=stats["suspicious"],
        vt_active=virustotal_service.is_configured,
        ml_status=url_detector.is_ready,
    )
