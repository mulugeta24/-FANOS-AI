"""
Database Initialization Helper
Ensures all required tables (including newly integrated threat detection tables) exist.
"""
from sqlalchemy import text
from app.db.base import engine, Base
import app.models  # ensure all models are registered
from app.core.logging import log


async def init_tables():
    """Create all tables defined in Base metadata if they do not exist, and ensure newly added columns exist."""
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            
            # Safe column additions for existing tables
            migration_queries = [
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(64);",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_name VARCHAR(128);",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_type VARCHAR(64);",
                "ALTER TABLE assets ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;",
                "ALTER TABLE assets ADD COLUMN IF NOT EXISTS target_url VARCHAR(512);",
                "ALTER TABLE assets ADD COLUMN IF NOT EXISTS service_type VARCHAR(64);",
                "ALTER TABLE assets ALTER COLUMN organization_id DROP NOT NULL;",
                "ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES users(id) ON DELETE SET NULL;",
                "UPDATE service_requests SET customer_id = user_id WHERE customer_id IS NULL AND user_id IS NOT NULL;",
            ]
            for q in migration_queries:
                try:
                    await conn.execute(text(q))
                except Exception as col_err:
                    log.debug("Column migration notice", query=q, error=str(col_err))

        log.info("Database tables and columns verified / created successfully")
    except Exception as e:
        log.warning("Database table creation deferred or failed", error=str(e))

    try:
        from app.services.scanner.models import init_scanner_tables
        init_scanner_tables()
        log.info("Web Security Scanner tables verified / created successfully")
    except Exception as e:
        log.warning("Web Security Scanner table creation deferred or failed", error=str(e))

