#!/usr/bin/env bash
set -euo pipefail

SITE_DOMAIN="${SITE_DOMAIN:-www.shikongxiehou.com}"
SITE_APEX_DOMAIN="${SITE_APEX_DOMAIN:-shikongxiehou.com}"
SITE_SSL_DIR="${SITE_SSL_DIR:-/mnt/data/spacetime-prod/letsencrypt}"
ACME_WEBROOT="${ACME_WEBROOT:-/mnt/data/spacetime-prod/acme}"
NGINX_CONTAINER="${NGINX_CONTAINER:-spacetime-nginx-prod}"
CERTBOT_BIN="${CERTBOT_BIN:-/opt/spacetime-certbot/bin/certbot}"

log() {
  printf '[site-cert] %s\n' "$*"
}

command -v docker >/dev/null 2>&1 || {
  log "缺少 docker 命令"
  exit 1
}

[ -x "$CERTBOT_BIN" ] || {
  log "缺少 Certbot：$CERTBOT_BIN"
  exit 1
}

mkdir -p "$SITE_SSL_DIR" "$SITE_SSL_DIR/work" "$SITE_SSL_DIR/logs" "$ACME_WEBROOT"

log "检查并续期官网证书"
"$CERTBOT_BIN" certonly \
  --webroot \
  --webroot-path "$ACME_WEBROOT" \
  --config-dir "$SITE_SSL_DIR" \
  --work-dir "$SITE_SSL_DIR/work" \
  --logs-dir "$SITE_SSL_DIR/logs" \
  --non-interactive \
  --agree-tos \
  --register-unsafely-without-email \
  --keep-until-expiring \
  --cert-name "$SITE_DOMAIN" \
  -d "$SITE_DOMAIN" \
  -d "$SITE_APEX_DOMAIN"

log "校验并重载 Nginx"
docker exec "$NGINX_CONTAINER" nginx -t
docker exec "$NGINX_CONTAINER" nginx -s reload
log "官网证书检查完成"
