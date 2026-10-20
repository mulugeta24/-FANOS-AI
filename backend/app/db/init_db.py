"""
Database Initialization Helper
Ensures all required tables (including newly integrated threat detection tables) exist.
"""
from app.db.base import engine, Base
import app.models  # ensure all models are registered
from app.core.logging import log


async def init_tables():
    """Create all tables defined in Base metadata if they do not exist."""
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        log.info("Database tables verified / created successfully")
    except Exception as e:
        log.warning("Database table creation deferred or failed", error=str(e))

    try:
        from app.services.scanner.models import init_scanner_tables
        init_scanner_tables()
        log.info("Web Security Scanner tables verified / created successfully")
    except Exception as e:
        log.warning("Web Security Scanner table creation deferred or failed", error=str(e))
