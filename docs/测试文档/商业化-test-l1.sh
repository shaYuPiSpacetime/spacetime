#!/bin/bash
# ================================================================
# PRD-04 商业化 - L1 接口测试脚本
# 范围：小程序 VIP/成家币/资产/支付/解锁 + 后台套餐CRUD/财务查询
# ================================================================
API_URL="${API_URL:-http://localhost:8080}"
ADMIN_USERNAME="${ADMIN_USERNAME:-peter}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-000000}"
MINIAPP_TOKEN="${MINIAPP_TOKEN:-}"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'; NC='\033[0m'
PASS=0; FAIL=0

api_post_no_token() { curl -s -w "\n%{http_code}" -X POST "$1" -H "Content-Type: application/json" -d "$2"; }
api_get_no_token()  { curl -s -w "\n%{http_code}" -X GET "$1"; }
api_post_json()     { curl -s -w "\n%{http_code}" -X POST "$1" -H "X-Auth-Token: ${TOKEN}" -H "Content-Type: application/json" -d "$2"; }
api_get()           { curl -s -w "\n%{http_code}" -X GET "$1" -H "X-Auth-Token: ${TOKEN}"; }
api_put_json()      { curl -s -w "\n%{http_code}" -X PUT "$1" -H "X-Auth-Token: ${TOKEN}" -H "Content-Type: application/json" -d "$2"; }
api_get_miniapp()   { curl -s -w "\n%{http_code}" -X GET "$1" -H "X-Auth-Token: ${MINIAPP_TOKEN}"; }
api_post_miniapp()  { curl -s -w "\n%{http_code}" -X POST "$1" -H "X-Auth-Token: ${MINIAPP_TOKEN}" -H "Content-Type: application/json" -d "$2"; }

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

check_code() {
  local label="$1" expected="$2" actual="$3"
  if [ "$actual" = "$expected" ]; then
    echo -e "  ${GREEN}PASS${NC} $label (code=$actual)"; ((PASS++))
  else
    echo -e "  ${RED}FAIL${NC} $label (expected $expected, got $actual)"; ((FAIL++))
  fi
}

check_contains() {
  local label="$1" body="$2" keyword="$3"
  if echo "$body" | grep -q "$keyword"; then
    echo -e "  ${GREEN}PASS${NC} $label"; ((PASS++))
  else
    echo -e "  ${RED}FAIL${NC} $label (missing '$keyword')"; ((FAIL++))
  fi
}

login_admin() {
  LOGIN_RESP=$(api_post_no_token "$API_URL/admin/login" "{\"account\":\"$ADMIN_USERNAME\",\"password\":\"$ADMIN_PASSWORD\"}")
  parse_response "$LOGIN_RESP"
  TOKEN=$(json_field "$RESP_BODY" "data.token")
  if [ -z "$TOKEN" ] || [ "$TOKEN" = "None" ]; then
    echo -e "${RED}管理员登录失败，请检查服务是否启动${NC}"
    exit 1
  fi
  echo -e "${GREEN}管理员登录成功${NC}"
}

# ================================================================
echo "=========================================="
echo "  PRD-04 商业化 L1 接口冒烟测试"
echo "  API: $API_URL"
echo "=========================================="

login_admin

# ---------- 后台: VIP 权益 ----------
echo -e "\n${YELLOW}[后台] VIP 权益管理${NC}"

# 列表
RESP=$(api_get "$API_URL/admin/vip/benefits/list")
parse_response "$RESP"
check_code "VIP权益列表" 200 "$RESP_CODE"

# 新增
RESP=$(api_post_json "$API_URL/admin/vip/benefits" \
  '{"benefitCode":"test_benefit","benefitName":"测试权益","benefitType":"quota","benefitDesc":"测试描述","displayOrder":1,"status":"ENABLED"}')
parse_response "$RESP"
check_code "新增VIP权益" 200 "$RESP_CODE"
BENEFIT_ID=$(json_field "$RESP_BODY" "data")
echo "  权益ID: $BENEFIT_ID"

# 详情
RESP=$(api_get "$API_URL/admin/vip/benefits/$BENEFIT_ID")
parse_response "$RESP"
check_code "VIP权益详情" 200 "$RESP_CODE"

# 编辑
RESP=$(api_put_json "$API_URL/admin/vip/benefits/$BENEFIT_ID" \
  '{"benefitCode":"test_benefit","benefitName":"测试权益(已编辑)","benefitType":"quota","benefitDesc":"更新后的描述","displayOrder":2,"status":"ENABLED"}')
parse_response "$RESP"
check_code "编辑VIP权益" 200 "$RESP_CODE"

# 停用
RESP=$(api_put_json "$API_URL/admin/vip/benefits/$BENEFIT_ID/status" '{"status":"DISABLED"}')
parse_response "$RESP"
check_code "停用VIP权益" 200 "$RESP_CODE"

# ---------- 后台: VIP 套餐 ----------
echo -e "\n${YELLOW}[后台] VIP 套餐管理${NC}"

RESP=$(api_get "$API_URL/admin/vip/packages/list")
parse_response "$RESP"
check_code "VIP套餐列表" 200 "$RESP_CODE"

RESP=$(api_post_json "$API_URL/admin/vip/packages" \
  '{"packageName":"测试月卡","packageType":"normal","price":19.90,"originPrice":25.00,"durationDays":30,"recommendFlag":1,"packageTag":"hot","sortOrder":1,"status":"ENABLED"}')
parse_response "$RESP"
check_code "新增VIP套餐" 200 "$RESP_CODE"
VIP_PKG_ID=$(json_field "$RESP_BODY" "data")
echo "  套餐ID: $VIP_PKG_ID"

RESP=$(api_get "$API_URL/admin/vip/packages/$VIP_PKG_ID")
parse_response "$RESP"
check_code "VIP套餐详情" 200 "$RESP_CODE"

RESP=$(api_put_json "$API_URL/admin/vip/packages/$VIP_PKG_ID/status" '{"status":"DISABLED"}')
parse_response "$RESP"
check_code "停用VIP套餐" 200 "$RESP_CODE"

# ---------- 后台: 成家币套餐 ----------
echo -e "\n${YELLOW}[后台] 成家币套餐管理${NC}"

RESP=$(api_get "$API_URL/admin/coin/packages/list")
parse_response "$RESP"
check_code "币套餐列表" 200 "$RESP_CODE"

RESP=$(api_post_json "$API_URL/admin/coin/packages" \
  '{"packageName":"测试币套餐","amount":6.00,"coinCount":60,"bonusCoinCount":10,"recommendFlag":1,"packageTag":"hot","packageDesc":"加赠10币","sortOrder":1,"status":"ENABLED"}')
parse_response "$RESP"
check_code "新增币套餐" 200 "$RESP_CODE"
COIN_PKG_ID=$(json_field "$RESP_BODY" "data")
echo "  币套餐ID: $COIN_PKG_ID"

RESP=$(api_put_json "$API_URL/admin/coin/packages/$COIN_PKG_ID/status" '{"status":"DISABLED"}')
parse_response "$RESP"
check_code "停用币套餐" 200 "$RESP_CODE"

# ---------- 后台: 财务中心 ----------
echo -e "\n${YELLOW}[后台] 财务中心${NC}"

RESP=$(api_get "$API_URL/admin/finance/orders/list?page=1&size=10")
parse_response "$RESP"
check_code "订单列表" 200 "$RESP_CODE"
check_contains "订单列表含data" "$RESP_BODY" "data"

RESP=$(api_get "$API_URL/admin/finance/orders/list?page=1&size=10&orderType=vip&orderStatus=success")
parse_response "$RESP"
check_code "订单筛选(类型+状态)" 200 "$RESP_CODE"

RESP=$(api_get "$API_URL/admin/finance/flows/list?page=1&size=10")
parse_response "$RESP"
check_code "流水列表" 200 "$RESP_CODE"

RESP=$(api_get "$API_URL/admin/finance/refunds/list?page=1&size=10")
parse_response "$RESP"
check_code "退款列表" 200 "$RESP_CODE"

RESP=$(api_get "$API_URL/admin/finance/stats/daily?date=2026-05-28")
parse_response "$RESP"
check_code "日统计" 200 "$RESP_CODE"

# ---------- 权限校验 ----------
echo -e "\n${YELLOW}[后台] 权限校验${NC}"

RESP=$(api_get_no_token "$API_URL/admin/vip/benefits/list")
parse_response "$RESP"
check_code "无token访问-401" 401 "$RESP_CODE"

# ---------- 小程序接口 (如果 MINIAPP_TOKEN 已设置) ----------
if [ -n "$MINIAPP_TOKEN" ]; then
  echo -e "\n${YELLOW}[小程序] 商业化接口${NC}"

  RESP=$(api_get_miniapp "$API_URL/miniapp/vip/packages")
  parse_response "$RESP"
  check_code "VIP套餐列表" 200 "$RESP_CODE"

  RESP=$(api_get_miniapp "$API_URL/miniapp/vip/benefits")
  parse_response "$RESP"
  check_code "VIP权益列表" 200 "$RESP_CODE"

  RESP=$(api_get_miniapp "$API_URL/miniapp/vip/status")
  parse_response "$RESP"
  check_code "VIP状态查询" 200 "$RESP_CODE"

  RESP=$(api_get_miniapp "$API_URL/miniapp/coin/packages")
  parse_response "$RESP"
  check_code "币套餐列表" 200 "$RESP_CODE"

  RESP=$(api_get_miniapp "$API_URL/miniapp/coin/balance")
  parse_response "$RESP"
  check_code "币余额查询" 200 "$RESP_CODE"

  RESP=$(api_get_miniapp "$API_URL/miniapp/asset/summary")
  parse_response "$RESP"
  check_code "资产摘要" 200 "$RESP_CODE"

  # 创建订单
  RESP=$(api_post_miniapp "$API_URL/miniapp/payment/create-order" '{"orderType":"vip","packageId":'$VIP_PKG_ID'}')
  parse_response "$RESP"
  check_code "创建VIP订单" 200 "$RESP_CODE"
  ORDER_ID=$(json_field "$RESP_BODY" "data.orderId")

  # 模拟支付
  if [ -n "$ORDER_ID" ] && [ "$ORDER_ID" != "None" ]; then
    RESP=$(api_post_miniapp "$API_URL/miniapp/payment/mock-pay/$ORDER_ID" "{}")
    parse_response "$RESP"
    check_code "模拟支付" 200 "$RESP_CODE"

    # 幂等支付
    RESP=$(api_post_miniapp "$API_URL/miniapp/payment/mock-pay/$ORDER_ID" "{}")
    parse_response "$RESP"
    check_code "幂等支付" 200 "$RESP_CODE"
  fi

  # 解锁 (需要余额)
  RESP=$(api_post_miniapp "$API_URL/miniapp/asset/unlock" \
    '{"unlockScene":"ideal_user","targetUserIds":[101]}')
  parse_response "$RESP"
  check_code "单条解锁" 200 "$RESP_CODE"

  # 批量解锁超限
  RESP=$(api_post_miniapp "$API_URL/miniapp/asset/unlock" \
    '{"unlockScene":"ideal_user","targetUserIds":[101,102,103,104,105,106]}')
  parse_response "$RESP"
  check_code "批量解锁超限(6个)" 400 "$RESP_CODE"
else
  echo -e "\n${YELLOW}[小程序] 跳过 (未设置 MINIAPP_TOKEN，如需测试请设置后运行)${NC}"
fi

# ================================================================
echo -e "\n=========================================="
echo -e "  测试结果: ${GREEN}通过 $PASS${NC} / ${RED}失败 $FAIL${NC}"
echo "=========================================="

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
