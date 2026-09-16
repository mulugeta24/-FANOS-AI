"""
FANOS AI — SMS Module Models
Supports demo (in-memory) mode — no DB migration needed for initial setup.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import List, Optional

# ── In-memory store (demo mode) ──────────────────────────────────────────────
# Persists for the lifetime of the backend process. Replace with SQLAlchemy
# models + Alembic migration when moving to production DB.

class SmsCustomer:
    """Represents an SMS notification recipient."""

    def __init__(self, name: str, phone: str, status: str = "active"):
        self.id: str = str(uuid.uuid4())
        self.name: str = name
        self.phone: str = phone          # E.164: +2519XXXXXXXX
        self.status: str = status        # active | inactive
        self.created_at: datetime = datetime.now(timezone.utc)


class SmsMessage:
    """Represents a dispatched SMS message."""

    def __init__(
        self,
        recipient_phone: str,
        sender_id: str,
        body: str,
        status: str = "sent",
        provider_ref: Optional[str] = None,
    ):
        self.id: str = str(uuid.uuid4())
        self.recipient_phone: str = recipient_phone
        self.sender_id: str = sender_id
        self.body: str = body
        self.status: str = status        # pending | sent | delivered | failed
        self.provider_ref: Optional[str] = provider_ref
        self.created_at: datetime = datetime.now(timezone.utc)


# ── Singleton in-memory repository ──────────────────────────────────────────

class SmsStore:
    """Thread-safe in-memory store for demo mode."""

    def __init__(self):
        self.customers: List[SmsCustomer] = []
        self.messages: List[SmsMessage] = []
        self._seed()

    def _seed(self):
        """Pre-populate with demo data."""
        demo_customers = [
            SmsCustomer("Abebe Girma",   "+251911234567", "active"),
            SmsCustomer("Kebede Tadesse", "+251922345678", "active"),
            SmsCustomer("Tigist Haile",  "+251933456789", "active"),
            SmsCustomer("Yonas Bekele",  "+251944567890", "inactive"),
            SmsCustomer("Hiwot Tesfaye", "+251955678901", "active"),
        ]
        self.customers.extend(demo_customers)

        demo_msgs = [
            SmsMessage("+251911234567", "FANOS AI", "Security alert: Unusual login detected.", "sent"),
            SmsMessage("+251922345678", "FANOS AI", "Welcome to FANOS AI security alerts.", "delivered"),
            SmsMessage("+251933456789", "FANOS AI", "Test notification from FANOS AI.", "failed"),
            SmsMessage("+251944567890", "FANOS AI", "Intrusion attempt blocked on your account.", "delivered"),
            SmsMessage("+251955678901", "FANOS AI", "Your password was changed successfully.", "sent"),
        ]
        self.messages.extend(demo_msgs)

    # ── Customer helpers ──────────────────────────────────────────────────

    def add_customer(self, name: str, phone: str) -> SmsCustomer:
        c = SmsCustomer(name, phone)
        self.customers.append(c)
        return c

    def get_customer(self, customer_id: str) -> Optional[SmsCustomer]:
        return next((c for c in self.customers if c.id == customer_id), None)

    def delete_customer(self, customer_id: str) -> bool:
        for i, c in enumerate(self.customers):
            if c.id == customer_id:
                self.customers.pop(i)
                return True
        return False

    # ── Message helpers ───────────────────────────────────────────────────

    def add_message(self, msg: SmsMessage) -> SmsMessage:
        self.messages.append(msg)
        return msg

    # ── Stats ─────────────────────────────────────────────────────────────

    def get_stats(self) -> dict:
        from datetime import date
        today = date.today()
        today_msgs = [
            m for m in self.messages
            if m.created_at.date() == today
        ]
        return {
            "total_customers": len(self.customers),
            "messages_sent":      sum(1 for m in self.messages if m.status in ("sent", "delivered")),
            "messages_delivered": sum(1 for m in self.messages if m.status == "delivered"),
            "messages_failed":    sum(1 for m in self.messages if m.status == "failed"),
            "today_messages":     len(today_msgs),
        }


# Singleton instance
sms_store = SmsStore()
