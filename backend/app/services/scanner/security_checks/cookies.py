"""
Cookie Security Assessment Engine
Audits Set-Cookie headers for Secure, HttpOnly, and SameSite attributes.
"""
import uuid

SESSION_COOKIE_NAMES = {
    'session', 'sessionid', 'phpsessid', 'jsessionid', 'aspsessionid',
    'auth_token', 'jwt', 'token', 'connect.sid', 'laravel_session',
    'remember_token', 'user_session', 'csrftoken'
}

def check_cookie_security(target_url: str, headers: dict) -> list[dict]:
    """
    Audits cookie security flags from Set-Cookie headers.
    Redacts sensitive cookie values in stored evidence.
    """
    findings = []
    is_https = target_url.lower().startswith('https://')
    
    # Collect Set-Cookie headers (could be single string or list)
    set_cookies = []
    for k, v in headers.items():
        if k.lower() == 'set-cookie':
            if isinstance(v, list):
                set_cookies.extend(v)
            else:
                set_cookies.append(v)
                
    for raw_cookie in set_cookies:
        parts = [p.strip() for p in raw_cookie.split(';')]
        if not parts:
            continue
            
        cookie_kv = parts[0]
        cookie_name = cookie_kv.split('=')[0].strip() if '=' in cookie_kv else cookie_kv
        attributes = [p.lower() for p in parts[1:]]
        
        has_secure = any(a == 'secure' for a in attributes)
        has_httponly = any(a == 'httponly' for a in attributes)
        samesite_attr = next((a for a in attributes if a.startswith('samesite')), None)
        
        is_sensitive_candidate = cookie_name.lower() in SESSION_COOKIE_NAMES or 'sess' in cookie_name.lower() or 'auth' in cookie_name.lower()
        
        # 1. Missing Secure Flag on HTTPS
        if is_https and not has_secure:
            findings.append({
                'id': f"FND-COOKIE-SEC-{uuid.uuid4().hex[:8]}",
                'title': f"Cookie Missing 'Secure' Attribute: {cookie_name}",
                'severity': "Medium" if is_sensitive_candidate else "Low",
                'confidence': "Confirmed",
                'category': "Cookie Security",
                'affected_asset': target_url,
                'affected_url': target_url,
                'http_method': "GET",
                'parameter': cookie_name,
                'description': f"The cookie '{cookie_name}' was issued over HTTPS without the 'Secure' flag.",
                'impact': "Browsers will transmit this cookie over unencrypted HTTP connections if the user clicks a plain http:// link or is subjected to SSL stripping, exposing it to eavesdropping.",
                'remediation': f"Add the 'Secure' flag to the Set-Cookie header for '{cookie_name}'. Example:\nSet-Cookie: {cookie_name}=[REDACTED]; Secure; HttpOnly; SameSite=Lax",
                'references': [
                    {"title": "OWASP Session Management: Cookies", "url": "https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html#cookies"},
                    {"title": "CWE-614: Sensitive Cookie in HTTPS Session Without 'Secure' Attribute", "url": "https://cwe.mitre.org/data/definitions/614.html"}
                ],
                'evidence': {
                    'cookie_name': cookie_name,
                    'sanitized_cookie_header': f"{cookie_name}=[REDACTED_VALUE]; {'; '.join(parts[1:])}",
                    'missing_flags': ['Secure']
                },
                'scanner_module': "CookieSecurityCheck"
            })

        # 2. Missing HttpOnly Flag on Potential Session / Auth Cookies
        if is_sensitive_candidate and not has_httponly:
            findings.append({
                'id': f"FND-COOKIE-HTTPONLY-{uuid.uuid4().hex[:8]}",
                'title': f"Sensitive Cookie Missing 'HttpOnly' Attribute: {cookie_name}",
                'severity': "Medium",
                'confidence': "High confidence",
                'category': "Cookie Security",
                'affected_asset': target_url,
                'affected_url': target_url,
                'http_method': "GET",
                'parameter': cookie_name,
                'description': f"The cookie '{cookie_name}' appears to carry session or authentication data but lacks the 'HttpOnly' flag.",
                'impact': "JavaScript code running in the browser can access document.cookie, meaning any Cross-Site Scripting (XSS) vulnerability can immediately exfiltrate user session tokens.",
                'remediation': f"Add the 'HttpOnly' flag to the Set-Cookie directive:\nSet-Cookie: {cookie_name}=[REDACTED]; HttpOnly; Secure; SameSite=Lax",
                'references': [
                    {"title": "CWE-1004: Sensitive Cookie Without 'HttpOnly' Flag", "url": "https://cwe.mitre.org/data/definitions/1004.html"}
                ],
                'evidence': {
                    'cookie_name': cookie_name,
                    'sanitized_cookie_header': f"{cookie_name}=[REDACTED_VALUE]; {'; '.join(parts[1:])}",
                    'missing_flags': ['HttpOnly']
                },
                'scanner_module': "CookieSecurityCheck"
            })

        # 3. Missing or Permissive SameSite Attribute
        if not samesite_attr or 'samesite=none' in samesite_attr:
            findings.append({
                'id': f"FND-COOKIE-SAMESITE-{uuid.uuid4().hex[:8]}",
                'title': f"Cookie Missing Restrictive 'SameSite' Attribute: {cookie_name}",
                'severity': "Low",
                'confidence': "Confirmed",
                'category': "Cookie Security",
                'affected_asset': target_url,
                'affected_url': target_url,
                'http_method': "GET",
                'parameter': cookie_name,
                'description': f"The cookie '{cookie_name}' does not configure a restrictive 'SameSite' policy (Lax or Strict).",
                'impact': "The browser may attach this cookie to cross-site requests initiated by third-party origins, increasing vulnerability to Cross-Site Request Forgery (CSRF).",
                'remediation': f"Explicitly specify 'SameSite=Lax' (recommended default) or 'SameSite=Strict' on the cookie:\nSet-Cookie: {cookie_name}=[REDACTED]; SameSite=Lax; Secure",
                'references': [
                    {"title": "MDN SameSite cookies", "url": "https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite"}
                ],
                'evidence': {
                    'cookie_name': cookie_name,
                    'current_samesite': samesite_attr or "None specified",
                    'recommendation': "SameSite=Lax or SameSite=Strict"
                },
                'scanner_module': "CookieSecurityCheck"
            })

    return findings
