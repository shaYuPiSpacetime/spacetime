#!/usr/bin/env bash
# on-session-start.sh
# Hook: SessionStart
# Fires when a session starts or resumes.
# Loads project context, checks environment, initialises state.

set -euo pipefail

CLAUDE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SCRATCHPAD="$CLAUDE_DIR/memory/scratchpad.md"
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")

# Log session start
{
  echo ""
  echo "--- Session resumed at ${TIMESTAMP} ---"
} >> "$SCRATCHPAD"

# Emit a structured message for Claude's context
cat <<-EOM
{
  "hook": "SessionStart",
  "timestamp": "${TIMESTAMP}",
  "project": "$(basename "$(git rev-parse --show-toplevel 2>/dev/null || echo 'unknown')")",
  "active_plan": "$CLAUDE_DIR/plans/active-plan.md"
}
EOM
