#!/usr/bin/env bash
# log-agent-activity.sh
# Hook: PostToolUse (matcher: Task*)
# Logs agent/subagent activity to the scratchpad for audit trail and
# context recovery across session restarts.

set -euo pipefail

CLAUDE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SCRATCHPAD="$CLAUDE_DIR/memory/scratchpad.md"
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")

# Read stdin for hook context
INPUT=$(cat)

# Extract tool name and input summary
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // "unknown"')
TOOL_INPUT=$(echo "$INPUT" | jq -r '.tool_input // {} | tostring | .[0:120]')

{
  echo "- ${TIMESTAMP} | ${TOOL_NAME} | ${TOOL_INPUT}..."
} >> "$SCRATCHPAD"

# Exit silently — logging is best-effort
exit 0
