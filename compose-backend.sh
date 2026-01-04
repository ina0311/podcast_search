#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.yml"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker command not found. Please install Docker first." >&2
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "docker compose CLI is not available. Please update Docker." >&2
  exit 1
fi

if [ $# -eq 0 ]; then
  set -- up -d
fi

exec docker compose -f "${COMPOSE_FILE}" --profile backend "$@"

