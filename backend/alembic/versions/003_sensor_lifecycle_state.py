"""Add persistent sensor lifecycle state for FANOS sensor control.

Revision ID: 003
Revises: 002
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "sensor_lifecycles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("asset_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("sensor_id", sa.String(128), nullable=False),
        sa.Column("desired_state", sa.String(32), nullable=False, server_default="STOPPED"),
        sa.Column("status", sa.String(32), nullable=False, server_default="OFFLINE"),
        sa.Column("suricata_status", sa.String(32), nullable=False, server_default="OFFLINE"),
        sa.Column("collector_status", sa.String(32), nullable=False, server_default="IDLE"),
        sa.Column("service_status", sa.String(32), nullable=False, server_default="OFFLINE"),
        sa.Column("last_heartbeat", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_seen", sa.DateTime(timezone=True), nullable=True),
        sa.Column("suricata_pid", sa.Integer, nullable=True),
        sa.Column("collector_pid", sa.Integer, nullable=True),
        sa.Column("restart_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("last_error", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["asset_id"], ["assets.id"], name="fk_sensor_lifecycles_asset_id"),
        sa.UniqueConstraint("asset_id", name="uq_sensor_lifecycles_asset_id"),
        sa.UniqueConstraint("sensor_id", name="uq_sensor_lifecycles_sensor_id"),
    )
    op.create_index("ix_sensor_lifecycles_asset_id", "sensor_lifecycles", ["asset_id"], unique=True)
    op.create_index("ix_sensor_lifecycles_sensor_id", "sensor_lifecycles", ["sensor_id"], unique=True)
    op.create_index("ix_sensor_lifecycles_desired_state", "sensor_lifecycles", ["desired_state"])
    op.create_index("ix_sensor_lifecycles_status", "sensor_lifecycles", ["status"])
    op.create_index("ix_sensor_lifecycles_created_at", "sensor_lifecycles", ["created_at"])
    op.create_index("ix_sensor_lifecycles_restart_count", "sensor_lifecycles", ["restart_count"])


def downgrade() -> None:
    op.drop_index("ix_sensor_lifecycles_restart_count", table_name="sensor_lifecycles")
    op.drop_index("ix_sensor_lifecycles_created_at", table_name="sensor_lifecycles")
    op.drop_index("ix_sensor_lifecycles_status", table_name="sensor_lifecycles")
    op.drop_index("ix_sensor_lifecycles_desired_state", table_name="sensor_lifecycles")
    op.drop_index("ix_sensor_lifecycles_sensor_id", table_name="sensor_lifecycles")
    op.drop_index("ix_sensor_lifecycles_asset_id", table_name="sensor_lifecycles")
    op.drop_table("sensor_lifecycles")
