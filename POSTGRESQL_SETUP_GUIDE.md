# PostgreSQL Database Setup Guide for FANOS AI

Complete step-by-step guide to install, configure, and connect PostgreSQL database for FANOS AI platform.

---

## Table of Contents
1. [Install PostgreSQL](#1-install-postgresql)
2. [Configure PostgreSQL](#2-configure-postgresql)
3. [Create Database & User](#3-create-database--user)
4. [Configure FANOS AI Connection](#4-configure-fanos-ai-connection)
5. [Run Database Migrations](#5-run-database-migrations)
6. [Verify Connection](#6-verify-connection)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Install PostgreSQL

### On Windows:

**Step 1: Download PostgreSQL**
1. Go to https://www.postgresql.org/download/windows/
2. Download PostgreSQL 14 or higher (recommended: 15.x)
3. Run the installer (`postgresql-15.x-x-windows-x64.exe`)

**Step 2: Installation Wizard**
1. Click "Next" through welcome screen
2. **Installation Directory**: `C:\Program Files\PostgreSQL\15` (default)
3. **Select Components**: 
   - ✅ PostgreSQL Server
   - ✅ pgAdmin 4 (GUI tool)
   - ✅ Command Line Tools
   - ✅ Stack Builder (optional)
4. **Data Directory**: `C:\Program Files\PostgreSQL\15\data` (default)
5. **Password**: Enter a strong password for `postgres` superuser
   - **IMPORTANT**: Remember this password!
   - Example: `FanosAI@2026!Secure`
6. **Port**: `5432` (default)
7. **Locale**: `Default locale`
8. Click "Next" and "Finish"

**Step 3: Add PostgreSQL to PATH**
```powershell
# Run as Administrator
[Environment]::SetEnvironmentVariable(
    "Path",
    $env:Path + ";C:\Program Files\PostgreSQL\15\bin",
    [EnvironmentVariableTarget]::Machine
)
```

Or manually:
1. Search "Environment Variables" in Windows
2. Edit "Path" in System Variables
3. Add: `C:\Program Files\PostgreSQL\15\bin`

**Step 4: Verify Installation**
```powershell
psql --version
# Output: psql (PostgreSQL) 15.x
```

---

### On Linux (Ubuntu/Debian):

```bash
# Update package index
sudo apt update

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify installation
psql --version
```

---

### On macOS:

```bash
# Install using Homebrew
brew install postgresql@15

# Start PostgreSQL service
brew services start postgresql@15

# Verify installation
psql --version
```

---

## 2. Configure PostgreSQL

### Windows Configuration:

**Step 1: Open Command Prompt/PowerShell as Administrator**

**Step 2: Connect to PostgreSQL**
```powershell
psql -U postgres
# Enter the password you set during installation
```

**Step 3: Configure PostgreSQL Settings (Optional)**

Edit `postgresql.conf` (located in data directory):
```
C:\Program Files\PostgreSQL\15\data\postgresql.conf
```

Recommended settings for FANOS AI:
```conf
# Connection Settings
max_connections = 100
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 16MB
maintenance_work_mem = 64MB

# Performance
random_page_cost = 1.1
effective_io_concurrency = 200

# Logging
log_destination = 'stderr'
logging_collector = on
log_directory = 'log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_min_duration_statement = 1000  # Log slow queries (>1s)
```

**Step 4: Restart PostgreSQL**
```powershell
# Windows
net stop postgresql-x64-15
net start postgresql-x64-15

# Or using Services app
# Search "Services" → Find "postgresql-x64-15" → Restart
```

---

## 3. Create Database & User

### Method 1: Using psql Command Line

**Step 1: Connect to PostgreSQL**
```powershell
psql -U postgres
# Enter postgres password
```

**Step 2: Create Database**
```sql
-- Create database
CREATE DATABASE fanos_ai
    WITH 
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TEMPLATE = template0;

-- Connect to database
\c fanos_ai

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Verify database created
\l
```

**Step 3: Create User**
```sql
-- Create dedicated user for FANOS AI
CREATE USER fanos_user WITH ENCRYPTED PASSWORD 'FanosSecure@2026!DB';

-- Grant all privileges on database
GRANT ALL PRIVILEGES ON DATABASE fanos_ai TO fanos_user;

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO fanos_user;
GRANT ALL ON ALL TABLES IN SCHEMA public TO fanos_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO fanos_user;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO fanos_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO fanos_user;

-- Verify user created
\du
```

**Step 4: Exit psql**
```sql
\q
```

---

### Method 2: Using pgAdmin 4 (GUI)

**Step 1: Open pgAdmin 4**
- Start Menu → pgAdmin 4
- Enter master password (if set)

**Step 2: Connect to Server**
- Left panel → Servers → PostgreSQL 15
- Enter postgres password

**Step 3: Create Database**
1. Right-click "Databases" → Create → Database
2. **Database**: `fanos_ai`
3. **Owner**: `postgres`
4. **Encoding**: `UTF8`
5. Click "Save"

**Step 4: Create User**
1. Right-click "Login/Group Roles" → Create → Login/Group Role
2. **General Tab**: Name = `fanos_user`
3. **Definition Tab**: Password = `FanosSecure@2026!DB`
4. **Privileges Tab**: 
   - ✅ Can login?
   - ✅ Create databases?
5. Click "Save"

**Step 5: Grant Privileges**
1. Right-click database `fanos_ai` → Properties
2. **Security Tab** → Add
3. Select `fanos_user`
4. Grant: `ALL`
5. Click "Save"

---

## 4. Configure FANOS AI Connection

### Step 1: Create .env File

Create `backend/.env` file:

```bash
# Navigate to backend directory
cd "c:\Fanos Aii\backend"

# Create .env file (Windows PowerShell)
New-Item -Path .env -ItemType File
```

### Step 2: Add Database Configuration

Edit `backend/.env`:

```env
# ==========================================
# FANOS AI - Environment Configuration
# ==========================================

# ── Database Configuration ────────────────
DATABASE_URL=postgresql://fanos_user:FanosSecure@2026!DB@localhost:5432/fanos_ai

# Alternative format (if special characters cause issues)
# DATABASE_URL=postgresql://fanos_user:FanosSecure%402026%21DB@localhost:5432/fanos_ai

# Database Pool Settings
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=10
DB_POOL_TIMEOUT=30
DB_POOL_RECYCLE=3600

# ── Application Settings ──────────────────
SECRET_KEY=your-secret-key-change-in-production
DEBUG=True
ENVIRONMENT=development

# ── CORS Settings ─────────────────────────
CORS_ORIGINS=["http://localhost:3000","http://localhost:3001","http://localhost:5173"]

# ── JWT Settings ──────────────────────────
JWT_SECRET_KEY=your-jwt-secret-key-change-in-production
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# ── AI Model Settings ─────────────────────
AI_MODEL_PATH=models/fanos_v3_xgboost_rare_improved.json
AI_CONFIDENCE_THRESHOLD=0.75

# ── Logging ───────────────────────────────
LOG_LEVEL=INFO
LOG_FILE=logs/fanos_ai.log
```

**Security Note**: 
- Never commit `.env` file to Git
- Change passwords in production
- Use environment-specific configurations

---

### Step 3: Update Database Configuration Code

Check `backend/app/db/__init__.py`:

```python
"""
Database connection and session management for FANOS AI.
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool
from typing import Generator

# Load database URL from environment
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://fanos_user:FanosSecure@2026!DB@localhost:5432/fanos_ai"
)

# Create SQLAlchemy engine
engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=int(os.getenv("DB_POOL_SIZE", "20")),
    max_overflow=int(os.getenv("DB_MAX_OVERFLOW", "10")),
    pool_timeout=int(os.getenv("DB_POOL_TIMEOUT", "30")),
    pool_recycle=int(os.getenv("DB_POOL_RECYCLE", "3600")),
    echo=os.getenv("DEBUG", "False").lower() == "true",
)

# Create session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Dependency for FastAPI routes
def get_db() -> Generator[Session, None, None]:
    """
    Database session dependency for FastAPI routes.
    
    Usage:
        @app.get("/users")
        def get_users(db: Session = Depends(get_db)):
            return db.query(User).all()
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Health check function
def check_db_connection() -> bool:
    """
    Check if database connection is alive.
    
    Returns:
        bool: True if connected, False otherwise
    """
    try:
        with engine.connect() as conn:
            conn.execute("SELECT 1")
        return True
    except Exception as e:
        print(f"Database connection failed: {e}")
        return False
```

---

## 5. Run Database Migrations

### Step 1: Install Python Dependencies

```powershell
# Navigate to backend directory
cd "c:\Fanos Aii\backend"

# Activate virtual environment (if using one)
.\.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Verify Alembic installed
alembic --version
```

### Step 2: Configure Alembic

Check `backend/alembic.ini`:

```ini
[alembic]
script_location = alembic
sqlalchemy.url = postgresql://fanos_user:FanosSecure@2026!DB@localhost:5432/fanos_ai

# Or use environment variable
# sqlalchemy.url = driver://user:pass@localhost/dbname
```

**Better approach** - Use environment variable in `alembic/env.py`:

```python
from app.db import DATABASE_URL

# In run_migrations_online():
configuration = context.config
configuration.set_main_option("sqlalchemy.url", DATABASE_URL)
```

### Step 3: Run Migrations

```powershell
# Check current migration status
alembic current

# View migration history
alembic history

# Run all pending migrations
alembic upgrade head

# Expected output:
# INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
# INFO  [alembic.runtime.migration] Will assume transactional DDL.
# INFO  [alembic.runtime.migration] Running upgrade  -> 001, Initial FANOS AI schema
```

### Step 4: Verify Tables Created

```powershell
# Connect to database
psql -U fanos_user -d fanos_ai
# Enter password: FanosSecure@2026!DB

# List all tables
\dt

# Expected output:
#                 List of relations
#  Schema |       Name        | Type  |   Owner    
# --------+-------------------+-------+------------
#  public | alembic_version   | table | fanos_user
#  public | blocked_ips       | table | fanos_user
#  public | incidents         | table | fanos_user
#  public | response_actions  | table | fanos_user
#  public | security_events   | table | fanos_user
#  public | users             | table | fanos_user

# Describe a table
\d users

# Exit
\q
```

---

## 6. Verify Connection

### Method 1: Python Script

Create `backend/test_db.py`:

```python
"""
Test database connection for FANOS AI.
"""
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def test_connection():
    """Test PostgreSQL connection."""
    try:
        # Create engine
        engine = create_engine(DATABASE_URL)
        
        # Test connection
        with engine.connect() as conn:
            result = conn.execute(text("SELECT version();"))
            version = result.fetchone()[0]
            print("✅ Database connection successful!")
            print(f"📊 PostgreSQL version: {version}")
            
            # Test tables
            result = conn.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name;
            """))
            tables = [row[0] for row in result.fetchall()]
            print(f"📋 Tables found: {', '.join(tables)}")
            
            # Test data
            result = conn.execute(text("SELECT COUNT(*) FROM users;"))
            user_count = result.fetchone()[0]
            print(f"👥 Users in database: {user_count}")
            
        return True
        
    except Exception as e:
        print(f"❌ Database connection failed!")
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    test_connection()
```

Run the test:
```powershell
cd backend
python test_db.py
```

---

### Method 2: Using FastAPI Startup Event

Add to `backend/app/main.py`:

```python
from fastapi import FastAPI
from app.db import check_db_connection

app = FastAPI(title="FANOS AI")

@app.on_event("startup")
async def startup_event():
    """Check database connection on startup."""
    print("🚀 Starting FANOS AI...")
    if check_db_connection():
        print("✅ Database connected successfully!")
    else:
        print("❌ Database connection failed!")
        # Optionally exit if DB is critical
        # import sys
        # sys.exit(1)

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    db_status = check_db_connection()
    return {
        "status": "healthy" if db_status else "unhealthy",
        "database": "connected" if db_status else "disconnected"
    }
```

Start the server:
```powershell
cd backend
python run.py
# or
uvicorn app.main:app --reload
```

Visit: http://localhost:8000/health

---

## 7. Troubleshooting

### Issue 1: "psql: command not found"

**Solution**: Add PostgreSQL to PATH
```powershell
# Windows - Run as Administrator
$env:Path += ";C:\Program Files\PostgreSQL\15\bin"
```

---

### Issue 2: "authentication failed for user"

**Solutions**:

1. **Check password**:
   ```powershell
   psql -U fanos_user -d fanos_ai
   # Enter correct password
   ```

2. **Reset user password**:
   ```sql
   -- Connect as postgres
   psql -U postgres
   
   -- Reset password
   ALTER USER fanos_user WITH PASSWORD 'NewSecurePassword!2026';
   ```

3. **Check pg_hba.conf** (authentication rules):
   ```
   C:\Program Files\PostgreSQL\15\data\pg_hba.conf
   ```
   
   Ensure this line exists:
   ```
   # TYPE  DATABASE        USER            ADDRESS                 METHOD
   host    all             all             127.0.0.1/32            md5
   ```

---

### Issue 3: "database does not exist"

**Solution**: Create the database
```sql
psql -U postgres
CREATE DATABASE fanos_ai;
\q
```

---

### Issue 4: "could not connect to server"

**Solutions**:

1. **Check if PostgreSQL is running**:
   ```powershell
   # Windows
   Get-Service postgresql-x64-15
   
   # If not running, start it
   Start-Service postgresql-x64-15
   ```

2. **Check port 5432**:
   ```powershell
   netstat -an | findstr :5432
   ```

3. **Check postgresql.conf**:
   ```
   listen_addresses = 'localhost'  # or '*' for all
   port = 5432
   ```

---

### Issue 5: "SSL connection error"

**Solution**: Disable SSL for local development

In connection string:
```
postgresql://user:pass@localhost:5432/fanos_ai?sslmode=disable
```

Or use `require` for secure connections:
```
postgresql://user:pass@localhost:5432/fanos_ai?sslmode=require
```

---

### Issue 6: "too many connections"

**Solution**: Increase max_connections

Edit `postgresql.conf`:
```conf
max_connections = 200
```

Restart PostgreSQL.

---

### Issue 7: Migration errors

**Solution 1**: Reset migrations
```powershell
# Drop all tables (CAUTION: Destroys data!)
psql -U fanos_user -d fanos_ai
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
\q

# Re-run migrations
alembic upgrade head
```

**Solution 2**: Check Alembic version table
```sql
SELECT * FROM alembic_version;
```

---

## 8. Production Recommendations

### Security Hardening:

1. **Use strong passwords**: Minimum 20 characters with special chars
2. **Enable SSL/TLS**: 
   ```
   ssl = on
   ssl_cert_file = 'server.crt'
   ssl_key_file = 'server.key'
   ```
3. **Restrict connections**: Edit `pg_hba.conf` to allow only specific IPs
4. **Regular backups**: Use `pg_dump` or automated backup tools
5. **Monitor logs**: Enable detailed logging for security auditing
6. **Update regularly**: Keep PostgreSQL patched

### Performance Tuning:

```conf
# postgresql.conf for production
shared_buffers = 4GB               # 25% of RAM
effective_cache_size = 12GB        # 75% of RAM
work_mem = 32MB
maintenance_work_mem = 512MB
max_connections = 200
random_page_cost = 1.1
effective_io_concurrency = 200
checkpoint_completion_target = 0.9
wal_buffers = 16MB
```

---

## 9. Useful Commands Reference

### PostgreSQL Commands:

```bash
# Connect to database
psql -U fanos_user -d fanos_ai -h localhost -p 5432

# List databases
\l

# Connect to database
\c fanos_ai

# List tables
\dt

# Describe table
\d users

# List users/roles
\du

# Execute SQL file
\i /path/to/file.sql

# Quit
\q
```

### SQL Queries:

```sql
-- Check database size
SELECT pg_size_pretty(pg_database_size('fanos_ai'));

-- Check table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Active connections
SELECT * FROM pg_stat_activity WHERE datname = 'fanos_ai';

-- Kill connection
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE datname = 'fanos_ai' AND pid <> pg_backend_pid();
```

---

## 10. Next Steps

After successful database connection:

1. ✅ **Seed initial data**: Create admin user, test data
2. ✅ **Configure backup**: Set up automated pg_dump
3. ✅ **Monitor performance**: Install pg_stat_statements
4. ✅ **Set up replication**: For high availability (optional)
5. ✅ **Document credentials**: Store securely (e.g., password manager)

---

## Support

For issues with database setup:
- **Email**: support@fanos.ai
- **Documentation**: https://docs.fanos.ai
- **GitHub Issues**: https://github.com/fanos-ai/platform/issues

---

**Last Updated**: September 12, 2026  
**PostgreSQL Version**: 14+  
**Tested On**: Windows 10/11, Ubuntu 22.04, macOS Monterey
