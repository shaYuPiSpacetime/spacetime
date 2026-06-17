#!/usr/bin/env bash
set -u

# 推广裂变与邀请奖励 L1 接口测试。
# 需要 API_URL；后台用 TOKEN，小程序用 MINIAPP_TOKEN（未提供则跳过小程序登录态用例）。
# 可选夹具：LOW_PRIV_TOKEN、TEST_FROZEN_REWARD_ID、TEST_FROZEN_RELATION_ID、
# TEST_SETTLEMENT_UNSETTLED_ID、TEST_SETTLEMENT_CONFIRMED_ID。

API_URL="${API_URL:-${BASE_URL:-}}"
TOKEN="${TOKEN:-}"
MINIAPP_TOKEN="${MINIAPP_TOKEN:-}"
LOW_PRIV_TOKEN="${LOW_PRIV_TOKEN:-}"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

TOTAL=0
PASS=0
FAIL=0
SKIP=0

trim_base() {
  printf '%s' "$1" | sed 's#/$##'
}

API_URL="$(trim_base "$API_URL")"

record_pass() {
  TOTAL=$((TOTAL + 1))
  PASS=$((PASS + 1))
  printf "%b✅ %s | %s%b\n" "$GREEN" "$1" "$2" "$NC"
}

record_fail() {
  TOTAL=$((TOTAL + 1))
  FAIL=$((FAIL + 1))
  printf "%b❌ %s | %s%b\n" "$RED" "$1" "$2" "$NC"
}

record_skip() {
  TOTAL=$((TOTAL + 1))
  SKIP=$((SKIP + 1))
  printf "%b⏭️ %s | %s%b\n" "$YELLOW" "$1" "$2" "$NC"
}

body_code() {
  local resp="$1"
  HTTP_CODE="$(printf '%s' "$resp" | tail -n 1)"
  RESP_BODY="$(printf '%s' "$resp" | sed '$d')"
}

json_field() {
  local field="$1"
  printf '%s' "$2" | sed -n "s/.*\"$field\"[[:space:]]*:[[:space:]]*\"\([^\"]*\)\".*/\1/p" | head -1
}

json_number_field() {
  local field="$1"
  printf '%s' "$2" | sed -n "s/.*\"$field\"[[:space:]]*:[[:space:]]*\([0-9][0-9]*\).*/\1/p" | head -1
}

expect_http() {
  local id="$1"
  local desc="$2"
  local expect="$3"
  local resp="$4"
  body_code "$resp"
  if [ "$HTTP_CODE" = "$expect" ]; then
    record_pass "$id" "$desc HTTP=$HTTP_CODE"
  else
    record_fail "$id" "$desc HTTP=$HTTP_CODE body=$(printf '%s' "$RESP_BODY" | head -c 220)"
  fi
}

expect_2xx_body_has() {
  local id="$1"
  local desc="$2"
  local resp="$3"
  shift 3
  body_code "$resp"
  if [ "$HTTP_CODE" != "200" ]; then
    record_fail "$id" "$desc HTTP=$HTTP_CODE body=$(printf '%s' "$RESP_BODY" | head -c 220)"
    return
  fi
  local missing=""
  for needle in "$@"; do
    if ! printf '%s' "$RESP_BODY" | grep -q "$needle"; then
      missing="$missing $needle"
    fi
  done
  if [ -z "$missing" ]; then
    record_pass "$id" "$desc HTTP=$HTTP_CODE"
  else
    record_fail "$id" "$desc missing=$missing body=$(printf '%s' "$RESP_BODY" | head -c 220)"
  fi
}

api_get() {
  curl -sS -w "\n%{http_code}" -X GET "$API_URL$1" -H "X-Auth-Token: $TOKEN"
}

api_get_no_token() {
  curl -sS -w "\n%{http_code}" -X GET "$API_URL$1"
}

api_put_json() {
  curl -sS -w "\n%{http_code}" -X PUT "$API_URL$1" -H "X-Auth-Token: $TOKEN" -H "Content-Type: application/json" -d "$2"
}

