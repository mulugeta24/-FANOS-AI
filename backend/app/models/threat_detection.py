"""
SQLAlchemy ORM models for URL Threat Detection & Intelligence.
Matches existing FANOS-CYBERSEC database schema while integrating with Base.
"""
from __future__ import annotations

import time
from sqlalchemy import Column, Integer, BigInteger, String, Text, Float
from app.db.base import Base


class URLScan(Base):
    """Stores URL analysis scans and hybrid detection results."""
    __tablename__ = "scans"

    id             = Column(Integer, primary_key=True, autoincrement=True)
    url            = Column(Text, nullable=False, index=True)
    final_verdict  = Column(String(64), nullable=False, index=True)
    ml_prediction  = Column(String(64), nullable=True)
    ml_confidence  = Column(Float, nullable=True)
    vt_result      = Column(Text, nullable=True)
    user_id        = Column(String(128), nullable=True, index=True)
    timestamp      = Column(BigInteger, default=lambda: int(time.time()), index=True)
    source         = Column(String(64), default="web")


class VTVerdictCache(Base):
    """Stores cached VirusTotal API query results to avoid redundant external calls."""
    __tablename__ = "vt_cache"

    url        = Column(Text, primary_key=True)
    result     = Column(Text, nullable=True)
    verdict    = Column(String(64), nullable=True)
    malicious  = Column(Integer, default=0)
    suspicious = Column(Integer, default=0)
    harmless   = Column(Integer, default=0)
    timestamp  = Column(BigInteger, default=lambda: int(time.time()), index=True)


class UserThreatReport(Base):
    """Stores user reports / feedback regarding URL classification verdicts."""
    __tablename__ = "user_reports"

    id               = Column(Integer, primary_key=True, autoincrement=True)
    scan_id          = Column(Integer, nullable=True, index=True)
    url              = Column(Text, nullable=False)
    original_verdict = Column(String(64), nullable=True)
    user_verdict     = Column(String(64), nullable=False)
    user_id          = Column(String(128), nullable=True, index=True)
    timestamp        = Column(BigInteger, default=lambda: int(time.time()), index=True)
    notes            = Column(Text, nullable=True)


class ThreatStat(Base):
    """Key-value platform statistics counter."""
    __tablename__ = "stats"

    key   = Column(String(128), primary_key=True)
    value = Column(BigInteger, default=0)
