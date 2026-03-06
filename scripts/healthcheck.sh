#!/usr/bin/env bash
# =============================================================================
# healthcheck.sh — Check all Acumen Playbook services
# Outputs a JSON health report to stdout.
# Exit codes: 0 = all healthy, 1 = any service degraded/unhealthy
# =============================================================================
set -euo pipefail

COMPOSE_PROJECT="${COMPOSE_PROJECT:-acumen-playbook}"
TIMESTAMP=$(date -u -Iseconds)

check_http() {
  local name="$1"
  local url="$2"
  local status
  local message=""
  if curl -sf --max-time 5 "${url}" > /dev/null 2>&1; then
    status="ok"
  else
    status="error"
    message="HTTP check failed for ${url}"
  fi
  echo "\"${name}\": {\"status\": \"${status}\"$([ -n "${message}" ] && echo ", \"message\": \"${message}\"" || echo "")}"
}

check_postgres() {
  local name="$1"
  local container="${COMPOSE_PROJECT}-postgres-1"
  local status
  local message=""
  if docker exec "${container}" pg_isready -U postgres > /dev/null 2>&1; then
    status="ok"
  else
    status="error"
    message="pg_isready failed"
  fi
  echo "\"${name}\": {\"status\": \"${status}\"$([ -n "${message}" ] && echo ", \"message\": \"${message}\"" || echo "")}"
}

check_redis() {
  local name="$1"
  local container="${COMPOSE_PROJECT}-redis-1"
  local status
  local message=""
  if docker exec "${container}" redis-cli ping > /dev/null 2>&1; then
    status="ok"
  else
    status="error"
    message="redis-cli ping failed"
  fi
  echo "\"${name}\": {\"status\": \"${status}\"$([ -n "${message}" ] && echo ", \"message\": \"${message}\"" || echo "")}"
}

check_rabbitmq() {
  local name="$1"
  local container="${COMPOSE_PROJECT}-rabbitmq-1"
  local status
  local message=""
  if docker exec "${container}" rabbitmq-diagnostics -q ping > /dev/null 2>&1; then
    status="ok"
  else
    status="error"
    message="rabbitmq-diagnostics ping failed"
  fi
  echo "\"${name}\": {\"status\": \"${status}\"$([ -n "${message}" ] && echo ", \"message\": \"${message}\"" || echo "")}"
}

STRAPI=$(check_http "strapi" "http://localhost:88/strapi/_health" 2>&1 || echo '"strapi": {"status": "error", "message": "check failed"}')
WIKIJS=$(check_http "wikijs" "http://localhost:88/healthz" 2>&1 || echo '"wikijs": {"status": "error", "message": "check failed"}')
SYNC=$(check_http "sync-service" "http://localhost:88/api/sync/health" 2>&1 || echo '"sync-service": {"status": "error", "message": "check failed"}')
POSTGRES=$(check_postgres "postgres" 2>&1 || echo '"postgres": {"status": "error", "message": "check failed"}')
REDIS=$(check_redis "redis" 2>&1 || echo '"redis": {"status": "error", "message": "check failed"}')
RABBITMQ=$(check_rabbitmq "rabbitmq" 2>&1 || echo '"rabbitmq": {"status": "error", "message": "check failed"}')

# Determine overall status
ERROR_COUNT=0
for check in "${STRAPI}" "${WIKIJS}" "${SYNC}" "${POSTGRES}" "${REDIS}" "${RABBITMQ}"; do
  if echo "${check}" | grep -q '"status": "error"'; then
    ERROR_COUNT=$((ERROR_COUNT + 1))
  fi
done

if [ "${ERROR_COUNT}" -eq 0 ]; then
  OVERALL="healthy"
elif [ "${ERROR_COUNT}" -lt 4 ]; then
  OVERALL="degraded"
else
  OVERALL="unhealthy"
fi

cat <<EOF
{
  "status": "${OVERALL}",
  "timestamp": "${TIMESTAMP}",
  "checks": {
    ${STRAPI},
    ${WIKIJS},
    ${SYNC},
    ${POSTGRES},
    ${REDIS},
    ${RABBITMQ}
  }
}
EOF

if [ "${OVERALL}" != "healthy" ]; then
  exit 1
fi

exit 0
