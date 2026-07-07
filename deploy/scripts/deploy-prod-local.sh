#!/usr/bin/env bash
set -euo pipefail

TARGET="${1:-full}"
PROJECT_DIR="${SPACETIME_PROJECT_DIR:-/mnt/data/spacetime-prod}"
PROD_ENV_FILE="${SPACETIME_PROD_ENV_FILE:-${PROJECT_DIR}/secrets/prod.env}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

log() {
  printf '[spacetime-prod] %s\n' "$*"
}

fail() {
  printf '[spacetime-prod] ERROR: %s\n' "$*" >&2
  exit 1
}

require_file() {
  local file="$1"
  [ -s "$file" ] || fail "缺少文件：$file"
}

require_command() {
  local command_name="$1"
  command -v "$command_name" >/dev/null 2>&1 || fail "缺少命令：$command_name"
}

load_env() {
  require_file "$PROD_ENV_FILE"
  local registry_password_from_pipeline="${ALIYUN_REGISTRY_PASSWORD:-}"
  set -a
  # shellcheck disable=SC1090
  . "$PROD_ENV_FILE"
  set +a
  if [ -n "$registry_password_from_pipeline" ]; then
    export ALIYUN_REGISTRY_PASSWORD="$registry_password_from_pipeline"
  fi

  export PROJECT_NAME="${PROJECT_NAME:-spacetime-prod}"
  export ADMIN_DOMAIN="${ADMIN_DOMAIN:-admin.shikongxiehou.com}"
  export ADMIN_SSL_DIR="${ADMIN_SSL_DIR:-/mnt/data/spacetime-prod/ssl}"
  export ALIYUN_CR_REGISTRY="${ALIYUN_CR_REGISTRY:-crpi-agc08x7zneglt1wg.cn-hangzhou.personal.cr.aliyuncs.com}"
  export NGINX_IMAGE="${NGINX_IMAGE:-${ALIYUN_CR_REGISTRY}/bobo2026/bobo2026:spacetime-nginx-prod}"
  export ALIYUN_REGISTRY_USER_NAME="${ALIYUN_REGISTRY_USER_NAME:-393841724@qq.com}"
  export DOCKER_NAMESPACE="${DOCKER_NAMESPACE:-bobo2026}"
  export ADMIN_IMAGE_NAME="${ADMIN_IMAGE_NAME:-bobo2026}"
  export ADMIN_IMAGE_TAG="${ADMIN_IMAGE_TAG:-spacetime-admin-prod}"
  export BACKEND_IMAGE_NAME="${BACKEND_IMAGE_NAME:-bobo2026}"
  export BACKEND_IMAGE_TAG="${BACKEND_IMAGE_TAG:-spacetime-backend-prod}"
  export ADMIN_IMAGE="${ADMIN_IMAGE:-${ALIYUN_CR_REGISTRY}/${DOCKER_NAMESPACE}/${ADMIN_IMAGE_NAME}:${ADMIN_IMAGE_TAG}}"
  export BACKEND_IMAGE="${BACKEND_IMAGE:-${ALIYUN_CR_REGISTRY}/${DOCKER_NAMESPACE}/${BACKEND_IMAGE_NAME}:${BACKEND_IMAGE_TAG}}"

  for key in DB_HOST DB_PORT DB_NAME DB_USER DB_PASSWORD REDIS_HOST REDIS_PORT REDIS_USERNAME REDIS_PASSWORD OSS_ENDPOINT OSS_BUCKET_NAME OSS_ACCESS_KEY_ID OSS_ACCESS_KEY_SECRET; do
    [ -n "${!key:-}" ] || fail "prod.env 缺少 ${key}"
  done

  require_file "${ADMIN_SSL_DIR}/${ADMIN_DOMAIN}.pem"
  require_file "${ADMIN_SSL_DIR}/${ADMIN_DOMAIN}.key"
}

ensure_runtime() {
  require_command docker
}

