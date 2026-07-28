#!/usr/bin/env bash
set -euo pipefail

# PRD-07 推广裂变 L1 接口测试。
# 账号、密码和 Token 必须由运行环境提供，脚本不保存任何凭据。

API_BASE_URL="${API_BASE_URL:-http://127.0.0.1:8080}"
ADMIN_USERNAME="${ADMIN_USERNAME:?请通过环境变量提供 ADMIN_USERNAME}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:?请通过环境变量提供 ADMIN_PASSWORD}"
TEST_RUN_ID="${TEST_RUN_ID:-$(date +%Y%m%d%H%M%S)}"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

pass() {
  echo "PASS: $*"
}

json_code() {
  jq -r '.code // empty' "$1"
}

assert_code() {
  local file="$1"
  local expected="$2"
  local label="$3"
  local actual
  actual="$(json_code "$file")"
  [[ "$actual" == "$expected" ]] || fail "$label：期望 R.code=$expected，实际=$actual，响应=$(jq -c . "$file")"
  pass "$label"
}

admin_request() {
  local method="$1"
  local path="$2"
  local output="$3"
  local data="${4:-}"
  local args=(
    --silent --show-error --fail-with-body
    --request "$method"
    --header "X-Auth-Token: $ADMIN_TOKEN"
    --header "Content-Type: application/json"
    --output "$output"
  )
  if [[ -n "$data" ]]; then
    args+=(--data "$data")
  fi
  curl "${args[@]}" "$API_BASE_URL$path"
}

echo "PRD-07 L1 测试开始：runId=$TEST_RUN_ID"

LOGIN_JSON="$TMP_DIR/login.json"
curl --silent --show-error --fail-with-body \
  --request POST \
  --header "Content-Type: application/json" \
  --data "$(jq -cn --arg account "$ADMIN_USERNAME" --arg password "$ADMIN_PASSWORD" \
    '{account:$account,password:$password}')" \
  --output "$LOGIN_JSON" \
  "$API_BASE_URL/admin/login"
assert_code "$LOGIN_JSON" 200 "AUTH-P0-01 管理员真实登录"
ADMIN_TOKEN="$(jq -r '.data.token // empty' "$LOGIN_JSON")"
[[ -n "$ADMIN_TOKEN" ]] || fail "登录响应缺少 Token"

ROUTERS_JSON="$TMP_DIR/routers.json"
admin_request GET "/admin/routers" "$ROUTERS_JSON"
assert_code "$ROUTERS_JSON" 200 "AUTH-P0-02 查询后台菜单"
for permission in \
  promotion:rule:view \
  promotion:rule:normal:publish \
  promotion:rule:agent:publish \
  promotion:relation:view \
  promotion:reward:view \
  promotion:agent:view \
  promotion:agent:sensitive \
  promotion:settlement:view; do
  jq -e --arg permission "$permission" \
    '.data.permissions | index($permission) != null' "$LOGIN_JSON" >/dev/null \
    || fail "登录响应缺少权限：$permission"
done
for route in \
  /promotion/rules \
  /promotion/relations \
  /promotion/rewards \
  /promotion/agents \
  /promotion/settlements; do
  jq -e --arg route "$route" \
    '.. | objects | select(.path? == $route)' "$ROUTERS_JSON" >/dev/null \
    || fail "菜单响应缺少运行态路由：$route"
done
pass "推广五页和关键权限已授权"

UNAUTH_STATUS="$(
  curl --silent --output "$TMP_DIR/unauth.json" --write-out '%{http_code}' \
    "$API_BASE_URL/admin/promotion/relations/list?page=1&size=20"
)"
[[ "$UNAUTH_STATUS" == "401" ]] || fail "未登录后台接口期望 HTTP 401，实际=$UNAUTH_STATUS"
pass "AUTH-P3-03 未登录访问后台返回 HTTP 401"

for source_type in normal_user campus_agent; do
  RULE_JSON="$TMP_DIR/rule-$source_type.json"
  admin_request GET "/admin/promotion/rules/current?sourceType=$source_type" "$RULE_JSON"
  assert_code "$RULE_JSON" 200 "RULE 查询 $source_type 当前版本"
  jq -e --arg source "$source_type" '
    .data.sourceType == $source
    and (.data.version | type == "number")
    and ([.data.events[].eventType] | sort
      == (["first_coin_recharge_reward","first_vip_reward","profile_complete_reward","register_reward","verify_complete_reward"] | sort))
    and ([.data.events[] | select(.eventType == "register_reward" and .enabled == true)] | length == 1)
  ' "$RULE_JSON" >/dev/null || fail "$source_type 当前规则结构或固定注册事件不正确"
  pass "RULE 当前版本结构 $source_type"
done

for endpoint in \
  "/admin/promotion/relations/list?page=1&size=20" \
  "/admin/promotion/rewards/list?page=1&size=20" \
  "/admin/promotion/agents/list?page=1&size=20" \
  "/admin/promotion/settlements/list?page=1&size=20"; do
  OUTPUT="$TMP_DIR/list-$(echo "$endpoint" | tr '/?&=' '_').json"
  admin_request GET "$endpoint" "$OUTPUT"
  assert_code "$OUTPUT" 200 "列表接口 $endpoint"
  jq -e '.data.records | type == "array"' "$OUTPUT" >/dev/null \
    || fail "$endpoint 未返回分页 records"
