"""
Form Security & CSRF (Cross-Site Request Forgery) Assessment Engine
Audits HTML forms discovered during crawling for anti-CSRF tokens, plaintext credential submission, and insecure methods.
"""
import uuid

CSRF_TOKEN_NAMES = {
    'csrf', 'csrftoken', 'csrf_token', '_csrf', '_csrf_token',
    '_token', 'authenticity_token', 'anticrfs', 'token',
    'nonce', '_wpnonce', 'form_key', 'requestverificationtoken'
}

def check_forms_and_csrf(target_url: str, discovered_forms: list) -> list[dict]:
    """
    Evaluates discovered HTML forms for CSRF vulnerabilities and insecure configurations.
    """
    findings = []
    if not discovered_forms:
        return findings

    post_forms_missing_csrf = []
    insecure_password_forms = []

    for f in discovered_forms:
        action = f.get('action') or target_url
        method = (f.get('method') or 'GET').upper()
        inputs = f.get('inputs', [])
        
        # Check if form submits state-changing POST/PUT/DELETE
        if method in ('POST', 'PUT', 'DELETE', 'PATCH'):
            input_names = [inp.get('name', '').lower() for inp in inputs]
            has_csrf_token = any(
                any(token_pat in name for token_pat in CSRF_TOKEN_NAMES)
                for name in input_names
            )
            
            if not has_csrf_token:
                # Extract clean action name
                action_name = action.split('/')[-1].split('?')[0] or 'unknown'
                post_forms_missing_csrf.append({
                    'action': action,
                    'action_name': action_name,
                    'method': method,
                    'inputs_count': len(inputs),
                    'field_names': [inp.get('name') for inp in inputs[:5]]
                })

        # Check for password field submitted over HTTP
        has_password = any(inp.get('type') == 'password' for inp in inputs)
        if has_password and action.startswith('http://'):
            insecure_password_forms.append(action)

    # 1. Missing CSRF Token Finding
    if post_forms_missing_csrf:
        affected_actions = ', '.join([f['action_name'] for f in post_forms_missing_csrf[:5]])
        findings.append({
            'id': f"FND-CSRF-MISSING-{uuid.uuid4().hex[:8]}",
            'title': f"Missing CSRF Token in POST Form(s)",
            'severity': "Medium",
            'confidence': "Medium confidence",
            'category': "CSRF & Browser Attacks",
            'affected_asset': target_url,
            'affected_url': post_forms_missing_csrf[0]['action'],
            'http_method': "POST",
            'parameter': "CSRF Token",
            'description': f"Found {len(post_forms_missing_csrf)} HTML POST form(s) without a detectable CSRF token field. Affected actions: {affected_actions}.",
            'impact': "Forms lacking CSRF tokens can be submitted by malicious third-party websites on behalf of authenticated users, enabling state-changing attacks.",
            'remediation': "Add a cryptographically random CSRF token to every state-changing form. Validate the token server-side on submission. Use SameSite=Strict cookies as defence-in-depth.",
            'references': [
                {"title": "OWASP CSRF Prevention Cheat Sheet", "url": "https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html"},
                {"title": "CWE-352: Cross-Site Request Forgery", "url": "https://cwe.mitre.org/data/definitions/352.html"}
            ],
            'evidence': {
                'unprotected_forms_count': len(post_forms_missing_csrf),
                'forms': post_forms_missing_csrf[:5]
            },
            'scanner_module': "CSRFSecurityCheck"
        })

    # 2. Insecure Password Transmission
    if insecure_password_forms:
        findings.append({
            'id': f"FND-PWD-PLAINTEXT-{uuid.uuid4().hex[:8]}",
            'title': "Password Form Submits Over Insecure Plaintext HTTP",
            'severity': "Critical",
            'confidence': "Confirmed",
            'category': "Authentication & Form Security",
            'affected_asset': target_url,
            'affected_url': insecure_password_forms[0],
            'http_method': "POST",
            'parameter': "Password Input",
            'description': f"Detected login/credential form submitting password data over unencrypted HTTP: {insecure_password_forms[0]}.",
            'impact': "Plaintext credentials can be intercepted and harvested by any attacker on local Wi-Fi, routers, or internet service providers.",
            'remediation': "Ensure all authentication forms and submission targets strictly use HTTPS endpoints.",
            'references': [
                {"title": "CWE-319: Cleartext Transmission of Sensitive Information", "url": "https://cwe.mitre.org/data/definitions/319.html"}
            ],
            'evidence': {
                'insecure_actions': insecure_password_forms
            },
            'scanner_module': "CSRFSecurityCheck"
        })

    return findings
