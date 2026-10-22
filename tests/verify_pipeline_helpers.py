"""
Helper functions for End-to-End Pipeline Verification.
Used by verify-suricata-e2e.ps1 to execute independent ML predictions,
database verification, and JWT generation without PowerShell CLI string escaping issues.
"""
import sys
import os
import json
import asyncio
from pathlib import Path

# Add backend directory to sys.path and cwd
backend_dir = Path(r"c:\Fanos Aii\backend")
os.chdir(str(backend_dir))
sys.path.insert(0, str(backend_dir))

def test_ml_inference():
    """Check 2: ML Model Independent Inference"""
    from app.services.threat_detection.url_detector import URLDetector
    detector = URLDetector.get_instance()
    benign_res = detector.predict("https://www.google.com")
    phish_res = detector.predict("http://login-apple-security-account.update.xyz/verify")

    from app.ai.predictor import fanos_predictor
    flow_sample = {
        "flow_duration_ms": 1500,
        "pkts_toserver": 12,
        "pkts_toclient": 15,
        "bytes_toserver": 1200,
        "bytes_toclient": 8400,
        "proto": "TCP",
        "dest_port": 443
    }
    flow_res = fanos_predictor.predict_flow(flow_sample)
    
    result = {
        "url_benign": benign_res["label"],
        "url_benign_conf": float(benign_res["confidence"]),
        "url_phish": phish_res["label"],
        "url_phish_conf": float(phish_res["confidence"]),
        "flow_prediction": flow_res.prediction,
        "flow_confidence": float(flow_res.confidence),
        "flow_schema": getattr(flow_res, "feature_schema", "SURICATA_FLOW_NATIVE_V1")
    }
    print(json.dumps(result))

async def test_db_persistence():
    """Check 6: Database Persistence Check"""
    from app.db.base import AsyncSessionLocal
    from app.models.security import SecurityEvent
    from sqlalchemy import select

    async with AsyncSessionLocal() as session:
        stmt = (
            select(SecurityEvent)
            .where(SecurityEvent.sensor_source.in_(["suricata", "suricata-flow"]))
            .order_by(SecurityEvent.created_at.desc())
            .limit(1)
        )
        res = await session.execute(stmt)
        ev = res.scalar_one_or_none()
        if ev:
            print(json.dumps({
                "status": "found",
                "id": str(ev.id),
                "severity": ev.severity,
                "source_ip": ev.source_ip,
                "target": ev.target,
                "attack_type": ev.attack_type,
                "sensor_source": ev.sensor_source,
                "created_at": ev.created_at.isoformat() if ev.created_at else None
            }))
        else:
            print(json.dumps({"status": "not_found"}))

def generate_admin_token():
    """Check 8: Generate Valid JWT Token for Dashboard API Retrieval"""
    from app.core.security import create_access_token
    token = create_access_token("admin@fanos.local", claims={"role": "admin"})
    print(token)

def get_ingest_token():
    """Get the active backend Suricata ingestion token"""
    from app.core.config import get_settings
    settings = get_settings()
    print(settings.SURICATA_INGEST_TOKEN)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python verify_pipeline_helpers.py <ml|db|token|ingest-token>")
        sys.exit(1)
    
    cmd = sys.argv[1].lower()
    if cmd == "ml":
        test_ml_inference()
    elif cmd == "db":
        asyncio.run(test_db_persistence())
    elif cmd == "token":
        generate_admin_token()
    elif cmd == "ingest-token":
        get_ingest_token()
    else:
        print(f"Unknown command: {cmd}")
        sys.exit(1)
