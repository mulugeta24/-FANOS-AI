"""
Auth API — Registration, login, token refresh, and profile management.
Unified with PostgreSQL database storage and seamless fallback for demo reliability.
"""
from datetime import datetime, timedelta, timezone
import uuid
from typing import Dict, Any, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, hash_password, verify_password
from app.core.config import get_settings
from app.core.auth import Principal, get_current_principal, get_current_principal_optional
from app.db.base import get_async_session
from app.models.security import User, Organization
from app.schemas.security import LoginRequest, TokenResponse
from app.schemas.customer import CustomerRegisterRequest, CustomerUserOut, CustomerProfileUpdate

router = APIRouter(prefix="/auth", tags=["Auth"])
settings = get_settings()

# Demo users memory cache (seed credentials for fast demo & fallback)
_USERS: Dict[str, Dict[str, Any]] = {}
_USERS_INITIALIZED = False


def _initialize_users():
    """Initialize pre-configured demo users in memory."""
    global _USERS, _USERS_INITIALIZED
    if not _USERS_INITIALIZED:
        _USERS = {
            "fanos ai": {
                "id": "ad7bdbef-8002-4484-ad5c-d782244bed96",
                "username": "FanosAi",
                "full_name": "FANOS AI Administrator",
                "email": "admin@fanos.ai",
                "role": "admin",
                "organization": "FANOS AI Security",
                "organization_name": "FANOS AI Security",
                "organization_type": "Security Operations",
                "phone": "+251 911 000 000",
                "hashed_pwd": hash_password("Fanos4561644@"),
            },
            "mulugeta.ababi": {
                "id": "ad7bdbef-8002-4484-ad5c-d782244bed97",
                "username": "mulugeta.ababi",
                "full_name": "Mulugeta Ababi",
                "email": "mulugeta.ababi@fanos.ai",
                "role": "admin",
                "organization": "FANOS AI Research",
                "organization_name": "FANOS AI Research",
                "organization_type": "AI Cyber Defense",
                "phone": "+251 912 345 678",
                "hashed_pwd": hash_password("FanosAdmin2026!"),
            },
            "soc.analyst": {
                "id": "ad7bdbef-8002-4484-ad5c-d782244bed98",
                "username": "soc.analyst",
                "full_name": "SOC Analyst",
                "email": "analyst@fanos.ai",
                "role": "analyst",
                "organization": "Security Operations Center",
                "organization_name": "Security Operations Center",
                "organization_type": "SOC",
                "phone": "+251 920 111 222",
                "hashed_pwd": hash_password("SocAnalyst2026!"),
            },
            "customer.demo": {
                "id": "ad7bdbef-8002-4484-ad5c-d782244bed99",
                "username": "customer.demo",
                "full_name": "GlobalBank Security Officer",
                "email": "security@globalbank.com",
                "role": "customer",
                "organization": "GlobalBank Group",
                "organization_name": "GlobalBank Group",
                "organization_type": "Banking & Financial Services",
                "phone": "+1-800-555-0144",
                "hashed_pwd": hash_password("CustomerDemo2026!"),
            },
            "azanaww": {
                "id": "ad7bdbef-8002-4484-ad5c-d782244bed9a",
                "username": "Azanaww",
                "full_name": "Azanaww",
                "email": "azanaw@ethiopianairlines.com",
                "role": "customer",
                "organization": "Ethiopian Airlines",
                "organization_name": "Ethiopian Airlines",
                "organization_type": "Aviation & Datacenter Infrastructure",
                "phone": "+251 911 234 567",
                "hashed_pwd": hash_password("CustomerDemo2026!"),
            },
            "azanaw": {
                "id": "ad7bdbef-8002-4484-ad5c-d782244bed9b",
                "username": "Azanaw",
                "full_name": "Azanaw",
                "email": "azanaw@ethiopianairlines.com",
                "role": "customer",
                "organization": "Ethiopian Airlines",
                "organization_name": "Ethiopian Airlines",
                "organization_type": "Aviation & Datacenter Infrastructure",
                "phone": "+251 911 234 567",
                "hashed_pwd": hash_password("CustomerDemo2026!"),
            },
        }
        _USERS_INITIALIZED = True


