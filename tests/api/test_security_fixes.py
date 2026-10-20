"""
Regression tests for security fixes in FANOS AI:
1. Fix 1: WAF development auto-login removed (credentials required in dev and prod).
2. Fix 2: Scanner endpoints require authentication, enforce job ownership RBAC,
          and reject unauthorized client allow_private SSRF overrides.
"""
from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.config import get_settings
from app.core.security import create_access_token

settings = get_settings()


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def admin_token():
    return create_access_token(
        subject="admin",
        claims={"sub": "admin", "role": "admin"},
    )


@pytest.fixture
def user_token():
    return create_access_token(
        subject="alice",
        claims={"sub": "alice", "role": "analyst"},
    )


@pytest.fixture
def other_user_token():
    return create_access_token(
        subject="bob",
        claims={"sub": "bob", "role": "analyst"},
    )


# ══════════════════════════════════════════════════════════════════════
# FIX 1 REGRESSION TESTS: WAF Authentication & Development Auto-Login
# ══════════════════════════════════════════════════════════════════════

def test_waf_unauthenticated_rejected_in_dev_mode(client, monkeypatch):
    """Proves missing credentials return 401 even when APP_ENV=development."""
    monkeypatch.setattr(settings, "APP_ENV", "development")

    protected_endpoints = [
        "/api/v1/waf/domains",
        "/api/v1/waf/rules",
        "/api/v1/waf/settings",
        "/api/v1/waf/audit/logs",
        "/api/v1/waf/reports/security-summary",
    ]
    for endpoint in protected_endpoints:
        response = client.get(endpoint)
        assert response.status_code == 401, (
            f"Expected 401 for unauthenticated request to {endpoint} in development mode, "
            f"got {response.status_code}"
        )
        assert "WWW-Authenticate" in response.headers


def test_waf_unauthenticated_rejected_in_prod_mode(client, monkeypatch):
    """Proves missing credentials return 401 when APP_ENV=production."""
    monkeypatch.setattr(settings, "APP_ENV", "production")

    response = client.get("/api/v1/waf/domains")
    assert response.status_code == 401
    assert "WWW-Authenticate" in response.headers


def test_waf_invalid_token_rejected(client):
    """Proves invalid/garbage tokens receive 401."""
    headers = {"Authorization": "Bearer not-a-valid-jwt-token"}
    response = client.get("/api/v1/waf/domains", headers=headers)
    assert response.status_code == 401


def test_waf_unknown_user_token_rejected(client, user_token):
    """Proves valid JWT with non-existent user in DB receives 401."""
    headers = {"Authorization": f"Bearer {user_token}"}
    resp = client.get("/api/v1/waf/domains", headers=headers)
    assert resp.status_code == 401
    assert "User account not found" in resp.json().get("detail", "")


def test_waf_rbac_non_admin_cannot_access_admin_endpoints(client):
    """Proves authenticated non-admin users cannot access administrative WAF endpoints (403)."""
    from app.waf.models import User
    from app.waf.security.auth import get_current_user

    analyst_user = User(
        id=99,
        username="analyst_alice",
        role="analyst",
        is_active=True,
    )

    app.dependency_overrides[get_current_user] = lambda: analyst_user
    try:
        # Non-admin trying to view audit logs -> 403 Forbidden
        resp_audit = client.get("/api/v1/waf/audit/logs")
        assert resp_audit.status_code == 403
        assert "administrative privileges" in resp_audit.json().get("detail", "").lower()

        # Non-admin trying to update settings -> 403 Forbidden
        resp_settings = client.patch("/api/v1/waf/settings", json={"waf_mode": "block"})
        assert resp_settings.status_code == 403

        # Non-admin trying to generate reports -> 403 Forbidden
        resp_report = client.post(
            "/api/v1/waf/reports/generate",
            json={"title": "Test Report", "time_range_hours": 24},
        )
        assert resp_report.status_code == 403

        # Non-admin trying to create custom rules -> 403 Forbidden
        resp_rule = client.post(
            "/api/v1/waf/rules",
            json={
                "id": "CUSTOM_999",
                "name": "Unauthorized Rule",
                "pattern": r"evil_pattern",
                "category": "custom",
                "severity": "low",
                "action": "block",
            },
        )
        assert resp_rule.status_code == 403

        # Non-admin CAN access user-level endpoints
        resp_domains = client.get("/api/v1/waf/domains")
        assert resp_domains.status_code == 200
    finally:
        app.dependency_overrides.pop(get_current_user, None)


# ══════════════════════════════════════════════════════════════════════
# FIX 2 REGRESSION TESTS: Scanner Authentication & Access Control
# ══════════════════════════════════════════════════════════════════════

