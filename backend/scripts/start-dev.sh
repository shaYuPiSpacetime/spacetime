#!/usr/bin/env bash
# ============================================================
# 开发环境启动脚本
# 配置全部在 application-dev.yml 中，无需额外环境变量
#
# 用法:
#   ./scripts/start-dev.sh              # 前台启动
#   ./scripts/start-dev.sh --background # 后台启动（日志输出到 target/dev.log）
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# 前置检查
command -v mvn >/dev/null 2>&1 || { echo "❌ 需要 Maven，请先安装: brew install maven"; exit 1; }
command -v java >/dev/null 2>&1 || { echo "❌ 需要 Java 21+，请先安装: brew install openjdk@21"; exit 1; }

# 检查 application-dev.yml 是否存在
DEV_YML="$PROJECT_DIR/src/main/resources/application-dev.yml"
if [[ ! -f "$DEV_YML" ]]; then
  echo "❌ 未找到 $DEV_YML"
  echo "   请从模板创建: cp src/main/resources/application-dev.yml.example src/main/resources/application-dev.yml"
  echo "   然后填入真实的数据库/Redis/OSS/微信配置"
  exit 1
fi

cd "$PROJECT_DIR"

if [[ "${1:-}" == "--background" ]]; then
  echo "🚀 后台启动 Spring Boot (dev profile)..."
  mvn spring-boot:run -Dspring-boot.run.profiles=dev > target/dev.log 2>&1 &
  PID=$!
  echo "✅ 进程 PID: $PID，日志文件: target/dev.log"
  echo "   查看日志: tail -f target/dev.log"
else
  echo "🚀 启动 Spring Boot (dev profile)..."
  mvn spring-boot:run -Dspring-boot.run.profiles=dev
fi
