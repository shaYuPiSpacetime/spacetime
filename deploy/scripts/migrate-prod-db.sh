#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${SPACETIME_PROJECT_DIR:-/mnt/data/spacetime-prod}"
PROD_ENV_FILE="${SPACETIME_PROD_ENV_FILE:-${PROJECT_DIR}/secrets/prod.env}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

log() {
  printf '[spacetime-prod-db] %s\n' "$*"
}

fail() {
  printf '[spacetime-prod-db] ERROR: %s\n' "$*" >&2
  exit 1
}

require_file() {
  local file="$1"
  [ -s "$file" ] || fail "缺少文件：$file"
}

load_env() {
  require_file "$PROD_ENV_FILE"
  set -a
  # shellcheck disable=SC1090
  . "$PROD_ENV_FILE"
  set +a

  for key in DB_HOST DB_PORT DB_NAME DB_USER DB_PASSWORD; do
    [ -n "${!key:-}" ] || fail "prod.env 缺少 ${key}"
  done
}

mysql_client() {
  if command -v mysql >/dev/null 2>&1; then
    printf 'mysql'
    return
  fi
  if command -v mariadb >/dev/null 2>&1; then
    printf 'mariadb'
    return
  fi
  fail "缺少 mysql 或 mariadb 客户端，请先安装 mysql 客户端"
}

quote_identifier() {
  local value="${1//\`/\`\`}"
  printf '`%s`' "$value"
}

ensure_database() {
  local client="$1"
  local quoted_db
  quoted_db="$(quote_identifier "$DB_NAME")"
  log "确保生产数据库存在"
  MYSQL_PWD="$DB_PASSWORD" "$client" \
    -h"$DB_HOST" \
    -P"${DB_PORT:-3306}" \
    -u"$DB_USER" \
    --default-character-set=utf8mb4 \
    -e "CREATE DATABASE IF NOT EXISTS ${quoted_db} DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
}

run_migrations() {
  local sql_files=()
  local sql_file

  if [ "$#" -gt 0 ]; then
    for sql_file in "$@"; do
      if [[ "$sql_file" != /* ]]; then
        sql_file="${ROOT_DIR}/${sql_file}"
      fi
      case "$sql_file" in
        "${ROOT_DIR}"/deploy/sql/prod/*.sql)
          ;;
        *)
          fail "Only production migrations under deploy/sql/prod are allowed: ${sql_file}"
          ;;
      esac
      require_file "$sql_file"
      sql_files+=("$sql_file")
    done
  else
    shopt -s nullglob
    sql_files=("$ROOT_DIR"/deploy/sql/prod/*.sql)
  fi
  [ "${#sql_files[@]}" -gt 0 ] || fail "未发现生产 SQL：$ROOT_DIR/deploy/sql/prod/*.sql"

  local client
  client="$(mysql_client)"
  log "使用 ${client} 直连生产数据库执行迁移"
  ensure_database "$client"

  for sql_file in "${sql_files[@]}"; do
    log "执行 $(basename "$sql_file")"
    MYSQL_PWD="$DB_PASSWORD" "$client" \
      -h"$DB_HOST" \
      -P"${DB_PORT:-3306}" \
      -u"$DB_USER" \
      --default-character-set=utf8mb4 \
      "$DB_NAME" < "$sql_file"
  done
}

main() {
  cd "$ROOT_DIR"
  load_env
  run_migrations "$@"
  log "数据库迁移完成"
}

main "$@"
