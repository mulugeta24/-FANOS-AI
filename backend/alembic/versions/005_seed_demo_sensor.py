"""Provision the development sensor used by the Sensor Control page.

Revision ID: 005
Revises: 004
"""
from typing import Sequence, Union

from alembic import op


revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, None] = None


def upgrade() -> None:
    op.execute(
        """
        DO $$
        DECLARE
            organization_id uuid;
            asset_id uuid;
        BEGIN
            SELECT id INTO organization_id
            FROM organizations
            WHERE is_active = true
            ORDER BY created_at
            LIMIT 1;

            IF organization_id IS NULL THEN
                INSERT INTO organizations (name, slug)
                VALUES ('FANOS Demo Organization', 'fanos-demo')
                RETURNING id INTO organization_id;
            END IF;

            SELECT id INTO asset_id
            FROM assets
            WHERE sensor_id = 'demo-sensor-01'
            LIMIT 1;

            IF asset_id IS NULL THEN
                INSERT INTO assets (
                    organization_id, name, asset_type, ip_address,
                    hostname, description, environment, status,
                    monitoring_enabled, sensor_id
                )
                VALUES (
                    organization_id, 'Demo Sensor 01', 'SENSOR',
                    '127.0.0.1', 'demo-sensor-01',
                    'Development sensor for lifecycle control', 'LAB',
                    'ACTIVE', true, 'demo-sensor-01'
                )
                RETURNING id INTO asset_id;
            END IF;

            INSERT INTO sensor_lifecycles (asset_id, sensor_id)
            VALUES (asset_id, 'demo-sensor-01')
            ON CONFLICT (sensor_id) DO NOTHING;
        END $$;
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DELETE FROM sensor_lifecycles
        WHERE sensor_id = 'demo-sensor-01';
        DELETE FROM assets
        WHERE sensor_id = 'demo-sensor-01';
        """
    )