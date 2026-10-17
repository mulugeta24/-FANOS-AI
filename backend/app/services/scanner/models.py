"""
PostgreSQL Models & Persistence Layer for Enterprise Web Security Scanner
Integrates with existing core.database connection pool and transaction manager.
"""
import json
import logging
try:
    from app.services.scanner.db import get_db
except ImportError:
    try:
        from scanner.db import get_db
    except ImportError:
        from core.database import get_db


def init_scanner_tables():
    """Initializes all PostgreSQL tables and indexes for the Web Security Scanner."""
    with get_db() as (conn, c):
        # 1. Web Scan Projects Table
        c.execute("""
            CREATE TABLE IF NOT EXISTS web_scan_projects (
                id SERIAL PRIMARY KEY,
                user_id VARCHAR(64),
                name VARCHAR(255) NOT NULL,
                target_url TEXT NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_web_scan_projects_user_id ON web_scan_projects(user_id);
        """)

        # 2. Web Scan Jobs Table
        c.execute("""
            CREATE TABLE IF NOT EXISTS web_scan_jobs (
                id VARCHAR(64) PRIMARY KEY,
                user_id VARCHAR(64),
                target_url TEXT NOT NULL,
                target_domain VARCHAR(255) NOT NULL,
                scope_config JSONB DEFAULT '{}'::jsonb,
                status VARCHAR(32) DEFAULT 'pending',
                progress INTEGER DEFAULT 0,
                current_phase VARCHAR(64) DEFAULT 'Queued',
                authorized_by VARCHAR(100),
                start_time TIMESTAMP WITH TIME ZONE,
                end_time TIMESTAMP WITH TIME ZONE,
                duration_seconds INTEGER DEFAULT 0,
                stats JSONB DEFAULT '{"assets":0,"urls":0,"apis":0,"technologies":0,"critical":0,"high":0,"medium":0,"low":0,"informational":0}'::jsonb,
                error_message TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_web_scan_jobs_user_id ON web_scan_jobs(user_id);
            CREATE INDEX IF NOT EXISTS idx_web_scan_jobs_status ON web_scan_jobs(status);
            CREATE INDEX IF NOT EXISTS idx_web_scan_jobs_created_at ON web_scan_jobs(created_at DESC);
        """)

        # 3. Web Scan Discovered Assets Table
        c.execute("""
            CREATE TABLE IF NOT EXISTS web_scan_assets (
                id SERIAL PRIMARY KEY,
                job_id VARCHAR(64) REFERENCES web_scan_jobs(id) ON DELETE CASCADE,
                asset_type VARCHAR(64) NOT NULL,
                asset_value TEXT NOT NULL,
                metadata JSONB DEFAULT '{}'::jsonb,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_web_scan_assets_job_id ON web_scan_assets(job_id);
            CREATE INDEX IF NOT EXISTS idx_web_scan_assets_type ON web_scan_assets(asset_type);
        """)

        # 4. Web Scan Crawled URLs Table
        c.execute("""
            CREATE TABLE IF NOT EXISTS web_scan_urls (
                id SERIAL PRIMARY KEY,
                job_id VARCHAR(64) REFERENCES web_scan_jobs(id) ON DELETE CASCADE,
                url TEXT NOT NULL,
                status_code INTEGER,
                content_type VARCHAR(128),
                response_time_ms INTEGER,
                in_scope BOOLEAN DEFAULT TRUE,
                discovered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_web_scan_urls_job_id ON web_scan_urls(job_id);
            CREATE INDEX IF NOT EXISTS idx_web_scan_urls_url ON web_scan_urls(url);
        """)

        # 5. Web Scan API Endpoints Table
        c.execute("""
            CREATE TABLE IF NOT EXISTS web_scan_endpoints (
                id SERIAL PRIMARY KEY,
                job_id VARCHAR(64) REFERENCES web_scan_jobs(id) ON DELETE CASCADE,
                endpoint_url TEXT NOT NULL,
                http_method VARCHAR(16) DEFAULT 'GET',
                parameters JSONB DEFAULT '[]'::jsonb,
                auth_required BOOLEAN DEFAULT FALSE,
                metadata JSONB DEFAULT '{}'::jsonb,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_web_scan_endpoints_job_id ON web_scan_endpoints(job_id);
        """)

        # 6. Web Scan Detected Technologies Table
        c.execute("""
            CREATE TABLE IF NOT EXISTS web_scan_technologies (
                id SERIAL PRIMARY KEY,
                job_id VARCHAR(64) REFERENCES web_scan_jobs(id) ON DELETE CASCADE,
                category VARCHAR(64) NOT NULL,
                name VARCHAR(128) NOT NULL,
                version VARCHAR(64),
                confidence VARCHAR(32) DEFAULT 'High',
                evidence_text TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_web_scan_technologies_job_id ON web_scan_technologies(job_id);
        """)

        # 7. Web Scan Findings Table
        c.execute("""
            CREATE TABLE IF NOT EXISTS web_scan_findings (
                id VARCHAR(64) PRIMARY KEY,
                job_id VARCHAR(64) REFERENCES web_scan_jobs(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                severity VARCHAR(32) NOT NULL,
                confidence VARCHAR(32) NOT NULL,
                category VARCHAR(64) NOT NULL,
                affected_asset TEXT NOT NULL,
                affected_url TEXT NOT NULL,
                http_method VARCHAR(16),
                parameter VARCHAR(128),
                description TEXT NOT NULL,
                impact TEXT NOT NULL,
                remediation TEXT NOT NULL,
                references_data JSONB DEFAULT '[]'::jsonb,
                evidence_data JSONB DEFAULT '{}'::jsonb,
                status VARCHAR(32) DEFAULT 'Open',
                scanner_module VARCHAR(64) NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_web_scan_findings_job_id ON web_scan_findings(job_id);
            CREATE INDEX IF NOT EXISTS idx_web_scan_findings_severity ON web_scan_findings(severity);
            CREATE INDEX IF NOT EXISTS idx_web_scan_findings_status ON web_scan_findings(status);
        """)

        # 8. Web Scan Evidence Table
        c.execute("""
            CREATE TABLE IF NOT EXISTS web_scan_evidence (
                id SERIAL PRIMARY KEY,
                finding_id VARCHAR(64) REFERENCES web_scan_findings(id) ON DELETE CASCADE,
                job_id VARCHAR(64) REFERENCES web_scan_jobs(id) ON DELETE CASCADE,
                evidence_type VARCHAR(64) NOT NULL,
                title VARCHAR(255),
                data JSONB NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_web_scan_evidence_finding_id ON web_scan_evidence(finding_id);
            CREATE INDEX IF NOT EXISTS idx_web_scan_evidence_job_id ON web_scan_evidence(job_id);
        """)

        print("[+] PostgreSQL Web Security Scanner tables verified/initialized")