api_put_json_token() {
  curl -sS -w "\n%{http_code}" -X PUT "$API_URL$2" -H "X-Auth-Token: $1" -H "Content-Type: application/json" -d "$3"
}

api_post_json() {
  curl -sS -w "\n%{http_code}" -X POST "$API_URL$1" -H "X-Auth-Token: $TOKEN" -H "Content-Type: application/json" -d "$2"
}

api_post_json_token() {
  curl -sS -w "\n%{http_code}" -X POST "$API_URL$2" -H "X-Auth-Token: $1" -H "Content-Type: application/json" -d "$3"
}

mini_get() {
  curl -sS -w "\n%{http_code}" -X GET "$API_URL$1" -H "X-Auth-Token: $MINIAPP_TOKEN"
}

mini_post_json() {
  curl -sS -w "\n%{http_code}" -X POST "$API_URL$1" -H "X-Auth-Token: $MINIAPP_TOKEN" -H "Content-Type: application/json" -d "$2"
}

require_api() {
  if [ -z "$API_URL" ]; then
    echo "缺少 API_URL，请设置 API_URL 或 BASE_URL"
    exit 2
  fi
}

require_admin_token_or_skip() {
  if [ -z "$TOKEN" ]; then
    record_skip "$1" "$2：未提供 TOKEN"
    return 1
  fi
  return 0
}

require_mini_token_or_skip() {
  if [ -z "$MINIAPP_TOKEN" ]; then
    record_skip "$1" "$2：未提供 MINIAPP_TOKEN"
    return 1
  fi
  return 0
}

require_fixture_or_skip() {
  local value="$1"
  local id="$2"
  local desc="$3"
  local name="$4"
  if [ -z "$value" ]; then
    record_skip "$id" "$desc：未提供 $name"
    return 1
  fi
  return 0
}

require_api

echo "== 推广裂变 L1 接口测试 =="
echo "API_URL=$API_URL"

if require_mini_token_or_skip "F1-P0-01" "获取邀请首页"; then
  expect_2xx_body_has "F1-P0-01" "获取邀请首页" "$(mini_get "/miniapp/promotion/invite/home")" "successInviteCount" "arrivedCoin" "recentRecords"
fi

if require_mini_token_or_skip "F1-P0-02" "获取活动规则"; then
  expect_2xx_body_has "F1-P0-02" "获取活动规则" "$(mini_get "/miniapp/promotion/invite/rules")" "successMetric" "reward"
fi

if require_mini_token_or_skip "F1-P0-03" "查询邀请记录"; then
  expect_2xx_body_has "F1-P0-03" "查询邀请记录" "$(mini_get "/miniapp/promotion/invite/records?page=1&size=10")" "records" "total"
fi

TRACE_NORMAL="TR_L1_$(date +%s)"
SHARE_NORMAL_BODY="{\"traceNo\":\"$TRACE_NORMAL\",\"sourceType\":\"normal_user\",\"inviterId\":1,\"scene\":\"l1\",\"deviceHash\":\"l1-device\"}"
expect_2xx_body_has "F1-P0-04" "记录普通用户来源" "$(curl -sS -w "\n%{http_code}" -X POST "$API_URL/miniapp/promotion/invite/share-log" -H "Content-Type: application/json" -d "$SHARE_NORMAL_BODY")" "traceNo" "normal_user"

if require_fixture_or_skip "${TEST_AGENT_QR_CODE:-}" "F1-P0-05" "记录校园代理来源" "TEST_AGENT_QR_CODE"; then
  TRACE_AGENT="TR_L1_AGENT_$(date +%s)"
  SHARE_AGENT_BODY="{\"traceNo\":\"$TRACE_AGENT\",\"sourceType\":\"campus_agent\",\"qrCode\":\"$TEST_AGENT_QR_CODE\",\"scene\":\"l1\"}"
  expect_2xx_body_has "F1-P0-05" "记录校园代理来源" "$(curl -sS -w "\n%{http_code}" -X POST "$API_URL/miniapp/promotion/invite/share-log" -H "Content-Type: application/json" -d "$SHARE_AGENT_BODY")" "traceNo" "campus_agent"
