"""
Verification script for FANOS AI customer workflow:
Signup -> Login -> Service Authorizations -> Submit WAF Request ->
Pending Enforcement -> Admin Review/Approval -> Approved Dashboard Access ->
URL Threat Detection -> Incident Response.
"""

import sys
import os
import time

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__))))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_full_workflow():
    print("==================================================")
    print("FANOS AI - CUSTOMER WORKFLOW VERIFICATION TEST")
    print("==================================================")

    # 1. Signup / Register new customer
    ts = int(time.time())
    test_username = f"customer_{ts}"
    test_email = f"security_{ts}@enterprise-demo.com"
    test_password = "SecurePassword123!"

    print(f"\n[Step 1] Customer Registration (/api/v1/auth/register) for '{test_username}'...")
    reg_payload = {
        "full_name": f"Enterprise Security Team {ts}",
        "username": test_username,
        "email": test_email,
        "password": test_password,
        "confirm_password": test_password
    }

    reg_resp = client.post("/api/v1/auth/register", json=reg_payload)
    print(f"Register status: {reg_resp.status_code}")
    assert reg_resp.status_code in (200, 201), f"Registration failed: {reg_resp.text}"
    user_data = reg_resp.json()
    print(f"Registered user: {user_data.get('username')} ({user_data.get('email')}), Role: {user_data.get('role')}")
    assert user_data.get("username") == test_username

    # 2. Customer Login
    print(f"\n[Step 2] Customer Login (/api/v1/auth/login)...")
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"username": test_username, "password": test_password}
    )
    print(f"Login status: {login_resp.status_code}")
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    login_data = login_resp.json()
    token = login_data["access_token"]
    assert token, "No access token returned"
    print("Access token received successfully.")

    headers = {"Authorization": f"Bearer {token}"}

    # 3. Check Service Authorizations on Customer Dashboard
    print("\n[Step 3] Fetching Service Authorizations (/api/v1/customer/services/authorizations)...")
    auth_resp = client.get("/api/v1/customer/services/authorizations", headers=headers)
    assert auth_resp.status_code == 200, f"Auth check failed: {auth_resp.text}"
    auth_data = auth_resp.json()
    authorizations = auth_data["authorizations"]
    print(f"Authorizations returned for services: {list(authorizations.keys())}")
    for s_id in ["waf", "ids", "vulnerability-scanner", "url-detection", "incident-response"]:
        assert s_id in authorizations, f"Missing service {s_id}"
        print(f" - {s_id}: status={authorizations[s_id]['status']}")
        assert authorizations[s_id]["status"] == "NOT_REQUESTED"

    # 4. Attempt to access WAF service data before requesting (should be 403 Forbidden)
    print("\n[Step 4] Checking Gated Access before request (/api/v1/customer/services/waf/data)...")
    unauth_resp = client.get("/api/v1/customer/services/waf/data", headers=headers)
    print(f"Gated access status before request: {unauth_resp.status_code} (Expected 403)")
    assert unauth_resp.status_code == 403, "Should be forbidden before request"

    # 5. Submit WAF Service Request with registered assets
    print("\n[Step 5] Registering WAF Asset & Submitting Service Request (/api/v1/customer/services/waf/request)...")
    waf_req_payload = {
        "website_name": "Enterprise Banking Portal",
        "domain_name": f"secure-{ts}.enterprise-bank.com",
        "frontend_url": f"https://secure-{ts}.enterprise-bank.com",
        "backend_app_url": "https://app-internal.enterprise-bank.com",
        "backend_api_url": "https://api-internal.enterprise-bank.com/v1",
        "environment": "PRODUCTION",
        "protection_mode": "BLOCKING"
    }
    waf_req_resp = client.post("/api/v1/customer/services/waf/request", json=waf_req_payload, headers=headers)
    print(f"WAF request status: {waf_req_resp.status_code}")
    assert waf_req_resp.status_code in (200, 201), f"WAF request failed: {waf_req_resp.text}"
    waf_item = waf_req_resp.json()
    req_id = waf_item["id"]
    print(f"Created Service Request ID: {req_id}, Status: {waf_item.get('status')}")
    assert waf_item.get("status") in ("Pending", "PENDING")

    # 6. Verify status is now PENDING and service access is still gated
    auth_resp2 = client.get("/api/v1/customer/services/authorizations", headers=headers)
    authorizations2 = auth_resp2.json()["authorizations"]
    print(f"WAF status is now: {authorizations2['waf']['status']}")
    assert authorizations2['waf']['status'] == "PENDING"

    pending_access = client.get("/api/v1/customer/services/waf/data", headers=headers)
    print(f"Gated access while PENDING: {pending_access.status_code} (Expected 403)")
    assert pending_access.status_code == 403

    # 7. Admin Login & Request Review
    print("\n[Step 7] Admin Review & Approval (/api/v1/customer/admin/all-requests)...")
    admin_login = client.post(
        "/api/v1/auth/login",
        json={"username": "mulugeta.ababi", "password": "FanosAdmin2026!"}
    )
    if admin_login.status_code != 200:
        admin_login = client.post(
            "/api/v1/auth/login",
            json={"username": "fanos ai", "password": "Fanos4561644@"}
        )
    assert admin_login.status_code == 200, f"Admin login failed: {admin_login.text}"
    admin_token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Fetch all requests as admin
    admin_all_reqs = client.get("/api/v1/customer/admin/all-requests", headers=admin_headers)
    assert admin_all_reqs.status_code == 200
    all_requests = admin_all_reqs.json()
    matching_req = next((r for r in all_requests if r["id"] == req_id), None)
    assert matching_req is not None, f"Admin did not see request {req_id}"
    print(f"Admin found request: {matching_req['id']}, Service: {matching_req['service_type']}, Customer: {matching_req['customer_name']}")

    # Admin approves request with notes
    review_notes = "Verified domain DNS ownership and WAF reverse proxy routing. Approved for deployment."
    approve_resp = client.post(
        f"/api/v1/customer/admin/requests/{req_id}/approve?notes={review_notes}",
        headers=admin_headers
    )
    print(f"Admin approve status: {approve_resp.status_code}")
    assert approve_resp.status_code == 200
    approved_item = approve_resp.json()
    print(f"Approved status: {approved_item['status']}, Admin notes: {approved_item.get('admin_notes')}")
    assert approved_item["status"] == "Approved"

    # 8. Customer now accesses approved WAF Dashboard
    print("\n[Step 8] Customer accessing approved WAF Service Page (/api/v1/customer/services/waf/data)...")
    auth_resp3 = client.get("/api/v1/customer/services/authorizations", headers=headers)
    authorizations3 = auth_resp3.json()["authorizations"]
    print(f"WAF status is now: {authorizations3['waf']['status']}")
    assert authorizations3['waf']['status'] == "APPROVED"

    waf_data_resp = client.get("/api/v1/customer/services/waf/data", headers=headers)
    print(f"WAF data response status: {waf_data_resp.status_code}")
    assert waf_data_resp.status_code == 200
    waf_data = waf_data_resp.json()
    print("WAF Overview metrics:", waf_data.get("overview"))
    print("Protected Websites count:", len(waf_data.get("protected_websites", [])))
    print("WAF Assets count:", len(waf_data.get("waf_assets", [])))
    assert waf_data.get("overview") is not None
    assert len(waf_data.get("protected_websites", [])) > 0

    # 9. Test Malicious URL Detection workflow
    print("\n[Step 9] Customer Malicious URL Detection workflow...")
    # First verify gated
    url_gate_resp = client.post(
        "/api/v1/customer/services/url-detection/analyze",
        json={"urls": ["https://test.com"]},
        headers=headers
    )
    print(f"URL analysis before approval: {url_gate_resp.status_code} (Expected 403)")
    assert url_gate_resp.status_code == 403

    # Customer submits URL Detection request
    url_req_resp = client.post(
        "/api/v1/customer/services/url-detection/request",
        json={
            "organization_name": "Enterprise Banking Corp",
            "target_domains": "enterprise-bank.com, portal.enterprise-bank.com",
            "environment": "PRODUCTION",
            "description": "Monitor employee emails and external ingress for malicious links"
        },
        headers=headers
    )
    assert url_req_resp.status_code in (200, 201)
    url_req_id = url_req_resp.json()["id"]

    # Admin approves URL detection request
    client.post(
        f"/api/v1/customer/admin/requests/{url_req_id}/approve?notes=Approved for AI phishing analysis",
        headers=admin_headers
    )

    # Now Customer analyzes multiple URLs
    url_analyze_resp = client.post(
        "/api/v1/customer/services/url-detection/analyze",
        json={
            "urls": [
                "https://paypal-update-account-verification-login.com/auth",
                "https://github.com/mulugeta24/-FANOS-AI",
                "http://192.168.1.55/update.exe"
            ],
            "description": "Suspicious login links received in executive inbox"
        },
        headers=headers
    )
    print(f"URL analysis status: {url_analyze_resp.status_code}")
    assert url_analyze_resp.status_code == 200
    url_results = url_analyze_resp.json()
    print(f"Analyzed {url_results.get('count')} URLs:")
    for res in url_results.get("results", []):
        print(f" - {res.get('url')} => {res.get('prediction')} (confidence: {res.get('confidence')}%)")

    # Fetch customer URL detection data (verified customer isolated)
    url_data_resp = client.get("/api/v1/customer/services/url-detection/data", headers=headers)
    assert url_data_resp.status_code == 200
    customer_scans = url_data_resp.json().get("recent_scans", [])
    print(f"Total scans stored for this customer: {len(customer_scans)}")
    assert len(customer_scans) >= 3

    # 10. Test Security Incident Response workflow
    print("\n[Step 10] Submitting Security Incident Response workflow...")
    # Customer submits Incident Response service request
    ir_req_resp = client.post(
        "/api/v1/customer/services/incident-response/request",
        json={
            "organization_name": "Enterprise Banking Corp",
            "primary_contact": "SOC War Room <soc@enterprise-bank.com>",
            "critical_scope": "Core Banking API & Payment Gateways",
            "environment": "PRODUCTION",
            "description": "Incident response readiness for core banking systems"
        },
        headers=headers
    )
    assert ir_req_resp.status_code in (200, 201)
    ir_req_id = ir_req_resp.json()["id"]

    # Admin approves Incident Response service
    client.post(
        f"/api/v1/customer/admin/requests/{ir_req_id}/approve?notes=Approved 24/7 Incident Response SLA",
        headers=admin_headers
    )

    # Customer submits security incident
    inc_payload = {
        "title": "Suspected API Credential Leak",
        "description": "Anomalous tokens observed accessing private microservices endpoints.",
        "affected_target": "https://api-internal.enterprise-bank.com",
        "incident_type": "Data Breach Suspected",
        "severity": "Critical",
        "detection_time": "2026-10-23T06:30:00"
    }
    inc_resp = client.post(
        "/api/v1/customer/services/incident-response/submit",
        json=inc_payload,
        headers=headers
    )
    print(f"Incident submit status: {inc_resp.status_code}")
    assert inc_resp.status_code in (200, 201)
    inc_result = inc_resp.json()
    print(f"Logged Incident ID: {inc_result.get('incident', {}).get('id') or inc_result.get('id')}")

    # Fetch customer incident data
    ir_data_resp = client.get("/api/v1/customer/services/incident-response/data", headers=headers)
    assert ir_data_resp.status_code == 200
    my_incidents = ir_data_resp.json().get("my_incidents", [])
    print(f"Customer has {len(my_incidents)} reported incident(s).")
    assert any(i.get("title") == "Suspected API Credential Leak" for i in my_incidents)

    print("\n==================================================")
    print("ALL 10 VERIFICATION WORKFLOW STEPS PASSED PERFECTLY!")
    print("==================================================")

if __name__ == "__main__":
    test_full_workflow()