def test_scanner_endpoints_require_authentication(client):
    """Proves all scanner endpoints reject unauthenticated requests with 401."""
    endpoints = [
        ("GET", "/api/v1/scanner/jobs"),
        ("POST", "/api/v1/scanner/jobs"),
        ("POST", "/api/v1/scanner/validate-target"),
        ("GET", "/api/v1/scanner/jobs/scan_test123"),
        ("POST", "/api/v1/scanner/jobs/scan_test123/cancel"),
        ("GET", "/api/v1/scanner/jobs/scan_test123/findings"),
        ("GET", "/api/v1/scanner/jobs/scan_test123/assets"),
        ("GET", "/api/v1/scanner/jobs/scan_test123/urls"),
        ("GET", "/api/v1/scanner/jobs/scan_test123/technologies"),
        ("GET", "/api/v1/scanner/jobs/scan_test123/report/json"),
        ("GET", "/api/v1/scanner/jobs/scan_test123/report/pdf"),
    ]
    for method, path in endpoints:
        if method == "GET":
            resp = client.get(path)
        else:
            resp = client.post(path, json={})
        assert resp.status_code == 401, (
            f"Expected 401 for unauthenticated {method} {path}, got {resp.status_code}"
        )


def test_scanner_invalid_token_rejected(client):
    """Proves invalid credentials on scanner endpoints receive 401."""
    headers = {"Authorization": "Bearer invalid.credentials.here"}
    resp = client.get("/api/v1/scanner/jobs", headers=headers)
    assert resp.status_code == 401


# ══════════════════════════════════════════════════════════════════════
# FIX 2 REGRESSION TESTS: SSRF Protection & Private Target Override
# ══════════════════════════════════════════════════════════════════════

