#!/bin/bash
# Run this from a production checkout. Deployment uses the same isolated
# production Docker Compose stack that is defined at the repository root.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.prod.yml"

cd "${ROOT_DIR}"

if ! docker compose version >/dev/null 2>&1; then
  echo "docker compose is required"
  exit 1
fi

echo "Building production images..."
docker compose -f "${COMPOSE_FILE}" build

echo "Starting production stack..."
docker compose -f "${COMPOSE_FILE}" up -d

echo "Production stack status:"
docker compose -f "${COMPOSE_FILE}" ps

echo "Logs:"
echo "  docker compose -f ${COMPOSE_FILE} logs -f"
