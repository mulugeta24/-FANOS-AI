"""
SQLAlchemy ORM models for FANOS AI security entities.
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean, Column, DateTime, Float, Integer,
    String, Text, ForeignKey, Enum as SAEnum,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import Base


def now_utc():
    return datetime.now(timezone.utc)


class SecurityEvent(Base):
    __tablename__ = "security_events"

    id             = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    severity       = Column(String(16), nullable=False, index=True)   # CRITICAL|HIGH|MEDIUM|LOW|INFO
    attack_type    = Column(String(128), nullable=False)
    source_ip      = Column(String(64), nullable=False, index=True)
    target         = Column(String(256), nullable=False)
    ai_confidence  = Column(Float, nullable=False)
    risk_score     = Column(Integer, nullable=False, index=True)
    status         = Column(String(32), nullable=False, default="ALERT")
    raw_payload    = Column(Text, nullable=True)
    sensor_source  = Column(String(64), nullable=True)   # suricata|zeek|waf|wazuh
    created_at     = Column(DateTime(timezone=True), default=now_utc, index=True)

    # WAF Telemetry Fields
    request_id     = Column(String(64), nullable=True, index=True)
    method         = Column(String(16), nullable=True)
    path           = Column(String(1024), nullable=True)
    decision       = Column(String(16), nullable=True, index=True)
    action         = Column(String(32), nullable=True)
    domain_id      = Column(String(36), nullable=True, index=True)
    hostname       = Column(String(255), nullable=True, index=True)
    http_status    = Column(Integer, nullable=True, default=200)
    client_ip      = Column(String(64), nullable=True, index=True)
    findings_count = Column(Integer, nullable=False, default=0)
    findings_json  = Column(Text, nullable=False, default="[]")
    processing_time_ms = Column(Float, nullable=False, default=0.0)
    policy_mode    = Column(String(16), nullable=False, default="monitor")
    origin_status  = Column(Integer, nullable=True)
    is_test        = Column(Boolean, nullable=False, default=False, index=True)
    headers_sanitized_json = Column(Text, nullable=True)
    query_sanitized_json   = Column(Text, nullable=True)
    body_sanitized = Column(Text, nullable=True)
    tenant_id      = Column(String(36), nullable=True, index=True)
    timestamp      = Column(DateTime(timezone=True), default=now_utc, index=True)

    # Relationship to incident (optional)
    incident_id    = Column(UUID(as_uuid=True), ForeignKey("incidents.id"), nullable=True)
    incident       = relationship("Incident", back_populates="events")


class Incident(Base):
    __tablename__ = "incidents"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title       = Column(String(256), nullable=False)
    threat      = Column(String(128), nullable=False)
    severity    = Column(String(16), nullable=False, index=True)
    source_ip   = Column(String(64), nullable=False)
    status      = Column(String(32), nullable=False, default="Open", index=True)
    risk_score  = Column(Integer, nullable=False)
    assigned_to = Column(String(128), nullable=True)
    description = Column(Text, nullable=True)
    created_at  = Column(DateTime(timezone=True), default=now_utc, index=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    events      = relationship("SecurityEvent", back_populates="incident")
    actions     = relationship("ResponseAction", back_populates="incident")


class ResponseAction(Base):
    __tablename__ = "response_actions"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    action      = Column(String(64), nullable=False)   # Blocked IP | WAF Rule | etc.
    target      = Column(String(256), nullable=False)
    reason      = Column(String(256), nullable=False)
    automated   = Column(Boolean, default=True)
    created_at  = Column(DateTime(timezone=True), default=now_utc, index=True)

    incident_id = Column(UUID(as_uuid=True), ForeignKey("incidents.id"), nullable=True)
    incident    = relationship("Incident", back_populates="actions")


class BlockedIP(Base):
    __tablename__ = "blocked_ips"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ip_address  = Column(String(64), nullable=False, unique=True, index=True)
    reason      = Column(String(256), nullable=False)
    blocked_by  = Column(String(64), nullable=False, default="FANOS AI")
    expires_at  = Column(DateTime(timezone=True), nullable=True)
    created_at  = Column(DateTime(timezone=True), default=now_utc, index=True)
    is_active   = Column(Boolean, default=True, index=True)


class User(Base):
    __tablename__ = "users"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username        = Column(String(64), nullable=False, unique=True, index=True)
    email           = Column(String(256), nullable=True, unique=True, index=True)
    full_name       = Column(String(128), nullable=True)
    hashed_pwd      = Column(String(256), nullable=True)
    hashed_password = Column(String(256), nullable=True)
    role            = Column(String(32), nullable=False, default="analyst")
    tenant_id       = Column(String(36), nullable=True, default="org-default", index=True)
    is_active       = Column(Boolean, default=True)
    is_admin        = Column(Boolean, default=False)
    mfa_enabled     = Column(Boolean, default=False)
    created_at      = Column(DateTime(timezone=True), default=now_utc)
    last_login      = Column(DateTime(timezone=True), nullable=True)

    @property
    def password_hash(self) -> str:
        return self.hashed_password or self.hashed_pwd or ""


class Organization(Base):
    __tablename__ = "organizations"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name       = Column(String(128), nullable=False)
    slug       = Column(String(128), nullable=False, unique=True, index=True)
    is_active  = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), default=now_utc, index=True)


class Asset(Base):
    __tablename__ = "assets"

    id                 = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id    = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    name               = Column(String(256), nullable=False)
    asset_type         = Column(String(32), nullable=False, default="OTHER")
    ip_address         = Column(String(64), nullable=False, index=True)
    hostname           = Column(String(256), nullable=True)
    description        = Column(Text, nullable=True)
    environment        = Column(String(32), nullable=False, default="LAB")
    status             = Column(String(32), nullable=False, default="PENDING", index=True)
    monitoring_enabled = Column(Boolean, nullable=False, default=False, index=True)
    sensor_id          = Column(String(128), nullable=True)
    created_at         = Column(DateTime(timezone=True), default=now_utc, index=True)
    updated_at         = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)


class SensorLifecycle(Base):
    __tablename__ = "sensor_lifecycles"

    id               = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    asset_id         = Column(UUID(as_uuid=True), ForeignKey("assets.id"), nullable=False, unique=True, index=True)
    sensor_id        = Column(String(128), nullable=False, unique=True, index=True)
    desired_state    = Column(String(32), nullable=False, default="STOPPED", index=True)
    status           = Column(String(32), nullable=False, default="OFFLINE", index=True)
    suricata_status  = Column(String(32), nullable=False, default="OFFLINE")
    collector_status = Column(String(32), nullable=False, default="IDLE")
    service_status   = Column(String(32), nullable=False, default="OFFLINE")
    last_heartbeat   = Column(DateTime(timezone=True), nullable=True)
    last_seen        = Column(DateTime(timezone=True), nullable=True)
    suricata_pid     = Column(Integer, nullable=True)
    collector_pid    = Column(Integer, nullable=True)
    restart_count    = Column(Integer, nullable=False, default=0, index=True)
    last_error       = Column(Text, nullable=True)
    created_at       = Column(DateTime(timezone=True), default=now_utc, index=True)
    updated_at       = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)


class SensorCommand(Base):
    __tablename__ = "sensor_commands"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sensor_id    = Column(String(128), nullable=False, index=True)
    command      = Column(String(32), nullable=False, index=True)
    requested_by = Column(String(128), nullable=False, index=True)
    status       = Column(String(32), nullable=False, default="PENDING", index=True)
    result       = Column(String(256), nullable=True)
    created_at   = Column(DateTime(timezone=True), default=now_utc, index=True)
    processed_at = Column(DateTime(timezone=True), nullable=True)


class SensorAuditLog(Base):
    __tablename__ = "sensor_audit_logs"

    id                     = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sensor_id              = Column(String(128), nullable=False, index=True)
    admin_user             = Column(String(128), nullable=False, index=True)
    action                 = Column(String(64), nullable=False, index=True)
    previous_desired_state = Column(String(32), nullable=True)
    new_desired_state      = Column(String(32), nullable=True)
    result                 = Column(String(32), nullable=False, default="ACCEPTED", index=True)
    details                = Column(Text, nullable=True)
    created_at             = Column(DateTime(timezone=True), default=now_utc, index=True)
