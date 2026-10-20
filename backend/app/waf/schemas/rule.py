"""
Pydantic schemas for rule management API.
"""
from typing import List, Optional
from pydantic import BaseModel, Field
from app.waf.constants import RuleAction, Severity


class RuleCreate(BaseModel):
    name: str = Field(..., min_length=3, max_length=128)
    category: str = Field(..., min_length=2, max_length=64)
    severity: Severity = Severity.HIGH
    action: RuleAction = RuleAction.BLOCK
    description: str = Field(..., min_length=5, max_length=512)
    pattern: str = Field(..., min_length=1, max_length=512, description="Regex or string pattern to match")
    target_locations: List[str] = Field(default=["query", "body"], description="Locations: path, query, body, headers")
    enabled: bool = True
    tags: List[str] = Field(default_factory=list)


class RuleUpdate(BaseModel):
    name: Optional[str] = None
    severity: Optional[Severity] = None
    action: Optional[RuleAction] = None
    description: Optional[str] = None
    enabled: Optional[bool] = None
    pattern: Optional[str] = None
    target_locations: Optional[List[str]] = None
    tags: Optional[List[str]] = None


class RuleOut(BaseModel):
    id: str
    name: str
    category: str
    severity: Severity
    action: RuleAction
    description: str
    enabled: bool
    is_custom: bool
    pattern: Optional[str] = None
    target_locations: List[str]
    tags: List[str]
