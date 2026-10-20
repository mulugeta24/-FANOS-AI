from functools import lru_cache
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # App
    APP_NAME: str = "FANOS AI"
    APP_VERSION: str = "1.0.0"
    APP_ENV: str = "development"
    DEBUG: bool = True

    # API
    API_PREFIX: str = "/api/v1"
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://fanos:fanos_pass@localhost:5432/fanos_db"
    DATABASE_SYNC_URL: str = "postgresql://fanos:fanos_pass@localhost:5432/fanos_db"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    # AI Engine
    AI_MODEL_PATH: str = "models/fanos_v3_xgboost_rare_improved.json"
    AI_CONFIDENCE_THRESHOLD: float = 0.75
    AI_BATCH_SIZE: int = 64

    # Suricata Collector Authentication
    SURICATA_INGEST_TOKEN: str = ""
    FANOS_SENSOR_TOKEN: str = ""
    VT_API_KEY: str = ""


    # Suricata Correlation Configuration
    FANOS_SURICATA_CORRELATION_WINDOW_SECONDS: int = 300
    FANOS_SURICATA_CORRELATION_MAX_EVENTS: int = 100

    # Deduplication Configuration
    FANOS_DEDUP_WINDOW_SECONDS: int = 60

    # FANOS WAF Unified Configuration
    PROJECT_NAME: str = "FANOS AI Unified Cybersecurity Platform"
    WAF_MODE: str = "monitor"  # "monitor" or "block"
    BLOCK_THRESHOLD: int = 70
    MONITOR_THRESHOLD: int = 30
    MAX_REQUEST_BODY_SIZE_BYTES: int = 1048576  # 1 MB
    MAX_URI_LENGTH: int = 2048                  # 2 KB
    MAX_HEADER_COUNT: int = 50
    MAX_HEADER_VALUE_LENGTH: int = 4096         # 4 KB
    MAX_QUERY_PARAM_COUNT: int = 50
    UPSTREAM_TARGET_URL: str = "http://localhost:3000"
    PROXY_ENABLED: bool = True
    PROXY_FAIL_MODE: str = "fail_closed"  # "fail_closed" or "fail_open"
    RATE_LIMIT_LOGIN_MAX_ATTEMPTS: int = 5
    RATE_LIMIT_LOGIN_WINDOW_SECONDS: int = 300
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str = "ChangeMeImmediately123!"

    # Scanner Configuration
    SCANNER_ALLOW_PRIVATE_TARGETS: bool = False
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]

    @property
    def allowed_origins_list(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]


@lru_cache
def get_settings() -> Settings:
    return Settings()