docker_login_if_possible() {
  if [ -n "${ALIYUN_REGISTRY_PASSWORD:-}" ]; then
    log "登录 ACR ${ALIYUN_CR_REGISTRY}"
    printf '%s' "$ALIYUN_REGISTRY_PASSWORD" | docker login "$ALIYUN_CR_REGISTRY" \
      --username "$ALIYUN_REGISTRY_USER_NAME" --password-stdin
  else
    log "prod.env 未配置 ALIYUN_REGISTRY_PASSWORD，跳过 docker login"
  fi
}

ensure_network() {
  docker network inspect spacetime-prod >/dev/null 2>&1 || docker network create spacetime-prod >/dev/null
}

pull_admin() {
  log "拉取管理后台镜像 ${ADMIN_IMAGE}"
  docker pull "$ADMIN_IMAGE"
}

pull_backend() {
  log "拉取后端镜像 ${BACKEND_IMAGE}"
  docker pull "$BACKEND_IMAGE"
}

pull_nginx() {
  log "拉取 Nginx 镜像 ${NGINX_IMAGE}"
  docker pull "$NGINX_IMAGE"
}

wait_backend() {
  log "等待后端健康检查"
  for _ in $(seq 1 60); do
    if curl -fsS "http://127.0.0.1:8080/health" | grep -q '"code":200'; then
      return
    fi
    sleep 2
  done
  docker logs --tail=200 spacetime-backend-prod || true
  fail "后端健康检查失败"
}

wait_admin() {
  log "等待管理后台 HTTPS 访问"
  for _ in $(seq 1 60); do
    if curl -k -fsS --resolve "${ADMIN_DOMAIN}:443:127.0.0.1" "https://${ADMIN_DOMAIN}/" >/dev/null; then
      return
    fi
    sleep 2
  done
  docker logs --tail=200 spacetime-nginx-prod || true
  docker logs --tail=200 spacetime-admin-prod || true
  fail "管理后台 HTTPS 检查失败"
}

restart_backend() {
  docker rm -f spacetime-backend-prod >/dev/null 2>&1 || true
  docker run -d \
    --name spacetime-backend-prod \
    --restart unless-stopped \
    --network spacetime-prod \
    --env-file "$PROD_ENV_FILE" \
    -e SPRING_PROFILES_ACTIVE=prod \
    -e TZ=Asia/Shanghai \
    -p 127.0.0.1:8080:8080 \
    "$BACKEND_IMAGE" >/dev/null
}

restart_admin() {
  docker rm -f spacetime-admin-prod >/dev/null 2>&1 || true
  docker run -d \
    --name spacetime-admin-prod \
    --restart unless-stopped \
    --network spacetime-prod \
    "$ADMIN_IMAGE" >/dev/null
}

restart_nginx() {
  docker rm -f spacetime-nginx-prod >/dev/null 2>&1 || true
  docker run -d \
    --name spacetime-nginx-prod \
    --restart unless-stopped \
    --network spacetime-prod \
    -p 80:80 \
    -p 443:443 \
    -v "$ROOT_DIR/deploy/nginx-prod/conf.d:/etc/nginx/conf.d:ro" \
    -v "${ADMIN_SSL_DIR}:/etc/nginx/ssl:ro" \
    "$NGINX_IMAGE" >/dev/null
}

deploy_backend() {
  pull_backend
  log "跳过数据库迁移，生产迁移请手动执行 scripts/migrate-prod-db.sh"
  restart_backend
  pull_nginx
  restart_nginx
  wait_backend
}

deploy_admin() {
  pull_admin
  restart_admin
  pull_nginx
  restart_nginx
  wait_admin
}

main() {
  cd "$ROOT_DIR"
  load_env
  ensure_runtime
  docker_login_if_possible
  ensure_network

  case "$TARGET" in
    backend)
      deploy_backend
      ;;
    admin)
      deploy_admin
      ;;
    full)
      deploy_backend
      deploy_admin
      ;;
    *)
      fail "未知部署目标：$TARGET，可选 backend/admin/full"
      ;;
  esac

  log "部署完成：$TARGET"
}

main "$@"
