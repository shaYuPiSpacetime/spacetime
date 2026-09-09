#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
python -X utf8 scripts/test_sensitive_word_live.py "$@"
