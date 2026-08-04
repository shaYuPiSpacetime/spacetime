#!/bin/bash
# PRD-05 推荐与社区全链路 L1 冒烟测试。
# 仅使用已提供的真实凭据；不伪造 Token，不修改认证状态，不触碰消息域。
set -u

API_URL="${API_URL:-http://localhost:8080}"
MINIAPP_TOKEN="${MINIAPP_TOKEN:-}"

PASS=0
FAIL=0
SKIP=0
TOKEN="${TOKEN:-}"
RESP_BODY=""
RESP_HTTP=""

request() {
  local method="$1" url="$2" token="${3:-}" body="${4:-}"
  local args=(-s -w $'\n%{http_code}' -X "$method" "$url")
  if [[ -n "$token" ]]; then args+=(-H "X-Auth-Token: $token"); fi
  if [[ -n "$body" ]]; then args+=(-H 'Content-Type: application/json' -d "$body"); fi
  local response
  response="$(curl "${args[@]}")"
  RESP_HTTP="$(printf '%s\n' "$response" | tail -1)"
  RESP_BODY="$(printf '%s\n' "$response" | sed '$d')"
}

business_code() {
  printf '%s' "$RESP_BODY" | jq -r '.code // empty' 2>/dev/null
}

check_ok() {
  local label="$1" code
  code="$(business_code)"
  if [[ "$RESP_HTTP" == "200" && "$code" == "200" ]]; then
    printf 'PASS %s (HTTP=%s, code=%s)\n' "$label" "$RESP_HTTP" "$code"
    PASS=$((PASS + 1))
  else
    printf 'FAIL %s (HTTP=%s, code=%s)\n' "$label" "$RESP_HTTP" "${code:-invalid-json}"
    FAIL=$((FAIL + 1))
  fi
}

check_http() {
  local label="$1" expected="$2"
  if [[ "$RESP_HTTP" == "$expected" ]]; then
    printf 'PASS %s (HTTP=%s)\n' "$label" "$RESP_HTTP"
    PASS=$((PASS + 1))
  else
    printf 'FAIL %s (expected HTTP=%s, actual=%s)\n' "$label" "$expected" "$RESP_HTTP"
    FAIL=$((FAIL + 1))
  fi
}

check_jq() {
  local label="$1" expression="$2"
  if printf '%s' "$RESP_BODY" | jq -e "$expression" >/dev/null 2>&1; then
    printf 'PASS %s\n' "$label"
    PASS=$((PASS + 1))
  else
    printf 'FAIL %s\n' "$label"
    FAIL=$((FAIL + 1))
  fi
}

printf 'PRD-05 L1: %s\n' "$API_URL"

if [[ -z "$TOKEN" ]]; then
  printf '未提供管理员 TOKEN，停止后台用例。\n'
  exit 1
fi

ADMIN_READ_PATHS=(
  '/admin/community/meta'
  '/admin/community/posts/stats?scope=content'
  '/admin/community/posts/list?page=1&size=10'
  '/admin/community/posts/stats?scope=moments'
  '/admin/community/comments/stats'
  '/admin/community/comments/list?page=1&size=10'
  '/admin/community/reports/stats'
  '/admin/community/reports/list?page=1&size=10'
  '/admin/community/topics/stats'
  '/admin/community/topics/list?page=1&size=10'
  '/admin/community/configs/version'
  '/admin/community/configs/logs?page=1&size=10'
)
for path in "${ADMIN_READ_PATHS[@]}"; do
  request GET "$API_URL$path" "$TOKEN"
  check_ok "后台读取 $path"
done

request GET "$API_URL/admin/community/meta" "$TOKEN"
check_jq '后台 meta 返回动态文案、状态和处罚周期' \
  '(.data.copy | type == "object" and length > 0) and (.data.options | type == "object" and length > 0)'