done

AGENT_JSON="$TMP_DIR/agent-create.json"
AGENT_PAYLOAD="$(jq -cn \
  --arg agentName "L1校园代理-$TEST_RUN_ID" \
  --arg school "时空测试大学" \
  --arg campus "主校区" \
  --arg contactName "测试联系人" \
  --arg contactPhone "13800001234" \
  '{agentName:$agentName,school:$school,campus:$campus,contactName:$contactName,contactPhone:$contactPhone,remark:"PRD-07 L1"}')"
admin_request POST "/admin/promotion/agents" "$AGENT_JSON" "$AGENT_PAYLOAD"
assert_code "$AGENT_JSON" 200 "AGT-P0-01 新增校园代理"
AGENT_NO="$(jq -r '.data.agentNo // empty' "$AGENT_JSON")"
[[ "$AGENT_NO" == AGT-* ]] || fail "代理编号格式错误：$AGENT_NO"

STATUS_JSON="$TMP_DIR/agent-disable.json"
admin_request PUT "/admin/promotion/agents/$AGENT_NO/status" "$STATUS_JSON" '{"status":"disabled"}'
assert_code "$STATUS_JSON" 200 "AGT-P0-04 停用校园代理"
jq -e '.data.status == "disabled"' "$STATUS_JSON" >/dev/null || fail "代理未变为 disabled"

STATUS_JSON="$TMP_DIR/agent-enable.json"
admin_request PUT "/admin/promotion/agents/$AGENT_NO/status" "$STATUS_JSON" '{"status":"enabled"}'
assert_code "$STATUS_JSON" 200 "AGT-P0-05 启用校园代理"
jq -e '.data.status == "enabled"' "$STATUS_JSON" >/dev/null || fail "代理未恢复 enabled"

QR_FIRST="$TMP_DIR/qr-first.json"
QR_SECOND="$TMP_DIR/qr-second.json"
admin_request POST "/admin/promotion/agents/$AGENT_NO/qr-code" "$QR_FIRST"
admin_request POST "/admin/promotion/agents/$AGENT_NO/qr-code" "$QR_SECOND"
assert_code "$QR_FIRST" 200 "AGT-P0-07 生成永久二维码"
assert_code "$QR_SECOND" 200 "AGT-P0-08 重复获取永久二维码"
jq -e --slurp '
  .[0].data.qrToken == .[1].data.qrToken
  and .[0].data.miniappPath == .[1].data.miniappPath
  and .[0].data.imageUrl == .[1].data.imageUrl
' "$QR_FIRST" "$QR_SECOND" >/dev/null || fail "两次二维码响应不一致"

QR_IMAGE_URL="$(jq -r '.data.imageUrl' "$QR_FIRST")"
curl --silent --show-error --fail-with-body \
  --header "X-Auth-Token: $ADMIN_TOKEN" \
  --output "$TMP_DIR/agent-qr.png" \
  "$API_BASE_URL$QR_IMAGE_URL"
[[ "$(stat -f '%z' "$TMP_DIR/agent-qr.png")" -gt 500 ]] || fail "二维码 PNG 为空或过小"
file "$TMP_DIR/agent-qr.png" | grep -q 'PNG image data' || fail "二维码下载不是 PNG"
pass "二维码图片为非空真实 PNG"

for legacy_path in \
  "/admin/promotion/materials/list" \
  "/admin/promotion/invite-rewards/frozen" \
  "/admin/promotion/settlements/legacy/paid"; do
  LEGACY_JSON="$TMP_DIR/legacy-$(echo "$legacy_path" | tr '/' '_').json"
  curl --silent --show-error \
    --header "X-Auth-Token: $ADMIN_TOKEN" \
    --output "$LEGACY_JSON" \
    "$API_BASE_URL$legacy_path"
  assert_code "$LEGACY_JSON" 404 "LEG 废弃接口不可达 $legacy_path"
done

SOURCE_STATUS="$(
  curl --silent --output "$TMP_DIR/source-invalid.json" --write-out '%{http_code}' \
    --request POST \
    --header "Content-Type: application/json" \
    --data '{"sourceType":"normal_user","sourceToken":"invalid-token","visitorKey":"L1-invalid-visitor"}' \
    "$API_BASE_URL/miniapp/promotion/source-traces"
)"
[[ "$SOURCE_STATUS" == "200" ]] || fail "匿名来源接口应被白名单放行，实际 HTTP=$SOURCE_STATUS"
assert_code "$TMP_DIR/source-invalid.json" 70001 "ATTR-P1-08 无效来源被业务拒绝"

H5_JSON="$TMP_DIR/invite-rules-h5.json"
H5_STATUS="$(
  curl --silent --output "$H5_JSON" --write-out '%{http_code}' \
    "$API_BASE_URL/miniapp/app/h5-content/invite_rules"
)"
[[ "$H5_STATUS" == "200" ]] || fail "邀请规则 H5 应公开可访问，实际 HTTP=$H5_STATUS"
assert_code "$H5_JSON" 200 "MOB-P0-10 邀请规则 H5 公开接口"

echo "PRD-07 L1 测试完成：全部断言通过"
