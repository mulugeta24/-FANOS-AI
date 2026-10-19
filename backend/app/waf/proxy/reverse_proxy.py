"""
FANOS WAF Reverse Proxy Engine.
===============================
Provides inline HTTP traffic interception and protection for upstream web applications.

Security Guarantees:
- Strictly validated upstream destination with DNS resolution checks (Anti-SSRF).
- Pre-forwarding inspection: Evaluates every packet before it touches the upstream app.
- Configurable failure mode: Fail-safe (fail-open or fail-closed) with explicit non-silent audit logging.
- Destination IP Pinning (Anti-TOCTOU & DNS Rebinding) for both HTTP and HTTPS targets with full TLS SNI validation.
- Connection pooling and reuse across requests to eliminate client socket churn.
- Preserves clean client IP headers while filtering unsafe hop-by-hop and spoofed headers.
- Request smuggling prevention (conflicting CL/TE and multi-CL rejection).
- Strict request and response size enforcement in all operational modes.
- Adds hardening security headers (X-WAF-Protected, X-WAF-Decision).
- Standards-compliant reverse proxy error mapping (502 Bad Gateway, 504 Gateway Timeout).
"""
import ipaddress
import logging
import os
import re
import socket
import ssl
from typing import Dict, List, Optional, Tuple
import urllib.parse
import uuid
from fastapi import APIRouter, Header, HTTPException, Request, Response, status
from fastapi.responses import JSONResponse
import httpx
import httpcore
from httpcore._backends.anyio import AnyIOBackend

from app.core.config import get_settings
from app.waf.constants import Decision
from app.db.base import AsyncSessionLocal
from app.waf.engine.pipeline import pipeline
from app.waf.models import Domain
from app.waf.schemas.inspect import Finding, InspectRequest, InspectResponse
from app.waf.security.rate_limiter import proxy_traffic_rate_limiter
from app.waf.services.audit_service import audit_service
from app.waf.services.domain_service import domain_service
from app.waf.services.event_service import event_service

logger = logging.getLogger("fanos_waf.proxy")
settings = get_settings()

router = APIRouter(prefix="/proxy", tags=["Reverse Proxy"])

DEFAULT_UPSTREAM_URL = "http://localhost:3000"
MAX_RESPONSE_BODY_SIZE_BYTES = 10485760  # 10 MB limit for upstream responses

HOP_BY_HOP_HEADERS = {
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
    "transfer-encoding",
    "upgrade",
}

UNTRUSTED_FORWARDING_HEADERS = {
    "x-forwarded-host",
    "x-forwarded-proto",
    "x-forwarded-port",
    "forwarded",
    "x-forwarded-for",
    "x-real-ip",
    "host",
}

PROHIBITED_METADATA_HOSTS = {
    "169.254.169.254",
    "metadata.google.internal",
    "instance-data",
    "metadata.internal",
    "100.100.100.200",  # Alibaba Cloud metadata
}

PROHIBITED_NETWORKS = [
    ipaddress.ip_network("169.254.0.0/16"),       # IPv4 Link-local / Cloud metadata
    ipaddress.ip_network("fe80::/10"),            # IPv6 Link-local
    ipaddress.ip_network("224.0.0.0/4"),          # Multicast
    ipaddress.ip_network("ff00::/8"),             # IPv6 Multicast
    ipaddress.ip_network("240.0.0.0/4"),          # Reserved / Future use
    ipaddress.ip_network("0.0.0.0/8"),            # Source / broadcast network
]

PROHIBITED_EXACT_IPS = {
    ipaddress.ip_address("169.254.169.254"),       # IPv4 IMDS / Link-local
    ipaddress.ip_address("255.255.255.255"),
    ipaddress.ip_address("0.0.0.0"),
    ipaddress.ip_address("fd00:ec2::254"),         # AWS IMDSv2 IPv6
    ipaddress.ip_address("::ffff:169.254.169.254"), # IPv4-mapped IPv6 IMDS
}


class PinnedAsyncNetworkBackend(AnyIOBackend):
    """
    Custom AnyIO network backend that routes TCP connections to a pre-validated,
    pinned IP address while leaving the origin hostname intact for TLS SNI
    and HTTP Host header validation.
    """

    def __init__(self, host_map: Dict[str, str]):
        super().__init__()
        self.host_map = host_map

    async def connect_tcp(
        self,
        host: str,
        port: int,
        timeout: Optional[float] = None,
        local_address: Optional[str] = None,
        socket_options=None,
    ):
        target_host = self.host_map.get(host, host)
        return await super().connect_tcp(
            target_host, port, timeout=timeout, local_address=local_address, socket_options=socket_options
        )


