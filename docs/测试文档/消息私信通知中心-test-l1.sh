#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${PRD03_BASE_URL:-http://127.0.0.1:8080}"
TOKEN="${PRD03_AUTH_TOKEN:-}"

if [[ -z "$TOKEN" ]]; then
  echo "SKIP: PRD03_AUTH_TOKEN is required; no token is invented by this script."
  exit 0
fi

request() {
  local path="$1"
  echo "GET ${path}"
  curl --fail-with-body --silent --show-error \
    -H "X-Auth-Token: ${TOKEN}" \
    "${BASE_URL}${path}"
  echo
}

request "/miniapp/message/home"
request "/miniapp/message/unread-summary"
request "/miniapp/message/conversations?size=20"
request "/miniapp/message/whispers?direction=received&size=20"
request "/miniapp/message/whispers?direction=sent&size=20"
request "/miniapp/message/assistant/messages?size=20"
request "/miniapp/message/system-messages?size=20"
request "/miniapp/im/credentials"

echo "PASS: PRD-03 read-only L1 smoke requests completed."
