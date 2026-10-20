"""
Test unified WAF API endpoints hosted in FANOS AI Backend (Port 8000).
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_waf_health(client):
    response = client.get("/api/v1/waf/health")
    assert response.status_code == 200
    data = response.json()
    assert data.get("status") == "healthy"


def test_waf_stats_summary(client):
    response = client.get("/api/v1/waf/stats")
    assert response.status_code == 200
    data = response.json()
    assert "total_inspected" in data
    assert "total_allowed" in data
    assert "total_blocked" in data
    assert "active_rules_count" in data


def test_waf_inspect_sqli_attack(client):
    payload = {
        "client_ip": "192.168.1.100",
        "method": "GET",
        "path": "/products",
        "query_params": {"id": "1' UNION SELECT username, password FROM users--"},
        "headers": {"Host": "fanos-sec.vercel.app"},
        "body": "",
    }
    response = client.post("/api/v1/waf/inspect", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data.get("decision") in ("BLOCK", "MONITOR")
    assert data.get("risk_score") > 0
    assert len(data.get("findings", [])) > 0


@pytest.fixture(scope="module")
def admin_headers(client):
    res = client.post(
        "/waf-api/auth/login",
        json={"username": "admin", "password": "ChangeMeImmediately123!"},
    )
    assert res.status_code == 200
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_waf_domains_list(client, admin_headers):
    unauth_resp = client.get("/api/v1/waf/domains")
    assert unauth_resp.status_code == 401

    response = client.get("/api/v1/waf/domains", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert any(d.get("domain_name") in ("localhost", "127.0.0.1") for d in data)


def test_waf_rules_list(client, admin_headers):
    unauth_resp = client.get("/api/v1/waf/rules")
    assert unauth_resp.status_code == 401

    response = client.get("/api/v1/waf/rules", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 10


def test_waf_settings(client, admin_headers):
    unauth_resp = client.get("/api/v1/waf/settings")
    assert unauth_resp.status_code == 401

    response = client.get("/api/v1/waf/settings", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert "waf_mode" in data
    assert "block_threshold" in data


def test_waf_direct_prefix(client):
    # Verifies /waf-api direct mount works identically to /api/v1/waf
    response = client.get("/waf-api/stats")
    assert response.status_code == 200
    data = response.json()
    assert "total_inspected" in data


def test_waf_login(client):
    response = client.post(
        "/waf-api/auth/login",
        json={"username": "admin", "password": "ChangeMeImmediately123!"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data.get("role") == "admin"