# ============================================================================
# Job CRUD Operations
# ============================================================================

def create_scan_job(job_id, user_id, target_url, target_domain, scope_config, authorized_by):
    """Creates a new web scan job record."""
    with get_db() as (conn, c):
        c.execute("""
            INSERT INTO web_scan_jobs 
            (id, user_id, target_url, target_domain, scope_config, status, progress, current_phase, authorized_by, created_at)
            VALUES (%s, %s, %s, %s, %s, 'pending', 0, 'Queued', %s, NOW())
            RETURNING id, target_url, target_domain, status, progress, current_phase, created_at;
        """, (job_id, user_id, target_url, target_domain, json.dumps(scope_config), authorized_by))
        row = c.fetchone()
        if row:
            return {
                'id': row[0],
                'target_url': row[1],
                'target_domain': row[2],
                'status': row[3],
                'progress': row[4],
                'current_phase': row[5],
                'created_at': row[6].isoformat() if row[6] else None
            }
        return None

def update_scan_job(job_id, status=None, progress=None, current_phase=None, stats=None, error_message=None, start_time=None, end_time=None, duration_seconds=None):
    """Updates status, progress, and stats of a scan job."""
    updates = []
    params = []
    
    if status is not None:
        updates.append("status = %s")
        params.append(status)
    if progress is not None:
        updates.append("progress = %s")
        params.append(progress)
    if current_phase is not None:
        updates.append("current_phase = %s")
        params.append(current_phase)
    if stats is not None:
        updates.append("stats = %s")
        params.append(json.dumps(stats))
    if error_message is not None:
        updates.append("error_message = %s")
        params.append(error_message)
    if start_time is not None:
        updates.append("start_time = %s")
        params.append(start_time)
    if end_time is not None:
        updates.append("end_time = %s")
        params.append(end_time)
    if duration_seconds is not None:
        updates.append("duration_seconds = %s")
        params.append(duration_seconds)
        
    if not updates:
        return
        
    params.append(job_id)
    query = f"UPDATE web_scan_jobs SET {', '.join(updates)} WHERE id = %s"
    
    with get_db() as (conn, c):
        c.execute(query, tuple(params))

