#!/bin/bash
# ================================================================
# 推广裂变 - L1 接口测试脚本（已实现接口范围）
# 范围：
#   - 小程序匿名接口：rules/share-log/qr-source
#   - 后台：规则、邀请列表、奖励列表/复核、代理/二维码、结算
# 未纳入：
#   - 邀请导出、代理统计、代理奖金明细/结算导出不纳入本期需求范围
#   - PRD-03/04/06 真实通知、成家币、认证/支付联动
# ================================================================
API_URL="${API_URL:-http://localhost:8080}"
ADMIN_USERNAME="${ADMIN_USERNAME:-peter}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-000000}"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'; NC='\033[0m'

api_post_no_token() { curl -s -w "\n%{http_code}" -X POST "$1" -H "Content-Type: application/json" -d "$2"; }
api_get_no_token()  { curl -s -w "\n%{http_code}" -X GET "$1"; }
api_post_json()     { curl -s -w "\n%{http_code}" -X POST "$1" -H "X-Auth-Token: ${TOKEN}" -H "Content-Type: application/json" -d "$2"; }
api_get()           { curl -s -w "\n%{http_code}" -X GET "$1" -H "X-Auth-Token: ${TOKEN}"; }
api_put_json()      { curl -s -w "\n%{http_code}" -X PUT "$1" -H "X-Auth-Token: ${TOKEN}" -H "Content-Type: application/json" -d "$2"; }

parse_response() { RESP_CODE=$(echo "$1" | tail -1); RESP_BODY=$(echo "$1" | sed '$d'); }
json_field() {
  echo "$1" | python3 -c "
import sys,json
d=json.load(sys.stdin)
for k in '$2'.split('.'):
    if isinstance(d, dict): d=d.get(k)
    else: d=None
v=d if d is not None else ''
print(str(v).lower() if isinstance(v, bool) else v)
" 2>/dev/null
}
json_eval() {
  BODY="$1" EXPR="$2" python3 - <<'PY' 2>/dev/null
import json, os
d = json.loads(os.environ["BODY"])
safe = {"next": next, "str": str, "len": len}
print(eval(os.environ["EXPR"], {"__builtins__": {}}, {"d": d, **safe}))
PY
}
json_ids_by_perms() {
  BODY="$1" python3 - "${@:2}" <<'PY' 2>/dev/null
import json, os, sys
perms = set(sys.argv[1:])
d = json.loads(os.environ["BODY"])
ids = []
def walk(items):
    for item in items or []:
        if item.get("perms") in perms:
            ids.append(str(item.get("id")))
        walk(item.get("children"))
walk(d.get("data"))
print(",".join(ids))
PY
}
login_admin() {
  LOGIN_RESP=$(api_post_no_token "$API_URL/admin/login" "{\"account\":\"$ADMIN_USERNAME\",\"password\":\"$ADMIN_PASSWORD\"}")
  parse_response "$LOGIN_RESP"
  TOKEN=$(json_field "$RESP_BODY" "data.token")
  if [ -z "$TOKEN" ]; then
    echo -e "${RED}❌ 登录失败，无法获取 Token (resp: $RESP_BODY)${NC}"
    exit 1
  fi
}
ensure_promotion_permissions() {
  local perms_csv role_id user_id user_role_ids bind_role_ids
  local required_perms=(
    "promotion:rule:list" "promotion:rule:add" "promotion:rule:edit"
    "promotion:invite:list" "promotion:invite:review"
    "promotion:reward:list" "promotion:reward:review"
    "promotion:agent:list" "promotion:agent:add" "promotion:agent:edit" "promotion:agent:code"
    "promotion:settlement:list" "promotion:settlement:add" "promotion:settlement:confirm" "promotion:settlement:pay"
  )

  parse_response "$(api_get "$API_URL/admin/menu/list")"
  perms_csv=$(json_ids_by_perms "$RESP_BODY" "${required_perms[@]}")
  if [ -z "$perms_csv" ]; then
    echo -e "${YELLOW}⚠️  未发现 promotion 权限菜单，开始创建测试权限节点${NC}"
    local sort=1
    for perm in "${required_perms[@]}"; do
      parse_response "$(api_post_json "$API_URL/admin/menu" "{\"parentId\":0,\"menuName\":\"$perm\",\"menuType\":\"F\",\"perms\":\"$perm\",\"menuSort\":$sort,\"status\":\"ENABLED\",\"visible\":0,\"remark\":\"L1测试自举创建\"}")"
      if [ "$RESP_CODE" != "200" ]; then
        echo -e "${RED}❌ 创建权限 $perm 失败: $RESP_BODY${NC}"
        exit 1
      fi
      sort=$((sort+1))
    done
    parse_response "$(api_get "$API_URL/admin/menu/list")"
    perms_csv=$(json_ids_by_perms "$RESP_BODY" "${required_perms[@]}")
    if [ -z "$perms_csv" ]; then
      echo -e "${RED}❌ 创建后仍未查询到 promotion 权限菜单${NC}"
      exit 1
    fi
  fi

  parse_response "$(api_get "$API_URL/admin/role/list?page=1&size=100")"
  role_id=$(json_eval "$RESP_BODY" "next((r.get('id') for r in d.get('data',{}).get('records',[]) if r.get('roleCode') == 'promotion_l1_test' or r.get('roleName') == '推广测试角色'), '')")
  if [ -z "$role_id" ]; then
    parse_response "$(api_post_json "$API_URL/admin/role" '{"roleName":"推广测试角色","roleCode":"promotion_l1_test","roleGroup":"TEST","roleSort":990,"status":"ENABLED","remark":"PRD-07 L1/L4测试自举角色"}')"
    role_id=$(json_field "$RESP_BODY" "data")
  fi
  if [ -z "$role_id" ]; then
    echo -e "${RED}❌ 准备推广测试角色失败: $RESP_BODY${NC}"
    exit 1
  fi

  parse_response "$(api_put_json "$API_URL/admin/role/$role_id/menus" "{\"menuIds\":[${perms_csv}]}")"
  if [ "$RESP_CODE" != "200" ]; then
    echo -e "${RED}❌ 绑定推广权限到测试角色失败: $RESP_BODY${NC}"
    exit 1
  fi

  parse_response "$(api_get "$API_URL/admin/user/list?page=1&size=100")"
  user_id=$(json_eval "$RESP_BODY" "next((u.get('id') for u in d.get('data',{}).get('records',[]) if u.get('username') == '$ADMIN_USERNAME'), '')")
  if [ -z "$user_id" ]; then
    echo -e "${RED}❌ 未找到测试账号 $ADMIN_USERNAME${NC}"
    exit 1
  fi
  parse_response "$(api_get "$API_URL/admin/user/$user_id")"
  user_role_ids=$(json_eval "$RESP_BODY" "','.join(str(x) for x in (d.get('data',{}).get('roleIds') or []))")
  bind_role_ids="$user_role_ids"
  if [ "$ADMIN_USERNAME" = "peter" ] && ! echo ",$bind_role_ids," | grep -q ",1,"; then
    if [ -n "$bind_role_ids" ]; then
      bind_role_ids="1,$bind_role_ids"
    else
      bind_role_ids="1"
    fi
  fi
  if ! echo ",$bind_role_ids," | grep -q ",$role_id,"; then
    if [ -n "$bind_role_ids" ]; then
      bind_role_ids="$bind_role_ids,$role_id"
    else
      bind_role_ids="$role_id"
    fi
  fi
  parse_response "$(api_put_json "$API_URL/admin/user/$user_id/roles" "{\"roleIds\":[${bind_role_ids}]}")"
  if [ "$RESP_CODE" != "200" ]; then
    echo -e "${RED}❌ 绑定测试角色到用户失败: $RESP_BODY${NC}"
    exit 1
  fi

  login_admin
  echo "✅ 已预置 promotion 权限并刷新 Token"
}

TOTAL=0; PASS=0; FAIL=0; SKIP=0
assert_eq() { local id="$1" d="$2" e="$3" a="$4"; TOTAL=$((TOTAL+1)); if [ "$e" = "$a" ]; then PASS=$((PASS+1)); echo -e "${GREEN}✅ [$id] $d${NC}"; else FAIL=$((FAIL+1)); echo -e "${RED}❌ [$id] $d | exp=$e act=$a${NC}"; echo "   body=$RESP_BODY"; fi; }
assert_contains() { local id="$1" d="$2" k="$3" a="$4"; TOTAL=$((TOTAL+1)); if echo "$a" | grep -q "$k"; then PASS=$((PASS+1)); echo -e "${GREEN}✅ [$id] $d${NC}"; else FAIL=$((FAIL+1)); echo -e "${RED}❌ [$id] $d | need:$k${NC}"; echo "   body=$a"; fi; }
skip_test() { TOTAL=$((TOTAL+1)); SKIP=$((SKIP+1)); echo -e "${YELLOW}⏭️  [$1] $2 | $3${NC}"; }

echo "=========================================="
echo " 推广裂变 L1 接口测试（已实现范围）"
echo " API_URL: $API_URL"
echo "=========================================="

echo ""
echo "── 0. 环境检查 & 登录 ──"
parse_response "$(api_get_no_token "$API_URL/admin/routers")"
if [ "$RESP_CODE" = "000" ]; then
  echo -e "${RED}❌ 后端 $API_URL 无法连接${NC}"
  exit 1
fi
echo "✅ 后端 $API_URL 可达"

login_admin
echo "✅ 登录成功，Token=${TOKEN:0:12}..."
ensure_promotion_permissions

echo ""
echo "── 1. 小程序匿名推广接口 ──"
RULES_RESP=$(api_get_no_token "$API_URL/miniapp/promotion/invite/rules")
parse_response "$RULES_RESP"
assert_eq "F1-P0-02" "获取活动规则可匿名访问" "200" "$RESP_CODE"
assert_contains "F1-P0-02-body" "活动规则包含三项认证说明" "三项认证" "$RESP_BODY"

TRACE_MARK="l1-$(date +%s)"
SHARE_RESP=$(api_post_no_token "$API_URL/miniapp/promotion/invite/share-log" "{\"sourceType\":\"user_qr\",\"scene\":\"$TRACE_MARK\"}")
parse_response "$SHARE_RESP"
TRACE_NO=$(json_field "$RESP_BODY" "data.traceNo")
assert_eq "F1-P0-04" "记录普通分享来源" "200" "$RESP_CODE"
assert_contains "F1-P0-04-trace" "返回 traceNo" "TR" "$RESP_BODY"

MISSING_SOURCE_RESP=$(api_post_no_token "$API_URL/miniapp/promotion/invite/share-log" "{\"inviterId\":100}")
parse_response "$MISSING_SOURCE_RESP"
MISSING_SOURCE_CODE=$(json_field "$RESP_BODY" "code")
assert_eq "F1-P2-01" "分享来源缺少来源类型" "5001" "$MISSING_SOURCE_CODE"

echo ""
echo "── 2. 推广规则管理 ──"
RULE_NAME="L1PromotionRule$(date +%s)"
CREATE_RULE_RESP=$(api_post_json "$API_URL/admin/promotion/rules" "{\"ruleName\":\"$RULE_NAME\",\"ruleType\":\"user_invite\",\"eventType\":\"register_login_reward\",\"rewardAmount\":10,\"rewardUnit\":\"coin\",\"status\":\"ENABLED\"}")
parse_response "$CREATE_RULE_RESP"
RULE_ID=$(json_field "$RESP_BODY" "data")
assert_eq "F2-P0-01" "新增普通邀请奖励规则" "200" "$RESP_CODE"

RULE_LIST_RESP=$(api_get "$API_URL/admin/promotion/rules/list?page=1&size=10&ruleType=user_invite")
parse_response "$RULE_LIST_RESP"
assert_eq "F2-P0-04" "查询规则列表" "200" "$RESP_CODE"
assert_contains "F2-P0-04-body" "规则列表包含新建规则" "$RULE_NAME" "$RESP_BODY"

if [ -n "$RULE_ID" ]; then
  UPDATE_RULE_RESP=$(api_put_json "$API_URL/admin/promotion/rules/$RULE_ID" "{\"ruleName\":\"$RULE_NAME-已编辑\",\"ruleType\":\"user_invite\",\"eventType\":\"register_login_reward\",\"rewardAmount\":12,\"rewardUnit\":\"coin\",\"status\":\"ENABLED\"}")
  parse_response "$UPDATE_RULE_RESP"
  assert_eq "F2-P0-02" "编辑规则" "200" "$RESP_CODE"

  TIER_RESP=$(api_put_json "$API_URL/admin/promotion/rules/$RULE_ID/tiers" "[{\"minCount\":0,\"maxCount\":2,\"rewardAmount\":5,\"status\":\"ENABLED\"},{\"minCount\":3,\"maxCount\":8,\"rewardAmount\":10,\"status\":\"ENABLED\"}]")
  parse_response "$TIER_RESP"
  assert_eq "F2-P0-03" "保存阶梯规则" "200" "$RESP_CODE"

  OVERLAP_RESP=$(api_put_json "$API_URL/admin/promotion/rules/$RULE_ID/tiers" "[{\"minCount\":1,\"maxCount\":5,\"rewardAmount\":5},{\"minCount\":5,\"maxCount\":8,\"rewardAmount\":10}]")
  parse_response "$OVERLAP_RESP"
  OVERLAP_CODE=$(json_field "$RESP_BODY" "code")
  assert_eq "F2-P2-02" "保存阶梯区间重叠应失败" "5001" "$OVERLAP_CODE"

  STATUS_RESP=$(api_put_json "$API_URL/admin/promotion/rules/$RULE_ID/status" "{\"status\":\"DISABLED\"}")
  parse_response "$STATUS_RESP"
  assert_eq "F2-P1-01" "启停规则" "200" "$RESP_CODE"
else
  skip_test "F2-P0-02/F2-P0-03/F2-P1-01" "规则后续链式测试" "规则创建失败"
fi

NEG_RULE_RESP=$(api_post_json "$API_URL/admin/promotion/rules" "{\"ruleName\":\"L1NegativeReward\",\"ruleType\":\"user_invite\",\"eventType\":\"register_login_reward\",\"rewardAmount\":-1,\"rewardUnit\":\"coin\"}")
parse_response "$NEG_RULE_RESP"
NEG_RULE_CODE=$(json_field "$RESP_BODY" "code")
assert_eq "F2-P2-01" "新增规则金额为负数" "5001" "$NEG_RULE_CODE"

INVITE_LIST_RESP=$(api_get "$API_URL/admin/promotion/invites/list?page=1&size=10")
parse_response "$INVITE_LIST_RESP"
assert_eq "F2-P0-05" "查询邀请关系列表" "200" "$RESP_CODE"

echo ""
echo "── 3. 奖励流水与复核 ──"
REWARD_LIST_RESP=$(api_get "$API_URL/admin/promotion/rewards/list?page=1&size=10")
parse_response "$REWARD_LIST_RESP"
assert_eq "F3-P0-01" "查询奖励流水列表" "200" "$RESP_CODE"

FROZEN_RESP=$(api_get "$API_URL/admin/promotion/rewards/frozen?page=1&size=10")
parse_response "$FROZEN_RESP"
assert_eq "F3-P0-02" "查询冻结队列" "200" "$RESP_CODE"

NON_EXIST_REWARD_RESP=$(api_put_json "$API_URL/admin/promotion/rewards/999999999/approve" "{\"remark\":\"不存在\"}")
parse_response "$NON_EXIST_REWARD_RESP"
NON_EXIST_REWARD_CODE=$(json_field "$RESP_BODY" "code")
assert_eq "F3-P2-03" "审核不存在/非 frozen 奖励应失败" "5001" "$NON_EXIST_REWARD_CODE"

echo ""
echo "── 4. 代理与二维码 ──"
AGENT_NAME="L1Agent$(date +%s)"
CREATE_AGENT_RESP=$(api_post_json "$API_URL/admin/promotion/agents" "{\"agentName\":\"$AGENT_NAME\",\"contactName\":\"L1\",\"contactPhone\":\"13800000000\",\"school\":\"测试大学\",\"campus\":\"主校区\",\"agentGroup\":\"DEFAULT\",\"status\":\"normal\"}")
parse_response "$CREATE_AGENT_RESP"
AGENT_ID=$(json_field "$RESP_BODY" "data")
assert_eq "F3-P0-05" "新增代理" "200" "$RESP_CODE"

AGENT_LIST_RESP=$(api_get "$API_URL/admin/promotion/agents/list?page=1&size=10&keyword=$AGENT_NAME")
parse_response "$AGENT_LIST_RESP"
assert_eq "F3-P1-03" "查询代理列表" "200" "$RESP_CODE"
assert_contains "F3-P1-03-body" "代理列表包含新建代理" "$AGENT_NAME" "$RESP_BODY"

if [ -n "$AGENT_ID" ]; then
  CODE_RESP=$(api_post_json "$API_URL/admin/promotion/agents/$AGENT_ID/qr-codes/regenerate" "{}")
  parse_response "$CODE_RESP"
  QR_CODE=$(json_field "$RESP_BODY" "data.qrCode")
  QR_CODE_ID=$(json_field "$RESP_BODY" "data.id")
  assert_eq "F3-P0-06" "生成代理二维码" "200" "$RESP_CODE"
  assert_contains "F3-P0-06-code" "返回二维码编号" "A" "$QR_CODE"

  AGENT_SOURCE_RESP=$(api_get_no_token "$API_URL/miniapp/promotion/invite/qr-source?qrCode=$QR_CODE")
  parse_response "$AGENT_SOURCE_RESP"
  assert_eq "F1-P1-01" "查询代理来源" "200" "$RESP_CODE"
  assert_contains "F1-P1-01-body" "代理来源 available=true" "available\":true" "$RESP_BODY"

  AGENT_SHARE_RESP=$(api_post_no_token "$API_URL/miniapp/promotion/invite/share-log" "{\"sourceType\":\"agent_qr\",\"qrCode\":\"$QR_CODE\"}")
  parse_response "$AGENT_SHARE_RESP"
  assert_eq "F1-P0-05" "记录代理扫码来源" "200" "$RESP_CODE"

  PAUSE_RESP=$(api_put_json "$API_URL/admin/promotion/agents/$AGENT_ID/status" "{\"status\":\"paused\"}")
  parse_response "$PAUSE_RESP"
  assert_eq "F3-P1-02" "变更代理状态为 paused" "200" "$RESP_CODE"

  if [ -n "$QR_CODE_ID" ]; then
    DISABLE_CODE_RESP=$(api_put_json "$API_URL/admin/promotion/agent-qr-codes/$QR_CODE_ID/disable" "{}")
    parse_response "$DISABLE_CODE_RESP"
    assert_eq "F3-P1-01" "停用代理二维码" "200" "$RESP_CODE"
  fi
else
  skip_test "F3-P0-06/F1-P1-01/F1-P0-05/F3-P1-02" "代理链式测试" "代理创建失败"
fi

BAD_AGENT_RESP=$(api_post_json "$API_URL/admin/promotion/agents" "{\"school\":\"测试大学\"}")
parse_response "$BAD_AGENT_RESP"
BAD_AGENT_CODE=$(json_field "$RESP_BODY" "code")
assert_eq "F3-P2-04" "新增代理缺少代理名称" "4001" "$BAD_AGENT_CODE"

echo ""
echo "── 5. 结算单 ──"
if [ -n "$AGENT_ID" ]; then
  SETTLE_RESP=$(api_post_json "$API_URL/admin/promotion/settlements" "{\"agentId\":$AGENT_ID,\"periodStart\":\"2026-05-01\",\"periodEnd\":\"2026-05-31\",\"payableAmount\":100,\"statsDesc\":\"L1测试\"}")
  parse_response "$SETTLE_RESP"
  SETTLEMENT_ID=$(json_field "$RESP_BODY" "data")
  assert_eq "F3-P0-08" "生成结算单" "200" "$RESP_CODE"

  SETTLE_LIST_RESP=$(api_get "$API_URL/admin/promotion/settlements/list?page=1&size=10&agentId=$AGENT_ID")
  parse_response "$SETTLE_LIST_RESP"
  assert_eq "F3-P0-list" "查询结算单列表" "200" "$RESP_CODE"

  if [ -n "$SETTLEMENT_ID" ]; then
    CONFIRM_RESP=$(api_put_json "$API_URL/admin/promotion/settlements/$SETTLEMENT_ID/confirm" "{\"remark\":\"L1确认\"}")
    parse_response "$CONFIRM_RESP"
    assert_eq "F3-P0-09" "标记结算单已确认" "200" "$RESP_CODE"

    PAID_RESP=$(api_put_json "$API_URL/admin/promotion/settlements/$SETTLEMENT_ID/paid" "{\"paidAmount\":100,\"remark\":\"L1发放\"}")
    parse_response "$PAID_RESP"
    assert_eq "F3-P0-10" "标记结算单已发放" "200" "$RESP_CODE"

    PAID_AGAIN_RESP=$(api_put_json "$API_URL/admin/promotion/settlements/$SETTLEMENT_ID/paid" "{\"paidAmount\":100,\"remark\":\"重复发放\"}")
    parse_response "$PAID_AGAIN_RESP"
    PAID_AGAIN_CODE=$(json_field "$RESP_BODY" "code")
    assert_eq "F3-P2-02" "已发放结算单再次标记发放应失败" "5001" "$PAID_AGAIN_CODE"
  fi
else
  skip_test "F3-P0-08/F3-P0-09/F3-P0-10" "结算链式测试" "代理创建失败"
fi

BAD_PERIOD_RESP=$(api_post_json "$API_URL/admin/promotion/settlements" "{\"agentId\":1,\"periodStart\":\"2026-06-01\",\"periodEnd\":\"2026-05-01\",\"payableAmount\":100}")
parse_response "$BAD_PERIOD_RESP"
BAD_PERIOD_CODE=$(json_field "$RESP_BODY" "code")
assert_eq "F3-P2-period" "结算开始日期晚于结束日期应失败" "5001" "$BAD_PERIOD_CODE"

echo ""
echo "── 6. 非本期需求范围记录 ──"
skip_test "F2-P1-04" "导出邀请关系" "非本期需求范围"
skip_test "F3-P0-07" "查询代理统计" "非本期需求范围"
skip_test "F3-P1-04" "导出结算明细" "非本期需求范围"

echo ""
echo "=========================================="
echo "L1 汇总: 总计 $TOTAL / 通过 $PASS / 失败 $FAIL / 跳过 $SKIP"
echo "=========================================="
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
