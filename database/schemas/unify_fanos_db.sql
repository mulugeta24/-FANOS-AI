-- ============================================================================
-- FANOS UNIFIED DATABASE MIGRATION SCRIPT
-- ============================================================================
-- Target Database: fanos_db (ONLY THIS DATABASE)
-- Consolidates:
--   1. Core FANOS SOC & Security Operations (incidents, assets, responses, etc.)
--   2. Malicious URL Detector & Web Security Scanner (scans, vt_cache, user_reports, stats, web_scan_*)
--   3. FANOS WAF (domains, waf_rules, waf_settings, rate_limit_policies, rule_exclusions, reports, audit_logs)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

BEGIN;

-- ============================================================================
-- PART 1: CORE / AUTH / MULTI-TENANCY UNIFICATION
-- ============================================================================

-- Organizations
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(128) NOT NULL,
    slug VARCHAR(128) UNIQUE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_organizations_slug ON organizations(slug);

-- Users (Unified for Core SOC, Malicious URL Detector, and WAF)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(64) UNIQUE NOT NULL,
    email VARCHAR(256) UNIQUE,
    full_name VARCHAR(128),
    hashed_pwd VARCHAR(256),
    hashed_password VARCHAR(256),
    role VARCHAR(32) NOT NULL DEFAULT 'admin',
    tenant_id VARCHAR(36),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE
);

-- Relax strict NOT NULLs so all three modules can authenticate
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
ALTER TABLE users ALTER COLUMN full_name DROP NOT NULL;
ALTER TABLE users ALTER COLUMN hashed_pwd DROP NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS hashed_password VARCHAR(256);
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(36);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS ix_users_username ON users(username);
CREATE INDEX IF NOT EXISTS ix_users_email ON users(email);
CREATE INDEX IF NOT EXISTS ix_users_tenant_id ON users(tenant_id);

-- Keep hashed_pwd and hashed_password synchronized
UPDATE users SET hashed_password = hashed_pwd WHERE hashed_password IS NULL AND hashed_pwd IS NOT NULL;
UPDATE users SET hashed_pwd = hashed_password WHERE hashed_pwd IS NULL AND hashed_password IS NOT NULL;

-- ============================================================================
-- PART 2: WAF (WEB APPLICATION FIREWALL) INTEGRATION INTO fanos_db
-- ============================================================================

