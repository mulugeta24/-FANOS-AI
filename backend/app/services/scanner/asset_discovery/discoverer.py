"""
Asset Discovery Engine
Discovers DNS records, IP addresses, authorized subdomains, and web services.
"""
import socket
import logging
from urllib.parse import urlparse
from scanner.models import add_scan_asset
from scanner.target_validation import is_ssrf_safe_ip

log = logging.getLogger(__name__)

COMMON_SUBDOMAINS = [
    'www', 'api', 'app', 'portal', 'auth', 'login', 'secure',
    'mail', 'dev', 'stage', 'test', 'admin', 'dashboard', 'cdn'
]

COMMON_WEB_PORTS = [80, 443, 8080, 8443]

def run_asset_discovery(job_id: str, target_domain: str, allow_private: bool = False, scope_config: dict = None) -> dict:
    """
    Executes DNS, IP, subdomain, and service asset discovery for an authorized target domain.
    """
    discovered = {
        'domain': target_domain,
        'ips': [],
        'dns_records': [],
        'subdomains': [],
        'services': []
    }
    
    # 1. Main Domain Asset
    add_scan_asset(job_id, 'domain', target_domain, {'is_primary': True})
    
    # 2. IP Resolution & Reverse DNS
    try:
        primary_ips = socket.gethostbyname_ex(target_domain)[2]
        for ip in primary_ips:
            safe, _ = is_ssrf_safe_ip(ip, allow_private=allow_private)
            if not safe:
                continue
                
            rev_host = "Unknown"
            try:
                rev_host = socket.gethostbyaddr(ip)[0]
            except Exception:
                pass
                
            ip_data = {'ip': ip, 'reverse_dns': rev_host, 'primary': True}
            discovered['ips'].append(ip_data)
            add_scan_asset(job_id, 'ip_address', ip, ip_data)
            discovered['dns_records'].append({'type': 'A', 'name': target_domain, 'value': ip})
            add_scan_asset(job_id, 'dns_record', f"A: {target_domain} -> {ip}", {'type': 'A', 'domain': target_domain, 'value': ip})
    except Exception as e:
        log.warning(f"Error resolving primary IP for {target_domain}: {e}")

    # 3. Subdomain Discovery (Authorized Scope Only)
    scope_config = scope_config or {}
    include_subdomains = scope_config.get('include_subdomains', True)
    
    if include_subdomains:
        for sub in COMMON_SUBDOMAINS:
            subdomain = f"{sub}.{target_domain}"
            try:
                sub_ips = socket.gethostbyname_ex(subdomain)[2]
                if sub_ips:
                    sub_data = {'subdomain': subdomain, 'resolved_ips': sub_ips}
                    discovered['subdomains'].append(sub_data)
                    add_scan_asset(job_id, 'subdomain', subdomain, sub_data)
                    for sip in sub_ips:
                        add_scan_asset(job_id, 'dns_record', f"A: {subdomain} -> {sip}", {'type': 'A', 'domain': subdomain, 'value': sip})
            except Exception:
                pass

    # 4. Service Probing on Live HTTP/HTTPS Ports
    for port in COMMON_WEB_PORTS:
        service_name = 'HTTPS' if port in (443, 8443) else 'HTTP'
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(2.0)
            res = sock.connect_ex((target_domain, port))
            sock.close()
            if res == 0:
                service_info = {
                    'port': port,
                    'service': service_name,
                    'status': 'Open',
                    'protocol': 'tcp'
                }
                discovered['services'].append(service_info)
                add_scan_asset(job_id, 'service', f"{service_name}:{port} on {target_domain}", service_info)
        except Exception:
            pass

    return discovered