fi

if require_mini_token_or_skip "F1-P1-05" "获取普通用户二维码"; then
  expect_2xx_body_has "F1-P1-05" "获取普通用户二维码" "$(mini_get "/miniapp/promotion/invite/qr-code")" "qrCode"
fi

if require_fixture_or_skip "${TEST_AGENT_QR_CODE:-}" "F1-P1-06" "解析代理二维码来源" "TEST_AGENT_QR_CODE"; then
  expect_2xx_body_has "F1-P1-06" "解析代理二维码来源" "$(curl -sS -w "\n%{http_code}" -X GET "$API_URL/miniapp/promotion/invite/qr-source?qrCode=$TEST_AGENT_QR_CODE")" "available" "miniappPath"
fi

if require_mini_token_or_skip "F1-P2-01" "无效来源绑定"; then
  expect_http "F1-P2-01" "无效来源绑定" "200" "$(mini_post_json "/miniapp/promotion/invite/bind" '{"traceNo":"TR_NOT_EXISTS_L1","qrCode":"QR_NOT_EXISTS_L1"}')"
fi

expect_http "F1-P3-01" "未登录访问邀请首页" "401" "$(api_get_no_token "/miniapp/promotion/invite/home")"
expect_http "F1-P3-02" "未登录访问邀请记录" "401" "$(api_get_no_token "/miniapp/promotion/invite/records")"

if require_admin_token_or_skip "F2-P0-01" "获取规则配置聚合详情"; then
  expect_2xx_body_has "F2-P0-01" "获取规则配置聚合详情" "$(api_get "/admin/promotion/rule-config")" "inviteReward" "agentBonus" "risk"
fi

INVITE_REWARD_BODY='{"events":[{"eventType":"register_login_reward","enabled":true,"amount":1},{"eventType":"profile_complete_reward","enabled":true,"amount":2},{"eventType":"verify_complete_reward","enabled":true,"amount":3},{"eventType":"first_vip_reward","enabled":true,"amount":4},{"eventType":"first_coin_reward","enabled":true,"amount":5}],"successMetric":"verify_complete_reward","rewardMode":"fixed","rewardCap":1000,"ladder":[]}'
if require_admin_token_or_skip "F2-P0-02" "保存普通奖励配置"; then
  expect_http "F2-P0-02" "保存普通奖励配置" "200" "$(api_put_json "/admin/promotion/rule-config/invite-reward" "$INVITE_REWARD_BODY")"
fi

AGENT_RULE_BODY='{"ruleGroups":[{"groupCode":"L1_GROUP","groupName":"L1测试规则组","enabled":true,"events":[{"eventType":"register_login_reward","enabled":true,"amount":1},{"eventType":"verify_complete_reward","enabled":true,"amount":3}]}]}'
if require_admin_token_or_skip "F2-P0-03" "保存代理奖金规则组"; then
  expect_http "F2-P0-03" "保存代理奖金规则组" "200" "$(api_put_json "/admin/promotion/rule-config/agent-bonus" "$AGENT_RULE_BODY")"
fi

RISK_BODY='{"dailyCap":50,"deviceThreshold":5,"phoneThreshold":5,"paymentThreshold":3,"freezeSwitch":true,"reviewSwitch":true}'
if require_admin_token_or_skip "F2-P0-04" "保存风控参数"; then
  expect_http "F2-P0-04" "保存风控参数" "200" "$(api_put_json "/admin/promotion/rule-config/risk" "$RISK_BODY")"
fi

