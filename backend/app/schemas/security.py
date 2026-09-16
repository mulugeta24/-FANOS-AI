"""
Pydantic v2 schemas for FANOS AI API request/response validation.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field, IPvAnyAddress


# ──────────────────────────────────────────────
# Common
# ──────────────────────────────────────────────
class PaginatedResponse(BaseModel):
    total:   int
    page:    int
    size:    int
    items:   list


# ──────────────────────────────────────────────
# Security Event
# ──────────────────────────────────────────────
class SecurityEventOut(BaseModel):
    id:            uuid.UUID
    severity:      str
    attack_type:   str
    source_ip:     str
    target:        str
    ai_confidence: float
    risk_score:    int
    status:        str
    sensor_source: Optional[str]
    created_at:    datetime

    model_config = {"from_attributes": True}


# ──────────────────────────────────────────────
# Incident
# ──────────────────────────────────────────────
class IncidentOut(BaseModel):
    id:          uuid.UUID
    title:       str
    threat:      str
    severity:    str
    source_ip:   str
    status:      str
    risk_score:  int
    assigned_to: Optional[str]
    created_at:  datetime

    model_config = {"from_attributes": True}


class IncidentUpdate(BaseModel):
    status:      Optional[str] = None
    assigned_to: Optional[str] = None
    description: Optional[str] = None


# ──────────────────────────────────────────────
# Response Action
# ──────────────────────────────────────────────
class ResponseActionOut(BaseModel):
    id:         uuid.UUID
    action:     str
    target:     str
    reason:     str
    automated:  bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ──────────────────────────────────────────────
# Blocked IP
# ──────────────────────────────────────────────
class BlockIPRequest(BaseModel):
    ip_address: str = Field(..., examples=["192.168.56.10"])
    reason:     str = Field(..., min_length=3, max_length=256)
    expires_at: Optional[datetime] = None


class BlockedIPOut(BaseModel):
    id:         uuid.UUID
    ip_address: str
    reason:     str
    blocked_by: str
    is_active:  bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ──────────────────────────────────────────────
# Dashboard KPIs
# ──────────────────────────────────────────────
class DashboardKPIs(BaseModel):
    critical_threats:  int
    critical_change:   str
    active_incidents:  int
    incidents_today:   int
    blocked_threats:   int
    blocked_change:    str
    security_events:   int
    events_change:     str
    ai_accuracy:       float
    ai_f1_score:       float
    system_health:     float
    sensors_online:    int
    sensors_total:     int


# ──────────────────────────────────────────────
# Threat Activity
# ──────────────────────────────────────────────
class ThreatActivityPoint(BaseModel):
    time:    str
    network: int
    web:     int
    system:  int
    blocked: int


# ──────────────────────────────────────────────
# Attack Distribution
# ──────────────────────────────────────────────
class AttackDistributionItem(BaseModel):
    name:  str
    value: int
    color: str


# ──────────────────────────────────────────────
# AI Engine
# ──────────────────────────────────────────────
class AIEngineStatus(BaseModel):
    model_name:       str
    model_version:    str
    status:           str
    accuracy:         float
    precision:        float
    recall:           float
    f1_score:         float
    inference_ms:     float
    requests_per_sec: int


# ──────────────────────────────────────────────
# AI Prediction Request / Response
# ──────────────────────────────────────────────
class PredictionRequest(BaseModel):
    features: List[float] = Field(..., description="Feature vector for the AI model")
    source_ip: Optional[str] = None
    target:    Optional[str] = None


class PredictionResponse(BaseModel):
    attack_detected:  bool
    attack_type:      str
    confidence:       float
    risk_score:       int
    severity:         str
    recommendation:   str


# ──────────────────────────────────────────────
# Sensor
# ──────────────────────────────────────────────
class SensorOut(BaseModel):
    name:   str
    type:   str
    status: str
    events: int
    uptime: str


# ──────────────────────────────────────────────
# Prevention Status
# ──────────────────────────────────────────────
class PreventionStatus(BaseModel):
    active_blocking:  bool
    blocked_ips:      int
    blocked_sessions: int
    waf_blocks:       int
    firewall_actions: int
    auto_response:    bool


# ──────────────────────────────────────────────
# Web Security
# ──────────────────────────────────────────────
class AttackTypeCount(BaseModel):
    name:  str
    count: int
    color: str


class WebSecurityStats(BaseModel):
    total_requests:     int
    suspicious:         int
    confirmed_findings: int
    critical_findings:  int
    high_findings:      int
    attack_types:       List[AttackTypeCount]


# ──────────────────────────────────────────────
# URI Assessment
# ──────────────────────────────────────────────
class URIAssessmentRequest(BaseModel):
    uri:   str = Field(..., examples=["https://example.com/login"])
    scope: str = Field(default="Single URI", examples=["Single URI", "Application Path"])


class URIAssessmentResult(BaseModel):
    uri:           str
    scope:         str
    risk_score:    int
    findings:      int
    critical:      int
    high:          int
    medium:        int
    summary:       str
    scan_duration: float


# ──────────────────────────────────────────────
# Auth
# ──────────────────────────────────────────────
class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    expires_in:   int
    user:         Optional[dict] = None
