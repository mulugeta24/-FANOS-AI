"""
Pydantic schemas for safe WAF configuration management.
"""
from typing import List, Optional
from pydantic import BaseModel, Field


class SettingItem(BaseModel):
    key: str
    value: str
    description: Optional[str] = None


class WAFSettingsOut(BaseModel):
    waf_mode: str  # "monitor" or "block"
    block_threshold: int
    monitor_threshold: int
    max_body_size_bytes: int
    max_uri_length: int
    allowlist_ips: List[str] = Field(default_factory=list)
    monitored_paths: List[str] = Field(default_factory=list)


class WAFSettingsUpdate(BaseModel):
    waf_mode: Optional[str] = Field(None, pattern="^(monitor|block)$")
    block_threshold: Optional[int] = Field(None, ge=10, le=100)
    monitor_threshold: Optional[int] = Field(None, ge=0, le=100)
    max_body_size_bytes: Optional[int] = Field(None, ge=1024, le=52428800)  # Up to 50MB
    max_uri_length: Optional[int] = Field(None, ge=256, le=16384)
