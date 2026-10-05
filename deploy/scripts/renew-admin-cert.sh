#!/usr/bin/env bash
set -euo pipefail

ADMIN_DOMAIN="${ADMIN_DOMAIN:-admin.shikongxiehou.com}"
ADMIN_SSL_DIR="${ADMIN_SSL_DIR:-/mnt/data/spacetime-prod/ssl}"
SITE_SSL_DIR="${SITE_SSL_DIR:-/mnt/data/spacetime-prod/letsencrypt}"
ACME_WEBROOT="${ACME_WEBROOT:-/mnt/data/spacetime-prod/acme}"
NGINX_CONTAINER="${NGINX_CONTAINER:-spacetime-nginx-prod}"
CERTBOT_BIN="${CERTBOT_BIN:-/opt/spacetime-certbot/bin/certbot}"

log() {
  printf '[admin-cert] %s\n' "$*"
}

command -v docker >/dev/null 2>&1 || {
  log "缺少 docker 命令"
  exit 1
}

[ -x "$CERTBOT_BIN" ] || {
  log "缺少 Certbot：$CERTBOT_BIN"
  exit 1
}

mkdir -p "$SITE_SSL_DIR" "$SITE_SSL_DIR/work" "$SITE_SSL_DIR/logs" "$ACME_WEBROOT" "$ADMIN_SSL_DIR"

log "检查并续期接口域名证书"
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
  --cert-name "$ADMIN_DOMAIN" \
  -d "$ADMIN_DOMAIN"

# 保留部署脚本和 Nginx 的既有路径；每次续期同步完整证书链与私钥。
CERT_DIR="$SITE_SSL_DIR/live/$ADMIN_DOMAIN"
install -m 644 "$CERT_DIR/fullchain.pem" "$ADMIN_SSL_DIR/$ADMIN_DOMAIN.pem"
install -m 600 "$CERT_DIR/privkey.pem" "$ADMIN_SSL_DIR/$ADMIN_DOMAIN.key"
log "校验并重载 Nginx"
docker exec "$NGINX_CONTAINER" nginx -t
docker exec "$NGINX_CONTAINER" nginx -s reload
log "接口域名证书已更新"
