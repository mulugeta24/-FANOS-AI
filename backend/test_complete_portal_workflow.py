"""
Complete Automated Verification Script for:
FANOS AI Customer Authentication, Service Requests & Private Customer Portal
Tests all 19 scenarios required by the project specifications.
"""
import asyncio
import sys
import uuid
import httpx
from app.main import app
from app.core.security import verify_password
from app.db.base import AsyncSessionLocal
from app.models.security import User, ServiceRequest, RequestAsset, RequestHistory
from sqlalchemy import select, func


async def run_tests():
    print("=" * 70)
    print("🚀 FANOS AI — Customer Portal & Authentication Workflow Tests")
    print("=" * 70)

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # Generate unique test customer credentials
        suffix = uuid.uuid4().hex[:6]
        cust_a_email = f"customer_a_{suffix}@example.com"
        cust_a_user = f"cust_a_{suffix}"
        cust_a_pwd = "PasswordA123!"

        cust_b_email = f"customer_b_{suffix}@example.com"
        cust_b_user = f"cust_b_{suffix}"
        cust_b_pwd = "PasswordB123!"

        # ── Test 1: Customer A registers with unique email ─────────
        print("\n[Test 1] Customer A registers with unique email...")
        res = await client.post("/api/auth/register", json={
            "full_name": "Customer Alpha",
            "username": cust_a_user,
            "email": cust_a_email,
            "password": cust_a_pwd,
            "confirm_password": cust_a_pwd,
            "organization_name": "Alpha Corp",
            "role": "customer",
        })
        assert res.status_code == 201, f"Expected 201, got {res.status_code}: {res.text}"
        data_a = res.json()
        cust_a_id = data_a["id"]
        assert cust_a_id, "Customer ID should be returned"
        print(f"  ✓ Customer A created: ID={cust_a_id}, Email={cust_a_email}")

        # ── Test 2: Duplicate email registration is rejected ──────
        print("\n[Test 2] Duplicate email registration is rejected...")
        res_dup = await client.post("/api/auth/register", json={
            "full_name": "Duplicate User",
            "username": f"dup_{suffix}",
            "email": cust_a_email,
            "password": "SomePassword123!",
            "confirm_password": "SomePassword123!",
        })
        assert res_dup.status_code == 400, f"Expected 400 for duplicate email, got {res_dup.status_code}"
        print(f"  ✓ Duplicate email rejected: {res_dup.json().get('detail')}")

        # ── Test 3: Customer A logs in successfully ───────────────
        print("\n[Test 3] Customer A logs in successfully...")
        res_login = await client.post("/api/auth/login", json={
            "username": cust_a_email,
            "password": cust_a_pwd,
        })
        assert res_login.status_code == 200, f"Expected 200, got {res_login.status_code}: {res_login.text}"
        token_a = res_login.json()["access_token"]
        assert token_a, "Bearer token must be present"
        headers_a = {"Authorization": f"Bearer {token_a}"}
        print(f"  ✓ Customer A logged in. JWT token obtained.")

        # ── Test 4: Cannot access customer dashboard without login ─
        print("\n[Test 4] Cannot access dashboard without login...")
        res_unauth = await client.get("/api/customer/my-requests")
        assert res_unauth.status_code == 401, f"Expected 401 Unauthorized, got {res_unauth.status_code}"
        print(f"  ✓ Unauthenticated access rejected with 401 Unauthorized.")

        # ── Test 5: Customer A submits WAF request ────────────────
        print("\n[Test 5] Customer A submits WAF request...")
        res_waf = await client.post("/api/customer/services/waf/request", headers=headers_a, json={
            "website_name": "Alpha Customer Portal",
            "domain_name": "alpha.example.com",
            "frontend_url": "https://alpha.example.com",
            "backend_app_url": "http://10.0.1.50:8000",
            "backend_api_url": "http://10.0.1.50:8000/api",
            "environment": "PRODUCTION",
            "protection_mode": "MONITOR",
        })
        assert res_waf.status_code == 201, f"Expected 201, got {res_waf.status_code}: {res_waf.text}"
        waf_req = res_waf.json()
        waf_req_id = waf_req["id"]
        waf_req_num = waf_req["request_number"]
        print(f"  ✓ WAF request created: {waf_req_num} (ID: {waf_req_id})")

        # ── Test 6: WAF request is saved under authenticated customer ID ─
        print("\n[Test 6] Verify WAF request saved under authenticated customer ID...")
        async with AsyncSessionLocal() as s:
            db_req = await s.get(ServiceRequest, uuid.UUID(waf_req_id))
            assert db_req is not None, "Request should be in database"
            assert str(db_req.customer_id) == str(cust_a_id) or str(db_req.user_id) == str(cust_a_id), "Saved under Customer A ID"
            assert db_req.status in ("Pending", "Pending Review")
            # Check RequestAsset and RequestHistory
            r_assets = (await s.execute(select(RequestAsset).where(RequestAsset.request_id == db_req.id))).scalars().all()
            assert len(r_assets) > 0, "Request asset should be recorded"
            r_hist = (await s.execute(select(RequestHistory).where(RequestHistory.request_id == db_req.id))).scalars().all()
            assert len(r_hist) > 0, "Request history should be recorded"
        print(f"  ✓ Verified in DB: customer_id={cust_a_id}, assets count={len(r_assets)}, history count={len(r_hist)}")

        # ── Test 7: Customer A sees their WAF request ──────────────
        print("\n[Test 7] Customer A sees their WAF request in /my-requests...")
        res_my_reqs = await client.get("/api/customer/my-requests", headers=headers_a)
        assert res_my_reqs.status_code == 200
        req_list_a = res_my_reqs.json()
        req_ids_a = [r["id"] for r in req_list_a]
        assert waf_req_id in req_ids_a, "Customer A must see their WAF request"
        print(f"  ✓ Customer A retrieved {len(req_list_a)} request(s), including WAF request {waf_req_num}.")

        # ── Test 8 & 9: Customer A logs out and logs back in ──────
        print("\n[Test 8 & 9] Customer A logs out, logs back in, and verifies request persists...")
        await client.post("/api/auth/logout", headers=headers_a)
        # Login again
        res_relogin = await client.post("/api/auth/login", json={
            "username": cust_a_email,
            "password": cust_a_pwd,
        })
        assert res_relogin.status_code == 200
        token_a2 = res_relogin.json()["access_token"]
        headers_a2 = {"Authorization": f"Bearer {token_a2}"}
        res_my_reqs2 = await client.get("/api/customer/my-requests", headers=headers_a2)
        assert res_my_reqs2.status_code == 200
        req_ids_a2 = [r["id"] for r in res_my_reqs2.json()]
        assert waf_req_id in req_ids_a2, "Requests must persist after logout and login"
        print(f"  ✓ Requests persist seamlessly after re-authentication.")

        # ── Test 10: Customer A submits an IDS request ────────────
        print("\n[Test 10] Customer A submits an IDS request...")
        res_ids = await client.post("/api/customer/services/ids/request", headers=headers_a2, json={
            "organization_name": "Alpha Corp",
            "network_name": "Alpha Internal Network",
            "network_cidr": "10.0.0.0/16",
            "sensor_name": "Alpha-Suricata-01",
            "sensor_ip": "10.0.0.10",
            "environment": "PRODUCTION",
            "monitoring_description": "Core VPC network monitoring",
        })
        assert res_ids.status_code == 201
        ids_req = res_ids.json()
        ids_req_id = ids_req["id"]
        print(f"  ✓ IDS request created: {ids_req['request_number']} (ID: {ids_req_id})")

        # ── Test 11: Customer A sees both requests ────────────────
        print("\n[Test 11] Customer A sees both requests...")
        res_both = await client.get("/api/customer/my-requests", headers=headers_a2)
        both_ids = [r["id"] for r in res_both.json()]
        assert waf_req_id in both_ids and ids_req_id in both_ids
        print(f"  ✓ Customer A has {len(both_ids)} requests (WAF and IDS).")

        # ── Register Customer B ───────────────────────────────────
        print("\n[Register Customer B] Registering Customer B...")
        res_b = await client.post("/api/auth/register", json={
            "full_name": "Customer Beta",
            "username": cust_b_user,
            "email": cust_b_email,
            "password": cust_b_pwd,
            "confirm_password": cust_b_pwd,
            "organization_name": "Beta Ltd",
            "role": "customer",
        })
        assert res_b.status_code == 201
        cust_b_id = res_b.json()["id"]

        res_b_login = await client.post("/api/auth/login", json={
            "username": cust_b_email,
            "password": cust_b_pwd,
        })
        token_b = res_b_login.json()["access_token"]
        headers_b = {"Authorization": f"Bearer {token_b}"}
        print(f"  ✓ Customer B registered: ID={cust_b_id}, logged in.")

        # Customer B submits Vulnerability Scanner request
        res_scan_b = await client.post("/api/customer/services/vulnerability-scanner/request", headers=headers_b, json={
            "website_name": "Beta E-Commerce",
            "domain": "beta.example.com",
            "target_url": "https://beta.example.com",
            "application_name": "Beta Storefront",
            "environment": "PRODUCTION",
            "authorized": True,
        })
        assert res_scan_b.status_code == 201
        b_scan_id = res_scan_b.json()["id"]
        print(f"  ✓ Customer B submitted Vulnerability Scanner request ID: {b_scan_id}")

        # ── Test 12: Customer Isolation — Customer A cannot see Customer B's requests ──
        print("\n[Test 12] Customer A cannot see Customer B's requests...")
        res_a_view = await client.get("/api/customer/my-requests", headers=headers_a2)
        a_seen = [r["id"] for r in res_a_view.json()]
        assert b_scan_id not in a_seen, "Customer A MUST NOT see Customer B's request!"

        res_b_view = await client.get("/api/customer/my-requests", headers=headers_b)
        b_seen = [r["id"] for r in res_b_view.json()]
        assert waf_req_id not in b_seen, "Customer B MUST NOT see Customer A's WAF request!"
        assert ids_req_id not in b_seen, "Customer B MUST NOT see Customer A's IDS request!"
        print(f"  ✓ STRICT ISOLATION CONFIRMED: Customer A sees {len(a_seen)} reqs, Customer B sees {len(b_seen)} reqs. No cross-customer leakage.")

        # ── Test 13: Customer A cannot access Customer B's request details ──
        print("\n[Test 13] Customer A cannot access Customer B's request details...")
        res_cross_get = await client.get(f"/api/customer/my-requests/{b_scan_id}", headers=headers_a2)
        assert res_cross_get.status_code in (403, 404), f"Expected 403/404, got {res_cross_get.status_code}"
        print(f"  ✓ Cross-customer detail view rejected with status {res_cross_get.status_code}.")

        # ── Test 14: Customer A cannot cancel/update Customer B's requests ──
        print("\n[Test 14] Customer A cannot cancel/delete Customer B's requests...")
        res_cross_del = await client.delete(f"/api/customer/my-requests/{b_scan_id}", headers=headers_a2)
        assert res_cross_del.status_code in (403, 404), f"Expected 403/404, got {res_cross_del.status_code}"
        print(f"  ✓ Cross-customer delete/cancel rejected with status {res_cross_del.status_code}.")

        # ── Test 15: Customer cannot approve requests ─────────────
        print("\n[Test 15] Customer cannot approve requests...")
        res_cust_approve = await client.post(f"/api/admin/service-requests/{waf_req_id}/review", headers=headers_a2, json={
            "action": "approve",
            "notes": "Hacked approval",
        })
        assert res_cust_approve.status_code == 403, f"Expected 403 Forbidden for customer calling admin endpoint, got {res_cust_approve.status_code}"
        print(f"  ✓ Customer authorization block confirmed: 403 Forbidden.")

        # ── Test 16: Admin can approve a request ──────────────────
        print("\n[Test 16] Admin can approve a request...")
        admin_login = await client.post("/api/auth/login", json={
            "username": "mulugeta.ababi",
            "password": "FanosAdmin2026!",
        })
        assert admin_login.status_code == 200, f"Admin login failed: {admin_login.text}"
        admin_token = admin_login.json()["access_token"]
        headers_admin = {"Authorization": f"Bearer {admin_token}"}

        admin_note = "Approved by SOC Lead Mulugeta Ababi. Enterprise protection active."
        res_admin_app = await client.post(f"/api/admin/service-requests/{waf_req_id}/review", headers=headers_admin, json={
            "action": "approve",
            "notes": admin_note,
        })
        assert res_admin_app.status_code == 200, f"Expected 200, got {res_admin_app.status_code}: {res_admin_app.text}"
        app_data = res_admin_app.json()
        assert app_data["status"] == "Approved", f"Expected Approved, got {app_data['status']}"
        assert app_data["admin_notes"] == admin_note
        print(f"  ✓ Request {waf_req_num} successfully approved by Administrator.")

        # ── Test 17: Admin can reject a request with review notes ─
        print("\n[Test 17] Admin can reject a request with review notes...")
        rej_note = "Target CIDR 10.0.0.0/16 is reserved. Please provide DMZ sensor subnet."
        res_admin_rej = await client.post(f"/api/admin/service-requests/{ids_req_id}/review", headers=headers_admin, json={
            "action": "reject",
            "notes": rej_note,
        })
        assert res_admin_rej.status_code == 200
        rej_data = res_admin_rej.json()
        assert rej_data["status"] == "Rejected"
        assert rej_data["admin_notes"] == rej_note
        print(f"  ✓ Request {ids_req['request_number']} successfully rejected with admin notes.")

        # ── Test 18: Customer sees updated status and review notes ─
        print("\n[Test 18] Customer A sees updated status and review notes...")
        res_check_a = await client.get(f"/api/customer/my-requests/{waf_req_id}", headers=headers_a2)
        assert res_check_a.status_code == 200
        detail_waf = res_check_a.json()
        assert detail_waf["status"] == "Approved"
        assert detail_waf["admin_notes"] == admin_note
        assert len(detail_waf.get("history", [])) >= 2, "History must show initial and approved states"

        res_check_ids = await client.get(f"/api/customer/my-requests/{ids_req_id}", headers=headers_a2)
        assert res_check_ids.status_code == 200
        detail_ids = res_check_ids.json()
        assert detail_ids["status"] == "Rejected"
        assert detail_ids["admin_notes"] == rej_note
        print(f"  ✓ Customer sees Approved status on WAF and Rejected status with notes on IDS.")

        # ── Test 19: Passwords stored securely (hashed with bcrypt) ─
        print("\n[Test 19] Passwords stored securely (hashed)...")
        async with AsyncSessionLocal() as s:
            u_db = (await s.execute(select(User).where(User.username == cust_a_user))).scalar_one()
            assert u_db.password_hash != cust_a_pwd, "Password must not be stored in plaintext"
            assert u_db.password_hash.startswith("$2b$") or u_db.password_hash.startswith("$2a$"), "Must be bcrypt hash"
            assert verify_password(cust_a_pwd, u_db.password_hash) is True
        print(f"  ✓ Passwords securely hashed with bcrypt in database.")

        print("\n" + "=" * 70)
        print("🎉 ALL 19 BACKEND WORKFLOW TESTS PASSED PERFECTLY!")
        print("=" * 70)


if __name__ == "__main__":
    asyncio.run(run_tests())
