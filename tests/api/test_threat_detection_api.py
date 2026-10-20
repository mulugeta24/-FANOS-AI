"""
Integration Tests for Unified Threat Detection & Scanner API Endpoints
"""
import pytest
import os
import sys
from fastapi.testclient import TestClient

backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "backend"))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from app.main import app
from app.core.security import create_access_token


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def auth_headers():
    token = create_access_token(
        subject="test_analyst",
        claims={"sub": "test_analyst", "role": "analyst"},
    )
    return {"Authorization": f"Bearer {token}"}


def test_health_endpoints(client):
    """Verify health endpoints accessible directly and through /api proxy."""
    r1 = client.get("/health")
    assert r1.status_code == 200
    assert r1.json()["status"] == "healthy"

    r2 = client.get("/api/health")
    assert r2.status_code == 200
    assert r2.json()["status"] == "healthy"


def test_analyze_url_endpoint(client):
    """Verify /api/v1/threat-detection/analyze returns full schema."""
    resp = client.post(
        "/api/v1/threat-detection/analyze",
        json={"url": "https://paypal-security-account.xyz/login", "skip_vt": True},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "url" in data
    assert "final_verdict" in data
    assert "ml_prediction" in data
    assert "ml_confidence" in data
    assert "ml_probabilities" in data
    assert "features" in data
    assert len(data["features"]) == 17


def test_legacy_scan_endpoint(client):
    """Verify /api/scan backward compatibility for legacy callers and bot."""
    resp = client.post(
        "/api/scan",
        json={"url": "https://example.com", "skip_vt": True},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "final_verdict" in data
    assert "ml_prediction" in data


def test_scans_and_stats_endpoints(client):
    """Verify scans history and aggregated telemetry endpoints."""
    r_scans = client.get("/api/v1/threat-detection/scans?limit=10")
    assert r_scans.status_code == 200
    assert isinstance(r_scans.json(), list)

    r_stats = client.get("/api/v1/threat-detection/stats")
    assert r_stats.status_code == 200
    stats = r_stats.json()
    assert "total_scans" in stats
    assert "ml_status" in stats


def test_scanner_target_validation(client, auth_headers):
    """Verify scanner SSRF target validation requires auth and enforces SSRF protection."""
    # Unauthenticated attempt must be rejected with 401
    r_unauth = client.post(
        "/api/v1/scanner/validate-target",
        json={"target_url": "https://example.com", "allow_private": False},
    )
    assert r_unauth.status_code == 401

    # Safe public target with authentication
    r_valid = client.post(
        "/api/v1/scanner/validate-target",
        headers=auth_headers,
        json={"target_url": "https://example.com", "allow_private": False},
    )
    assert r_valid.status_code == 200
    assert r_valid.json()["valid"] is True

    # Cloud metadata SSRF attempt must be blocked
    r_blocked = client.post(
        "/api/v1/scanner/validate-target",
        headers=auth_headers,
        json={"target_url": "http://169.254.169.254/latest/meta-data/", "allow_private": False},
    )
    assert r_blocked.status_code == 200
    assert r_blocked.json()["valid"] is False
    assert "restricted" in r_blocked.json()["error"].lower() or "ssrf" in r_blocked.json()["error"].lower()
