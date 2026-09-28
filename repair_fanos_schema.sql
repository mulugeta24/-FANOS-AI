BEGIN;

CREATE TABLE IF NOT EXISTS incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(256) NOT NULL,
    threat VARCHAR(128) NOT NULL,
    severity VARCHAR(16) NOT NULL,
    source_ip VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'Open',
    risk_score INTEGER NOT NULL,
    assigned_to VARCHAR(128),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS response_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action VARCHAR(64) NOT NULL,
    target VARCHAR(256) NOT NULL,
    reason VARCHAR(256) NOT NULL,
    automated BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    incident_id UUID REFERENCES incidents(id)
);

CREATE TABLE IF NOT EXISTS blocked_ips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address VARCHAR(64) NOT NULL UNIQUE,
    reason VARCHAR(256) NOT NULL,
    blocked_by VARCHAR(64) NOT NULL DEFAULT 'FANOS AI',
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(64) NOT NULL UNIQUE,
    email VARCHAR(256) NOT NULL UNIQUE,
    full_name VARCHAR(128) NOT NULL,
    hashed_pwd VARCHAR(256) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'analyst',
    is_active BOOLEAN DEFAULT true,
    mfa_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    last_login TIMESTAMP WITH TIME ZONE
);

ALTER TABLE security_events
ADD COLUMN IF NOT EXISTS incident_id UUID;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'security_events_incident_id_fkey'
    ) THEN
        ALTER TABLE security_events
        ADD CONSTRAINT security_events_incident_id_fkey
        FOREIGN KEY (incident_id)
        REFERENCES incidents(id);
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS ix_incidents_severity
    ON incidents(severity);

CREATE INDEX IF NOT EXISTS ix_incidents_status
    ON incidents(status);

CREATE INDEX IF NOT EXISTS ix_incidents_created_at
    ON incidents(created_at);

CREATE INDEX IF NOT EXISTS ix_security_events_severity
    ON security_events(severity);

CREATE INDEX IF NOT EXISTS ix_security_events_source_ip
    ON security_events(source_ip);

CREATE INDEX IF NOT EXISTS ix_security_events_risk_score
    ON security_events(risk_score);

CREATE INDEX IF NOT EXISTS ix_security_events_created_at
    ON security_events(created_at);

CREATE INDEX IF NOT EXISTS ix_response_actions_created_at
    ON response_actions(created_at);

CREATE INDEX IF NOT EXISTS ix_blocked_ips_ip_address
    ON blocked_ips(ip_address);

CREATE INDEX IF NOT EXISTS ix_blocked_ips_is_active
    ON blocked_ips(is_active);

CREATE INDEX IF NOT EXISTS ix_users_username
    ON users(username);

CREATE INDEX IF NOT EXISTS ix_users_email
    ON users(email);

COMMIT;