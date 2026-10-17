"""
TLS/SSL Cryptographic Configuration & Certificate Assessment Engine
Evaluates certificate expiration, validity, hostname matching, and transport encryption.
"""
import ssl
import socket
import uuid
from datetime import datetime, timezone
from urllib.parse import urlparse

def check_tls_security(target_url: str, target_domain: str) -> list[dict]:
    """
    Performs SSL/TLS socket inspection against the target domain.
    """
    findings = []
    parsed = urlparse(target_url)
    
    # If the user supplied http://, test if HTTPS is available
    is_http_only = parsed.scheme.lower() == 'http'
    
    try:
        context = ssl.create_default_context()
        # Custom timeout on handshake
        with socket.create_connection((target_domain, 443), timeout=5.0) as sock:
            with context.wrap_socket(sock, server_hostname=target_domain) as ssock:
                cert = ssock.getpeercert()
                tls_version = ssock.version()
                cipher = ssock.cipher()
                
                # 1. Parse Certificate Expiration
                not_after_str = cert.get('notAfter')
                if not_after_str:
                    # Format: 'May 12 12:00:00 2026 GMT'
                    expiry_date = datetime.strptime(not_after_str, '%b %d %H:%M:%S %Y %Z').replace(tzinfo=timezone.utc)
                    now = datetime.now(timezone.utc)
                    days_remaining = (expiry_date - now).days
                    
                    if days_remaining < 0:
                        findings.append({
                            'id': f"FND-TLS-EXPIRED-{uuid.uuid4().hex[:8]}",
                            'title': "Critical: SSL/TLS Certificate Has Expired",
                            'severity': "Critical",
                            'confidence': "Confirmed",
                            'category': "TLS/SSL",
                            'affected_asset': target_domain,
                            'affected_url': f"https://{target_domain}",
                            'http_method': "TCP/443",
                            'parameter': "Certificate Validity",
                            'description': f"The SSL/TLS certificate for '{target_domain}' expired {abs(days_remaining)} days ago (on {expiry_date.strftime('%Y-%m-%d')}).",
                            'impact': "Users will encounter full-screen browser security warnings (NET::ERR_CERT_DATE_INVALID) and will be unable to access the site securely without bypassing security warnings.",
                            'remediation': "Renew and deploy a valid SSL/TLS certificate immediately using Let's Encrypt, Cloudflare, or your CA.",
                            'references': [
                                {"title": "CWE-298: Improper Validation of Certificate Expiration", "url": "https://cwe.mitre.org/data/definitions/298.html"}
                            ],
                            'evidence': {
                                'expired_date': expiry_date.isoformat(),
                                'days_expired': abs(days_remaining),
                                'issuer': dict(x[0] for x in cert.get('issuer', []))
                            },
                            'scanner_module': "TLSSecurityCheck"
                        })
                    elif days_remaining <= 15:
                        findings.append({
                            'id': f"FND-TLS-EXPIRING-{uuid.uuid4().hex[:8]}",
                            'title': f"SSL/TLS Certificate Expiring Soon ({days_remaining} Days Remaining)",
                            'severity': "High",
                            'confidence': "Confirmed",
                            'category': "TLS/SSL",
                            'affected_asset': target_domain,
                            'affected_url': f"https://{target_domain}",
                            'http_method': "TCP/443",
                            'parameter': "Certificate Expiration",
                            'description': f"The active certificate will expire in {days_remaining} days on {expiry_date.strftime('%Y-%m-%d')}.",
                            'impact': "When the certificate expires, users will be blocked by browser security warnings, disrupting service availability.",
                            'remediation': "Renew the certificate before expiration and verify automatic renewal hooks (e.g. certbot renew) are functioning.",
                            'references': [
                                {"title": "NIST SP 800-52 Rev. 2: Guidelines for TLS Implementations", "url": "https://csrc.nist.gov/publications/detail/sp/800-52/rev-2/final"}
                            ],
                            'evidence': {
                                'expiration_date': expiry_date.isoformat(),
                                'days_remaining': days_remaining
                            },
                            'scanner_module': "TLSSecurityCheck"
                        })

                # 2. Hostname Match (SANs)
                sans = [item[1] for item in cert.get('subjectAltName', []) if item[0] == 'DNS']
                domain_matches = False
                for san in sans:
                    if san == target_domain:
                        domain_matches = True
                        break
                    if san.startswith('*.') and target_domain.endswith(san[1:]):
                        domain_matches = True
                        break

                if not domain_matches and sans:
                    findings.append({
                        'id': f"FND-TLS-SAN-{uuid.uuid4().hex[:8]}",
                        'title': "SSL/TLS Certificate Subject Alternative Name (SAN) Mismatch",
                        'severity': "High",
                        'confidence': "High confidence",
                        'category': "TLS/SSL",
                        'affected_asset': target_domain,
                        'affected_url': f"https://{target_domain}",
                        'http_method': "TCP/443",
                        'parameter': "Subject Alternative Name",
                        'description': f"The certificate presented does not cover the requested hostname '{target_domain}'. Configured SANs: {', '.join(sans[:5])}.",
                        'impact': "Browsers will display security warnings (ERR_CERT_COMMON_NAME_INVALID) preventing users from trusting the encrypted tunnel.",
                        'remediation': "Reissue the certificate to include the domain or wildcard domain covering this host.",
                        'references': [
                            {"title": "CWE-297: Improper Validation of Certificate Host Mismatch", "url": "https://cwe.mitre.org/data/definitions/297.html"}
                        ],
                        'evidence': {
                            'target_domain': target_domain,
                            'certificate_sans': sans
                        },
                        'scanner_module': "TLSSecurityCheck"
                    })

                # 3. Informational TLS Protocol Check
                if tls_version in ('TLSv1', 'TLSv1.1'):
                    findings.append({
                        'id': f"FND-TLS-DEPRECATED-{uuid.uuid4().hex[:8]}",
                        'title': f"Deprecated Protocol Version Supported: {tls_version}",
                        'severity': "Medium",
                        'confidence': "Confirmed",
                        'category': "TLS/SSL",
                        'affected_asset': target_domain,
                        'affected_url': f"https://{target_domain}",
                        'http_method': "TCP/443",
                        'parameter': "TLS Protocol Version",
                        'description': f"The web server accepted connection using deprecated {tls_version}.",
                        'impact': "Old TLS versions suffer from known cryptographic weaknesses (POODLE, BEAST) and fail PCI-DSS compliance.",
                        'remediation': "Disable TLS 1.0 and TLS 1.1 in web server / load balancer configuration. Enforce TLS 1.2 and TLS 1.3 exclusively.",
                        'references': [
                            {"title": "RFC 8996: Deprecating TLS 1.0 and TLS 1.1", "url": "https://datatracker.ietf.org/doc/html/rfc8996"}
                        ],
                        'evidence': {
                            'negotiated_protocol': tls_version,
                            'cipher_suite': cipher[0] if cipher else None
                        },
                        'scanner_module': "TLSSecurityCheck"
                    })

    except ssl.SSLError as ssl_err:
        findings.append({
            'id': f"FND-TLS-ERROR-{uuid.uuid4().hex[:8]}",
            'title': "SSL/TLS Handshake or Certificate Verification Error",
            'severity': "High",
            'confidence': "Confirmed",
            'category': "TLS/SSL",
            'affected_asset': target_domain,
            'affected_url': f"https://{target_domain}",
            'http_method': "TCP/443",
            'parameter': "SSL Handshake",
            'description': f"An SSL/TLS error occurred during handshake with {target_domain}: {str(ssl_err)}",
            'impact': "Secure connections cannot be established without errors, leaving clients vulnerable or breaking access.",
            'remediation': "Verify that the certificate chain is complete, properly installed, and signed by a trusted Certificate Authority (CA).",
            'references': [
                {"title": "CWE-295: Improper Certificate Validation", "url": "https://cwe.mitre.org/data/definitions/295.html"}
            ],
            'evidence': {
                'error_message': str(ssl_err)
            },
            'scanner_module': "TLSSecurityCheck"
        })
    except (socket.timeout, ConnectionRefusedError, socket.error):
        if not is_http_only:
            findings.append({
                'id': f"FND-TLS-UNAVAILABLE-{uuid.uuid4().hex[:8]}",
                'title': "HTTPS / Port 443 Service Unavailable",
                'severity': "High",
                'confidence': "High confidence",
                'category': "TLS/SSL",
                'affected_asset': target_domain,
                'affected_url': f"http://{target_domain}",
                'http_method': "TCP/443",
                'parameter': "HTTPS Availability",
                'description': f"Could not establish connection to port 443 on '{target_domain}'. Transport encryption appears unavailable.",
                'impact': "Users transmit credentials, session tokens, and personal data over unencrypted plaintext HTTP, exposing it to intercepting routers and ISPs.",
                'remediation': "Install an SSL/TLS certificate and configure HTTP to HTTPS 301 redirects across all pages.",
                'references': [
                    {"title": "CWE-319: Cleartext Transmission of Sensitive Information", "url": "https://cwe.mitre.org/data/definitions/319.html"}
                ],
                'evidence': {
                    'port': 443,
                    'status': 'Connection refused or timed out'
                },
                'scanner_module': "TLSSecurityCheck"
            })

    return findings
