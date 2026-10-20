"""
SQLAlchemy database models for FANOS WAF.
Unified with FANOS AI core models.
"""
from datetime import datetime, timezone
import uuid
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID

from app.db.base import Base
from app.models.security import User, Organization, SecurityEvent

# SecurityEventModel is unified with SecurityEvent
SecurityEventModel = SecurityEvent


class Domain(Base):
    __tablename__ = "domains"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String(36), nullable=False, default="default", index=True)
    domain_name = Column(String(255), unique=True, nullable=False, index=True)
    subdomains_json = Column(Text, nullable=False, default="[]")
    origin_url = Column(String(512), nullable=False)  # e.g. "http://127.0.0.1:5000"
    environment = Column(String(32), nullable=False, default="development")  # development, staging, production
    enforcement_mode = Column(String(16), nullable=False, default="monitor")  # monitor, block
    verification_status = Column(String(32), nullable=False, default="pending")  # pending, verified, failed, expired
    verification_token = Column(String(128), nullable=False)
    verification_token_hash = Column(String(256), nullable=False)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    ssl_enabled = Column(Boolean, nullable=False, default=False)
    ssl_mode = Column(String(32), nullable=False, default="flexible")
    # Honest Protection and Target Type tracking
    target_type = Column(String(32), nullable=False, default="production")  # production, demo_lab
    tls_status = Column(String(32), nullable=False, default="pending")  # ready, pending, disabled, error
    proxy_status = Column(String(32), nullable=False, default="pending")  # configured, unreachable, origin_down, pending
    health_status = Column(String(32), nullable=False, default="unknown")  # healthy, unhealthy, unknown
    last_health_check_at = Column(DateTime(timezone=True), nullable=True)
    traffic_verified = Column(Boolean, nullable=False, default=False)
    last_traffic_test_at = Column(DateTime(timezone=True), nullable=True)
    protection_status = Column(String(32), nullable=False, default="DOMAIN_REGISTERED")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class RateLimitPolicy(Base):
    __tablename__ = "rate_limit_policies"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String(36), nullable=False, default="default", index=True)
    domain_id = Column(String(36), nullable=True, index=True)
    route_pattern = Column(String(256), nullable=False, default="*")
    requests_per_minute = Column(Integer, nullable=False, default=60)
    burst_limit = Column(Integer, nullable=False, default=20)
    enabled = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class RuleExclusion(Base):
    __tablename__ = "rule_exclusions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String(36), nullable=False, default="default", index=True)
    domain_id = Column(String(36), nullable=True, index=True)
    rule_id = Column(String(64), nullable=False, index=True)
    path_pattern = Column(String(256), nullable=False, default="*")
    justification = Column(String(512), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime(timezone=True), nullable=True)


class WAFRuleModel(Base):
    __tablename__ = "waf_rules"

    id = Column(String(64), primary_key=True)
    name = Column(String(128), nullable=False)
    category = Column(String(64), nullable=False, index=True)
    severity = Column(String(16), nullable=False, index=True)
    action = Column(String(16), nullable=False)
    description = Column(String(512), nullable=False)
    enabled = Column(Boolean, nullable=False, default=True, index=True)
    is_custom = Column(Boolean, nullable=False, default=False)
    pattern = Column(String(512), nullable=True)
    target_locations_json = Column(Text, nullable=False, default="[]")
    tags_json = Column(Text, nullable=False, default="[]")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class WAFSettingModel(Base):
    __tablename__ = "waf_settings"

    key = Column(String(64), primary_key=True)
    value = Column(String(512), nullable=False)
    description = Column(String(256), nullable=True)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class ReportModel(Base):
    __tablename__ = "reports"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(128), nullable=False)
    generated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    time_range = Column(String(64), nullable=False)
    total_inspected = Column(Integer, nullable=False, default=0)
    total_allowed = Column(Integer, nullable=False, default=0)
    total_monitored = Column(Integer, nullable=False, default=0)
    total_blocked = Column(Integer, nullable=False, default=0)
    summary_json = Column(Text, nullable=False, default="{}")


class AuditLogModel(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    username = Column(String(64), nullable=False, index=True)
    action = Column(String(64), nullable=False)
    details_json = Column(Text, nullable=True)
