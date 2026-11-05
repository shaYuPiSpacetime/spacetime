#!/usr/bin/env bash
set -euo pipefail
umask 077

PROJECT_DIR="${SPACETIME_PROJECT_DIR:-/mnt/data/spacetime-prod}"
PROD_ENV_FILE="${SPACETIME_PROD_ENV_FILE:-${PROJECT_DIR}/secrets/prod.env}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
fail() { printf 'MySQL 备份失败：%s\n' "$*" >&2; exit 1; }
. "$PROD_ENV_FILE"
. "$SCRIPT_DIR/local-mysql.sh"
mysql_local_enabled || fail "当前不是本机 MySQL 配置"
mysql_local_validate

backup_dir="${PROJECT_DIR}/backups/mysql-daily"
mkdir -p "$backup_dir"
chmod 700 "$backup_dir"
exec 9>"${backup_dir}/.lock"
flock -n 9 || fail "已有数据库备份运行"
name="${DB_NAME}-$(date +%Y%m%d-%H%M%S).sql.gz"
temporary="${backup_dir}/.${name}.partial"
trap 'rm -f "$temporary"' EXIT
docker exec spacetime-mysql-prod mysqldump --defaults-extra-file=/run/mysql-secrets/root.cnf \
  --single-transaction --source-data=2 --quick --routines --events --triggers --hex-blob \
  --set-gtid-purged=OFF --no-tablespaces --column-statistics=0 \
  --default-character-set=utf8mb4 "$DB_NAME" | gzip -1 > "$temporary"
gzip -t "$temporary"
mv "$temporary" "${backup_dir}/${name}"
(cd "$backup_dir" && sha256sum "$name" > "${name}.sha256")

# 使用限定来源 IP 和固定 scp 接收命令的专用 SSH 密钥，不能执行远程 Shell。
[ -n "${MYSQL_BACKUP_REMOTE:-}" ] || fail "未配置异机备份目标"
[ -s "${PROJECT_DIR}/secrets/mysql-backup/id_ed25519" ] || fail "缺少专用备份密钥"
# 旧版 OpenSSH 默认使用 SCP 且没有 -O；新版显式选择与受限接收命令一致的协议。
scp_flags=()
case "$(LC_ALL=C scp -O 2>&1 || true)" in *'unknown option'*) ;; *) scp_flags=(-O) ;; esac
scp "${scp_flags[@]}" -p -i "${PROJECT_DIR}/secrets/mysql-backup/id_ed25519" \
  -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes \
  -o "UserKnownHostsFile=${PROJECT_DIR}/secrets/mysql-backup/known_hosts" \
  "${backup_dir}/${name}" "${backup_dir}/${name}.sha256" "$MYSQL_BACKUP_REMOTE"
# 异机副本完成后才清理本机 14 天以前的备份；远端独立执行 30 天保留策略。
find "$backup_dir" -maxdepth 1 -type f \( -name '*.sql.gz' -o -name '*.sql.gz.sha256' \) -mtime +14 -delete
printf 'MySQL 一致性备份及异机复制完成：%s\n' "$name"
