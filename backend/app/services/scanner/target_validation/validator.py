"""
Target Validation, Scope Enforcement & SSRF Protection Module
"""
import ipaddress
import socket
import re
from urllib.parse import urlparse, urlunparse

PRIVATE_IP_NETWORKS = [
    ipaddress.ip_network('127.0.0.0/8'),        # Loopback
    ipaddress.ip_network('10.0.0.0/8'),         # Private class A
    ipaddress.ip_network('172.16.0.0/12'),      # Private class B
    ipaddress.ip_network('192.168.0.0/16'),     # Private class C
    ipaddress.ip_network('169.254.0.0/16'),     # Link-local / Cloud metadata
    ipaddress.ip_network('0.0.0.0/8'),          # Current network
    ipaddress.ip_network('100.64.0.0/10'),      # Carrier grade NAT
    ipaddress.ip_network('192.0.2.0/24'),       # Documentation TEST-NET-1
    ipaddress.ip_network('198.51.100.0/24'),    # Documentation TEST-NET-2
    ipaddress.ip_network('203.0.113.0/24'),     # Documentation TEST-NET-3
    ipaddress.ip_network('224.0.0.0/4'),        # Multicast
    ipaddress.ip_network('240.0.0.0/4'),        # Reserved
    ipaddress.ip_network('::1/128'),            # IPv6 Loopback
    ipaddress.ip_network('fc00::/7'),           # IPv6 Unique Local
    ipaddress.ip_network('fe80::/10'),          # IPv6 Link-local
]

def normalize_url(url: str) -> str:
    """Normalizes URL by stripping whitespace, trailing slashes, fragments, and ensuring scheme."""
    url = url.strip()
    if not url.startswith(('http://', 'https://')):
        url = 'https://' + url
        
    parsed = urlparse(url)
    scheme = parsed.scheme.lower()
    netloc = parsed.netloc.lower()
    path = parsed.path or '/'
    
    # Remove fragments and normalize
    return urlunparse((scheme, netloc, path, parsed.params, parsed.query, ''))

def extract_domain(url: str) -> str:
    """Extracts the hostname/domain from a URL."""
    parsed = urlparse(normalize_url(url))
    host = parsed.netloc
    if ':' in host:
        host = host.split(':')[0]
    return host.lower()

def is_ssrf_safe_ip(ip_str: str, allow_private: bool = False) -> tuple[bool, str]:
    """
    Checks if an IP address is safe from SSRF vulnerabilities.
    Blocks private IP addresses, cloud metadata services, and loopback.
    """
    if allow_private:
        return True, "Private scanning permitted by configuration"

    try:
        ip = ipaddress.ip_address(ip_str)
        for net in PRIVATE_IP_NETWORKS:
            if ip in net:
                return False, f"Destination IP {ip_str} falls into restricted/private network {net} (SSRF protection)"
        return True, "IP is public and routable"
    except ValueError:
        return False, f"Invalid IP address representation: {ip_str}"

def validate_target(target_url: str, allow_private: bool = False) -> dict:
    """
    Validates a target URL before scanning.
    Checks syntax, resolves DNS, checks SSRF protections, and extracts scope.
    """
    try:
        norm_url = normalize_url(target_url)
        parsed = urlparse(norm_url)
        domain = extract_domain(norm_url)
        
        if not domain or '.' not in domain and domain != 'localhost':
            return {
                'valid': False,
                'error': f"Invalid domain: {domain}. A fully qualified domain name is required."
            }
            
        # DNS Resolution
        try:
            resolved_ips = socket.gethostbyname_ex(domain)[2]
        except socket.gaierror as e:
            return {
                'valid': False,
                'error': f"DNS resolution failed for {domain}: {str(e)}"
            }
            
        if not resolved_ips:
            return {
                'valid': False,
                'error': f"Could not resolve any IP addresses for {domain}"
            }
            
        # Check SSRF on resolved IPs
        for ip in resolved_ips:
            safe, reason = is_ssrf_safe_ip(ip, allow_private=allow_private)
            if not safe:
                return {
                    'valid': False,
                    'error': f"SSRF Protection: {reason}",
                    'ip': ip,
                    'domain': domain
                }
                
        return {
            'valid': True,
            'normalized_url': norm_url,
            'domain': domain,
            'resolved_ips': resolved_ips,
            'scheme': parsed.scheme
        }
    except Exception as e:
        return {
            'valid': False,
            'error': f"Target validation error: {str(e)}"
        }

def is_url_in_scope(candidate_url: str, target_domain: str, scope_config: dict = None) -> bool:
    """
    Strict scope enforcer: ensures crawler and active tests NEVER leave authorized boundaries.
    """
    scope_config = scope_config or {}
    candidate_norm = normalize_url(candidate_url)
    candidate_domain = extract_domain(candidate_norm)
    candidate_parsed = urlparse(candidate_norm)
    
    # 1. Check exclusions first
    excluded_domains = [d.strip().lower() for d in scope_config.get('excluded_domains', []) if d.strip()]
    for ex_dom in excluded_domains:
        if candidate_domain == ex_dom or candidate_domain.endswith('.' + ex_dom):
            return False
            
    excluded_paths = [p.strip() for p in scope_config.get('excluded_paths', []) if p.strip()]
    for ex_path in excluded_paths:
        pattern = ex_path.replace('*', '.*')
        if re.search(pattern, candidate_parsed.path):
            return False

    # 2. Check allowed wildcard / subdomains
    include_subdomains = scope_config.get('include_subdomains', True)
    allowed_domains = [d.strip().lower() for d in scope_config.get('allowed_domains', []) if d.strip()]
    
    # Base match
    if candidate_domain == target_domain:
        return True
        
    # Subdomain match
    if include_subdomains and candidate_domain.endswith('.' + target_domain):
        return True
        
    # Additional explicit allowed domains
    for allow_dom in allowed_domains:
        if allow_dom.startswith('*.'):
            base = allow_dom[2:]
            if candidate_domain == base or candidate_domain.endswith('.' + base):
                return True
        elif candidate_domain == allow_dom:
            return True

    return False
