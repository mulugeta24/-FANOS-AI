"""Add sensor command and audit log records for backend lifecycle control.

Revision ID: 004
Revises: 003
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "sensor_commands",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("sensor_id", sa.String(128), nullable=False),
        sa.Column("command", sa.String(32), nullable=False),
        sa.Column("requested_by", sa.String(128), nullable=False),
        sa.Column("status", sa.String(32), nullable=False, server_default="PENDING"),
        sa.Column("result", sa.String(256), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_sensor_commands_sensor_id", "sensor_commands", ["sensor_id"])
    op.create_index("ix_sensor_commands_command", "sensor_commands", ["command"])
    op.create_index("ix_sensor_commands_requested_by", "sensor_commands", ["requested_by"])
    op.create_index("ix_sensor_commands_status", "sensor_commands", ["status"])
    op.create_index("ix_sensor_commands_created_at", "sensor_commands", ["created_at"])

    op.create_table(
        "sensor_audit_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("sensor_id", sa.String(128), nullable=False),
        sa.Column("admin_user", sa.String(128), nullable=False),
        sa.Column("action", sa.String(64), nullable=False),
        sa.Column("previous_desired_state", sa.String(32), nullable=True),
        sa.Column("new_desired_state", sa.String(32), nullable=True),
        sa.Column("result", sa.String(32), nullable=False, server_default="ACCEPTED"),
        sa.Column("details", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_sensor_audit_logs_sensor_id", "sensor_audit_logs", ["sensor_id"])
    op.create_index("ix_sensor_audit_logs_admin_user", "sensor_audit_logs", ["admin_user"])
    op.create_index("ix_sensor_audit_logs_action", "sensor_audit_logs", ["action"])
    op.create_index("ix_sensor_audit_logs_result", "sensor_audit_logs", ["result"])
    op.create_index("ix_sensor_audit_logs_created_at", "sensor_audit_logs", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_sensor_audit_logs_created_at", table_name="sensor_audit_logs")
    op.drop_index("ix_sensor_audit_logs_result", table_name="sensor_audit_logs")
    op.drop_index("ix_sensor_audit_logs_action", table_name="sensor_audit_logs")
    op.drop_index("ix_sensor_audit_logs_admin_user", table_name="sensor_audit_logs")
    op.drop_index("ix_sensor_audit_logs_sensor_id", table_name="sensor_audit_logs")
    op.drop_table("sensor_audit_logs")

    op.drop_index("ix_sensor_commands_created_at", table_name="sensor_commands")
    op.drop_index("ix_sensor_commands_status", table_name="sensor_commands")
    op.drop_index("ix_sensor_commands_requested_by", table_name="sensor_commands")
    op.drop_index("ix_sensor_commands_command", table_name="sensor_commands")
    op.drop_index("ix_sensor_commands_sensor_id", table_name="sensor_commands")
    op.drop_table("sensor_commands")
