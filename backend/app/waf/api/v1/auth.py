"""
Authentication API endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import get_db
from app.waf.models import User
from app.waf.schemas.auth import PasswordChangeRequest, Token, UserLogin, UserOut
from app.waf.security.auth import create_access_token, get_current_user
from app.waf.security.password import hash_password, verify_password
from app.waf.security.rate_limiter import (
    enforce_login_rate_limit,
    record_failed_login,
    record_successful_login,
)
from app.waf.services.audit_service import audit_service

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=Token)
async def login(
    credentials: UserLogin,
    request: Request,
    session: AsyncSession = Depends(get_db),
):
    """Authenticates admin or analyst credentials and issues a JWT token with rate limiting."""
    # 1. Enforce rate limiting
    enforce_login_rate_limit(request, username=credentials.username)

    # 2. Check credentials
    stmt = select(User).where(User.username == credentials.username)
    res = await session.execute(stmt)
    user = res.scalar_one_or_none()

    if not user or not verify_password(credentials.password, user.hashed_password):
        # Record failed attempt for rate limiting
        record_failed_login(request, username=credentials.username)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )

    if not user.is_active:
        record_failed_login(request, username=credentials.username)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    # 3. Successful authentication: reset rate limiter
    record_successful_login(request, username=credentials.username)

    # 4. Record audit log
    try:
        await audit_service.log_action(
            username=user.username,
            action="USER_LOGIN_SUCCESS",
            session=session,
            details={"client_ip": request.client.host if request.client else "unknown"},
        )
    except Exception:
        pass

    token = create_access_token(
        data={"sub": user.username, "role": user.role}
    )

    return Token(
        access_token=token,
        token_type="bearer",
        role=user.role,
        username=user.username,
    )


@router.get("/me", response_model=UserOut)
async def get_my_profile(current_user: User = Depends(get_current_user)):
    """Returns profile information for the authenticated user."""
    return UserOut(
        id=current_user.id,
        username=current_user.username,
        role=current_user.role,
        is_active=current_user.is_active,
    )


@router.post("/change-password")
async def change_password(
    data: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """Changes password for the current authenticated user."""
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password verification failed.",
        )

    if len(data.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 8 characters long.",
        )

    if data.new_password == data.current_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password cannot be identical to current password.",
        )

    current_user.hashed_password = hash_password(data.new_password)
    await session.commit()

    try:
        await audit_service.log_action(
            username=current_user.username,
            action="PASSWORD_CHANGED",
            session=session,
            details={"username": current_user.username},
        )
    except Exception:
        pass

    return {"message": "Password changed successfully."}