-- 1. Domains (WAF Protected Hosts)
CREATE TABLE IF NOT EXISTS domains (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL DEFAULT 'default',
    domain_name VARCHAR(255) UNIQUE NOT NULL,
    subdomains_json TEXT NOT NULL DEFAULT '[]',
    origin_url VARCHAR(512) NOT NULL,
    environment VARCHAR(32) NOT NULL DEFAULT 'development',
    enforcement_mode VARCHAR(16) NOT NULL DEFAULT 'monitor',
    verification_status VARCHAR(32) NOT NULL DEFAULT 'pending',
    verification_token VARCHAR(128) NOT NULL,
    verification_token_hash VARCHAR(256) NOT NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    ssl_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ssl_mode VARCHAR(32) NOT NULL DEFAULT 'flexible',
    target_type VARCHAR(32) NOT NULL DEFAULT 'production',
    tls_status VARCHAR(32) NOT NULL DEFAULT 'pending',
    proxy_status VARCHAR(32) NOT NULL DEFAULT 'pending',
    health_status VARCHAR(32) NOT NULL DEFAULT 'unknown',
    last_health_check_at TIMESTAMP WITH TIME ZONE,
    traffic_verified BOOLEAN NOT NULL DEFAULT FALSE,
    last_traffic_test_at TIMESTAMP WITH TIME ZONE,
    protection_status VARCHAR(32) NOT NULL DEFAULT 'DOMAIN_REGISTERED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_domains_tenant_id ON domains(tenant_id);
CREATE INDEX IF NOT EXISTS ix_domains_domain_name ON domains(domain_name);
CREATE INDEX IF NOT EXISTS ix_domains_is_active ON domains(is_active);

-- 2. WAF Core Rules
CREATE TABLE IF NOT EXISTS waf_rules (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    category VARCHAR(64) NOT NULL,
    severity VARCHAR(16) NOT NULL,
    action VARCHAR(16) NOT NULL,
    description VARCHAR(512) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    is_custom BOOLEAN NOT NULL DEFAULT FALSE,
    pattern VARCHAR(512),
    target_locations_json TEXT NOT NULL DEFAULT '[]',
    tags_json TEXT NOT NULL DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_waf_rules_category ON waf_rules(category);
CREATE INDEX IF NOT EXISTS ix_waf_rules_severity ON waf_rules(severity);
CREATE INDEX IF NOT EXISTS ix_waf_rules_enabled ON waf_rules(enabled);

-- 3. WAF Settings
CREATE TABLE IF NOT EXISTS waf_settings (
    key VARCHAR(64) PRIMARY KEY,
    value VARCHAR(512) NOT NULL,
    description VARCHAR(256),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Rate Limit Policies
CREATE TABLE IF NOT EXISTS rate_limit_policies (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL DEFAULT 'default',
    domain_id VARCHAR(36) REFERENCES domains(id) ON DELETE CASCADE,
    route_pattern VARCHAR(256) NOT NULL DEFAULT '*',
    requests_per_minute INTEGER NOT NULL DEFAULT 60,
    burst_limit INTEGER NOT NULL DEFAULT 20,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_rate_limit_policies_tenant_id ON rate_limit_policies(tenant_id);
CREATE INDEX IF NOT EXISTS ix_rate_limit_policies_domain_id ON rate_limit_policies(domain_id);

-- 5. Rule Exclusions
CREATE TABLE IF NOT EXISTS rule_exclusions (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL DEFAULT 'default',
    domain_id VARCHAR(36) REFERENCES domains(id) ON DELETE CASCADE,
    rule_id VARCHAR(64) NOT NULL,
    path_pattern VARCHAR(256) NOT NULL DEFAULT '*',
    justification VARCHAR(512) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS ix_rule_exclusions_tenant_id ON rule_exclusions(tenant_id);
CREATE INDEX IF NOT EXISTS ix_rule_exclusions_domain_id ON rule_exclusions(domain_id);
CREATE INDEX IF NOT EXISTS ix_rule_exclusions_rule_id ON rule_exclusions(rule_id);

-- 6. Reports (WAF Security Reports)
CREATE TABLE IF NOT EXISTS reports (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(128) NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    time_range VARCHAR(64) NOT NULL,
    total_inspected INTEGER NOT NULL DEFAULT 0,
    total_allowed INTEGER NOT NULL DEFAULT 0,
    total_monitored INTEGER NOT NULL DEFAULT 0,
    total_blocked INTEGER NOT NULL DEFAULT 0,
    summary_json TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS ix_reports_generated_at ON reports(generated_at DESC);

-- 7. Audit Logs (WAF & Security Audit Logs)
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(36) PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    username VARCHAR(64) NOT NULL,
    action VARCHAR(64) NOT NULL,
    details_json TEXT
);
CREATE INDEX IF NOT EXISTS ix_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS ix_audit_logs_username ON audit_logs(username);

-- ============================================================================
-- PART 3: UNIFY security_events FOR CORE SOC, SURICATA & WAF
-- ============================================================================

-- Ensure security_events exists
CREATE TABLE IF NOT EXISTS security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    severity VARCHAR(16) NOT NULL DEFAULT 'INFO',
    attack_type VARCHAR(128) NOT NULL DEFAULT 'Web Attack',
    source_ip VARCHAR(64) NOT NULL DEFAULT '127.0.0.1',
    target VARCHAR(256) NOT NULL DEFAULT '',
    ai_confidence DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    risk_score INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'ALERT',
    raw_payload TEXT,
    sensor_source VARCHAR(64) DEFAULT 'waf',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Relax NOT NULL constraints on legacy fields so WAF direct models can write seamlessly
ALTER TABLE security_events ALTER COLUMN severity DROP NOT NULL;
ALTER TABLE security_events ALTER COLUMN attack_type DROP NOT NULL;
ALTER TABLE security_events ALTER COLUMN source_ip DROP NOT NULL;
ALTER TABLE security_events ALTER COLUMN target DROP NOT NULL;
ALTER TABLE security_events ALTER COLUMN ai_confidence DROP NOT NULL;
ALTER TABLE security_events ALTER COLUMN risk_score SET DEFAULT 0;
ALTER TABLE security_events ALTER COLUMN status SET DEFAULT 'ALERT';

-- Add all WAF-specific telemetry columns
ALTER TABLE security_events
    ADD COLUMN IF NOT EXISTS request_id VARCHAR(64),
    ADD COLUMN IF NOT EXISTS timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS client_ip VARCHAR(64),
    ADD COLUMN IF NOT EXISTS method VARCHAR(16),
    ADD COLUMN IF NOT EXISTS path VARCHAR(1024),
    ADD COLUMN IF NOT EXISTS decision VARCHAR(16),
    ADD COLUMN IF NOT EXISTS action VARCHAR(32) DEFAULT 'ALLOW',
    ADD COLUMN IF NOT EXISTS findings_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS findings_json TEXT DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS processing_time_ms DOUBLE PRECISION DEFAULT 0.0,
    ADD COLUMN IF NOT EXISTS policy_mode VARCHAR(16) DEFAULT 'monitor',
    ADD COLUMN IF NOT EXISTS domain_id VARCHAR(36),
    ADD COLUMN IF NOT EXISTS hostname VARCHAR(255),
    ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(36),
    ADD COLUMN IF NOT EXISTS http_status INTEGER DEFAULT 200,
    ADD COLUMN IF NOT EXISTS origin_status INTEGER,
    ADD COLUMN IF NOT EXISTS is_test BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS headers_sanitized_json TEXT,
    ADD COLUMN IF NOT EXISTS query_sanitized_json TEXT,
    ADD COLUMN IF NOT EXISTS body_sanitized TEXT;

CREATE INDEX IF NOT EXISTS ix_security_events_request_id ON security_events(request_id);
CREATE INDEX IF NOT EXISTS ix_security_events_timestamp ON security_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS ix_security_events_client_ip ON security_events(client_ip);
CREATE INDEX IF NOT EXISTS ix_security_events_path ON security_events(path);
CREATE INDEX IF NOT EXISTS ix_security_events_decision ON security_events(decision);
CREATE INDEX IF NOT EXISTS ix_security_events_action ON security_events(action);
CREATE INDEX IF NOT EXISTS ix_security_events_domain_id ON security_events(domain_id);
CREATE INDEX IF NOT EXISTS ix_security_events_hostname ON security_events(hostname);

-- ============================================================================
-- PART 4: MALICIOUS URL DETECTOR & WEB SCANNER TABLES (VERIFICATION & ENHANCEMENT)
-- ============================================================================

-- 1. Scans Table
CREATE TABLE IF NOT EXISTS scans (
    id SERIAL PRIMARY KEY,
    url TEXT NOT NULL,
    final_verdict VARCHAR(64) NOT NULL,
    ml_prediction VARCHAR(64),
    ml_confidence DOUBLE PRECISION,
    vt_result TEXT,
    user_id VARCHAR(128),
    timestamp BIGINT DEFAULT EXTRACT(epoch FROM NOW())::bigint,
    source VARCHAR(64) DEFAULT 'web'
);
CREATE INDEX IF NOT EXISTS ix_scans_url ON scans(url);
CREATE INDEX IF NOT EXISTS ix_scans_final_verdict ON scans(final_verdict);
CREATE INDEX IF NOT EXISTS ix_scans_timestamp ON scans(timestamp);
CREATE INDEX IF NOT EXISTS ix_scans_user_id ON scans(user_id);

-- 2. VirusTotal Cache Table
CREATE TABLE IF NOT EXISTS vt_cache (
    url TEXT PRIMARY KEY,
    result TEXT,
    verdict VARCHAR(64),
    malicious INTEGER DEFAULT 0,
    suspicious INTEGER DEFAULT 0,
    harmless INTEGER DEFAULT 0,
    timestamp BIGINT DEFAULT EXTRACT(epoch FROM NOW())::bigint
);
CREATE INDEX IF NOT EXISTS ix_vt_cache_timestamp ON vt_cache(timestamp);

-- 3. User Threat Reports Table
CREATE TABLE IF NOT EXISTS user_reports (
    id SERIAL PRIMARY KEY,
    scan_id INTEGER,
    url TEXT NOT NULL,
    original_verdict VARCHAR(64),
    user_verdict VARCHAR(64) NOT NULL,
    user_id VARCHAR(128),
    timestamp BIGINT DEFAULT EXTRACT(epoch FROM NOW())::bigint,
    notes TEXT
);
CREATE INDEX IF NOT EXISTS ix_user_reports_scan_id ON user_reports(scan_id);
CREATE INDEX IF NOT EXISTS ix_user_reports_timestamp ON user_reports(timestamp);
CREATE INDEX IF NOT EXISTS ix_user_reports_user_id ON user_reports(user_id);

-- 4. Global Stats Key-Value Counter
CREATE TABLE IF NOT EXISTS stats (
    key VARCHAR(128) PRIMARY KEY,
    value BIGINT DEFAULT 0
);

-- 5. Web Security Scanner Tables (Projects, Jobs, Assets, Findings, etc.)
CREATE TABLE IF NOT EXISTS web_scan_projects (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(64),
    name VARCHAR(255) NOT NULL,
    target_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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
    stats JSONB DEFAULT '{"low": 0, "apis": 0, "high": 0, "urls": 0, "assets": 0, "medium": 0, "critical": 0, "technologies": 0, "informational": 0}'::jsonb,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crucial: Add ml_threat_intel column requested in pgAdmin
ALTER TABLE web_scan_jobs
ADD COLUMN IF NOT EXISTS ml_threat_intel JSONB DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_web_scan_jobs_created_at ON web_scan_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_web_scan_jobs_status ON web_scan_jobs(status);
CREATE INDEX IF NOT EXISTS idx_web_scan_jobs_user_id ON web_scan_jobs(user_id);

CREATE TABLE IF NOT EXISTS web_scan_assets (
    id SERIAL PRIMARY KEY,
    job_id VARCHAR(64) REFERENCES web_scan_jobs(id) ON DELETE CASCADE,
    asset_type VARCHAR(64) NOT NULL,
    asset_value TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_web_scan_assets_job_id ON web_scan_assets(job_id);

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

-- ============================================================================
-- PART 5: SEED INITIAL / DEFAULT ESSENTIAL CONFIGURATION
-- ============================================================================

-- Default WAF Settings
INSERT INTO waf_settings (key, value, description)
VALUES 
    ('waf_mode', 'block', 'Global operational enforcement mode (monitor or block)'),
    ('block_threshold', '70', 'Risk score threshold required to trigger BLOCK action'),
    ('monitor_threshold', '30', 'Risk score threshold required to trigger MONITOR action')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Default Admin User (if no admin exists)
INSERT INTO users (id, username, email, full_name, hashed_pwd, hashed_password, role, is_active, is_admin)
VALUES (
    gen_random_uuid(),
    'admin',
    'admin@fanos.ai',
    'FANOS Administrator',
    '$2b$12$xrPt0c6Dll5e4CUqqwtuO.y8J2ALRsMrkBVq53oi4PCBRlBqR7Q46',
    '$2b$12$xrPt0c6Dll5e4CUqqwtuO.y8J2ALRsMrkBVq53oi4PCBRlBqR7Q46',
    'admin',
    TRUE,
    TRUE
)
ON CONFLICT (username) DO UPDATE 
SET hashed_password = EXCLUDED.hashed_password,
    hashed_pwd = EXCLUDED.hashed_pwd;

-- Default Protected Domain
INSERT INTO domains (
    id, tenant_id, domain_name, subdomains_json, origin_url, environment,
    target_type, enforcement_mode, verification_status, verification_token,
    verification_token_hash, is_active, ssl_enabled, ssl_mode, tls_status,
    proxy_status, health_status, traffic_verified, protection_status
) VALUES (
    '9f095261-ca37-4641-a4a6-04a8a6347593',
    'org-default',
    'fanos-sec.vercel.app',
    '["sec.fanos.ai", "api.fanos-sec.vercel.app"]',
    'https://fanossec.onrender.com',
    'production',
    'production',
    'block',
    'verified',
    'fanos-waf-verify-prod-9f095261',
    'hash9f095261',
    TRUE,
    TRUE,
    'strict',
    'valid',
    'configured',
    'healthy',
    TRUE,
    'PROTECTION_ACTIVE'
)
ON CONFLICT (domain_name) DO NOTHING;

COMMIT;
