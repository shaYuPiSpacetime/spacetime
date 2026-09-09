#!/usr/bin/env bash
# E2E-01..09: real HTTP submission -> WeChat/local moderation -> persisted admin evidence.
# Retains the user-requested business records. Pass --resume only after inspecting the existing report.
set -euo pipefail
repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
: "${SENSITIVE_WORD_ADMIN_USERNAME:?Provide the authorized administrator account}"
: "${SENSITIVE_WORD_ADMIN_PASSWORD:?Provide the administrator password in process environment}"
: "${SENSITIVE_WORD_MINIAPP_PHONE:?Provide the documented development test phone}"
: "${SENSITIVE_WORD_MINIAPP_SMS_CODE:?Provide the valid configured development verification code}"
: "${SENSITIVE_WORD_MINIAPP_USER_ID:?Provide the confirmed development test user ID}"
export SENSITIVE_WORD_ADMIN_USERNAME SENSITIVE_WORD_ADMIN_PASSWORD SENSITIVE_WORD_MINIAPP_PHONE SENSITIVE_WORD_MINIAPP_SMS_CODE SENSITIVE_WORD_MINIAPP_USER_ID
python -X utf8 "$repo_root/scripts/test_sensitive_word_business_real.py" "$@"