def get_scan_job(job_id, user_id=None):
    """Retrieves full details of a single scan job."""
    with get_db() as (conn, c):
        query = """
            SELECT id, user_id, target_url, target_domain, scope_config, status, 
                   progress, current_phase, authorized_by, start_time, end_time, 
                   duration_seconds, stats, error_message, created_at
            FROM web_scan_jobs
            WHERE id = %s
        """
        params = [job_id]
        if user_id is not None:
            query += " AND (user_id = %s OR %s = 0)"
            params.extend([user_id, user_id])
            
        c.execute(query, tuple(params))
        row = c.fetchone()
        if not row:
            return None
            
        stats_data = row[12]
        if isinstance(stats_data, str):
            try:
                stats_data = json.loads(stats_data)
            except Exception:
                stats_data = {}

        scope_data = row[4]
        if isinstance(scope_data, str):
            try:
                scope_data = json.loads(scope_data)
            except Exception:
                scope_data = {}

        return {
            'id': row[0],
            'user_id': row[1],
            'target_url': row[2],
            'target_domain': row[3],
            'scope_config': scope_data or {},
            'status': row[5],
            'progress': row[6],
            'current_phase': row[7],
            'authorized_by': row[8],
            'start_time': row[9].isoformat() if row[9] else None,
            'end_time': row[10].isoformat() if row[10] else None,
            'duration_seconds': row[11],
            'stats': stats_data or {},
            'error_message': row[13],
            'created_at': row[14].isoformat() if row[14] else None
        }

def list_scan_jobs(user_id=None, limit=50):
    """Lists recent scan jobs for a user or admin."""
    with get_db() as (conn, c):
        query = """
            SELECT id, user_id, target_url, target_domain, status, progress, 
                   current_phase, stats, created_at, duration_seconds
            FROM web_scan_jobs
        """
        params = []
        if user_id is not None and user_id != 0:
            query += " WHERE user_id = %s"
            params.append(user_id)
            
        query += " ORDER BY created_at DESC LIMIT %s"
        params.append(limit)
        
        c.execute(query, tuple(params))
        rows = c.fetchall()
        
        jobs = []
        for r in rows:
            stats = r[7]
            if isinstance(stats, str):
                try:
                    stats = json.loads(stats)
                except Exception:
                    stats = {}
            jobs.append({
                'id': r[0],
                'user_id': r[1],
                'target_url': r[2],
                'target_domain': r[3],
                'status': r[4],
                'progress': r[5],
                'current_phase': r[6],
                'stats': stats or {},
                'created_at': r[8].isoformat() if r[8] else None,
                'duration_seconds': r[9]
            })
        return jobs

# ============================================================================
# Asset & Discovery Operations
# ============================================================================

def add_scan_asset(job_id, asset_type, asset_value, metadata=None):
    """Stores an asset discovered during scan."""
    with get_db() as (conn, c):
        c.execute("""
            INSERT INTO web_scan_assets (job_id, asset_type, asset_value, metadata)
            VALUES (%s, %s, %s, %s)
            RETURNING id;
        """, (job_id, asset_type, asset_value, json.dumps(metadata or {})))
        return c.fetchone()[0]

def get_scan_assets(job_id, asset_type=None):
    """Retrieves all discovered assets for a job, optionally filtered by type."""
    with get_db() as (conn, c):
        query = "SELECT id, asset_type, asset_value, metadata, created_at FROM web_scan_assets WHERE job_id = %s"
        params = [job_id]
        if asset_type:
            query += " AND asset_type = %s"
            params.append(asset_type)
        query += " ORDER BY id ASC"
        c.execute(query, tuple(params))
        
        results = []
        for r in c.fetchall():
            meta = r[3]
            if isinstance(meta, str):
                try:
                    meta = json.loads(meta)
                except Exception:
                    meta = {}
            results.append({
                'id': r[0],
                'asset_type': r[1],
                'asset_value': r[2],
                'metadata': meta,
                'created_at': r[4].isoformat() if r[4] else None
            })
        return results

def add_scan_url(job_id, url, status_code=None, content_type=None, response_time_ms=None, in_scope=True):
    """Logs a crawled URL."""
    with get_db() as (conn, c):
        c.execute("""
            INSERT INTO web_scan_urls (job_id, url, status_code, content_type, response_time_ms, in_scope)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id;
        """, (job_id, url, status_code, content_type, response_time_ms, in_scope))
        return c.fetchone()[0]

