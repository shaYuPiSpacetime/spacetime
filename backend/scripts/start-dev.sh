#!/usr/bin/env bash
# ============================================================
# 开发环境启动脚本
# 自动加载 .env.local 中的环境变量，然后启动 Spring Boot
#
# 用法:
#   ./scripts/start-dev.sh              # 前台启动
#   ./scripts/start-dev.sh --background # 后台启动（日志输出到 target/dev.log）
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_DIR/.env.local"

# 前置检查：依赖工具是否可用
command -v mvn >/dev/null 2>&1 || { echo "❌ 需要 Maven，请先安装: brew install maven"; exit 1; }
command -v java >/dev/null 2>&1 || { echo "❌ 需要 Java 21+，请先安装: brew install openjdk@21"; exit 1; }

# 检查 .env.local 是否存在
if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌ 未找到 $ENV_FILE，请先创建该文件并填入开发环境变量"
  exit 1
fi

echo "📦 加载环境变量: $ENV_FILE"
# 逐行导出环境变量（跳过空行和注释行）
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

cd "$PROJECT_DIR"

BACKGROUND=false
if [[ "${1:-}" == "--background" ]]; then
  BACKGROUND=true
fi

if $BACKGROUND; then
  echo "🚀 后台启动 Spring Boot (dev profile)..."
  mvn spring-boot:run -Dspring-boot.run.profiles=dev > target/dev.log 2>&1 &
  PID=$!
  echo "✅ 进程 PID: $PID，日志文件: target/dev.log"
  echo "   查看日志: tail -f target/dev.log"
else
  echo "🚀 启动 Spring Boot (dev profile)..."
  mvn spring-boot:run -Dspring-boot.run.profiles=dev
fi
