"""
Pydantic schemas for domain onboarding, multi-tenant website management, and origin health.
"""
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator
import urllib.parse
import re

DOMAIN_REGEX = re.compile(
    r"^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$|"
    r"^localhost$|"
    r"^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$"
)


class DomainCreate(BaseModel):
    domain_name: str = Field(..., description="Fully qualified domain name or IP/localhost for development")
    subdomains: List[str] = Field(default_factory=list, description="Optional list of protected subdomains")
    origin_url: str = Field(..., description="Protected upstream origin URL, e.g. http://127.0.0.1:5000")
    environment: str = Field("development", description="development, staging, or production")
    target_type: str = Field("production", description="'production' for real customer websites, 'demo_lab' for authorized training labs")
    enforcement_mode: str = Field("monitor", description="monitor or block")
    ssl_enabled: bool = Field(False, description="Enable TLS / HTTPS reverse proxy termination")

    @field_validator("domain_name")
    @classmethod
    def validate_domain_name(cls, v: str) -> str:
        clean = v.strip().lower()
        # Remove any protocol or port prefix/suffix if accidentally entered
        if "://" in clean:
            clean = urllib.parse.urlparse(clean).netloc or clean
        if ":" in clean:
            clean = clean.split(":")[0]
        if not clean or not DOMAIN_REGEX.match(clean):
            raise ValueError(f"Invalid domain name format: '{v}'")
        return clean

    @field_validator("origin_url")
    @classmethod
    def validate_origin(cls, v: str) -> str:
        clean = v.strip().rstrip("/")
        parsed = urllib.parse.urlparse(clean)
        if parsed.scheme not in ("http", "https"):
            raise ValueError("Origin URL must start with http:// or https://")
        if not parsed.hostname:
            raise ValueError("Origin URL must contain a valid host")

        lower_host = parsed.hostname.lower().strip()
        if lower_host in ("169.254.169.254", "metadata.google.internal", "instance-data", "metadata.internal", "100.100.100.200"):
            raise ValueError(f"Prohibited: Cloud metadata endpoint '{lower_host}' cannot be used as an origin.")

        import ipaddress
        try:
            ip_obj = ipaddress.ip_address(lower_host)
            if ip_obj in (ipaddress.ip_address("169.254.169.254"), ipaddress.ip_address("255.255.255.255"), ipaddress.ip_address("0.0.0.0")):
                raise ValueError(f"Prohibited: IP address '{ip_obj}' is restricted.")
            for net in [ipaddress.ip_network("169.254.0.0/16"), ipaddress.ip_network("fe80::/10"), ipaddress.ip_network("224.0.0.0/4"), ipaddress.ip_network("240.0.0.0/4"), ipaddress.ip_network("0.0.0.0/8")]:
                if ip_obj in net:
                    raise ValueError(f"Prohibited: Origin address '{ip_obj}' is in restricted range '{net}'.")
        except ValueError as ve:
            if "Prohibited:" in str(ve):
                raise ve

        return clean

    @field_validator("enforcement_mode")
    @classmethod
    def validate_mode(cls, v: str) -> str:
        clean = v.strip().lower()
        if clean not in ("monitor", "block", "hybrid", "both"):
            raise ValueError("Enforcement mode must be 'monitor', 'block', or 'hybrid'")
        return "hybrid" if clean == "both" else clean


class DomainUpdate(BaseModel):
    origin_url: Optional[str] = None
    environment: Optional[str] = None
    target_type: Optional[str] = None
    enforcement_mode: Optional[str] = None
    is_active: Optional[bool] = None
    ssl_enabled: Optional[bool] = None

    @field_validator("enforcement_mode")
    @classmethod
    def validate_mode(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            clean = v.strip().lower()
            if clean not in ("monitor", "block", "hybrid", "both"):
                raise ValueError("Enforcement mode must be 'monitor', 'block', or 'hybrid'")
            return "hybrid" if clean == "both" else clean
        return v


class DomainOut(BaseModel):
    id: str
    tenant_id: str
    domain_name: str
    subdomains: List[str]
    origin_url: str
    environment: str
    target_type: str = "production"
    enforcement_mode: str
    verification_status: str
    verification_token: str
    verified_at: Optional[datetime] = None
    is_active: bool
    ssl_enabled: bool
    ssl_mode: str
    dns_txt_record_name: str
    dns_txt_record_value: str
    tls_status: str = "pending"
    proxy_status: str = "pending"
    health_status: str = "unknown"
    last_health_check_at: Optional[datetime] = None
    traffic_verified: bool = False
    last_traffic_test_at: Optional[datetime] = None
    protection_status: str = "DOMAIN_REGISTERED"
    protection_stages: Optional[dict] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class DomainVerifyRequest(BaseModel):
    simulation_mode: bool = Field(False, description="Allow instant verification for local lab/dev test domains")


class DomainVerifyResponse(BaseModel):
    domain_id: str
    domain_name: str
    verified: bool
    verification_status: str
    message: str
    verified_at: Optional[datetime] = None


class OriginHealthOut(BaseModel):
    domain_id: str
    domain_name: str
    origin_url: str
    is_reachable: bool
    status_code: Optional[int] = None
    latency_ms: float = 0.0
    error: Optional[str] = None
    checked_at: datetime


class TrafficTestResponse(BaseModel):
    domain_id: str
    domain_name: str
    target_type: str
    success: bool
    status_code: Optional[int] = None
    latency_ms: float = 0.0
    message: str
    tested_at: datetime
    protection_status: str
    protection_stages: dict


class AttackSimulationRequest(BaseModel):
    test_case_ids: Optional[List[str]] = None
    confirm_production_authorization: Optional[bool] = False


class AttackSimulationItem(BaseModel):
    test_id: str
    name: str
    vector: str
    matched_rule: Optional[str] = None
    risk_score: int = 0
    decision: str = "ALLOW"
    blocked_before_origin: bool = False
    is_test: bool = True
    status: str = "PASSED"  # PASSED, FAILED, WARN
    details: str = ""
    test_type: str = "detection_engine_simulation"  # "detection_engine_simulation" or "live_proxy_test"
    proxy_status_code: Optional[int] = None
    origin_received: Optional[bool] = None


class AttackSimulationResponse(BaseModel):
    test_run_id: str
    domain_id: str
    domain_name: str
    target_type: str
    enforcement_mode: str
    timestamp: datetime
    tests_passed: int
    tests_total: int
    test_type: str = "detection_engine_simulation"  # "detection_engine_simulation" or "live_proxy_test"
    results: List[AttackSimulationItem]


class LabCatalogItem(BaseModel):
    id: str
    name: str
    target_type: str
    default_origin: str
    default_port: int
    description: str
    recommended_mode: str
    sample_test_paths: List[str]