def get_scan_urls(job_id, limit=500):
    """Retrieves crawled URLs for a job."""
    with get_db() as (conn, c):
        c.execute("""
            SELECT id, url, status_code, content_type, response_time_ms, in_scope, discovered_at
            FROM web_scan_urls
            WHERE job_id = %s
            ORDER BY id ASC
            LIMIT %s
        """, (job_id, limit))
        return [{
            'id': r[0],
            'url': r[1],
            'status_code': r[2],
            'content_type': r[3],
            'response_time_ms': r[4],
            'in_scope': r[5],
            'discovered_at': r[6].isoformat() if r[6] else None
        } for r in c.fetchall()]

def add_scan_endpoint(job_id, endpoint_url, http_method='GET', parameters=None, auth_required=False, metadata=None):
    """Logs an identified API endpoint."""
    with get_db() as (conn, c):
        c.execute("""
            INSERT INTO web_scan_endpoints (job_id, endpoint_url, http_method, parameters, auth_required, metadata)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id;
        """, (job_id, endpoint_url, http_method, json.dumps(parameters or []), auth_required, json.dumps(metadata or {})))
        return c.fetchone()[0]

def get_scan_endpoints(job_id):
    """Retrieves discovered API endpoints for a job."""
    with get_db() as (conn, c):
        c.execute("""
            SELECT id, endpoint_url, http_method, parameters, auth_required, metadata, created_at
            FROM web_scan_endpoints
            WHERE job_id = %s
            ORDER BY id ASC
        """, (job_id,))
        return [{
            'id': r[0],
            'endpoint_url': r[1],
            'http_method': r[2],
            'parameters': r[3] if isinstance(r[3], list) else (json.loads(r[3]) if r[3] else []),
            'auth_required': r[4],
            'metadata': r[5] if isinstance(r[5], dict) else (json.loads(r[5]) if r[5] else {}),
            'created_at': r[6].isoformat() if r[6] else None
        } for r in c.fetchall()]

def add_scan_technology(job_id, category, name, version=None, confidence='High', evidence_text=None):
    """Logs an identified web technology."""
    with get_db() as (conn, c):
        c.execute("""
            INSERT INTO web_scan_technologies (job_id, category, name, version, confidence, evidence_text)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id;
        """, (job_id, category, name, version, confidence, evidence_text))
        return c.fetchone()[0]

def get_scan_technologies(job_id):
    """Retrieves detected technologies for a job."""
    with get_db() as (conn, c):
        c.execute("""
            SELECT id, category, name, version, confidence, evidence_text, created_at
            FROM web_scan_technologies
            WHERE job_id = %s
            ORDER BY category, name
        """, (job_id,))
        return [{
            'id': r[0],
            'category': r[1],
            'name': r[2],
            'version': r[3],
            'confidence': r[4],
            'evidence_text': r[5],
            'created_at': r[6].isoformat() if r[6] else None
        } for r in c.fetchall()]

# ============================================================================
# Findings & Evidence Operations
# ============================================================================

def add_scan_finding(finding_id, job_id, title, severity, confidence, category, affected_asset, 
                     affected_url, http_method, parameter, description, impact, remediation, 
                     references_data, evidence_data, scanner_module, status='Open'):
    """Stores a structured security assessment finding."""
    with get_db() as (conn, c):
        c.execute("""
            INSERT INTO web_scan_findings
            (id, job_id, title, severity, confidence, category, affected_asset, affected_url,
             http_method, parameter, description, impact, remediation, references_data,
             evidence_data, status, scanner_module, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
            RETURNING id;
        """, (
            finding_id, job_id, title, severity, confidence, category, affected_asset,
            affected_url, http_method, parameter, description, impact, remediation,
            json.dumps(references_data or []), json.dumps(evidence_data or {}), status, scanner_module
        ))
        return c.fetchone()[0]

