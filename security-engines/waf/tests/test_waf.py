"""
FANOS WAF Test Suite
=====================

Automated tests for the FANOS Web Application Firewall.
Tests are designed to run against the Docker Compose WAF stack.

Prerequisites:
    - Docker Desktop running
    - docker compose up -d waf-test-app waf
    - pip install requests (or use standard library urllib)

Usage:
    python test_waf.py
    python test_waf.py --verbose
"""

import json
import subprocess
import sys
import time
import argparse
import urllib.request
import urllib.error
import urllib.parse

# ── Configuration ────────────────────────────────────────────
WAF_BASE_URL = "http://localhost:8080"
WAF_CONTAINER = "fanos-waf"
TEST_APP_CONTAINER = "fanos-waf-test-app"

# ── Test tracking ────────────────────────────────────────────
results = []
test_count = 0


def log(msg, level="INFO"):
    symbols = {"PASS": "✓", "FAIL": "✗", "INFO": "ℹ", "WARN": "⚠"}
    print(f"  {symbols.get(level, '·')} [{level}] {msg}")


def test(name):
    """Decorator to register and run a test."""
    def decorator(func):
        def wrapper():
            global test_count
            test_count += 1
            print(f"\n── Test {test_count}: {name} ──")
            try:
                func()
                results.append((name, "PASS", ""))
                log(f"{name} — PASSED", "PASS")
            except AssertionError as e:
                results.append((name, "FAIL", str(e)))
                log(f"{name} — FAILED: {e}", "FAIL")
            except Exception as e:
                results.append((name, "FAIL", str(e)))
                log(f"{name} — ERROR: {e}", "FAIL")
        wrapper.__name__ = name
        wrapper._test = True
        return wrapper
    return decorator


