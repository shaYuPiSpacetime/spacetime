#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if [[ ! -f backend/.env.local ]]; then
  echo "Missing env file: backend/.env.local" >&2
  exit 1
fi

export $(grep -v '^#' backend/.env.local | xargs)
cd backend
mvn spring-boot:run -Dspring-boot.run.profiles=dev -Denforcer.skip=true