@router.post("/register", response_model=CustomerUserOut, status_code=status.HTTP_201_CREATED)
async def register(
    body: CustomerRegisterRequest,
    session: AsyncSession = Depends(get_async_session),
) -> CustomerUserOut:
    """
    Register a new customer account.
    Validates input, checks for duplicate usernames/emails, securely hashes the password with bcrypt,
    and persists the account to PostgreSQL database and memory cache.
    """
    _initialize_users()

    clean_username = body.username.strip()
    clean_email = body.email.strip().lower()
    clean_name = body.full_name.strip()
    org_name = (body.organization_name or body.organization or "").strip()
    org_type = (body.organization_type or "").strip()
    phone = (body.phone or "").strip()
    role = "customer"

    if len(clean_username) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username must be at least 3 characters",
        )

    if len(body.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long",
        )

    if body.confirm_password and body.password != body.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password and confirmation do not match",
        )

    # 1. Check duplicate username or email in database
    try:
        existing_user_query = await session.execute(
            select(User).where(
                (func.lower(User.username) == clean_username.lower())
                | (func.lower(User.email) == clean_email)
            )
        )
        existing_user = existing_user_query.scalar_one_or_none()
        if existing_user:
            if existing_user.username.lower() == clean_username.lower():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username already exists. Please choose a different username.",
                )
            if existing_user.email and existing_user.email.lower() == clean_email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already registered. Please sign in or use a different email.",
                )
    except HTTPException:
        raise
    except Exception as exc:
        # If DB query failed, check in-memory dictionary
        pass

    # 2. Check in-memory store
    if clean_username.lower() in _USERS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists. Please choose a different username.",
        )
    for u in _USERS.values():
        if u.get("email", "").lower() == clean_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered. Please sign in or use a different email.",
            )

    # 3. Securely hash password
    hashed = hash_password(body.password)
    user_id = uuid.uuid4()
    now = datetime.now(timezone.utc)

    # 4. Save to Database
    try:
        # Check or create organization if provided
        org_id = None
        if org_name:
            slug = func.lower(func.replace(org_name, " ", "-"))
            existing_org = (
                await session.execute(
                    select(Organization).where(
                        func.lower(Organization.name) == org_name.lower()
                    )
                )
            ).scalar_one_or_none()

            if not existing_org:
                new_org = Organization(
                    id=uuid.uuid4(),
                    name=org_name,
                    slug=org_name.lower().replace(" ", "-")[:100],
                    is_active=True,
                )
                session.add(new_org)
                await session.flush()
                org_id = new_org.id
            else:
                org_id = existing_org.id

        new_user = User(
            id=user_id,
            username=clean_username,
            email=clean_email,
            full_name=clean_name,
            hashed_pwd=hashed,
            hashed_password=hashed,
            role=role,
            phone=phone,
            organization_name=org_name,
            organization_type=org_type,
            tenant_id=str(org_id) if org_id else "org-default",
            is_active=True,
            is_admin=False,
            created_at=now,
        )
        session.add(new_user)
        await session.commit()
        await session.refresh(new_user)
    except HTTPException:
        raise
    except Exception as db_err:
        await session.rollback()

    # 5. Also sync to memory cache
    _USERS[clean_username.lower()] = {
        "id": str(user_id),
        "username": clean_username,
        "full_name": clean_name,
        "email": clean_email,
        "role": role,
        "phone": phone,
        "organization": org_name,
        "organization_name": org_name,
        "organization_type": org_type,
        "hashed_pwd": hashed,
        "created_at": now.isoformat(),
    }

    return CustomerUserOut(
        id=user_id,
        username=clean_username,
        full_name=clean_name,
        email=clean_email,
        role=role,
        organization_name=org_name,
        organization_type=org_type,
        phone=phone,
        created_at=now,
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    body: LoginRequest,
    session: AsyncSession = Depends(get_async_session),
) -> TokenResponse:
    """
    Authenticate user by Email or Username and Password.
    Returns standard Bearer JWT token with user metadata and role permissions.
    """
    _initialize_users()
    login_input = body.username.strip().lower()

    user_record = None
    user_source = None

    # 1. Search in PostgreSQL database by username OR email
    try:
        result = await session.execute(
            select(User).where(
                (func.lower(User.username) == login_input)
                | (func.lower(User.email) == login_input)
            )
        )
        db_user = result.scalar_one_or_none()
        if db_user and db_user.is_active:
            user_record = db_user
            user_source = "db"
    except Exception:
        # Fall back to in-memory store if DB is down
        pass

    # 2. Check in-memory demo cache if not in DB
    if not user_record:
        # Direct key lookup
        mem_user = _USERS.get(login_input)
        if not mem_user:
            # Check by email
            for u in _USERS.values():
                if u.get("email", "").lower() == login_input:
                    mem_user = u
                    break
        if mem_user:
            user_record = mem_user
            user_source = "memory"

    if not user_record:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email/username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 3. Verify password
    hashed_pwd = (
        user_record.password_hash
        if user_source == "db"
        else user_record.get("hashed_pwd", "")
    )

    if not verify_password(body.password, hashed_pwd):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email/username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 4. Extract verified attributes
    if user_source == "db":
        uid = str(user_record.id)
        uname = user_record.username
        fname = user_record.full_name or uname
        uemail = user_record.email or ""
        urole = user_record.role or "customer"
        uorg = user_record.organization_name or ""
        uorg_type = getattr(user_record, "organization_type", "") or ""
        uphone = getattr(user_record, "phone", "") or ""

        # Update last_login
        try:
            user_record.last_login = datetime.now(timezone.utc)
            await session.commit()
        except Exception:
            pass
    else:
        uid = str(user_record.get("id") or uuid.uuid4())
        uname = user_record["username"]
        fname = user_record.get("full_name") or uname
        uemail = user_record.get("email", "")
        urole = user_record.get("role", "customer")
        uorg = user_record.get("organization_name") or user_record.get("organization", "")
        uorg_type = user_record.get("organization_type", "")
        uphone = user_record.get("phone", "")

    # 5. Create JWT Token
    token = create_access_token(
        subject=uname,
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        claims={
            "role": urole,
            "organization": uorg,
            "organization_type": uorg_type,
            "full_name": fname,
            "email": uemail,
            "user_id": uid,
            "customer_id": uid,
        },
    )

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user={
            "id": uid,
            "customer_id": uid,
            "username": uname,
            "full_name": fname,
            "email": uemail,
            "role": urole,
            "organization": uorg,
            "organization_name": uorg,
            "organization_type": uorg_type,
            "phone": uphone,
        },
    )