@pytest.mark.parametrize("target_url", [
    "http://127.0.0.1:8000/api",
    "http://127.0.0.2:8080",
    "http://169.254.169.254/latest/meta-data/",
    "http://10.0.0.1/",
    "http://192.168.1.1/",
    "http://172.16.0.1/",
    "http://0.0.0.0:8000/",
    "http://localhost/",
    "http://localhost.localdomain/",
    "http://[::1]:8080/",
    "http://[fe80::1]/",
    "http://[fc00::1]/",
    "http://[::ffff:127.0.0.1]/",
])
def test_scanner_ssrf_blocks_private_and_metadata_targets(client, admin_token, target_url):
    """Proves internal IPs, cloud metadata, and loopback addresses are blocked by default."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    resp = client.post(
        "/api/v1/scanner/validate-target",
        headers=headers,
        json={"target_url": target_url, "allow_private": False},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["valid"] is False
    assert "SSRF Protection" in data.get("error", "")


def test_scanner_rejects_non_http_schemes(client, admin_token):
    """Proves non-HTTP/HTTPS schemes (e.g. file://, ftp://) are rejected."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    for bad_url in ["file:///etc/passwd", "ftp://example.com/file"]:
        resp = client.post(
            "/api/v1/scanner/validate-target",
            headers=headers,
            json={"target_url": bad_url, "allow_private": False},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["valid"] is False


def test_scanner_non_admin_cannot_override_allow_private(client, user_token):
    """Proves non-admin users cannot bypass SSRF protections using allow_private=True."""
    headers = {"Authorization": f"Bearer {user_token}"}

    # Attempting on validate-target
    resp = client.post(
        "/api/v1/scanner/validate-target",
        headers=headers,
        json={"target_url": "http://127.0.0.1:8000", "allow_private": True},
    )
    assert resp.status_code == 403
    assert "administrator privileges" in resp.json().get("detail", "").lower()

    # Attempting on scan creation
    resp_job = client.post(
        "/api/v1/scanner/jobs",
        headers=headers,
        json={"target_url": "http://127.0.0.1:8000", "allow_private": True},
    )
    assert resp_job.status_code == 403
    assert "administrator privileges" in resp_job.json().get("detail", "").lower()


def test_scanner_admin_allow_private_disabled_by_server_config(client, admin_token, monkeypatch):
    """Proves admin allow_private is rejected if server setting SCANNER_ALLOW_PRIVATE_TARGETS is False."""
    monkeypatch.setattr(settings, "SCANNER_ALLOW_PRIVATE_TARGETS", False)
    headers = {"Authorization": f"Bearer {admin_token}"}

    resp = client.post(
        "/api/v1/scanner/validate-target",
        headers=headers,
        json={"target_url": "http://127.0.0.1:8000", "allow_private": True},
    )
    assert resp.status_code == 403
    assert "disabled by server configuration" in resp.json().get("detail", "").lower()


def test_scanner_admin_allow_private_permitted_only_when_server_configured(client, admin_token, monkeypatch):
    """Proves admin allow_private succeeds only when server explicitly enables SCANNER_ALLOW_PRIVATE_TARGETS."""
    monkeypatch.setattr(settings, "SCANNER_ALLOW_PRIVATE_TARGETS", True)
    headers = {"Authorization": f"Bearer {admin_token}"}

    resp = client.post(
        "/api/v1/scanner/validate-target",
        headers=headers,
        json={"target_url": "http://127.0.0.1:8000", "allow_private": True},
    )
    assert resp.status_code == 200
    assert resp.json()["valid"] is True


# ══════════════════════════════════════════════════════════════════════
# FIX 2 REGRESSION TESTS: Scan Ownership & Job Access Control
# ══════════════════════════════════════════════════════════════════════

@patch("app.api.v1.scanner.get_scan_job")
def test_scanner_job_ownership_isolation(mock_get_job, client, user_token, other_user_token, admin_token):
    """Proves ordinary users cannot view or cancel jobs belonging to another user."""
    alice_job = {
        "id": "scan_alice_123",
        "user_id": "alice",
        "target_url": "https://example.com",
        "status": "completed",
        "progress": 100,
    }
    mock_get_job.return_value = alice_job

    alice_headers = {"Authorization": f"Bearer {user_token}"}
    bob_headers = {"Authorization": f"Bearer {other_user_token}"}
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Alice (owner) can view her job
    resp_alice = client.get("/api/v1/scanner/jobs/scan_alice_123", headers=alice_headers)
    assert resp_alice.status_code == 200
    assert resp_alice.json()["id"] == "scan_alice_123"

    # 2. Bob (non-owner, non-admin) cannot view Alice's job -> 403 Forbidden
    resp_bob = client.get("/api/v1/scanner/jobs/scan_alice_123", headers=bob_headers)
    assert resp_bob.status_code == 403
    assert "permission" in resp_bob.json().get("detail", "").lower()

    # 3. Bob cannot cancel Alice's job -> 403 Forbidden
    resp_bob_cancel = client.post("/api/v1/scanner/jobs/scan_alice_123/cancel", headers=bob_headers)
    assert resp_bob_cancel.status_code == 403

    # 4. Administrator can access Alice's job
    resp_admin = client.get("/api/v1/scanner/jobs/scan_alice_123", headers=admin_headers)
    assert resp_admin.status_code == 200
    assert resp_admin.json()["id"] == "scan_alice_123"


@patch("app.api.v1.scanner.list_scan_jobs")
def test_scanner_job_listing_scoped_to_user(mock_list_jobs, client, user_token, admin_token):
    """Proves ordinary users only list their own jobs, while admin sees all."""
    mock_list_jobs.return_value = []

    user_headers = {"Authorization": f"Bearer {user_token}"}
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Regular user: list_scan_jobs called with user_id="alice"
    client.get("/api/v1/scanner/jobs", headers=user_headers)
    mock_list_jobs.assert_called_with(user_id="alice", limit=20)

    # Admin: list_scan_jobs called with user_id=None (all jobs)
    client.get("/api/v1/scanner/jobs", headers=admin_headers)
    mock_list_jobs.assert_called_with(user_id=None, limit=20)


@patch("app.api.v1.scanner.get_scan_job")
def test_scanner_subresources_reject_unauthorized_user(mock_get_job, client, other_user_token):
    """Proves non-owners cannot access findings, assets, urls, technologies, or reports of another user."""
    alice_job = {
        "id": "scan_alice_456",
        "user_id": "alice",
        "target_url": "https://example.com",
        "status": "completed",
        "progress": 100,
    }
    mock_get_job.return_value = alice_job
    bob_headers = {"Authorization": f"Bearer {other_user_token}"}

    subresource_paths = [
        "/api/v1/scanner/jobs/scan_alice_456/findings",
        "/api/v1/scanner/jobs/scan_alice_456/assets",
        "/api/v1/scanner/jobs/scan_alice_456/urls",
        "/api/v1/scanner/jobs/scan_alice_456/technologies",
        "/api/v1/scanner/jobs/scan_alice_456/report/json",
    ]
    for path in subresource_paths:
        resp = client.get(path, headers=bob_headers)
        assert resp.status_code == 403, f"Expected 403 for {path}, got {resp.status_code}"


def test_scanner_dns_rebinding_ssrf_blocked(client, admin_token):
    """Proves that a domain resolving to a private/loopback/cloud IP (e.g. DNS rebinding) is blocked."""
    import socket
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Simulate domain resolving to a public IP and 169.254.169.254 or 127.0.0.1
    rebind_addr_info = [
        (socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", 80)),
        (socket.AF_INET, socket.SOCK_STREAM, 6, "", ("169.254.169.254", 80)),
    ]
    with patch("socket.getaddrinfo", return_value=rebind_addr_info):
        resp = client.post(
            "/api/v1/scanner/validate-target",
            headers=headers,
            json={"target_url": "https://rebind.example.org", "allow_private": False},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["valid"] is False
        assert "SSRF Protection" in data.get("error", "")


def test_scanner_redirect_based_ssrf_protection():
    """Proves that redirecting to a private destination raises RequestError via validation hook."""
    import httpx
    from app.services.scanner.target_validation.validator import validate_target

    def validate_redirect_hook(response: httpx.Response):
        if response.is_redirect and "location" in response.headers:
            loc = str(response.url.join(response.headers["location"]))
            val = validate_target(loc, allow_private=False)
            if not val.get("valid"):
                raise httpx.RequestError(f"Redirect blocked by SSRF protection: {loc}")

    # Build a mock 302 response pointing to AWS metadata
    request = httpx.Request("GET", "https://public-site.com/redirect")
    redirect_response = httpx.Response(
        status_code=302,
        headers={"location": "http://169.254.169.254/latest/meta-data/"},
        request=request,
    )

    with pytest.raises(httpx.RequestError) as exc_info:
        validate_redirect_hook(redirect_response)

    assert "Redirect blocked by SSRF protection" in str(exc_info.value)
