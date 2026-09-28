#!/bin/bash
#
# FANOS WAF Collector Service Startup Script
#

set -e

BACKEND_URL="${BACKEND_URL:-http://backend:8000}"
WAF_CONTAINER="${WAF_CONTAINER:-fanos-waf}"
LOG_LEVEL="${LOG_LEVEL:-INFO}"

echo "=========================================="
echo "FANOS WAF Log Collector Service"
echo "=========================================="
echo "Backend URL:    ${BACKEND_URL}"
echo "WAF Container:  ${WAF_CONTAINER}"
echo "Log Level:      ${LOG_LEVEL}"
echo "=========================================="

# Wait for backend to be ready
echo "Waiting for FANOS backend..."
max_wait=60
elapsed=0
while ! curl -sf "${BACKEND_URL}/health" > /dev/null 2>&1; do
    if [ $elapsed -ge $max_wait ]; then
        echo "WARNING: Backend not responding after ${max_wait}s - starting anyway"
        break
    fi
    echo "Backend not ready yet... (${elapsed}s/${max_wait}s)"
    sleep 5
    elapsed=$((elapsed + 5))
done

echo "Backend is ready!"

# Start the collector
echo "Starting WAF log collector..."
exec python collector_service.py \
    --backend "${BACKEND_URL}" \
    --container "${WAF_CONTAINER}" \
    ${LOG_LEVEL:+--verbose}
