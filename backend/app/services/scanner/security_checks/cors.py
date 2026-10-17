"""
CORS (Cross-Origin Resource Sharing) Assessment Engine
Evaluates Access-Control-Allow-Origin, Access-Control-Allow-Credentials, and wildcards.
"""
import uuid

def check_cors_security(target_url: str, headers: dict) -> list[dict]:
    """
    Checks for overly permissive or misconfigured CORS headers.
    """
    findings = []
    headers_lower = {k.lower(): v for k, v in headers.items()}
    
    acao = headers_lower.get('access-control-allow-origin')
    acac = headers_lower.get('access-control-allow-credentials')
    
    if acao == '*':
        findings.append({
            'id': f"FND-CORS-WILDCARD-{uuid.uuid4().hex[:8]}",
            'title': "Overly Permissive Cross-Origin Resource Sharing (CORS: *)",
            'severity': "Low",
            'confidence': "Confirmed",
            'category': "CORS",
            'affected_asset': target_url,
            'affected_url': target_url,
            'http_method': "GET",
            'parameter': "Access-Control-Allow-Origin",
            'description': "The server returns 'Access-Control-Allow-Origin: *', allowing any arbitrary third-party website to make browser requests and read response data.",
            'impact': "If authenticated user data or proprietary APIs are served here, third-party sites can read sensitive payloads via XMLHttpRequest / fetch.",
            'remediation': "Explicitly restrict Access-Control-Allow-Origin to trusted application origins rather than using a wildcard '*'.",
            'references': [
                {"title": "OWASP Cross-Origin Resource Sharing", "url": "https://owasp.org/www-community/attacks/CORS_OriginHeaderScrutiny"}
            ],
            'evidence': {
                'header': 'Access-Control-Allow-Origin',
                'observed_value': '*'
            },
            'scanner_module': "CORSSecurityCheck"
        })
        
    return findings