request GET "$API_URL/admin/community/posts/list?page=1&size=1" "$TOKEN"
POST_ID="$(printf '%s' "$RESP_BODY" | jq -r '.data.records[0].id // empty')"
if [[ -n "$POST_ID" ]]; then
  request GET "$API_URL/admin/community/posts/$POST_ID" "$TOKEN"
  check_ok '后台内容详情抽屉数据'
fi

request GET "$API_URL/admin/community/reports/list?page=1&size=1" "$TOKEN"
REPORT_ID="$(printf '%s' "$RESP_BODY" | jq -r '.data.records[0].id // empty')"
if [[ -n "$REPORT_ID" ]]; then
  request GET "$API_URL/admin/community/reports/$REPORT_ID" "$TOKEN"
  check_ok '后台举报上下文详情'
fi

request GET "$API_URL/admin/community/posts/list?page=1&size=1" ''
check_http '后台社区接口拒绝未登录访问' 401

if [[ -z "$MINIAPP_TOKEN" ]]; then
  printf 'SKIP 小程序真实接口（未提供 MINIAPP_TOKEN）\n'
  SKIP=$((SKIP + 1))
else
  MINI_READ_PATHS=(
    '/miniapp/community/meta'
    '/miniapp/community/config'
    '/miniapp/community/topics/home'
    '/miniapp/community/topics?page=1&size=10'
    '/miniapp/community/posts?scene=FOLLOWING&page=1&size=10'
    '/miniapp/community/posts?scene=city&page=1&size=10'
    '/miniapp/community/posts?scene=hot&page=1&size=10'
    '/miniapp/community/sincere-posts?page=1&size=10'
    '/miniapp/community/me/posts?page=1&size=10'
    '/miniapp/community/me/interactions?type=commented&page=1&size=10'
    '/miniapp/community/me/interactions?type=liked&page=1&size=10'
    '/miniapp/community/me/interactions?type=unlocked&page=1&size=10'
    '/miniapp/community/me/interactions?type=viewed&page=1&size=10'
    '/miniapp/community/me/view-history?page=1&size=10'
    '/miniapp/community/me/follows?relation=following&page=1&size=10'
    '/miniapp/community/me/follows?relation=fans&page=1&size=10'
    '/miniapp/community/me/hidden-authors?page=1&size=10'
    '/miniapp/community/me/profile-summary'
  )
  for path in "${MINI_READ_PATHS[@]}"; do
    request GET "$API_URL$path" "$MINIAPP_TOKEN"
    check_ok "小程序读取 $path"
  done

  request GET "$API_URL/miniapp/community/meta" "$MINIAPP_TOKEN"
  check_jq '小程序 meta 返回动态文案、话题和举报原因' \
    '(.data.copies | type == "object" and length > 0) and (.data.dictionaries.topics | type == "array") and (.data.dictionaries.reportReasons | type == "array" and length > 0)'

  request PUT "$API_URL/miniapp/community/drafts/community_post" "$MINIAPP_TOKEN" \
    '{"content":"PRD05 L1 draft","images":[]}'
  check_ok '服务端保存发布草稿'
  request GET "$API_URL/miniapp/community/drafts/community_post" "$MINIAPP_TOKEN"
  check_ok '服务端恢复发布草稿'
  check_jq '草稿内容真实回显' '.data.content == "PRD05 L1 draft"'
  request DELETE "$API_URL/miniapp/community/drafts/community_post" "$MINIAPP_TOKEN"
  check_ok '发布草稿删除闭环'

  request GET "$API_URL/miniapp/community/me/interactions" "$MINIAPP_TOKEN"
  check_ok '互动历史缺省类型安全降级'
fi

request POST "$API_URL/miniapp/community/posts" '' \
  '{"contentType":"community_post","content":"anonymous","topicId":1,"imageUrls":[]}'
check_http '小程序发布接口拒绝未登录访问' 401

printf 'RESULT pass=%d fail=%d skip=%d\n' "$PASS" "$FAIL" "$SKIP"
if [[ "$FAIL" -gt 0 ]]; then exit 1; fi