def get_scan_findings(job_id, severity=None, status=None, category=None):
    """Retrieves findings for a scan with optional filters."""
    with get_db() as (conn, c):
        query = """
            SELECT id, job_id, title, severity, confidence, category, affected_asset,
                   affected_url, http_method, parameter, description, impact, remediation,
                   references_data, evidence_data, status, scanner_module, created_at
            FROM web_scan_findings
            WHERE job_id = %s
        """
        params = [job_id]
        if severity:
            query += " AND severity = %s"
            params.append(severity)
        if status:
            query += " AND status = %s"
            params.append(status)
        if category:
            query += " AND category = %s"
            params.append(category)
            
        # Order by severity priority
        query += """
            ORDER BY CASE severity 
                WHEN 'Critical' THEN 1 
                WHEN 'High' THEN 2 
                WHEN 'Medium' THEN 3 
                WHEN 'Low' THEN 4 
                ELSE 5 
            END, created_at DESC
        """
        c.execute(query, tuple(params))
        
        findings = []
        for r in c.fetchall():
            refs = r[13]
            if isinstance(refs, str):
                try:
                    refs = json.loads(refs)
                except Exception:
                    refs = []
            evid = r[14]
            if isinstance(evid, str):
                try:
                    evid = json.loads(evid)
                except Exception:
                    evid = {}
            findings.append({
                'id': r[0],
                'job_id': r[1],
                'title': r[2],
                'severity': r[3],
                'confidence': r[4],
                'category': r[5],
                'affected_asset': r[6],
                'affected_url': r[7],
                'http_method': r[8],
                'parameter': r[9],
                'description': r[10],
                'impact': r[11],
                'remediation': r[12],
                'references': refs or [],
                'evidence': evid or {},
                'status': r[15],
                'scanner_module': r[16],
                'created_at': r[17].isoformat() if r[17] else None
            })
        return findings

def get_finding_by_id(finding_id):
    """Retrieves a single finding by its ID."""
    with get_db() as (conn, c):
        c.execute("""
            SELECT id, job_id, title, severity, confidence, category, affected_asset,
                   affected_url, http_method, parameter, description, impact, remediation,
                   references_data, evidence_data, status, scanner_module, created_at
            FROM web_scan_findings
            WHERE id = %s
        """, (finding_id,))
        r = c.fetchone()
        if not r:
            return None
        refs = r[13]
        if isinstance(refs, str):
            try:
                refs = json.loads(refs)
            except Exception:
                refs = []
        evid = r[14]
        if isinstance(evid, str):
            try:
                evid = json.loads(evid)
            except Exception:
                evid = {}
        return {
            'id': r[0],
            'job_id': r[1],
            'title': r[2],
            'severity': r[3],
            'confidence': r[4],
            'category': r[5],
            'affected_asset': r[6],
            'affected_url': r[7],
            'http_method': r[8],
            'parameter': r[9],
            'description': r[10],
            'impact': r[11],
            'remediation': r[12],
            'references': refs or [],
            'evidence': evid or {},
            'status': r[15],
            'scanner_module': r[16],
            'created_at': r[17].isoformat() if r[17] else None
        }

def update_finding_status(finding_id, new_status):
    """Updates the status of a finding (e.g. Open -> False Positive, Confirmed, etc.)."""
    valid_statuses = ['Open', 'Confirmed', 'False Positive', 'Accepted Risk', 'Resolved']
    if new_status not in valid_statuses:
        raise ValueError(f"Invalid status: {new_status}. Must be one of {valid_statuses}")
    with get_db() as (conn, c):
        c.execute("""
            UPDATE web_scan_findings
            SET status = %s
            WHERE id = %s
            RETURNING id, status;
        """, (new_status, finding_id))
        return c.fetchone() is not None

def add_scan_evidence(finding_id, job_id, evidence_type, title, data):
    """Stores non-sensitive technical evidence item linked to a finding."""
    with get_db() as (conn, c):
        c.execute("""
            INSERT INTO web_scan_evidence (finding_id, job_id, evidence_type, title, data)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id;
        """, (finding_id, job_id, evidence_type, title, json.dumps(data)))
        return c.fetchone()[0]

def get_scan_evidence(job_id, finding_id=None):
    """Retrieves technical evidence items for a job, optionally filtered by finding_id."""
    with get_db() as (conn, c):
        query = "SELECT id, finding_id, job_id, evidence_type, title, data, created_at FROM web_scan_evidence WHERE job_id = %s"
        params = [job_id]
        if finding_id:
            query += " AND finding_id = %s"
            params.append(finding_id)
        query += " ORDER BY id ASC"
        c.execute(query, tuple(params))
        
        evidence_items = []
        for r in c.fetchall():
            d = r[5]
            if isinstance(d, str):
                try:
                    d = json.loads(d)
                except Exception:
                    d = {}
            evidence_items.append({
                'id': r[0],
                'finding_id': r[1],
                'job_id': r[2],
                'evidence_type': r[3],
                'title': r[4],
                'data': d,
                'created_at': r[6].isoformat() if r[6] else None
            })
        return evidence_items
