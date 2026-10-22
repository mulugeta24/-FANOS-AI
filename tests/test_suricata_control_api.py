"""
Unit tests for Suricata Process Controller API
==============================================
Verifies:
1. GET /api/v1/suricata/control/status returns operational status, mode, and interface
2. POST /api/v1/suricata/control/simulate injects and stores a realistic test alert
3. GET /api/v1/suricata/control/logs returns collector logs array
"""
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.security import create_access_token


@pytest.mark.anyio
async def test_suricata_control_status_endpoint():
    """Verify /suricata/control/status returns operational mode and process state."""
    admin_token = create_access_token("admin@fanos.local", claims={"role": "admin"})
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            "/api/v1/suricata/control/status",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "mode" in data
        assert data["mode"] in ("LIVE", "PAUSED", "OFFLINE")
        assert "interface" in data
        assert "suricata_running" in data
        assert "collector_running" in data


@pytest.mark.anyio
async def test_suricata_control_simulate_endpoint():
    """Verify /suricata/control/simulate creates and persists a simulated test alert."""
    admin_token = create_access_token("admin@fanos.local", claims={"role": "admin"})
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/suricata/control/simulate?attack_type=log4j",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "event_id" in data
        assert "severity" in data
        assert data["severity"] in ("CRITICAL", "HIGH", "MEDIUM", "LOW")


@pytest.mark.anyio
async def test_suricata_control_logs_endpoint():
    """Verify /suricata/control/logs returns an array of log lines."""
    admin_token = create_access_token("admin@fanos.local", claims={"role": "admin"})
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            "/api/v1/suricata/control/logs?limit=20",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "logs" in data
        assert isinstance(data["logs"], list)
