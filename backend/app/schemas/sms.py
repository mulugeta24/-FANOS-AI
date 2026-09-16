"""
FANOS AI — SMS Pydantic Schemas
"""
from __future__ import annotations

import re
from datetime import datetime
from typing import List, Literal, Optional
from pydantic import BaseModel, field_validator, Field


E164_REGEX = re.compile(r"^\+[1-9]\d{6,14}$")


# ── Customer ─────────────────────────────────────────────────────────────────

class CustomerCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    phone: str = Field(..., description="E.164 format, e.g. +251911234567")

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        if not E164_REGEX.match(v):
            raise ValueError("Phone must be in E.164 format (e.g. +251911234567)")
        return v


class CustomerOut(BaseModel):
    id: str
    name: str
    phone: str
    status: str
    created_at: datetime


class CustomerList(BaseModel):
    customers: List[CustomerOut]
    total: int


# ── Message ──────────────────────────────────────────────────────────────────

class SendMessageIn(BaseModel):
    recipient_phone: str = Field(..., description="E.164 phone number")
    sender_id: str = Field(..., description="Must match configured Sender ID")
    body: str = Field(..., min_length=1, max_length=918, description="SMS body (max 6 SMS parts)")

    @field_validator("recipient_phone")
    @classmethod
    def validate_recipient(cls, v: str) -> str:
        if not E164_REGEX.match(v):
            raise ValueError("Recipient must be in E.164 format (e.g. +251911234567)")
        return v


class MessageOut(BaseModel):
    id: str
    recipient_phone: str
    sender_id: str
    body: str
    status: str
    provider_ref: Optional[str]
    created_at: datetime


class MessageHistoryList(BaseModel):
    messages: List[MessageOut]
    total: int


# ── Stats ────────────────────────────────────────────────────────────────────

class SmsStats(BaseModel):
    total_customers: int
    messages_sent: int
    messages_delivered: int
    messages_failed: int
    today_messages: int


# ── Settings ─────────────────────────────────────────────────────────────────

class SmsSettings(BaseModel):
    provider: Literal["demo", "africastalking", "twilio"] = "demo"
    sender_id: str = "FANOS AI"
    demo_mode: bool = True
    api_key_configured: bool = False   # masked — never expose actual key


class SmsSettingsUpdate(BaseModel):
    provider: Optional[Literal["demo", "africastalking", "twilio"]] = None
    sender_id: Optional[str] = Field(None, min_length=1, max_length=11,
                                     description="Alphanumeric Sender ID (max 11 chars)")
    demo_mode: Optional[bool] = None
    api_key: Optional[str] = None      # write-only
    api_secret: Optional[str] = None   # write-only (Twilio)
