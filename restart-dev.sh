#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
MINIAPP_DIR="$ROOT_DIR/miniapp"
RUNTIME_DIR="$ROOT_DIR/.runtime"
LOG_DIR="$RUNTIME_DIR/logs"
BACKEND_LOG="$LOG_DIR/backend.log"
FRONTEND_LOG="$LOG_DIR/frontend.log"
MINIAPP_LOG="$LOG_DIR/miniapp.log"
BACKEND_PID_FILE="$RUNTIME_DIR/backend.pid"
FRONTEND_PID_FILE="$RUNTIME_DIR/frontend.pid"
MINIAPP_PID_FILE="$RUNTIME_DIR/miniapp.pid"

BACKEND_PORT="${BACKEND_PORT:-8080}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
# miniapp target: dev:weapp (微信小程序) | dev:h5 (H5) | dev:swan | dev:alipay | dev:tt
MINIAPP_TARGET="${MINIAPP_TARGET:-dev:weapp}"
DEFAULT_JAVA_HOME="/Users/peter/Library/Java/JavaVirtualMachines/openjdk-22/Contents/Home"
JAVA_HOME="${JAVA_HOME:-$DEFAULT_JAVA_HOME}"

mkdir -p "$LOG_DIR"

require_command() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Missing required command: $cmd"
    exit 1
  fi
}

kill_pid_file() {
  local pid_file="$1"
  if [[ -f "$pid_file" ]]; then
    local pid
    pid="$(cat "$pid_file")"
    if [[ -n "$pid" ]] && kill -0 "$pid" >/dev/null 2>&1; then
      echo "Stopping recorded process: $pid"
      kill "$pid" >/dev/null 2>&1 || true
      sleep 1
      if kill -0 "$pid" >/dev/null 2>&1; then
        kill -9 "$pid" >/dev/null 2>&1 || true
      fi
    fi
    rm -f "$pid_file"
  fi
}

kill_port() {
  local port="$1"
  local pids
  pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "$pids" ]]; then
    echo "Stopping port $port listeners: $pids"
    kill $pids >/dev/null 2>&1 || true
    sleep 2
    pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
    if [[ -n "$pids" ]]; then
      echo "Force stopping port $port listeners: $pids"
      kill -9 $pids >/dev/null 2>&1 || true
    fi
  fi
}

wait_for_port() {
  local port="$1"
  local name="$2"
  local log_file="$3"
  local retries=60

  for ((i = 1; i <= retries; i++)); do
    if lsof -tiTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
      echo "$name started on port $port"
      return 0
    fi
    sleep 1
  done

  echo "$name failed to start. Recent logs:"
  tail -n 50 "$log_file" || true
  return 1
}

require_command lsof
require_command mvn
require_command npm

if [[ ! -x "$JAVA_HOME/bin/java" ]]; then
  echo "JAVA_HOME is invalid: $JAVA_HOME"
  exit 1
fi

echo "Cleaning previous dev processes..."
kill_pid_file "$BACKEND_PID_FILE"
kill_pid_file "$FRONTEND_PID_FILE"
kill_pid_file "$MINIAPP_PID_FILE"
kill_port "$BACKEND_PORT"
kill_port "$FRONTEND_PORT"

: > "$BACKEND_LOG"
: > "$FRONTEND_LOG"
: > "$MINIAPP_LOG"

echo "Starting backend with JAVA_HOME=$JAVA_HOME"
(
  cd "$BACKEND_DIR"
  export JAVA_HOME
  export PATH="$JAVA_HOME/bin:$PATH"
  nohup mvn spring-boot:run > "$BACKEND_LOG" 2>&1 &
  echo $! > "$BACKEND_PID_FILE"
)

wait_for_port "$BACKEND_PORT" "Backend" "$BACKEND_LOG"

echo "Starting frontend"
(
  cd "$FRONTEND_DIR"
  nohup npm run dev -- --host 0.0.0.0 > "$FRONTEND_LOG" 2>&1 &
  echo $! > "$FRONTEND_PID_FILE"
)

wait_for_port "$FRONTEND_PORT" "Frontend" "$FRONTEND_LOG"

echo "Starting miniapp ($MINIAPP_TARGET)"
(
  cd "$MINIAPP_DIR"
  nohup npm run "$MINIAPP_TARGET" > "$MINIAPP_LOG" 2>&1 &
  echo $! > "$MINIAPP_PID_FILE"
)

# miniapp is a Taro compile+watch process, no port to wait for.
# Wait briefly for the first compile to complete.
sleep 3
if kill -0 "$(cat "$MINIAPP_PID_FILE")" >/dev/null 2>&1; then
  echo "Miniapp compiler started (watch mode). See $MINIAPP_LOG"
else
  echo "Miniapp failed to start. Recent logs:"
  tail -n 50 "$MINIAPP_LOG" || true
fi

echo
echo "Dev services are ready:"
echo "Backend : http://127.0.0.1:$BACKEND_PORT"
echo "Frontend: http://127.0.0.1:$FRONTEND_PORT"
echo "Miniapp : npm run $MINIAPP_TARGET (watch mode, compiled to miniapp/dist/)"
echo "          → 微信开发者工具 → 导入项目 → 选择 miniapp/dist/ 目录"
echo "          → 或用 MINIAPP_TARGET=dev:h5 切换 H5 编译"
echo "Logs    :"
echo "  $BACKEND_LOG"
echo "  $FRONTEND_LOG"
echo "  $MINIAPP_LOG"