def http_get(path, headers=None, timeout=10):
    """Make an HTTP GET request, return (status_code, body)."""
    url = f"{WAF_BASE_URL}{path}"
    req = urllib.request.Request(url, headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", errors="replace")
    except Exception as e:
        return 0, str(e)


def http_post(path, data=None, content_type="application/x-www-form-urlencoded", timeout=10):
    """Make an HTTP POST request, return (status_code, body)."""
    url = f"{WAF_BASE_URL}{path}"
    if isinstance(data, str):
        data = data.encode("utf-8")
    req = urllib.request.Request(
        url, data=data,
        headers={"Content-Type": content_type},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", errors="replace")
    except Exception as e:
        return 0, str(e)


def docker_logs(container, tail=50):
    """Get recent Docker container logs."""
    try:
        result = subprocess.run(
            ["docker", "logs", "--tail", str(tail), container],
            capture_output=True, text=True, timeout=15,
        )
        return result.stdout + result.stderr
    except Exception as e:
        return f"Error getting logs: {e}"


# ═══════════════════════════════════════════════════════════
#  TESTS
# ═══════════════════════════════════════════════════════════

@test("WAF container is running")
def test_waf_running():
    result = subprocess.run(
        ["docker", "inspect", "-f", "{{.State.Running}}", WAF_CONTAINER],
        capture_output=True, text=True, timeout=10,
    )
    assert result.stdout.strip() == "true", \
        f"WAF container not running: {result.stderr.strip()}"


@test("Test app container is running")
def test_app_running():
    result = subprocess.run(
        ["docker", "inspect", "-f", "{{.State.Running}}", TEST_APP_CONTAINER],
        capture_output=True, text=True, timeout=10,
    )
    assert result.stdout.strip() == "true", \
        f"Test app container not running: {result.stderr.strip()}"


@test("Health endpoint returns 200")
def test_health_endpoint():
    status, body = http_get("/healthz")
    # /healthz may not have a dedicated handler — a 200 from the
    # proxied test app (or the WAF itself) indicates health
    assert status == 200, f"Expected 200, got {status}: {body[:200]}"


@test("Normal GET request passes through WAF")
def test_normal_get():
    status, body = http_get("/")
    assert status == 200, f"Expected 200, got {status}"
    assert "FANOS WAF Test" in body, "Response doesn't contain expected test app content"


@test("Normal POST request passes through WAF")
def test_normal_post():
    status, body = http_post("/submit", data="message=Hello+World")
    # nginx:alpine returns 405 for POST to static files, that's expected
    # The key is that the WAF doesn't block it (403)
    assert status != 403, f"WAF blocked a normal POST request (got {status})"
    log(f"POST /submit returned {status} (not blocked by WAF)", "INFO")


@test("SQL injection is detected and blocked")
def test_sqli_blocked():
    # Classic SQL injection payload
    payload = "1' OR '1'='1"
    encoded = urllib.parse.quote(payload)
    status, body = http_get(f"/search?q={encoded}")
    assert status == 403, \
        f"SQL injection not blocked — expected 403, got {status}"


@test("XSS attack is detected and blocked")
def test_xss_blocked():
    payload = "<script>alert(document.cookie)</script>"
    encoded = urllib.parse.quote(payload)
    status, body = http_get(f"/search?q={encoded}")
    assert status == 403, \
        f"XSS not blocked — expected 403, got {status}"


@test("Command injection is detected and blocked")
def test_command_injection_blocked():
    payload = "; cat /etc/passwd"
    encoded = urllib.parse.quote(payload)
    status, body = http_get(f"/search?q={encoded}")
    assert status == 403, \
        f"Command injection not blocked — expected 403, got {status}"


@test("Path traversal is detected and blocked")
def test_path_traversal_blocked():
    status, body = http_get("/../../etc/passwd")
    assert status == 403, \
        f"Path traversal not blocked — expected 403, got {status}"


@test("Audit log contains ModSecurity entries")
def test_audit_log_generated():
    logs = docker_logs(WAF_CONTAINER, tail=100)
    # ModSecurity JSON audit logs contain "transaction" or "messages"
    has_modsec = (
        "ModSecurity" in logs
        or "transaction" in logs
        or '"messages"' in logs
        or "id \"9" in logs
        or "Access denied" in logs
    )
    assert has_modsec, \
        "No ModSecurity audit entries found in WAF container logs"
    log("ModSecurity audit log entries detected", "INFO")


@test("Event model can create and serialize events")
def test_event_model():
    # Add the app directory to path for import
    waf_app_dir = str(
        subprocess.run(
            ["python", "-c", "import os; print(os.path.abspath('security-engines/waf/app'))"],
            capture_output=True, text=True, cwd=get_project_root(),
        ).stdout.strip()
    )
    sys.path.insert(0, waf_app_dir)

    try:
        from event_model import (
            FanosWafEvent, classify_rule_source,
            RuleSource, map_severity, Severity,
        )

        # Test rule source classification
        assert classify_rule_source("9500001") == RuleSource.FANOS_CUSTOM
        assert classify_rule_source("942100") == RuleSource.OWASP_CRS

        # Test severity mapping
        assert map_severity("2") == Severity.CRITICAL
        assert map_severity("4") == Severity.MEDIUM

        # Test event creation and serialization
        event = FanosWafEvent(
            source_ip="192.168.1.100",
            http_method="GET",
            request_uri="/search?q=test",
            rule_id="9500001",
            rule_message="FANOS: SQL injection attempt",
            severity="CRITICAL",
            action="BLOCK",
            status_code=403,
        )

        json_str = event.to_json()
        data = json.loads(json_str)
        assert data["source_ip"] == "192.168.1.100"
        assert data["rule_id"] == "9500001"
        assert data["action"] == "BLOCK"

        log("Event model serialization verified", "INFO")
    finally:
        if waf_app_dir in sys.path:
            sys.path.remove(waf_app_dir)


def get_project_root():
    """Find the FANOS project root."""
    import os
    # Walk up from this script's location
    current = os.path.dirname(os.path.abspath(__file__))
    while current != os.path.dirname(current):
        if os.path.exists(os.path.join(current, "docker-compose.yml")):
            return current
        current = os.path.dirname(current)
    return os.getcwd()


# ═══════════════════════════════════════════════════════════
#  RUNNER
# ═══════════════════════════════════════════════════════════

def wait_for_waf(max_wait=60):
    """Wait for the WAF to become responsive."""
    print("\nWaiting for WAF to become responsive...")
    start = time.time()
    while time.time() - start < max_wait:
        try:
            status, _ = http_get("/", timeout=3)
            if status in (200, 403):
                log(f"WAF responded with HTTP {status}", "INFO")
                return True
        except Exception:
            pass
        time.sleep(2)
        elapsed = int(time.time() - start)
        if elapsed % 10 == 0:
            log(f"Still waiting... ({elapsed}s)", "WARN")
    return False


def main():
    parser = argparse.ArgumentParser(description="FANOS WAF Test Suite")
    parser.add_argument("--verbose", "-v", action="store_true")
    parser.add_argument("--skip-wait", action="store_true",
                        help="Skip waiting for WAF to be ready")
    args = parser.parse_args()

    print("╔══════════════════════════════════════════════════╗")
    print("║       FANOS WAF — Automated Test Suite          ║")
    print("╚══════════════════════════════════════════════════╝")

    if not args.skip_wait:
        if not wait_for_waf():
            print("\n✗ WAF did not become responsive within timeout.")
            print("  Make sure to run: docker compose up -d waf-test-app waf")
            sys.exit(1)

    # Collect and run all test functions
    all_tests = [
        test_waf_running,
        test_app_running,
        test_health_endpoint,
        test_normal_get,
        test_normal_post,
        test_sqli_blocked,
        test_xss_blocked,
        test_command_injection_blocked,
        test_path_traversal_blocked,
        test_audit_log_generated,
        test_event_model,
    ]

    for test_fn in all_tests:
        test_fn()

    # ── Summary ──────────────────────────────────────────────
    print("\n" + "═" * 54)
    print("  TEST SUMMARY")
    print("═" * 54)

    passed = sum(1 for _, s, _ in results if s == "PASS")
    failed = sum(1 for _, s, _ in results if s == "FAIL")

    for name, status, error in results:
        symbol = "✓" if status == "PASS" else "✗"
        line = f"  {symbol} {name}"
        if error:
            line += f"  — {error[:80]}"
        print(line)

    print(f"\n  Total: {len(results)} | Passed: {passed} | Failed: {failed}")

    if failed == 0:
        print("\n  🎉 All tests passed!")
    else:
        print(f"\n  ⚠ {failed} test(s) failed.")

    print()
    sys.exit(0 if failed == 0 else 1)


if __name__ == "__main__":
    main()