@router.post("/logout")
async def logout(
    principal: Optional[Principal] = Depends(get_current_principal_optional),
):
    """End authenticated customer session."""
    return {"status": "success", "message": "Successfully signed out"}


@router.get("/me", response_model=CustomerUserOut)
async def me(
    principal: Principal = Depends(get_current_principal),
    session: AsyncSession = Depends(get_async_session),
) -> CustomerUserOut:
    """Get currently authenticated user's profile from database or token."""
    _initialize_users()

    # Query DB
    try:
        result = await session.execute(
            select(User).where(func.lower(User.username) == principal.username.lower())
        )
        db_user = result.scalar_one_or_none()
        if db_user:
            return CustomerUserOut(
                id=db_user.id,
                username=db_user.username,
                full_name=db_user.full_name or db_user.username,
                email=db_user.email or "",
                role=db_user.role,
                organization_name=db_user.organization_name,
                organization_type=db_user.organization_type,
                phone=db_user.phone,
                created_at=db_user.created_at,
                last_login=db_user.last_login,
            )
    except Exception:
        pass

    # Memory fallback
    mem = _USERS.get(principal.username.lower())
    if mem:
        return CustomerUserOut(
            id=uuid.UUID(mem["id"]) if "id" in mem and len(mem["id"]) == 36 else None,
            username=mem["username"],
            full_name=mem.get("full_name", mem["username"]),
            email=mem.get("email", ""),
            role=mem.get("role", principal.role),
            organization_name=mem.get("organization_name") or mem.get("organization"),
            organization_type=mem.get("organization_type"),
            phone=mem.get("phone"),
        )

    return CustomerUserOut(
        username=principal.username,
        full_name=principal.username,
        email=principal.email or "",
        role=principal.role,
        organization_name=principal.organization,
    )


@router.patch("/profile", response_model=CustomerUserOut)
async def update_profile(
    body: CustomerProfileUpdate,
    principal: Principal = Depends(get_current_principal),
    session: AsyncSession = Depends(get_async_session),
) -> CustomerUserOut:
    """Update profile details for the authenticated customer."""
    try:
        result = await session.execute(
            select(User).where(func.lower(User.username) == principal.username.lower())
        )
        db_user = result.scalar_one_or_none()
        if db_user:
            if body.full_name is not None:
                db_user.full_name = body.full_name.strip()
            if body.phone is not None:
                db_user.phone = body.phone.strip()
            if body.organization_name is not None:
                db_user.organization_name = body.organization_name.strip()
            if body.organization_type is not None:
                db_user.organization_type = body.organization_type.strip()

            await session.commit()
            await session.refresh(db_user)

            # Sync to memory
            if principal.username.lower() in _USERS:
                _USERS[principal.username.lower()]["full_name"] = db_user.full_name
                _USERS[principal.username.lower()]["organization_name"] = db_user.organization_name
                _USERS[principal.username.lower()]["organization_type"] = db_user.organization_type
                _USERS[principal.username.lower()]["phone"] = db_user.phone

            return CustomerUserOut(
                id=db_user.id,
                username=db_user.username,
                full_name=db_user.full_name or db_user.username,
                email=db_user.email or "",
                role=db_user.role,
                organization_name=db_user.organization_name,
                organization_type=db_user.organization_type,
                phone=db_user.phone,
                created_at=db_user.created_at,
                last_login=db_user.last_login,
            )
    except Exception as exc:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update profile: {exc}",
        )

    raise HTTPException(status_code=404, detail="User not found")
