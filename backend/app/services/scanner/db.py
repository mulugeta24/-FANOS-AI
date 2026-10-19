"""
Synchronous PostgreSQL Database Connection Pool for Enterprise Web Security Scanner.
Connects directly to the unified FANOS AI database.
"""
import os
import threading
from contextlib import contextmanager
import psycopg2
from psycopg2 import pool
from app.core.config import get_settings
from app.core.logging import log

settings = get_settings()

_pg_pool = None
_pool_lock = threading.Lock()


def get_pg_pool():
    global _pg_pool
    if _pg_pool is None:
        with _pool_lock:
            if _pg_pool is None:
                try:
                    dsn = settings.DATABASE_SYNC_URL
                    _pg_pool = pool.ThreadedConnectionPool(1, 20, dsn=dsn)
                    log.info("Scanner PostgreSQL connection pool initialized", dsn=dsn)
                except Exception as e:
                    log.warning("Scanner DB pool init failed, falling back to localhost", error=str(e))
                    _pg_pool = pool.ThreadedConnectionPool(
                        1, 10,
                        host="localhost",
                        port=5432,
                        dbname="fanos_db",
                        user="postgres",
                        password="postgres"
                    )
    return _pg_pool


@contextmanager
def get_db():
    """
    Context manager providing a PostgreSQL connection and cursor.
    Auto-commits on success and rolls back on error.
    """
    p = get_pg_pool()
    conn = p.getconn()
    conn.autocommit = False
    cur = conn.cursor()
    try:
        yield conn, cur
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
        p.putconn(conn)