class PinnedAsyncHTTPTransport(httpx.AsyncHTTPTransport):
    """
    AsyncHTTPTransport with pinned IP network backend to defeat DNS rebinding (TOCTOU)
    while maintaining standard TLS SNI hostname certificate validation and connection pooling.
    """

    def __init__(self, host_map: Dict[str, str], *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._pool._network_backend = PinnedAsyncNetworkBackend(host_map)


class ReverseProxyEngine:
    """Inline multi-tenant reverse proxy protector with dynamic host routing."""

    def __init__(self, upstream_url: Optional[str] = None, verify_ssl=None):
        self.upstream_url = (upstream_url or getattr(settings, "UPSTREAM_TARGET_URL", DEFAULT_UPSTREAM_URL)).rstrip("/")
        self.verify_ssl = verify_ssl
        self.pinned_ip: Optional[str] = None
        self.pinned_upstream_url: str = self.upstream_url
        self.forward_url_base: str = self.upstream_url
        self.target_scheme: str = "http"
        self.target_hostname: str = ""
        self.target_port: int = 80
        self.target_host_header: str = ""
        self.client: Optional[httpx.AsyncClient] = None
        self._client_pool: Dict[str, Tuple[httpx.AsyncClient, str, str]] = {}
        self._validate_upstream(self.upstream_url)

    def _create_client_for_host(self, host_map: Dict[str, str]) -> httpx.AsyncClient:
        transport_kwargs = {}
        if self.verify_ssl is not None:
            if isinstance(self.verify_ssl, str) and os.path.isfile(self.verify_ssl):
                transport_kwargs["verify"] = ssl.create_default_context(cafile=self.verify_ssl)
            else:
                transport_kwargs["verify"] = self.verify_ssl
        self._transport = PinnedAsyncHTTPTransport(host_map, **transport_kwargs)
        return httpx.AsyncClient(
            transport=self._transport,
            timeout=httpx.Timeout(15.0, connect=5.0),
            follow_redirects=False,
            limits=httpx.Limits(max_keepalive_connections=50, max_connections=100, keepalive_expiry=30.0),
        )

    def _init_client(self, host_map: Dict[str, str]) -> None:
        """Initializes default client for self.upstream_url."""
        if not hasattr(self, "_client_pool"):
            self._client_pool = {}
        self.client = self._create_client_for_host(host_map)
        self._client_pool[self.upstream_url] = (self.client, self.forward_url_base, self.target_host_header)

    async def aclose(self) -> None:
        """Closes all underlying HTTP client sessions and cleans up connection pool."""
        if hasattr(self, "client") and self.client is not None and not self.client.is_closed:
            await self.client.aclose()
        for c, _, _ in list(self._client_pool.values()):
            if c is not None and not c.is_closed:
                await c.aclose()
        self._client_pool.clear()

    def _get_or_create_client(self, url: str) -> Tuple[httpx.AsyncClient, str, str]:
        """
        Validates target origin against SSRF and returns a cached (client, forward_url_base, host_header).
        """
        clean_url = url.rstrip("/")
        if clean_url in self._client_pool:
            c, base, host_h = self._client_pool[clean_url]
            if not c.is_closed:
                return c, base, host_h

        parsed = urllib.parse.urlparse(clean_url)
        if parsed.scheme not in ("http", "https"):
            raise ValueError(f"Invalid upstream scheme: {parsed.scheme}")
        if not parsed.netloc:
            raise ValueError("Upstream URL must include a valid host.")

        hostname = parsed.hostname
        if not hostname:
            raise ValueError("Upstream URL must include a resolvable hostname.")

        lower_host = hostname.lower().strip()
        target_port = parsed.port or (443 if parsed.scheme == "https" else 80)
        target_host_header = parsed.netloc

        if lower_host in PROHIBITED_METADATA_HOSTS or any(lower_host.endswith(f".{mh}") for mh in PROHIBITED_METADATA_HOSTS):
            raise ValueError(f"Prohibited: Cloud metadata endpoint '{lower_host}' cannot be configured as upstream.")

        ip_obj = None
        try:
            ip_obj = ipaddress.ip_address(lower_host)
        except ValueError:
            pass

        if ip_obj is None:
            try:
                if lower_host.startswith("0x") or lower_host.isdigit():
                    ip_obj = ipaddress.ip_address(int(lower_host, 0))
            except (ValueError, OverflowError):
                pass

        port_str = f":{parsed.port}" if parsed.port else ""

        if ip_obj is not None:
            self._validate_ip(ip_obj)
            pinned_ip = str(ip_obj)
            ip_repr = f"[{pinned_ip}]" if ip_obj.version == 6 else pinned_ip
            forward_url_base = f"{parsed.scheme}://{ip_repr}{port_str}"
            client = self._create_client_for_host({pinned_ip: pinned_ip})
            self._client_pool[clean_url] = (client, forward_url_base, target_host_header)
            return client, forward_url_base, target_host_header

        # DNS Resolution
        addr_info = socket.getaddrinfo(lower_host, target_port, proto=socket.IPPROTO_TCP)
        if not addr_info:
            raise ValueError(f"No IP addresses resolved for upstream host '{lower_host}'.")

        resolved_ips = []
        for entry in addr_info:
            sockaddr = entry[4]
            resolved_ip = ipaddress.ip_address(sockaddr[0])
            self._validate_ip(resolved_ip)
            resolved_ips.append(resolved_ip)

        ipv4_candidates = [ip for ip in resolved_ips if ip.version == 4]
        pinned = ipv4_candidates[0] if ipv4_candidates else resolved_ips[0]
        pinned_ip = str(pinned)
        forward_url_base = f"{parsed.scheme}://{lower_host}{port_str}"
        client = self._create_client_for_host({lower_host: pinned_ip})
        self._client_pool[clean_url] = (client, forward_url_base, target_host_header)
        return client, forward_url_base, target_host_header

    def _validate_upstream(self, url: str) -> None:
        """Validates upstream target format and destination to prevent SSRF and DNS rebinding vulnerabilities."""
        parsed = urllib.parse.urlparse(url)
        if parsed.scheme not in ("http", "https"):
            raise ValueError(f"Invalid upstream scheme: {parsed.scheme}")
        if not parsed.netloc:
            raise ValueError("Upstream URL must include a valid host.")

        hostname = parsed.hostname
        if not hostname:
            raise ValueError("Upstream URL must include a resolvable hostname.")

        lower_host = hostname.lower().strip()
        self.target_scheme = parsed.scheme
        self.target_hostname = lower_host
        self.target_port = parsed.port or (443 if parsed.scheme == "https" else 80)
        self.target_host_header = parsed.netloc

        # Check prohibited metadata hosts
        if lower_host in PROHIBITED_METADATA_HOSTS or any(lower_host.endswith(f".{mh}") for mh in PROHIBITED_METADATA_HOSTS):
            raise ValueError(f"Prohibited: Cloud metadata endpoint '{lower_host}' cannot be configured as upstream.")

        # Check if hostname directly represents an IP
        ip_obj = None
        try:
            ip_obj = ipaddress.ip_address(lower_host)
        except ValueError:
            pass

        if ip_obj is None:
            try:
                if lower_host.startswith("0x") or lower_host.isdigit():
                    ip_obj = ipaddress.ip_address(int(lower_host, 0))
            except (ValueError, OverflowError):
                pass

        port_str = f":{parsed.port}" if parsed.port else ""

        if ip_obj is not None:
            self._validate_ip(ip_obj)
            self.pinned_ip = str(ip_obj)
            ip_repr = f"[{self.pinned_ip}]" if ip_obj.version == 6 else self.pinned_ip
            self.pinned_upstream_url = f"{parsed.scheme}://{ip_repr}{port_str}"
            self.forward_url_base = f"{parsed.scheme}://{ip_repr}{port_str}"
            self._init_client({self.pinned_ip: self.pinned_ip})
            return

        # DNS Resolution validation to defend against DNS rebinding & metadata aliases (fail-closed)
        try:
            addr_info = socket.getaddrinfo(
                lower_host,
                self.target_port,
                proto=socket.IPPROTO_TCP,
            )
            if not addr_info:
                raise ValueError(f"No IP addresses resolved for upstream host '{lower_host}'.")

            resolved_ips = []
            for entry in addr_info:
                sockaddr = entry[4]
                resolved_ip_str = sockaddr[0]
                resolved_ip = ipaddress.ip_address(resolved_ip_str)
                self._validate_ip(resolved_ip)
                resolved_ips.append(resolved_ip)

            # Pin to the first validated IP (prefer IPv4 for local loopback compatibility)
            ipv4_candidates = [ip for ip in resolved_ips if ip.version == 4]
            pinned = ipv4_candidates[0] if ipv4_candidates else resolved_ips[0]
            self.pinned_ip = str(pinned)

            ip_repr = f"[{self.pinned_ip}]" if pinned.version == 6 else self.pinned_ip
            self.pinned_upstream_url = f"{parsed.scheme}://{ip_repr}{port_str}"
            # For routing with PinnedAsyncHTTPTransport: retain hostname in base URL so TLS SNI matches
            self.forward_url_base = f"{parsed.scheme}://{lower_host}{port_str}"
            self._init_client({lower_host: self.pinned_ip})

        except socket.gaierror as e:
            raise ValueError(f"DNS resolution failed for upstream host '{lower_host}': {e}")
        except ValueError as ve:
            raise ve

    def _validate_ip(self, ip_obj: ipaddress.IPv4Address | ipaddress.IPv6Address) -> None:
        """Verifies an IP address does not target link-local, cloud metadata, or reserved ranges."""
        if ip_obj in PROHIBITED_EXACT_IPS:
            raise ValueError(f"Prohibited: Cloud metadata endpoint '{ip_obj}' cannot be configured as upstream.")

        ipv4_mapped = getattr(ip_obj, "ipv4_mapped", None)
        if ipv4_mapped is not None:
            if ipv4_mapped in PROHIBITED_EXACT_IPS:
                raise ValueError(f"Prohibited: Cloud metadata endpoint '{ip_obj}' cannot be configured as upstream.")
            for net in PROHIBITED_NETWORKS:
                if ipv4_mapped in net:
                    raise ValueError(f"Prohibited: Upstream address '{ip_obj}' is in restricted range '{net}'.")

        for net in PROHIBITED_NETWORKS:
            if ip_obj in net:
                raise ValueError(f"Prohibited: Upstream address '{ip_obj}' is in restricted range '{net}'.")

    async def intercept_and_forward(self, request: Request) -> Response:
        """Intercepts, inspects, and conditionally forwards HTTP traffic to the upstream."""
        # Check if proxy is globally enabled
        if not getattr(settings, "PROXY_ENABLED", True):
            return JSONResponse(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                content={
                    "error": "Reverse Proxy Disabled",
                    "detail": "The FANOS WAF reverse proxy component is currently disabled by administrator configuration.",
                },
                headers={"X-WAF-Protected": "FANOS-WAF", "X-WAF-Decision": "DISABLED"},
            )

        # 1. Defend against HTTP Request Smuggling (Conflicting CL / TE headers & multi-CL)
        header_keys_lower = [k.lower() for k in request.headers.keys()]
        has_te = "transfer-encoding" in header_keys_lower
        has_cl = "content-length" in header_keys_lower
        if has_te and has_cl:
            logger.warning("HTTP Request Smuggling attempt: Conflicting Transfer-Encoding and Content-Length")
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    "error": "Bad Request",
                    "detail": "Conflicting Transfer-Encoding and Content-Length headers prohibited.",
                },
                headers={"X-WAF-Protected": "FANOS-WAF", "X-WAF-Decision": "BLOCK"},
            )

        # Check for multiple Content-Length headers (smuggling vector)
        cl_list = request.headers.getlist("content-length")
        if len(cl_list) > 1:
            first_val = cl_list[0].strip()
            if any(val.strip() != first_val for val in cl_list):
                logger.warning("HTTP Request Smuggling attempt: Multiple conflicting Content-Length headers")
                return JSONResponse(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    content={"error": "Bad Request", "detail": "Multiple conflicting Content-Length headers prohibited."},
                    headers={"X-WAF-Protected": "FANOS-WAF", "X-WAF-Decision": "BLOCK"},
                )

        # Early Content-Length check to prevent reading oversized body
        cl_header = request.headers.get("content-length")
        if cl_header:
            if "," in cl_header:
                parts = [p.strip() for p in cl_header.split(",")]
                if any(p != parts[0] for p in parts):
                    logger.warning("HTTP Request Smuggling attempt: Comma-separated conflicting Content-Length header")
                    return JSONResponse(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        content={"error": "Bad Request", "detail": "Conflicting comma-separated Content-Length headers prohibited."},
                        headers={"X-WAF-Protected": "FANOS-WAF", "X-WAF-Decision": "BLOCK"},
                    )
                cl_header = parts[0]

            try:
                cl_val = int(cl_header.strip())
                if cl_val < 0:
                    return JSONResponse(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        content={"error": "Bad Request", "detail": "Negative Content-Length header prohibited."},
                        headers={"X-WAF-Protected": "FANOS-WAF", "X-WAF-Decision": "BLOCK"},
                    )
                if cl_val > settings.MAX_REQUEST_BODY_SIZE_BYTES:
                    return JSONResponse(
                        status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                        content={
                            "error": "Payload Too Large",
                            "detail": f"Request body length {cl_val} exceeds maximum allowed {settings.MAX_REQUEST_BODY_SIZE_BYTES} bytes.",
                        },
                        headers={"X-WAF-Protected": "FANOS-WAF", "X-WAF-Decision": "BLOCK"},
                    )
            except ValueError:
                return JSONResponse(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    content={"error": "Bad Request", "detail": "Invalid Content-Length header format."},
                    headers={"X-WAF-Protected": "FANOS-WAF", "X-WAF-Decision": "BLOCK"},
                )

        # 2. Extract request details and resolve Host against registered domains
        method = request.method
        path = request.url.path
        for prefix in ("/api/v1/proxy", "/proxy"):
            if path.startswith(prefix):
                path = path[len(prefix):] or "/"
                break

        query_params = dict(request.query_params)
        raw_headers = dict(request.headers)
        client_ip = request.client.host if request.client else "127.0.0.1"

        # Resolve Domain & Tenant from Host header
        raw_host = request.headers.get("x-waf-target-host") or request.headers.get("x-forwarded-host") or request.headers.get("host") or ""
        clean_host = raw_host.split(":")[0].strip().lower()

        domain: Optional[Domain] = None
        try:
            async with AsyncSessionLocal() as session:
                if clean_host:
                    domain = await domain_service.get_domain_by_host(clean_host, session)
        except Exception as e:
            logger.warning("Database domain resolution notice: %s", e)

        # If domain not found in DB
        is_unregistered_external = False
        if domain is None:
            # Check if this request is hitting the default local test upstream
            is_default_local = (
                clean_host in ("localhost", "127.0.0.1", "testserver")
                or not clean_host
            )
            target_origin_url = self.upstream_url
            effective_mode = "block" if not is_default_local else settings.WAF_MODE
            domain_id = None
            domain_name = clean_host or "localhost"
            tenant_id = "org-default"
            if not is_default_local:
                is_unregistered_external = True
        else:
            # Enforce active status
            if not domain.is_active:
                return JSONResponse(
                    status_code=status.HTTP_403_FORBIDDEN,
                    content={
                        "error": "Domain Inactive",
                        "detail": f"Domain '{domain.domain_name}' is currently deactivated by administrator policy.",
                    },
                    headers={"X-WAF-Protected": "FANOS-WAF", "X-WAF-Decision": "REJECT_DOMAIN"},
                )
            # Enforce verification status for external production targets
            is_non_prod = (
                domain.environment in ("development", "staging", "testing")
                or getattr(domain, "target_type", "production") == "demo_lab"
                or domain.domain_name.endswith((".local", ".internal", ".test", ".example.com"))
                or domain.domain_name in ("localhost", "127.0.0.1")
            )
            if domain.verification_status != "verified" and not is_non_prod:
                return JSONResponse(
                    status_code=status.HTTP_403_FORBIDDEN,
                    content={
                        "error": "Domain Ownership Unverified",
                        "detail": f"Domain '{domain.domain_name}' ownership has not been verified. Please complete DNS TXT verification before traffic enforcement can be activated.",
                    },
                    headers={"X-WAF-Protected": "FANOS-WAF", "X-WAF-Decision": "REJECT_DOMAIN"},
                )

            target_origin_url = domain.origin_url
            effective_mode = domain.enforcement_mode
            domain_id = domain.id
            domain_name = domain.domain_name
            tenant_id = domain.tenant_id

        # 3. Rate Limiting Enforcement
        rate_key = domain_id or "default"
        is_rate_limited, retry_after, remaining = proxy_traffic_rate_limiter.is_rate_limited(rate_key, client_ip)
        if is_rate_limited:
            logger.warning("[WAF RATE-LIMIT] Rate limit exceeded for %s on %s (Retry-After: %s)", client_ip, domain_name, retry_after)
            try:
                async with AsyncSessionLocal() as session:
                    rate_finding = Finding(
                        rule_id="FW-RATE-001",
                        rule_name="Rate Limit Exceeded",
                        category="Rate Limiting",
                        severity="medium",
                        action="rate_limit",
                        location="client_ip",
                        matched_value=client_ip,
                        description=f"Client {client_ip} exceeded maximum allowable request rate for domain {domain_name}.",
                    )
                    rate_resp = InspectResponse(
                        request_id=f"rate-{uuid.uuid4().hex[:12]}",
                        timestamp=datetime.now(timezone.utc),
                        decision=Decision.BLOCK,
                        risk_score=50,
                        findings_count=1,
                        findings=[rate_finding],
                        processing_time_ms=0.5,
                        client_ip=client_ip,
                        method=method,
                        path=path,
                        policy_mode=effective_mode,
                    )
                    dummy_req = InspectRequest(
                        method=method,
                        path=path,
                        query_params=query_params,
                        headers=raw_headers,
                        body=None,
                        client_ip=client_ip,
                        user_agent=raw_headers.get("user-agent"),
                    )
                    await event_service.log_event(
                        request=dummy_req,
                        response=rate_resp,
                        session=session,
                        domain_id=domain_id,
                        hostname=domain_name,
                        tenant_id=tenant_id,
                        http_status=status.HTTP_429_TOO_MANY_REQUESTS,
                        action="RATE_LIMIT",
                    )
            except Exception as e:
                logger.warning("Error persisting rate limit event: %s", e)

            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "error": "Too Many Requests",
                    "detail": f"Rate limit threshold exceeded for host '{domain_name}'. Please retry in {retry_after} seconds.",
                },
                headers={
                    "X-WAF-Protected": "FANOS-WAF",
                    "X-WAF-Decision": "RATE_LIMIT",
                    "Retry-After": str(retry_after),
                },
            )

        # Record this request against the domain's rate limiter
        proxy_traffic_rate_limiter.record_request(rate_key, client_ip)

        # 4. Read body and build InspectRequest
        body_bytes = await request.body()
        if len(body_bytes) > settings.MAX_REQUEST_BODY_SIZE_BYTES:
            oversize_req_id = f"req-{uuid.uuid4().hex[:12]}"
            logger.warning("[WAF BLOCK] Dropped request exceeding max body size: %s bytes from %s for %s", len(body_bytes), client_ip, domain_name)
            try:
                async with AsyncSessionLocal() as session:
                    size_finding = Finding(
                        rule_id="FW-SIZE-001",
                        rule_name="Payload Body Size Exceeded",
                        category="Protocol & Size Violations",
                        severity="high",
                        action="block",
                        location="body",
                        matched_value=f"size={len(body_bytes)}",
                        description=f"Request body size {len(body_bytes)} bytes exceeds limit {settings.MAX_REQUEST_BODY_SIZE_BYTES} bytes.",
                    )
                    size_resp = InspectResponse(
                        request_id=oversize_req_id,
                        timestamp=datetime.now(timezone.utc),
                        decision=Decision.BLOCK,
                        risk_score=70,
                        findings_count=1,
                        findings=[size_finding],
                        processing_time_ms=0.5,
                        client_ip=client_ip,
                        method=method,
                        path=path,
                        policy_mode=effective_mode,
                    )
                    dummy_req = InspectRequest(
                        method=method,
                        path=path,
                        query_params=query_params,
                        headers=raw_headers,
                        body=None,
                        client_ip=client_ip,
                        user_agent=raw_headers.get("user-agent"),
                    )
                    await event_service.log_event(
                        request=dummy_req,
                        response=size_resp,
                        session=session,
                        domain_id=domain_id,
                        hostname=domain_name,
                        tenant_id=tenant_id,
                        http_status=status.HTTP_413_CONTENT_TOO_LARGE,
                        action="BLOCK",
                    )
            except Exception as e:
                logger.error("Database persistence error during proxy 413 block: %s", str(e), exc_info=True)

            return JSONResponse(
                status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                content={
                    "error": "Payload Too Large",
                    "detail": f"Request body size {len(body_bytes)} bytes exceeds limit {settings.MAX_REQUEST_BODY_SIZE_BYTES} bytes.",
                    "request_id": oversize_req_id,
                },
                headers={
                    "X-WAF-Protected": "FANOS-WAF",
                    "X-WAF-Decision": "BLOCK",
                    "X-WAF-Request-ID": oversize_req_id,
                },
            )

        body_text = ""
        try:
            body_text = body_bytes.decode("utf-8")
        except UnicodeDecodeError:
            body_text = str(body_bytes[:2048])

        inspect_req = InspectRequest(
            method=method,
            path=path,
            query_params=query_params,
            headers=raw_headers,
            body=body_text if body_text else None,
            client_ip=client_ip,
            user_agent=raw_headers.get("user-agent"),
        )

        # 5. Inspect through WAF pipeline with domain mode override
        try:
            decision_result = pipeline.inspect(inspect_req, mode_override=effective_mode)
        except Exception as e:
            logger.error("WAF inspection engine exception: %s", str(e), exc_info=True)
            fail_mode = getattr(settings, "PROXY_FAIL_MODE", "fail_closed")
            if fail_mode == "fail_open":
                logger.warning("Fail-open enabled: Permitting uninspected traffic due to engine error: %s", str(e))
                decision_result = None
                try:
                    async with AsyncSessionLocal() as session:
                        await audit_service.log_action(
                            username="SYSTEM_WAF",
                            action="WAF_INSPECTION_ENGINE_FAILURE_FAIL_OPEN",
                            session=session,
                            details={"error": str(e), "path": path, "method": method, "client_ip": client_ip, "domain": domain_name},
                        )
                except Exception:
                    pass
            else:
                # Default fail-closed policy
                try:
                    async with AsyncSessionLocal() as session:
                        await audit_service.log_action(
                            username="SYSTEM_WAF",
                            action="WAF_INSPECTION_ENGINE_FAILURE_FAIL_CLOSED",
                            session=session,
                            details={"error": str(e), "path": path, "method": method, "client_ip": client_ip, "domain": domain_name},
                        )
                except Exception:
                    pass

                return JSONResponse(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    content={
                        "error": "WAF Inspection Failure",
                        "message": "Security engine failure occurred. Traffic blocked by fail-closed policy.",
                    },
                    headers={
                        "X-WAF-Protected": "FANOS-WAF",
                        "X-WAF-Decision": "BLOCK",
                        "X-WAF-Fail-Mode": "fail_closed",
                    },
                )

        # 6. Enforce Decision (BLOCK mode rejects request before reaching upstream)
        if decision_result is not None and decision_result.decision == Decision.BLOCK:
            logger.warning(
                "[WAF BLOCK] Dropped malicious request: %s %s from %s for %s (Score: %s)",
                method, path, client_ip, domain_name, decision_result.risk_score
            )
            # Persist block event with domain and tenant metadata
            try:
                async with AsyncSessionLocal() as session:
                    await event_service.log_event(
                        request=inspect_req,
                        response=decision_result,
                        session=session,
                        domain_id=domain_id,
                        hostname=domain_name,
                        tenant_id=tenant_id,
                        http_status=status.HTTP_403_FORBIDDEN,
                        origin_status=None,
                        action="BLOCK",
                    )
            except Exception as e:
                logger.error("Database persistence error during proxy block: %s", str(e), exc_info=True)

            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={
                    "error": "Forbidden by Web Application Firewall (WAF)",
                    "message": "This request was identified as a security policy violation and blocked.",
                    "request_id": decision_result.request_id,
                    "risk_score": decision_result.risk_score,
                    "findings_count": decision_result.findings_count,
                },
                headers={
                    "X-WAF-Protected": "FANOS-WAF",
                    "X-WAF-Decision": "BLOCK",
                    "X-WAF-Request-ID": decision_result.request_id,
                },
            )

        # If request is clean but was destined for an unregistered external host, reject with 404
        if is_unregistered_external:
            return JSONResponse(
                status_code=status.HTTP_404_NOT_FOUND,
                content={
                    "error": "Domain Not Found",
                    "detail": f"The requested host '{clean_host}' is not a registered domain on this FANOS WAF instance.",
                    "host": clean_host,
                },
                headers={"X-WAF-Protected": "FANOS-WAF", "X-WAF-Decision": "REJECT_DOMAIN"},
            )

        # 7. Forward clean or monitored request to configured origin
        if not path.startswith("/"):
            path = "/" + path
        while path.startswith("//"):
            path = path[1:]

        # Obtain connection-pooled client for this origin
        try:
            if target_origin_url == self.upstream_url and self.client is not None and not self.client.is_closed:
                forward_client = self.client
                forward_base = self.forward_url_base
                forward_host = self.target_host_header
            else:
                forward_client, forward_base, forward_host = self._get_or_create_client(target_origin_url)
        except Exception as e:
            logger.error("Failed to connect to origin '%s': %s", target_origin_url, e)
            return JSONResponse(
                status_code=status.HTTP_502_BAD_GATEWAY,
                content={"error": "Bad Gateway", "detail": f"Upstream origin configuration error: {str(e)}"},
                headers={"X-WAF-Protected": "FANOS-WAF", "X-WAF-Decision": "BLOCK"},
            )

        target_url = f"{forward_base}{path}"
        if query_params:
            target_url += f"?{urllib.parse.urlencode(query_params)}"

        # Extract client-specified hop-by-hop headers from Connection header
        custom_hop_by_hop = set()
        connection_header = raw_headers.get("connection")
        if connection_header:
            for h in connection_header.split(","):
                h_clean = h.strip().lower()
                if h_clean:
                    custom_hop_by_hop.add(h_clean)

        # Filter hop-by-hop and untrusted headers before forwarding
        forward_headers = {}
        for k, v in raw_headers.items():
            lower_k = k.lower().strip()
            if lower_k in HOP_BY_HOP_HEADERS or lower_k in UNTRUSTED_FORWARDING_HEADERS or lower_k in custom_hop_by_hop:
                continue
            forward_headers[k] = v

        # Set authoritative forwarding headers
        forward_headers["X-Forwarded-For"] = client_ip
        forward_headers["X-Forwarded-Proto"] = request.url.scheme
        forward_headers["X-WAF-Inspected"] = "true"
        forward_headers["Host"] = forward_host or domain_name

        try:
            upstream_res = await forward_client.request(
                method=method,
                url=target_url,
                headers=forward_headers,
                content=body_bytes if body_bytes else None,
            )

            # Upstream response size check
            content_len = len(upstream_res.content)
            if content_len > MAX_RESPONSE_BODY_SIZE_BYTES:
                logger.warning("Upstream response too large: %s bytes", content_len)
                return JSONResponse(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    content={"error": "Bad Gateway", "detail": "Upstream response exceeds maximum allowable size."},
                    headers={
                        "X-WAF-Protected": "FANOS-WAF",
                        "X-WAF-Decision": decision_result.decision.value if decision_result else "BLOCK",
                    },
                )

            # Persist allowed / monitored security event
            if decision_result is not None:
                try:
                    async with AsyncSessionLocal() as session:
                        await event_service.log_event(
                            request=inspect_req,
                            response=decision_result,
                            session=session,
                            domain_id=domain_id,
                            hostname=domain_name,
                            tenant_id=tenant_id,
                            http_status=upstream_res.status_code,
                            origin_status=upstream_res.status_code,
                            action=decision_result.decision.value,
                        )
                except Exception as e:
                    logger.error("Database persistence error during proxy forwarding: %s", str(e), exc_info=True)

            # Filter upstream response headers
            # Note: httpx automatically decodes compressed content (gzip/deflate/br).
            # We must strip 'content-encoding' and 'content-length' so clients don't attempt
            # double-decompression on already-decompressed bytes (avoiding zlib error -3).
            resp_headers = {
                k: v for k, v in upstream_res.headers.items()
                if k.lower() not in HOP_BY_HOP_HEADERS and k.lower() not in ("content-encoding", "content-length")
            }
            resp_headers["X-WAF-Protected"] = "FANOS-WAF"
            resp_headers["X-WAF-Decision"] = decision_result.decision.value if decision_result else "FAIL_OPEN"
            resp_headers["X-WAF-Request-ID"] = decision_result.request_id if decision_result else "none"
            if decision_result is None:
                resp_headers["X-WAF-Fail-Mode"] = "fail_open"
                resp_headers["X-WAF-Warning"] = "WAF inspection engine failure; traffic forwarded per fail-open policy"

            return Response(
                content=upstream_res.content,
                status_code=upstream_res.status_code,
                headers=resp_headers,
            )
        except httpx.TimeoutException as exc:
            logger.error("Upstream timeout [%s]: %s", target_url, str(exc))
            if decision_result is not None and (decision_result.findings_count > 0 or decision_result.risk_score > 0):
                try:
                    async with AsyncSessionLocal() as session:
                        await event_service.log_event(
                            request=inspect_req,
                            response=decision_result,
                            session=session,
                            domain_id=domain_id,
                            hostname=domain_name,
                            tenant_id=tenant_id,
                            http_status=status.HTTP_504_GATEWAY_TIMEOUT,
                            origin_status=status.HTTP_504_GATEWAY_TIMEOUT,
                            action=decision_result.decision.value,
                        )
                except Exception as e:
                    logger.error("Database persistence error during timeout event logging: %s", e)
            return JSONResponse(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                content={"error": "Gateway Timeout", "detail": "Protected upstream application timed out."},
                headers={
                    "X-WAF-Protected": "FANOS-WAF",
                    "X-WAF-Decision": decision_result.decision.value if decision_result else "BLOCK",
                    "X-WAF-Request-ID": decision_result.request_id if decision_result else "none",
                },
            )
        except httpx.ConnectError as exc:
            logger.error("Upstream target unreachable [%s]: %s", target_url, str(exc))
            if decision_result is not None and (decision_result.findings_count > 0 or decision_result.risk_score > 0):
                try:
                    async with AsyncSessionLocal() as session:
                        await event_service.log_event(
                            request=inspect_req,
                            response=decision_result,
                            session=session,
                            domain_id=domain_id,
                            hostname=domain_name,
                            tenant_id=tenant_id,
                            http_status=status.HTTP_502_BAD_GATEWAY,
                            origin_status=status.HTTP_502_BAD_GATEWAY,
                            action=decision_result.decision.value,
                        )
                except Exception as e:
                    logger.error("Database persistence error during connect error event logging: %s", e)
            return JSONResponse(
                status_code=status.HTTP_502_BAD_GATEWAY,
                content={"error": "Bad Gateway", "detail": "Protected upstream application is unreachable."},
                headers={
                    "X-WAF-Protected": "FANOS-WAF",
                    "X-WAF-Decision": decision_result.decision.value if decision_result else "BLOCK",
                    "X-WAF-Request-ID": decision_result.request_id if decision_result else "none",
                },
            )
        except (httpx.ProtocolError, httpx.DecodingError) as exc:
            logger.error("Upstream protocol or decoding error [%s]: %s", target_url, str(exc))
            return JSONResponse(
                status_code=status.HTTP_502_BAD_GATEWAY,
                content={"error": "Bad Gateway", "detail": "Received malformed response from protected upstream application."},
                headers={
                    "X-WAF-Protected": "FANOS-WAF",
                    "X-WAF-Decision": decision_result.decision.value if decision_result else "BLOCK",
                    "X-WAF-Request-ID": decision_result.request_id if decision_result else "none",
                },
            )
        except Exception as exc:
            logger.error("Proxy forwarding error: %s", str(exc), exc_info=True)
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={"error": "Proxy Error", "detail": "An error occurred forwarding traffic to upstream."},
                headers={"X-WAF-Protected": "FANOS-WAF", "X-WAF-Decision": "BLOCK"},
            )


proxy_engine = ReverseProxyEngine()


@router.api_route("", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"])
async def proxy_traffic_root(request: Request):
    """Reverse proxy root endpoint."""
    return await proxy_engine.intercept_and_forward(request)


@router.api_route("/{proxy_path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"])
async def proxy_traffic(proxy_path: str, request: Request):
    """
    Reverse proxy endpoint that intercepts traffic, resolves domain against database,
    applies rate limiting and WAF inspection, and forwards allowed traffic to the domain's upstream target.
    """
    return await proxy_engine.intercept_and_forward(request)

