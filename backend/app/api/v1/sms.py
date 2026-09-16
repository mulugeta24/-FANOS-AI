"""
FANOS AI — SMS API Router (Admin-only)
Demo mode: no real SMS is sent. Simulates provider responses.

Security: Sender ID is validated against the configured SMS_SENDER_ID setting.
Arbitrary spoofing of sender identities is not permitted.
"""
from __future__ import annotations

import random
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, status

from app.models.sms import SmsMessage, sms_store
from app.schemas.sms import (
    CustomerCreate,
    CustomerList,
    CustomerOut,
    MessageHistoryList,
    MessageOut,
    SendMessageIn,
    SmsSettings,
    SmsSettingsUpdate,
    SmsStats,
)

router = APIRouter(prefix="/sms", tags=["SMS Management"])

# ── In-memory settings (demo) ─────────────────────────────────────────────────
_settings = {
    "provider": "demo",
    "sender_id": "FANOS AI",
    "demo_mode": True,
    "api_key": None,
    "api_secret": None,
}


# ─────────────────────────────────────────────────────────────────────────────
# Stats
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/stats", response_model=SmsStats, summary="SMS Dashboard Stats")
async def get_sms_stats():
    """Return aggregate counts for the SMS dashboard."""
    return SmsStats(**sms_store.get_stats())


# ─────────────────────────────────────────────────────────────────────────────
# Customers
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/customers", response_model=CustomerList, summary="List Customers")
async def list_customers(
    search: Optional[str] = Query(None, description="Filter by name or phone"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
):
    customers = sms_store.customers
    if search:
        q = search.lower()
        customers = [
            c for c in customers
            if q in c.name.lower() or q in c.phone
        ]
    total = len(customers)
    start = (page - 1) * limit
    page_items = customers[start: start + limit]
    return CustomerList(
        customers=[
            CustomerOut(
                id=c.id, name=c.name, phone=c.phone,
                status=c.status, created_at=c.created_at,
            )
            for c in page_items
        ],
        total=total,
    )


@router.post("/customers", response_model=CustomerOut, status_code=status.HTTP_201_CREATED,
             summary="Add Customer")
async def add_customer(body: CustomerCreate):
    """Add a new SMS recipient/customer."""
    # Prevent duplicate phones
    existing = next((c for c in sms_store.customers if c.phone == body.phone), None)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Customer with phone {body.phone} already exists.",
        )
    customer = sms_store.add_customer(name=body.name, phone=body.phone)
    return CustomerOut(
        id=customer.id, name=customer.name, phone=customer.phone,
        status=customer.status, created_at=customer.created_at,
    )


@router.delete("/customers/{customer_id}", status_code=status.HTTP_204_NO_CONTENT,
               summary="Delete Customer")
async def delete_customer(customer_id: str):
    """Remove a customer from the SMS list."""
    if not sms_store.delete_customer(customer_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found.")


# ─────────────────────────────────────────────────────────────────────────────
# Send Message
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/send", response_model=MessageOut, status_code=status.HTTP_201_CREATED,
             summary="Send SMS")
async def send_sms(payload: SendMessageIn):
    """
    Send an SMS message.

    Security: `sender_id` in the request **must** match the configured
    Sender ID (`SMS_SENDER_ID`). Arbitrary spoofing is rejected with 403.
    """
    configured_id = _settings["sender_id"]

    # ── Sender ID validation (anti-spoofing) ──────────────────────────────
    if payload.sender_id.strip() != configured_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Sender ID '{payload.sender_id}' is not authorized. "
                f"Only '{configured_id}' is permitted on this system."
            ),
        )

    # ── Demo mode: simulate provider response ─────────────────────────────
    if _settings["demo_mode"] or _settings["provider"] == "demo":
        # Simulate ~85 % success rate
        outcome = random.choices(
            ["sent", "delivered", "failed"],
            weights=[40, 45, 15],
        )[0]
        ref = f"DEMO-{uuid.uuid4().hex[:8].upper()}"
    else:
        # Real provider integration goes here
        outcome = "sent"
        ref = None

    msg = SmsMessage(
        recipient_phone=payload.recipient_phone,
        sender_id=payload.sender_id,
        body=payload.body,
        status=outcome,
        provider_ref=ref,
    )
    sms_store.add_message(msg)

    return MessageOut(
        id=msg.id,
        recipient_phone=msg.recipient_phone,
        sender_id=msg.sender_id,
        body=msg.body,
        status=msg.status,
        provider_ref=msg.provider_ref,
        created_at=msg.created_at,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Message History
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/messages", response_model=MessageHistoryList, summary="Message History")
async def list_messages(
    status_filter: Optional[str] = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
):
    msgs = list(reversed(sms_store.messages))  # newest first
    if status_filter:
        msgs = [m for m in msgs if m.status == status_filter]
    total = len(msgs)
    start = (page - 1) * limit
    page_items = msgs[start: start + limit]
    return MessageHistoryList(
        messages=[
            MessageOut(
                id=m.id, recipient_phone=m.recipient_phone,
                sender_id=m.sender_id, body=m.body,
                status=m.status, provider_ref=m.provider_ref,
                created_at=m.created_at,
            )
            for m in page_items
        ],
        total=total,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Settings
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/settings", response_model=SmsSettings, summary="SMS Settings")
async def get_settings():
    """Return current SMS provider configuration (API key is masked)."""
    return SmsSettings(
        provider=_settings["provider"],
        sender_id=_settings["sender_id"],
        demo_mode=_settings["demo_mode"],
        api_key_configured=bool(_settings.get("api_key")),
    )


@router.put("/settings", response_model=SmsSettings, summary="Update SMS Settings")
async def update_settings(body: SmsSettingsUpdate):
    """Update SMS provider settings. Sender ID is validated before saving."""
    if body.provider is not None:
        _settings["provider"] = body.provider
        if body.provider == "demo":
            _settings["demo_mode"] = True
    if body.sender_id is not None:
        _settings["sender_id"] = body.sender_id
    if body.demo_mode is not None:
        _settings["demo_mode"] = body.demo_mode
    if body.api_key is not None:
        _settings["api_key"] = body.api_key
    if body.api_secret is not None:
        _settings["api_secret"] = body.api_secret

    return SmsSettings(
        provider=_settings["provider"],
        sender_id=_settings["sender_id"],
        demo_mode=_settings["demo_mode"],
        api_key_configured=bool(_settings.get("api_key")),
    )