INVALID_LADDER_BODY='{"events":[{"eventType":"register_login_reward","enabled":true,"amount":1}],"successMetric":"verify_complete_reward","rewardMode":"ladder","ladder":[{"minCount":1,"maxCount":10,"amount":1,"enabled":true},{"minCount":5,"maxCount":20,"amount":2,"enabled":true}]}'
if require_admin_token_or_skip "F2-P1-02" "阶梯区间重叠"; then
  expect_http "F2-P1-02" "阶梯区间重叠" "200" "$(api_put_json "/admin/promotion/rule-config/invite-reward" "$INVALID_LADDER_BODY")"
fi

INVALID_EVENT_BODY='{"events":[{"eventType":"register_login_reward","enabled":true}],"successMetric":"verify_complete_reward","rewardMode":"fixed"}'
if require_admin_token_or_skip "F2-P1-03" "启用事件但金额为空"; then
  expect_http "F2-P1-03" "启用事件但金额为空" "200" "$(api_put_json "/admin/promotion/rule-config/invite-reward" "$INVALID_EVENT_BODY")"
fi

LADDER_BODY='{"events":[{"eventType":"register_login_reward","enabled":true,"amount":1}],"successMetric":"verify_complete_reward","rewardMode":"ladder","ladder":[{"minCount":1,"maxCount":10,"amount":1,"enabled":true},{"minCount":11,"maxCount":20,"amount":2,"enabled":true}]}'
if require_admin_token_or_skip "F2-P1-04" "奖励方式选阶梯+有效档位保存"; then
  expect_http "F2-P1-04" "奖励方式选阶梯+有效档位保存" "200" "$(api_put_json "/admin/promotion/rule-config/invite-reward" "$LADDER_BODY")"
fi

INVALID_RISK_BODY='{"dailyCap":0,"deviceThreshold":0,"phoneThreshold":-1,"paymentThreshold":0,"freezeSwitch":true,"reviewSwitch":true}'
if require_admin_token_or_skip "F2-P2-01" "风控阈值非法"; then
  expect_http "F2-P2-01" "风控阈值非法" "200" "$(api_put_json "/admin/promotion/rule-config/risk" "$INVALID_RISK_BODY")"
fi

if [ -n "$LOW_PRIV_TOKEN" ]; then
  expect_http "F2-P3-01" "低权限无权保存风控" "403" "$(api_put_json_token "$LOW_PRIV_TOKEN" "/admin/promotion/rule-config/risk" "$RISK_BODY")"
else
  record_skip "F2-P3-01" "未提供 LOW_PRIV_TOKEN"
fi
expect_http "F2-P3-02" "未登录读取规则" "401" "$(api_get_no_token "/admin/promotion/rule-config")"

if require_admin_token_or_skip "F3-P0-01" "邀请关系列表"; then
  REL_LIST="$(api_get "/admin/promotion/invite-relations/list?page=1&size=10")"
  expect_2xx_body_has "F3-P0-01" "邀请关系列表" "$REL_LIST" "records" "total"
  body_code "$REL_LIST"
  RELATION_ID="$(json_number_field "id" "$RESP_BODY")"
fi

if [ -n "${RELATION_ID:-}" ]; then
  expect_2xx_body_has "F3-P0-02" "邀请关系详情" "$(api_get "/admin/promotion/invite-relations/$RELATION_ID")" "relationNo" "status"
else
  record_skip "F3-P0-02" "未从邀请关系列表发现关系 ID"
fi

if require_admin_token_or_skip "F3-P0-03" "奖励流水列表"; then
  REWARD_LIST="$(api_get "/admin/promotion/invite-rewards/list?page=1&size=10")"
  expect_2xx_body_has "F3-P0-03" "奖励流水列表" "$REWARD_LIST" "records" "total"
fi

if require_admin_token_or_skip "F3-P0-04" "冻结奖励队列"; then
  expect_2xx_body_has "F3-P0-04" "冻结奖励队列" "$(api_get "/admin/promotion/invite-rewards/frozen/list?page=1&size=10")" "records" "total"
fi

if require_fixture_or_skip "${TEST_FROZEN_REWARD_ID:-}" "F3-P0-05" "冻结奖励确认发放" "TEST_FROZEN_REWARD_ID"; then
  expect_http "F3-P0-05" "冻结奖励确认发放" "200" "$(api_put_json "/admin/promotion/invite-rewards/$TEST_FROZEN_REWARD_ID/approve" '{"remark":"L1 approve"}')"
