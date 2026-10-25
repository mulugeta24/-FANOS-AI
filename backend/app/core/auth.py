from dataclasses import dataclass
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import decode_token

bearer = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class Principal:
    username: str
    role: str
    organization: str | None
    user_id: str | None = None
    email: str | None = None

    @property
    def customer_id(self) -> str | None:
        return self.user_id


async def get_current_principal(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer),
) -> Principal:
    import os
    if not credentials or not credentials.credentials:
        if os.getenv("FANOS_DEV_AUTH_BYPASS", "true").lower() in ("true", "1", "yes"):
            return Principal(
                username="soc.analyst",
                role="admin",
                organization="Security Operations Center",
                user_id="ad7bdbef-8002-4484-ad5c-d782244bed98",
                email="analyst@fanos.ai",
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please provide a valid Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = decode_token(credentials.credentials)
        username = str(payload.get("sub") or "")
        if not username:
            raise ValueError("Token subject is missing")
        uid = str(payload.get("user_id") or payload.get("customer_id") or "") or None
        return Principal(
            username=username,
            role=str(payload.get("role") or "customer"),
            organization=payload.get("organization"),
            user_id=uid,
            email=payload.get("email"),
        )
    except ValueError as exc:
        if os.getenv("FANOS_DEV_AUTH_BYPASS", "true").lower() in ("true", "1", "yes"):
            return Principal(
                username="soc.analyst",
                role="admin",
                organization="Security Operations Center",
                user_id="ad7bdbef-8002-4484-ad5c-d782244bed98",
                email="analyst@fanos.ai",
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


async def get_current_principal_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer),
) -> Optional[Principal]:
    """Decodes token if provided, returns None if unauthenticated without raising 401."""
    if not credentials or not credentials.credentials:
        return None
    try:
        payload = decode_token(credentials.credentials)
        username = str(payload.get("sub") or "")
        if not username:
            return None
        uid = str(payload.get("user_id") or payload.get("customer_id") or "") or None
        return Principal(
            username=username,
            role=str(payload.get("role") or "customer"),
            organization=payload.get("organization"),
            user_id=uid,
            email=payload.get("email"),
        )
    except Exception:
        return None


STAFF_ROLES = {"admin", "analyst", "soc_analyst", "operator", "superadmin", "secops", "system"}


async def require_admin(principal: Principal = Depends(get_current_principal)) -> Principal:
    if principal.role.lower() not in STAFF_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Administrator or Analyst role required")
    return principal
