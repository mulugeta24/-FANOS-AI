"""Add organization-owned monitored assets and event ownership.

Revision ID: 002
Revises: 001
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "organizations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.String(128), nullable=False),
        sa.Column("slug", sa.String(128), nullable=False, unique=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_organizations_slug", "organizations", ["slug"], unique=True)
    op.create_index("ix_organizations_created_at", "organizations", ["created_at"])

    op.create_table(
        "assets",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("name", sa.String(256), nullable=False),
        sa.Column("asset_type", sa.String(32), nullable=False, server_default="OTHER"),
        sa.Column("ip_address", sa.String(64), nullable=False),
        sa.Column("hostname", sa.String(256), nullable=True),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("environment", sa.String(32), nullable=False, server_default="LAB"),
        sa.Column("status", sa.String(32), nullable=False, server_default="PENDING"),
        sa.Column("monitoring_enabled", sa.Boolean, nullable=False, server_default=sa.text("false")),
        sa.Column("sensor_id", sa.String(128), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.UniqueConstraint("organization_id", "ip_address", name="uq_assets_organization_ip"),
    )
    op.create_index("ix_assets_organization_id", "assets", ["organization_id"])
    op.create_index("ix_assets_ip_address", "assets", ["ip_address"])
    op.create_index("ix_assets_status", "assets", ["status"])
    op.create_index("ix_assets_monitoring_enabled", "assets", ["monitoring_enabled"])
    op.create_index("ix_assets_created_at", "assets", ["created_at"])

    op.add_column("security_events", sa.Column("asset_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("security_events", sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("security_events", sa.Column("signature", sa.String(256), nullable=True))
    op.add_column("security_events", sa.Column("category", sa.String(128), nullable=True))
    op.add_column("security_events", sa.Column("destination_ip", sa.String(64), nullable=True))
    op.add_column("security_events", sa.Column("destination_port", sa.Integer, nullable=True))
    op.add_column("security_events", sa.Column("protocol", sa.String(32), nullable=True))
    op.add_column("security_events", sa.Column("sensor_id", sa.String(128), nullable=True))
    op.create_foreign_key("fk_security_events_asset_id", "security_events", "assets", ["asset_id"], ["id"])
    op.create_foreign_key("fk_security_events_organization_id", "security_events", "organizations", ["organization_id"], ["id"])
    op.create_index("ix_security_events_asset_id", "security_events", ["asset_id"])
    op.create_index("ix_security_events_organization_id", "security_events", ["organization_id"])


def downgrade() -> None:
    op.drop_index("ix_security_events_organization_id", table_name="security_events")
    op.drop_index("ix_security_events_asset_id", table_name="security_events")
    op.drop_constraint("fk_security_events_organization_id", "security_events", type_="foreignkey")
    op.drop_constraint("fk_security_events_asset_id", "security_events", type_="foreignkey")
    op.drop_column("security_events", "organization_id")
    op.drop_column("security_events", "asset_id")
    op.drop_column("security_events", "sensor_id")
    op.drop_column("security_events", "protocol")
    op.drop_column("security_events", "destination_port")
    op.drop_column("security_events", "destination_ip")
    op.drop_column("security_events", "category")
    op.drop_column("security_events", "signature")
    op.drop_index("ix_assets_created_at", table_name="assets")
    op.drop_index("ix_assets_monitoring_enabled", table_name="assets")
    op.drop_index("ix_assets_status", table_name="assets")
    op.drop_index("ix_assets_ip_address", table_name="assets")
    op.drop_index("ix_assets_organization_id", table_name="assets")
    op.drop_table("assets")
    op.drop_index("ix_organizations_created_at", table_name="organizations")
    op.drop_index("ix_organizations_slug", table_name="organizations")
    op.drop_table("organizations")
