"""Initial FANOS AI schema

Revision ID: 001
Revises:
Create Date: 2026-09-07 00:00:00.000000
"""
from typing import Sequence, Union
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from alembic import op

revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'users',
        sa.Column('id',         postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('username',   sa.String(64),  nullable=False, unique=True),
        sa.Column('email',      sa.String(256), nullable=False, unique=True),
        sa.Column('full_name',  sa.String(128), nullable=False),
        sa.Column('hashed_pwd', sa.String(256), nullable=False),
        sa.Column('role',       sa.String(32),  nullable=False, server_default='analyst'),
        sa.Column('is_active',  sa.Boolean,     nullable=False, server_default='true'),
        sa.Column('mfa_enabled',sa.Boolean,     nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('last_login', sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        'incidents',
        sa.Column('id',          postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('title',       sa.String(256), nullable=False),
        sa.Column('threat',      sa.String(128), nullable=False),
        sa.Column('severity',    sa.String(16),  nullable=False),
        sa.Column('source_ip',   sa.String(64),  nullable=False),
        sa.Column('status',      sa.String(32),  nullable=False, server_default='Open'),
        sa.Column('risk_score',  sa.Integer,     nullable=False),
        sa.Column('assigned_to', sa.String(128), nullable=True),
        sa.Column('description', sa.Text,        nullable=True),
        sa.Column('created_at',  sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('ix_incidents_severity',   'incidents', ['severity'])
    op.create_index('ix_incidents_status',     'incidents', ['status'])
    op.create_index('ix_incidents_created_at', 'incidents', ['created_at'])

    op.create_table(
        'security_events',
        sa.Column('id',            postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('severity',      sa.String(16),  nullable=False),
        sa.Column('attack_type',   sa.String(128), nullable=False),
        sa.Column('source_ip',     sa.String(64),  nullable=False),
        sa.Column('target',        sa.String(256), nullable=False),
        sa.Column('ai_confidence', sa.Float,       nullable=False),
        sa.Column('risk_score',    sa.Integer,     nullable=False),
        sa.Column('status',        sa.String(32),  nullable=False, server_default='ALERT'),
        sa.Column('raw_payload',   sa.Text,        nullable=True),
        sa.Column('sensor_source', sa.String(64),  nullable=True),
        sa.Column('created_at',    sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('incident_id',   postgresql.UUID(as_uuid=True), sa.ForeignKey('incidents.id'), nullable=True),
    )
    op.create_index('ix_security_events_severity',   'security_events', ['severity'])
    op.create_index('ix_security_events_source_ip',  'security_events', ['source_ip'])
    op.create_index('ix_security_events_risk_score', 'security_events', ['risk_score'])
    op.create_index('ix_security_events_created_at', 'security_events', ['created_at'])

    op.create_table(
        'response_actions',
        sa.Column('id',          postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('action',      sa.String(64),  nullable=False),
        sa.Column('target',      sa.String(256), nullable=False),
        sa.Column('reason',      sa.String(256), nullable=False),
        sa.Column('automated',   sa.Boolean,     nullable=False, server_default='true'),
        sa.Column('created_at',  sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('incident_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('incidents.id'), nullable=True),
    )

    op.create_table(
        'blocked_ips',
        sa.Column('id',         postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('ip_address', sa.String(64),  nullable=False, unique=True),
        sa.Column('reason',     sa.String(256), nullable=False),
        sa.Column('blocked_by', sa.String(64),  nullable=False, server_default='FANOS AI'),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('is_active',  sa.Boolean,     nullable=False, server_default='true'),
    )
    op.create_index('ix_blocked_ips_ip_address', 'blocked_ips', ['ip_address'])
    op.create_index('ix_blocked_ips_is_active',  'blocked_ips', ['is_active'])


def downgrade() -> None:
    op.drop_table('blocked_ips')
    op.drop_table('response_actions')
    op.drop_table('security_events')
    op.drop_table('incidents')
    op.drop_table('users')
