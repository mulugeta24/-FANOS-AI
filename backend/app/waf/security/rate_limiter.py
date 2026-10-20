"""
Rate limiting module for FANOS WAF.
Provides bounded in-memory sliding window rate limiting for authentication and sensitive endpoints.
Protects against brute-force attacks and credential stuffing.
"""
from collections import defaultdict
from datetime import datetime, timezone
import time
from typing import Dict, List, Optional, Tuple
from fastapi import HTTPException, Request, status

from app.core.config import get_settings

settings = get_settings()


class SlidingWindowRateLimiter:
    """In-memory sliding window rate limiter."""

    def __init__(self, max_attempts: int = 5, window_seconds: int = 300, max_keys: int = 10000):
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self.max_keys = max_keys
        # key -> list of float timestamps
        self._attempts: Dict[str, List[float]] = defaultdict(list)

    def _cleanup_old_attempts(self, key: str, now: float) -> None:
        """Removes attempts outside the active time window and purges empty keys."""
        cutoff = now - self.window_seconds
        if key in self._attempts:
            self._attempts[key] = [ts for ts in self._attempts[key] if ts > cutoff]
            if not self._attempts[key]:
                del self._attempts[key]

    def _evict_if_full(self, now: float) -> None:
        """Evicts stale keys when the dictionary reaches max capacity."""
        if len(self._attempts) >= self.max_keys:
            cutoff = now - self.window_seconds
            stale_keys = [k for k, timestamps in self._attempts.items() if not timestamps or timestamps[-1] <= cutoff]
            for k in stale_keys:
                del self._attempts[k]
            # If still over limit, evict oldest 10%
            if len(self._attempts) >= self.max_keys:
                sorted_keys = sorted(self._attempts.keys(), key=lambda k: self._attempts[k][0] if self._attempts[k] else 0)
                for k in sorted_keys[: len(sorted_keys) // 10]:
                    del self._attempts[k]

    def is_rate_limited(self, key: str) -> Tuple[bool, int]:
        """
        Checks if key has exceeded the maximum attempts.
        Returns (is_limited, retry_after_seconds).
        """
        now = time.time()
        self._cleanup_old_attempts(key, now)

        if key not in self._attempts:
            return False, 0

        attempts = self._attempts[key]
        if len(attempts) >= self.max_attempts:
            oldest = attempts[0]
            retry_after = max(1, int(oldest + self.window_seconds - now))
            return True, retry_after

        return False, 0

    def record_attempt(self, key: str) -> None:
        """Records a failed or rate-counted attempt with capacity control."""
        now = time.time()
        self._cleanup_old_attempts(key, now)
        self._evict_if_full(now)
        self._attempts[key].append(now)

    def reset(self, key: str) -> None:
        """Clears recorded attempts for a key (e.g. after successful login)."""
        if key in self._attempts:
            del self._attempts[key]



# Global instance for login rate limiting
login_rate_limiter = SlidingWindowRateLimiter(
    max_attempts=settings.RATE_LIMIT_LOGIN_MAX_ATTEMPTS,
    window_seconds=settings.RATE_LIMIT_LOGIN_WINDOW_SECONDS,
)


def enforce_login_rate_limit(request: Request, username: Optional[str] = None) -> None:
    """
    Checks rate limits for login attempts based on client IP and target username.
    Raises HTTP 429 Too Many Requests if the limit is exceeded.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    ip_key = f"login_ip:{client_ip}"
    user_key = f"login_user:{username.lower().strip()}" if username else None

    # Check IP rate limit
    limited, retry_after = login_rate_limiter.is_rate_limited(ip_key)
    if limited:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many failed login attempts from this IP. Please try again in {retry_after} seconds.",
            headers={"Retry-After": str(retry_after)},
        )

    # Check User rate limit if username is provided
    if user_key:
        limited_user, retry_after_user = login_rate_limiter.is_rate_limited(user_key)
        if limited_user:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many failed login attempts for this account. Please try again in {retry_after_user} seconds.",
                headers={"Retry-After": str(retry_after_user)},
            )


def record_failed_login(request: Request, username: Optional[str] = None) -> None:
    """Records a failed login attempt for the client IP and username."""
    client_ip = request.client.host if request.client else "127.0.0.1"
    login_rate_limiter.record_attempt(f"login_ip:{client_ip}")
    if username:
        login_rate_limiter.record_attempt(f"login_user:{username.lower().strip()}")


def record_successful_login(request: Request, username: Optional[str] = None) -> None:
    """Resets rate limiting counters upon a successful authentication."""
    client_ip = request.client.host if request.client else "127.0.0.1"
    login_rate_limiter.reset(f"login_ip:{client_ip}")
    if username:
        login_rate_limiter.reset(f"login_user:{username.lower().strip()}")


class ProxyTrafficRateLimiter:
    """Enforces per-domain and per-client-IP traffic rate limits at the WAF reverse proxy layer."""

    def __init__(self, default_limit: int = 120, window_seconds: int = 60):
        self.default_limit = default_limit
        self.window_seconds = window_seconds
        self._limiter = SlidingWindowRateLimiter(max_attempts=default_limit, window_seconds=window_seconds, max_keys=20000)

    def is_rate_limited(self, domain_id: str, client_ip: str, limit: Optional[int] = None) -> Tuple[bool, int, int]:
        """
        Checks rate limit for (domain_id, client_ip).
        Returns (is_limited, retry_after_seconds, remaining_requests).
        """
        key = f"traffic:{domain_id}:{client_ip}"
        max_limit = limit if limit is not None else self.default_limit

        now = time.time()
        self._limiter._cleanup_old_attempts(key, now)
        attempts = self._limiter._attempts.get(key, [])
        if len(attempts) >= max_limit:
            oldest = attempts[0]
            retry_after = max(1, int(oldest + self.window_seconds - now))
            return True, retry_after, 0

        remaining = max(0, max_limit - len(attempts) - 1)
        return False, 0, remaining

    def record_request(self, domain_id: str, client_ip: str) -> None:
        """Records an inspected request for rate limit tracking."""
        key = f"traffic:{domain_id}:{client_ip}"
        self._limiter.record_attempt(key)

    def reset(self, domain_id: str, client_ip: str) -> None:
        """Clears counters for (domain_id, client_ip)."""
        key = f"traffic:{domain_id}:{client_ip}"
        self._limiter.reset(key)


proxy_traffic_rate_limiter = ProxyTrafficRateLimiter()