fi

if require_fixture_or_skip "${TEST_FROZEN_REWARD_REJECT_ID:-}" "F3-P0-06" "冻结奖励确认无效" "TEST_FROZEN_REWARD_REJECT_ID"; then
  expect_http "F3-P0-06" "冻结奖励确认无效" "200" "$(api_put_json "/admin/promotion/invite-rewards/$TEST_FROZEN_REWARD_REJECT_ID/reject" '{"remark":"L1 reject"}')"
fi

if require_fixture_or_skip "${TEST_FROZEN_RELATION_ID:-}" "F3-P1-01" "邀请关系解除冻结" "TEST_FROZEN_RELATION_ID"; then
  expect_http "F3-P1-01" "邀请关系解除冻结" "200" "$(api_put_json "/admin/promotion/invite-relations/$TEST_FROZEN_RELATION_ID/unfreeze" '{"remark":"L1 unfreeze"}')"
fi

if require_fixture_or_skip "${TEST_INVALID_RELATION_ID:-}" "F3-P1-02" "邀请关系人工判无效" "TEST_INVALID_RELATION_ID"; then
  expect_http "F3-P1-02" "邀请关系人工判无效" "200" "$(api_put_json "/admin/promotion/invite-relations/$TEST_INVALID_RELATION_ID/invalid" '{"remark":"L1 invalid"}')"
fi

if require_admin_token_or_skip "F3-P2-02" "不存在关系详情"; then
  expect_http "F3-P2-02" "不存在关系详情" "200" "$(api_get "/admin/promotion/invite-relations/999999999")"
fi

if require_admin_token_or_skip "F4-P0-01" "新增代理"; then
  AGENT_BODY="{\"agentName\":\"L1测试代理$(date +%s)\",\"contactName\":\"L1\",\"contactPhone\":\"13800000000\",\"school\":\"测试大学\",\"bonusRuleGroup\":\"L1_GROUP\",\"status\":\"normal\",\"remark\":\"L1\"}"
  AGENT_CREATE="$(api_post_json "/admin/promotion/agents" "$AGENT_BODY")"
  expect_http "F4-P0-01" "新增代理" "200" "$AGENT_CREATE"
  body_code "$AGENT_CREATE"
  AGENT_ID="$(json_number_field "data" "$RESP_BODY")"
fi

if require_admin_token_or_skip "F4-P0-02" "代理列表"; then
  AGENT_LIST="$(api_get "/admin/promotion/agents/list?page=1&size=10")"
  expect_2xx_body_has "F4-P0-02" "代理列表" "$AGENT_LIST" "records" "total"
  if [ -z "${AGENT_ID:-}" ]; then
    body_code "$AGENT_LIST"
    AGENT_ID="$(json_number_field "id" "$RESP_BODY")"
  fi
fi

if [ -n "${AGENT_ID:-}" ]; then
  expect_2xx_body_has "F4-P0-03" "代理详情" "$(api_get "/admin/promotion/agents/$AGENT_ID")" "agentNo" "agentName"
else
  record_skip "F4-P0-03" "未发现代理 ID"
fi

if require_admin_token_or_skip "F4-P0-04" "素材二维码列表"; then
  MATERIAL_LIST="$(api_get "/admin/promotion/materials/list?page=1&size=10")"
  expect_2xx_body_has "F4-P0-04" "素材二维码列表" "$MATERIAL_LIST" "records" "total"
  body_code "$MATERIAL_LIST"
  MATERIAL_ID="$(json_number_field "id" "$RESP_BODY")"
fi

if [ -n "${MATERIAL_ID:-}" ]; then
  expect_2xx_body_has "F4-P0-05" "重新生成二维码" "$(curl -sS -w "\n%{http_code}" -X POST "$API_URL/admin/promotion/materials/$MATERIAL_ID/regenerate" -H "X-Auth-Token: $TOKEN")" "qrCode" "version"
