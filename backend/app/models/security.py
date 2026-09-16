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

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username    = Column(String(64), nullable=False, unique=True, index=True)
    email       = Column(String(256), nullable=False, unique=True, index=True)
    full_name   = Column(String(128), nullable=False)
    hashed_pwd  = Column(String(256), nullable=False)
    role        = Column(String(32), nullable=False, default="analyst")
    is_active   = Column(Boolean, default=True)
    mfa_enabled = Column(Boolean, default=False)
    created_at  = Column(DateTime(timezone=True), default=now_utc)
    last_login  = Column(DateTime(timezone=True), nullable=True)
