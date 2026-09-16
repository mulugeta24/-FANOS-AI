"""
Auth API — login, registration, token refresh.
"""
from datetime import timedelta
from typing import Dict, Any

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr

from app.core.security import create_access_token, hash_password, verify_password
from app.core.config import get_settings
from app.schemas.security import LoginRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["Auth"])
settings = get_settings()

# Registration Request Schema
class RegisterRequest(BaseModel):
    full_name: str
    username: str
    email: EmailStr
    password: str
    phone: str = ""
    organization: str = ""
    role: str = "customer"

# User Response Schema
class UserResponse(BaseModel):
    username: str
    full_name: str
    email: str
    role: str

# Demo users (replace with DB lookup in production)
_USERS: Dict[str, Dict[str, Any]] = {}
_USERS_INITIALIZED = False

def _initialize_users():
    """Initialize demo users with hashed passwords."""
    global _USERS, _USERS_INITIALIZED
    if not _USERS_INITIALIZED:
        _USERS = {
            "fanos ai": {
                "username": "FanosAi",
                "full_name": "FANOS AI Administrator",
                "email": "admin@fanos.ai",
                "role": "admin",
                "hashed_pwd": hash_password("Fanos4561644@"),
            },
            "mulugeta.ababi": {
                "username": "mulugeta.ababi",
                "full_name": "Mulugeta Ababi",
                "email": "mulugeta.ababi@fanos.ai",
                "role": "admin",
                "hashed_pwd": hash_password("FanosAdmin2026!"),
            },
            "soc.analyst": {
                "username": "soc.analyst",
                "full_name": "SOC Analyst",
                "email": "analyst@fanos.ai",
                "role": "analyst",
                "hashed_pwd": hash_password("SocAnalyst2026!"),
            },
        }
        _USERS_INITIALIZED = True


@router.post("/register", response_model=UserResponse)
async def register(body: RegisterRequest) -> UserResponse:
    """
    Register a new user.
    In production, this would save to database.
    """
    _initialize_users()  # Ensure users are initialized
    
    # Check if username already exists
    username_lower = body.username.lower()
    if username_lower in _USERS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists",
        )
    
    # Check if email already exists
    for user_data in _USERS.values():
        if user_data["email"].lower() == body.email.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )
    
    # Create new user
    new_user = {
        "username": body.username,
        "full_name": body.full_name,
        "email": body.email,
        "role": body.role,
        "phone": body.phone,
        "organization": body.organization,
        "hashed_pwd": hash_password(body.password),
    }
    
    # Store user (in production: save to database)
    _USERS[username_lower] = new_user
    
    return UserResponse(
        username=new_user["username"],
        full_name=new_user["full_name"],
        email=new_user["email"],
        role=new_user["role"],
    )


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest) -> TokenResponse:
    _initialize_users()  # Ensure users are initialized
    
    user = _USERS.get(body.username.lower())
    if not user or not verify_password(body.password, user["hashed_pwd"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token(
        subject=body.username,
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    
    # Return token with user info
    return TokenResponse(
        access_token=token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user={
            "username": user["username"],
            "full_name": user["full_name"],
            "email": user["email"],
            "role": user["role"],
        }
    )


@router.get("/me")
async def me() -> dict:
    # In production: decode JWT and return current user
    return {
        "username": "mulugeta.ababi",
        "full_name": "Mulugeta Ababi",
        "email": "mulugeta.ababi@fanos.ai",
        "role": "admin",
    }