else
  record_skip "F4-P0-05" "未发现素材 ID"
fi

if require_admin_token_or_skip "F4-P0-06" "结算列表"; then
  expect_2xx_body_has "F4-P0-06" "结算列表" "$(api_get "/admin/promotion/settlements/list?page=1&size=10")" "records" "total"
fi

if require_fixture_or_skip "${TEST_SETTLEMENT_UNSETTLED_ID:-}" "F4-P0-07" "标记结算已确认" "TEST_SETTLEMENT_UNSETTLED_ID"; then
  expect_http "F4-P0-07" "标记结算已确认" "200" "$(api_put_json "/admin/promotion/settlements/$TEST_SETTLEMENT_UNSETTLED_ID/confirm" '{"remark":"L1 confirm"}')"
fi

if require_fixture_or_skip "${TEST_SETTLEMENT_CONFIRMED_ID:-}" "F4-P0-08" "标记结算已发放" "TEST_SETTLEMENT_CONFIRMED_ID"; then
  expect_http "F4-P0-08" "标记结算已发放" "200" "$(api_put_json "/admin/promotion/settlements/$TEST_SETTLEMENT_CONFIRMED_ID/paid" '{"paidAmount":1,"remark":"L1 paid"}')"
fi

if [ -n "${AGENT_ID:-}" ]; then
  expect_http "F4-P1-01" "暂停代理" "200" "$(api_put_json "/admin/promotion/agents/$AGENT_ID/status" '{"status":"paused"}')"
else
  record_skip "F4-P1-01" "未发现代理 ID"
fi

if require_fixture_or_skip "${TEST_TERMINATE_AGENT_ID:-}" "F4-P1-02" "终止代理" "TEST_TERMINATE_AGENT_ID"; then
  expect_http "F4-P1-02" "终止代理" "200" "$(api_put_json "/admin/promotion/agents/$TEST_TERMINATE_AGENT_ID/status" '{"status":"terminated"}')"
fi

if [ -n "${MATERIAL_ID:-}" ]; then
  expect_http "F4-P1-03" "停用二维码展示" "200" "$(api_put_json "/admin/promotion/materials/$MATERIAL_ID/disable" '{"remark":"L1 disable"}')"
else
  record_skip "F4-P1-03" "未发现素材 ID"
fi

if require_fixture_or_skip "${TEST_SETTLEMENT_PAID_ID:-}" "F4-P2-02" "paid 结算单重复发放" "TEST_SETTLEMENT_PAID_ID"; then
  expect_http "F4-P2-02" "paid 结算单重复发放" "200" "$(api_put_json "/admin/promotion/settlements/$TEST_SETTLEMENT_PAID_ID/paid" '{"paidAmount":1,"remark":"L1 repeat paid"}')"
fi

if [ -n "$LOW_PRIV_TOKEN" ]; then
  expect_http "F4-P3-01" "低权限无权新增代理" "403" "$(api_post_json_token "$LOW_PRIV_TOKEN" "/admin/promotion/agents" '{"agentName":"低权限代理"}')"
else
  record_skip "F4-P3-01" "未提供 LOW_PRIV_TOKEN"
fi

if [ -n "$LOW_PRIV_TOKEN" ] && [ -n "${TEST_SETTLEMENT_CONFIRMED_ID:-}" ]; then
  expect_http "F4-P3-02" "低权限无权标记 paid" "403" "$(api_put_json_token "$LOW_PRIV_TOKEN" "/admin/promotion/settlements/$TEST_SETTLEMENT_CONFIRMED_ID/paid" '{"paidAmount":1,"remark":"low forbidden"}')"
else
  record_skip "F4-P3-02" "未提供 LOW_PRIV_TOKEN 或 TEST_SETTLEMENT_CONFIRMED_ID"
fi

echo "总计 $TOTAL / 通过 $PASS / 失败 $FAIL / 跳过 $SKIP"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
