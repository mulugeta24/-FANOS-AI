-- ============================================================================
-- FANOS WAF — Production PostgreSQL Schema & Migration Script
-- ============================================================================
-- Engine: PostgreSQL 14+ (Compatible with PostgreSQL 15, 16, 17, 18)
-- Charset: UTF-8
-- Description: Full schema definitions, indexes, constraints, and standard
--              analytical queries for FANOS Web Application Firewall.
-- ============================================================================

-- Ensure pgcrypto or uuid-ossp extension is enabled for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Organizations (Multi-Tenant Workspace)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS organizations (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    slug VARCHAR(64) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_organizations_slug ON organizations(slug);

-- ----------------------------------------------------------------------------
-- 2. Users (WAF & SOC Administrators)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(64) UNIQUE NOT NULL,
    hashed_password VARCHAR(256) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'admin',
    tenant_id VARCHAR(36),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_users_username ON users(username);
CREATE INDEX IF NOT EXISTS ix_users_tenant_id ON users(tenant_id);

-- ----------------------------------------------------------------------------
-- 3. Domains (Protected Onboarded Hosts & Reverse Proxy Routing)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS domains (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL DEFAULT 'default',
    domain_name VARCHAR(255) UNIQUE NOT NULL,
    subdomains_json TEXT NOT NULL DEFAULT '[]',
    origin_url VARCHAR(512) NOT NULL,
    environment VARCHAR(32) NOT NULL DEFAULT 'development',  -- development, staging, production
    enforcement_mode VARCHAR(16) NOT NULL DEFAULT 'monitor', -- monitor, block
    verification_status VARCHAR(32) NOT NULL DEFAULT 'pending', -- pending, verified, failed, expired
    verification_token VARCHAR(128) NOT NULL,
    verification_token_hash VARCHAR(256) NOT NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    ssl_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ssl_mode VARCHAR(32) NOT NULL DEFAULT 'flexible',
    target_type VARCHAR(32) NOT NULL DEFAULT 'production',   -- production, demo_lab
    tls_status VARCHAR(32) NOT NULL DEFAULT 'pending',       -- ready, pending, disabled, error
    proxy_status VARCHAR(32) NOT NULL DEFAULT 'pending',     -- configured, unreachable, origin_down, pending
    health_status VARCHAR(32) NOT NULL DEFAULT 'unknown',    -- healthy, unhealthy, unknown
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
CREATE INDEX IF NOT EXISTS ix_domains_protection_status ON domains(protection_status);

-- ----------------------------------------------------------------------------
-- 4. Security Events (WAF Inspected HTTP Requests & Attack Logs)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS security_events (
    id VARCHAR(36) PRIMARY KEY,
    request_id VARCHAR(64) UNIQUE NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    client_ip VARCHAR(64) NOT NULL,
    method VARCHAR(16) NOT NULL,
    path VARCHAR(1024) NOT NULL,
    decision VARCHAR(16) NOT NULL,                           -- ALLOW, MONITOR, BLOCK
    action VARCHAR(32) NOT NULL DEFAULT 'ALLOW',             -- ALLOW, MONITOR, BLOCK, RATE_LIMIT
    risk_score INTEGER NOT NULL,                             -- 0 to 100
    findings_count INTEGER NOT NULL DEFAULT 0,
    findings_json TEXT NOT NULL DEFAULT '[]',
    processing_time_ms DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    policy_mode VARCHAR(16) NOT NULL DEFAULT 'monitor',
    domain_id VARCHAR(36),
    hostname VARCHAR(255),
    tenant_id VARCHAR(36),
    http_status INTEGER NOT NULL DEFAULT 200,
    origin_status INTEGER,
    is_test BOOLEAN NOT NULL DEFAULT FALSE,
    headers_sanitized_json TEXT,
    query_sanitized_json TEXT,
    body_sanitized TEXT
);

CREATE INDEX IF NOT EXISTS ix_security_events_request_id ON security_events(request_id);
CREATE INDEX IF NOT EXISTS ix_security_events_timestamp ON security_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS ix_security_events_client_ip ON security_events(client_ip);
CREATE INDEX IF NOT EXISTS ix_security_events_path ON security_events(path);
CREATE INDEX IF NOT EXISTS ix_security_events_decision ON security_events(decision);
CREATE INDEX IF NOT EXISTS ix_security_events_action ON security_events(action);
CREATE INDEX IF NOT EXISTS ix_security_events_risk_score ON security_events(risk_score DESC);
CREATE INDEX IF NOT EXISTS ix_security_events_domain_id ON security_events(domain_id);
CREATE INDEX IF NOT EXISTS ix_security_events_hostname ON security_events(hostname);
CREATE INDEX IF NOT EXISTS ix_security_events_tenant_id ON security_events(tenant_id);
CREATE INDEX IF NOT EXISTS ix_security_events_is_test ON security_events(is_test);

-- ----------------------------------------------------------------------------
-- 5. Rate Limit Policies
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 6. Rule Exclusions (False Positive Overrides & Whitelist Rules)
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 7. WAF Rules (Deterministic Core Rule Set & Custom Probes)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS waf_rules (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    category VARCHAR(64) NOT NULL,                          -- SQLI, XSS, TRAVERSAL, CMDI, etc.
    severity VARCHAR(16) NOT NULL,                          -- CRITICAL, HIGH, MEDIUM, LOW
    action VARCHAR(16) NOT NULL,                            -- BLOCK, MONITOR, ALLOW
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

-- ----------------------------------------------------------------------------
-- 8. WAF Settings (Key-Value Dynamic Configuration)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS waf_settings (
    key VARCHAR(64) PRIMARY KEY,
    value VARCHAR(512) NOT NULL,
    description VARCHAR(256),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 9. Reports (Security Compliance & Traffic Audits)
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 10. Audit Logs (SOC User Actions & Changes)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(36) PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    username VARCHAR(64) NOT NULL,
    action VARCHAR(64) NOT NULL,
    details_json TEXT
);

CREATE INDEX IF NOT EXISTS ix_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS ix_audit_logs_username ON audit_logs(username);

-- ----------------------------------------------------------------------------
-- Seed Default Organization and Rules
-- ----------------------------------------------------------------------------
INSERT INTO organizations (id, name, slug)
VALUES ('org-default', 'Default Organization', 'default')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO waf_settings (key, value, description)
VALUES
    ('waf_mode', 'block', 'Global operational enforcement mode (monitor or block)'),
    ('block_threshold', '70', 'Risk score threshold required to trigger BLOCK action'),
    ('monitor_threshold', '30', 'Risk score threshold required to trigger MONITOR action')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

COMMIT;
