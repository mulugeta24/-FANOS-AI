"""
Customer portal schemas: registration, service selection, asset registration, service requests.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import List, Optional, Any
from pydantic import BaseModel, Field, EmailStr


class CustomerRegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=128)
    username: str = Field(..., min_length=3, max_length=64)
    email: EmailStr
    password: str = Field(..., min_length=8)
    confirm_password: Optional[str] = None
    phone: Optional[str] = ""
    organization_name: Optional[str] = ""
    organization_type: Optional[str] = ""
    organization: Optional[str] = ""  # backwards compatibility
    role: Optional[str] = "customer"


class CustomerUserOut(BaseModel):
    id: Optional[uuid.UUID] = None
    username: str
    full_name: str
    email: str
    role: str
    organization_name: Optional[str] = None
    organization_type: Optional[str] = None
    phone: Optional[str] = None
    created_at: Optional[datetime] = None
    last_login: Optional[datetime] = None

    model_config = {"from_attributes": True}


class CustomerProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    organization_name: Optional[str] = None
    organization_type: Optional[str] = None


class CustomerAssetCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=256)
    asset_type: str = Field(default="WEBSITE")  # WEBSITE, API, SERVER, NETWORK, ENDPOINT, DATABASE, CLOUD, OTHER
    ip_address: str = Field(..., min_length=1, max_length=64)
    hostname: Optional[str] = None
    target_url: Optional[str] = None
    environment: str = Field(default="PRODUCTION")  # PRODUCTION, STAGING, DEVELOPMENT, LAB
    service_type: Optional[str] = None
    description: Optional[str] = None


class CustomerAssetOut(BaseModel):
    id: uuid.UUID
    name: str
    asset_type: str
    ip_address: str
    hostname: Optional[str] = None
    target_url: Optional[str] = None
    environment: str
    status: str
    monitoring_enabled: bool
    service_type: Optional[str] = None
    description: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ServiceRequestCreate(BaseModel):
    service_type: str = Field(..., min_length=3, max_length=64)
    service_category: Optional[str] = "SCANNER"
    asset_id: Optional[uuid.UUID] = None
    asset_name: Optional[str] = None
    target_spec: Optional[str] = None
    priority: str = Field(default="Medium")  # Low, Medium, High, Critical
    request_type: str = Field(default="Initial Deployment")
    description: Optional[str] = None


class RequestAssetOut(BaseModel):
    id: uuid.UUID
    request_id: uuid.UUID
    customer_id: uuid.UUID
    asset_type: str
    asset_name: str
    asset_data: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class RequestHistoryOut(BaseModel):
    id: uuid.UUID
    request_id: uuid.UUID
    customer_id: uuid.UUID
    previous_status: Optional[str] = None
    new_status: str
    changed_by: str
    notes: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ServiceRequestOut(BaseModel):
    id: uuid.UUID
    request_number: str
    user_id: Optional[uuid.UUID] = None
    customer_id: Optional[uuid.UUID] = None
    username: str
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    organization_name: Optional[str] = None
    organization_type: Optional[str] = None
    service_type: str
    service_category: Optional[str] = "SCANNER"
    asset_id: Optional[uuid.UUID] = None
    asset_name: Optional[str] = None
    target_spec: Optional[str] = None
    priority: Optional[str] = "Medium"
    status: Optional[str] = "Pending"
    request_type: Optional[str] = "New Deployment"
    description: Optional[str] = None
    admin_notes: Optional[str] = None
    assigned_to: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ServiceRequestDetailOut(ServiceRequestOut):
    assets: List[RequestAssetOut] = []
    history: List[RequestHistoryOut] = []
    service_configuration: Optional[dict] = None


class ServiceCatalogItem(BaseModel):
    id: str
    name: str
    category: str
    headline: str
    description: str
    features: List[str]
    status: str
    badge: str
    icon: str
    active: bool


class CustomerDashboardStats(BaseModel):
    total_requests: int
    pending_requests: int
    approved_requests: int
    rejected_requests: int
    in_progress_requests: int
    completed_requests: int
    active_services_count: int
    registered_assets_count: int
    recent_activity: List[Any]
    available_services: List[ServiceCatalogItem]


class WafServiceRequestCreate(BaseModel):
    website_name: str = Field(..., min_length=2, max_length=256)
    domain_name: str = Field(..., min_length=3, max_length=256)
    frontend_url: str = Field(..., min_length=3, max_length=512)
    backend_app_url: str = Field(..., min_length=3, max_length=512)
    backend_api_url: Optional[str] = None
    environment: str = Field(default="PRODUCTION")
    protection_mode: str = Field(default="MONITOR")
    # Image 3 form parameters
    ip_address: Optional[str] = None
    port: Optional[str] = None
    web_type: Optional[str] = None
    organization_name: Optional[str] = None
    host: Optional[str] = None


class IdsServiceRequestCreate(BaseModel):
    organization_name: str = Field(..., min_length=2, max_length=128)
    network_name: str = Field(..., min_length=2, max_length=256)
    network_cidr: str = Field(..., min_length=4, max_length=64)
    sensor_name: str = Field(..., min_length=2, max_length=128)
    sensor_ip: str = Field(..., min_length=4, max_length=64)
    environment: str = Field(default="LAB")
    monitoring_description: Optional[str] = None


class ScannerServiceRequestCreate(BaseModel):
    website_name: str = Field(..., min_length=2, max_length=256)
    domain: str = Field(..., min_length=3, max_length=256)
    target_url: str = Field(..., min_length=3, max_length=512)
    application_name: str = Field(..., min_length=2, max_length=128)
    environment: str = Field(default="PRODUCTION")
    backend_api_url: Optional[str] = None
    authorized: bool = Field(default=True)


class CustomerIncidentCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=256)
    description: str = Field(..., min_length=5)
    affected_target: str = Field(..., min_length=3, max_length=256)
    incident_type: str = Field(default="Web Exploit")
    severity: str = Field(default="High")
    detection_time: Optional[str] = None


class CustomerIncidentOut(BaseModel):
    id: uuid.UUID
    title: str
    description: Optional[str] = None
    threat: str
    severity: str
    source_ip: str
    status: str
    risk_score: int
    assigned_to: Optional[str] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class UrlDetectionServiceRequestCreate(BaseModel):
    url: Optional[str] = None
    multiple_urls: Optional[str] = None
    target_domains: Optional[str] = None
    organization_name: Optional[str] = None
    environment: str = Field(default="PRODUCTION")
    description: Optional[str] = None


class IncidentResponseServiceRequestCreate(BaseModel):
    incident_title: Optional[str] = None
    incident_description: Optional[str] = None
    affected_domain_or_ip: Optional[str] = None
    incident_type: Optional[str] = "Security Incident"
    severity: Optional[str] = "High"
    detection_time: Optional[str] = None
    evidence: Optional[str] = None
    critical_scope: Optional[str] = None
    description: Optional[str] = None
    organization_name: Optional[str] = None
    primary_contact: Optional[str] = None
    environment: str = Field(default="PRODUCTION")


class AdminReviewRequest(BaseModel):
    action: Optional[str] = "approve"  # approve / reject
    admin_notes: Optional[str] = None
    notes: Optional[str] = None


class AdminStatusUpdatePayload(BaseModel):
    status: str  # Pending Review, Approved, Rejected, In Progress, Completed
    notes: Optional[str] = None


class ServiceAuthorizationItem(BaseModel):
    service_id: str
    service_name: str
    status: str  # NOT_REQUESTED, PENDING, APPROVED, REJECTED
    request_id: Optional[uuid.UUID] = None
    request_number: Optional[str] = None
    created_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    admin_notes: Optional[str] = None
    target_spec: Optional[str] = None
    asset_name: Optional[str] = None
    environment: Optional[str] = None


class UnifiedServiceRequestCreate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=128)
    work_email: EmailStr
    password: Optional[str] = Field(default=None, min_length=6, max_length=128)
    company: str = Field(..., min_length=2, max_length=128)
    phone: Optional[str] = ""
    role: Optional[str] = ""
    services: List[str] = Field(default_factory=list)
    notes: Optional[str] = ""
    # Asset fields
    asset_name: Optional[str] = None
    frontend_domain: Optional[str] = None
    backend_domain: Optional[str] = None
    environment: Optional[str] = "PRODUCTION"
    protection_mode: Optional[str] = "BLOCKING"
    network_subnet: Optional[str] = None
    scan_target: Optional[str] = None
    # Image 3 form parameters
    ip_address: Optional[str] = None
    port: Optional[str] = None
    web_type: Optional[str] = None
    organization_name: Optional[str] = None
    host: Optional[str] = None


class CustomerTelemetryEvent(BaseModel):
    id: str
    timestamp: str
    attack_type: str
    target: str
    source_ip: str
    severity: str
    action: str
    ai_confidence: float
    risk_score: int


class CustomerDashboardTelemetry(BaseModel):
    is_approved: bool
    has_pending: bool
    active_asset_name: Optional[str] = None
    frontend_domain: Optional[str] = None
    backend_domain: Optional[str] = None
    total_attacks_blocked: int
    critical_threats: int
    total_events_analyzed: int
    ai_accuracy: float
    events: List[CustomerTelemetryEvent]
    attack_distribution: List[dict]
    traffic_trend: List[dict]
    approved_assets: List[CustomerAssetOut]
    pending_assets: List[CustomerAssetOut]
    misconfigurations: List[dict] = Field(default_factory=list)



