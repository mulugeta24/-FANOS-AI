#!/bin/sh
set -eu

echo "Applying PostgreSQL migrations..."
alembic upgrade head

exec "$@"