from dataclasses import dataclass

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import decode_token

bearer = HTTPBearer(auto_error=True)


@dataclass(frozen=True)
class Principal:
    username: str
    role: str
    organization: str | None


async def get_current_principal(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
) -> Principal:
    try:
        payload = decode_token(credentials.credentials)
        username = str(payload.get("sub") or "")
        if not username:
            raise ValueError("Token subject is missing")
        return Principal(
            username=username,
            role=str(payload.get("role") or "customer"),
            organization=payload.get("organization"),
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


async def require_admin(principal: Principal = Depends(get_current_principal)) -> Principal:
    if principal.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Administrator role required")
    return principal
