#!/usr/bin/env bash
# 由部署、迁移与备份脚本共用；生产初始化及数据恢复必须另行完成并验收。

mysql_local_enabled() {
  [ "${MYSQL_LOCAL_ENABLED:-false}" = true ]
}

mysql_local_validate() {
  [ "${SPACETIME_DEPLOY_ENV:-prod}" = prod ] || fail "测试环境不得启用生产本机 MySQL"
  [ "$DB_NAME" = shikongxiehou_prod ] && [ "$DB_HOST" = mysql ] && [ "$DB_PORT" = 3306 ] \
    || fail "本机 MySQL 仅允许 Docker mysql:3306 的生产库"
  if [ -n "${SPRING_DATASOURCE_URL:-}" ]; then
    [[ "$SPRING_DATASOURCE_URL" == jdbc:mysql://mysql:3306/shikongxiehou_prod\?* ]] \
      || fail "JDBC 显式连接地址不能覆盖为旧 RDS 或其他数据库"
  fi
  [[ "${MYSQL_IMAGE:-}" =~ @sha256:[a-f0-9]{64}$ ]] || fail "MySQL 必须使用固定摘要镜像"
  for file in mysql/data/auto.cnf mysql/production-ready secrets/mysql/server.cnf \
      secrets/mysql/root.cnf secrets/mysql/app.cnf; do
    [ -s "${PROJECT_DIR}/${file}" ] || fail "MySQL 数据或配置缺失，禁止初始化空生产库：${file}"
  done
}

mysql_local_app() {
  # 命令行 SQL 不连接标准输入，避免在 SSH 脚本中吞掉后续发布命令。
  local read_stdin=true argument
  for argument in "$@"; do
    case "$argument" in -e|--execute|--execute=*) read_stdin=false; break ;; esac
  done
  if [ "$read_stdin" = true ]; then
    docker exec -i spacetime-mysql-prod mysql --defaults-extra-file=/run/mysql-secrets/app.cnf \
      --connect-timeout=10 --default-character-set=utf8mb4 "$@"
  else
    docker exec spacetime-mysql-prod mysql --defaults-extra-file=/run/mysql-secrets/app.cnf \
      --connect-timeout=10 --default-character-set=utf8mb4 "$@"
  fi
}

ensure_mysql() {
  mysql_local_enabled || return 0
  mysql_local_validate
  local container=spacetime-mysql-prod
  if ! docker inspect "$container" >/dev/null 2>&1; then
    # 只重建容器壳，必须已经存在验收通过的数据目录，不能由发布流程创建空库。
    docker image inspect "$MYSQL_IMAGE" >/dev/null 2>&1 || docker pull "$MYSQL_IMAGE"
    docker run -d --name "$container" --restart unless-stopped \
      --network spacetime-prod --network-alias mysql --memory 4g \
      -v "${PROJECT_DIR}/mysql/data:/var/lib/mysql" \
      -v "${PROJECT_DIR}/secrets/mysql/server.cnf:/etc/mysql/conf.d/spacetime.cnf:ro" \
      -v "${PROJECT_DIR}/secrets/mysql:/run/mysql-secrets:ro" \
      -e TZ=Asia/Shanghai "$MYSQL_IMAGE" >/dev/null
  else
    local mounted_data
    mounted_data="$(docker inspect -f '{{range .Mounts}}{{if eq .Destination "/var/lib/mysql"}}{{.Source}}{{end}}{{end}}' "$container")"
    [ "$mounted_data" = "${PROJECT_DIR}/mysql/data" ] || fail "MySQL 数据目录与生产配置不一致"
    [ -z "$(docker port "$container")" ] || fail "MySQL 不允许映射宿主端口"
    docker start "$container" >/dev/null
  fi
  local expected_uuid actual_uuid
  expected_uuid="$(cat "${PROJECT_DIR}/mysql/production-ready")"
  for _ in $(seq 1 60); do
    actual_uuid="$(mysql_local_app -N "$DB_NAME" -e "SELECT CONCAT(@@server_uuid, ':', @@read_only, ':', @@super_read_only)" 2>/dev/null)" || actual_uuid=''
    if [ "$actual_uuid" = "${expected_uuid}:0:0" ]; then
      return 0
    fi
    sleep 1
  done
  fail "本机 MySQL 未就绪、处于只读状态或实例标识与迁移验收记录不符"
}
