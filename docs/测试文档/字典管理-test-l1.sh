#!/bin/bash
# ================================================================
# 字典管理 - L1 接口测试脚本
# 数据计划：
#   链式：登录获取 Token → 创建字典类型 → 测试CRUD → 创建字典数据 → 测试树/CRUD/级联 → 清理
#   自构建优先，自发现兜底
# ================================================================
API_URL="${API_URL:-http://localhost:8080}"
ADMIN_USERNAME="${ADMIN_USERNAME:-peter}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-000000}"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'; NC='\033[0m'

# ── 认证头使用 X-Auth-Token ──
api_post_no_token() { curl -s -w "\n%{http_code}" -X POST "$1" -H "Content-Type: application/json" -d "$2"; }
api_post_json()     { curl -s -w "\n%{http_code}" -X POST "$1" -H "X-Auth-Token: ${TOKEN}" -H "Content-Type: application/json" -d "$2"; }
api_get()           { curl -s -w "\n%{http_code}" -X GET  "$1" -H "X-Auth-Token: ${TOKEN}"; }
api_put_json()      { curl -s -w "\n%{http_code}" -X PUT "$1" -H "X-Auth-Token: ${TOKEN}" -H "Content-Type: application/json" -d "$2"; }
api_delete()        { curl -s -w "\n%{http_code}" -X DELETE "$1" -H "X-Auth-Token: ${TOKEN}"; }
api_get_no_token()  { curl -s -w "\n%{http_code}" -X GET  "$1"; }
api_post_no_auth()  { curl -s -w "\n%{http_code}" -X POST "$1" -H "Content-Type: application/json" -d "$2"; }

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

TOTAL=0; PASS=0; FAIL=0; SKIP=0
assert_eq() { local id="$1" d="$2" e="$3" a="$4"; TOTAL=$((TOTAL+1)); if [ "$e" = "$a" ]; then PASS=$((PASS+1)); echo -e "${GREEN}✅ [$id] $d${NC}"; else FAIL=$((FAIL+1)); echo -e "${RED}❌ [$id] $d | exp=$e act=$a${NC}"; fi; }
assert_contains() { local id="$1" d="$2" k="$3" a="$4"; TOTAL=$((TOTAL+1)); if echo "$a" | grep -q "$k"; then PASS=$((PASS+1)); echo -e "${GREEN}✅ [$id] $d${NC}"; else FAIL=$((FAIL+1)); echo -e "${RED}❌ [$id] $d | need:$k got:$a${NC}"; fi; }
skip_test() { TOTAL=$((TOTAL+1)); SKIP=$((SKIP+1)); echo -e "${YELLOW}⏭️  [$1] $2 | $3${NC}"; }

check_401() {
  local id="$1" desc="$2" resp="$3"
  parse_response "$resp"
  TOTAL=$((TOTAL+1))
  if [ "$RESP_CODE" = "401" ]; then PASS=$((PASS+1)); echo -e "${GREEN}✅ [$id] $desc | 401${NC}"
  else FAIL=$((FAIL+1)); echo -e "${RED}❌ [$id] $desc | expected 401 got $RESP_CODE${NC}"; fi
}

check_403() {
  local id="$1" desc="$2" resp="$3"
  parse_response "$resp"
  TOTAL=$((TOTAL+1))
  if [ "$RESP_CODE" = "403" ]; then PASS=$((PASS+1)); echo -e "${GREEN}✅ [$id] $desc | 403${NC}"
  else FAIL=$((FAIL+1)); echo -e "${RED}❌ [$id] $desc | expected 403 got $RESP_CODE${NC}"; fi
}

check_400() {
  local id="$1" desc="$2" resp="$3"
  parse_response "$resp"
  TOTAL=$((TOTAL+1))
  if [ "$RESP_CODE" = "400" ]; then PASS=$((PASS+1)); echo -e "${GREEN}✅ [$id] $desc | 400${NC}"
  else FAIL=$((FAIL+1)); echo -e "${RED}❌ [$id] $desc | expected 400 got $RESP_CODE${NC}"; fi
}

echo "=========================================="
echo " 字典管理 L1 接口测试"
echo " API_URL: $API_URL"
echo "=========================================="

# ═══════════════════════════════════════════
# 0. 环境检查 & 登录获取 Token
# ═══════════════════════════════════════════
echo ""
echo "── 0. 环境检查 & 登录 ──"

# 环境连通检查
parse_response "$(api_get_no_token "$API_URL/admin/dict-type/all")"
if [ "$RESP_CODE" = "000" ]; then
  echo -e "${RED}❌ 后端 $API_URL 无法连接${NC}"
  exit 1
fi
echo "✅ 后端 $API_URL 可达"

# 登录获取 Token
LOGIN_RESP=$(api_post_no_token "$API_URL/admin/login" "{\"account\":\"$ADMIN_USERNAME\",\"password\":\"$ADMIN_PASSWORD\"}")
parse_response "$LOGIN_RESP"
TOKEN=$(json_field "$RESP_BODY" "data.token")
if [ -z "$TOKEN" ] || [ "$TOKEN" = "" ]; then
  echo -e "${RED}❌ 登录失败，无法获取 Token (resp: $RESP_BODY)${NC}"
  exit 1
fi
echo "✅ 登录成功，Token=${TOKEN:0:20}..."
PERMISSIONS=$(json_field "$RESP_BODY" "data.permissions")
echo "   权限: $PERMISSIONS"

# ═══════════════════════════════════════════
# 1. 字典类型管理 (DictTypeController)
# ═══════════════════════════════════════════
echo ""
echo "── 1. 字典类型管理 ──"

# 1a. 创建测试字典类型 (数据准备)
TEST_DICT_TYPE="test_l1_$(date +%s)"
CREATE_TYPE_RESP=$(api_post_json "$API_URL/admin/dict-type" "{\"dictName\":\"L1测试类型\",\"dictType\":\"$TEST_DICT_TYPE\",\"dictSort\":99,\"status\":\"ENABLED\"}")
parse_response "$CREATE_TYPE_RESP"
CREATED_TYPE_ID=$(json_field "$RESP_BODY" "data")
assert_eq "D1-P0-03" "创建字典类型" "200" "$RESP_CODE"

# 1b. 分页查询列表
LIST_RESP=$(api_get "$API_URL/admin/dict-type/list?page=1&size=10")
parse_response "$LIST_RESP"
assert_eq "D1-P0-01" "分页查询字典类型" "200" "$RESP_CODE"
TOTAL_RECORDS=$(json_field "$RESP_BODY" "data.total")
echo "   → 列表 total=$TOTAL_RECORDS"

# 1c. 按关键词搜索
sleep 1
SEARCH_RESP=$(api_get "$API_URL/admin/dict-type/list?page=1&size=10&keyword=L1%E6%B5%8B%E8%AF%95")
parse_response "$SEARCH_RESP"
assert_contains "D1-P2-01" "关键词搜索" "L1测试" "$RESP_BODY"

# 1d. 按状态筛选
STATUS_RESP=$(api_get "$API_URL/admin/dict-type/list?page=1&size=10&status=ENABLED")
parse_response "$STATUS_RESP"
assert_contains "D1-P2-02" "状态筛选" "ENABLED" "$RESP_BODY"

# 1e. 查询全部启用类型
ALL_RESP=$(api_get "$API_URL/admin/dict-type/all")
parse_response "$ALL_RESP"
assert_eq "D1-P0-02" "查询全部字典类型" "200" "$RESP_CODE"

# 1f. 创建时编码重复
DUP_RESP=$(api_post_json "$API_URL/admin/dict-type" "{\"dictName\":\"重复测试\",\"dictType\":\"$TEST_DICT_TYPE\"}")
parse_response "$DUP_RESP"
DUP_MSG=$(json_field "$RESP_BODY" "msg")
assert_eq "D1-P2-03" "编码重复拦截" "字典类型编码已存在" "$DUP_MSG"

# 1g. 缺少必填字段
MISSING_RESP=$(api_post_json "$API_URL/admin/dict-type" "{\"dictType\":\"no_name_test\"}")
parse_response "$MISSING_RESP"
MISSING_CODE=$(json_field "$RESP_BODY" "code")
  assert_eq "D1-P2-04" "缺少必填字段dictName→4001" "4001" "$MISSING_CODE"

# 1h. 更新字典类型
if [ -n "$CREATED_TYPE_ID" ] && [ "$CREATED_TYPE_ID" != "None" ] && [ "$CREATED_TYPE_ID" != "" ]; then
  UPD_RESP=$(api_put_json "$API_URL/admin/dict-type/$CREATED_TYPE_ID" "{\"dictName\":\"L1测试类型(已更新)\",\"dictType\":\"$TEST_DICT_TYPE\",\"dictSort\":88,\"status\":\"ENABLED\"}")
  parse_response "$UPD_RESP"
  assert_eq "D1-P0-04" "更新字典类型" "200" "$RESP_CODE"
else
  skip_test "D1-P0-04" "更新字典类型" "未成功创建，skip"
fi

# 1i. 更新不存在的 ID
UPD_NX_RESP=$(api_put_json "$API_URL/admin/dict-type/999999" "{\"dictName\":\"不存在\",\"dictType\":\"nonexist_type\"}")
parse_response "$UPD_NX_RESP"
UPD_NX_MSG=$(json_field "$RESP_BODY" "msg")
assert_eq "D1-P2-05" "更新不存在的ID" "字典类型不存在" "$UPD_NX_MSG"

# 1j. 编码冲突（创建第二个类型后用它更新第一个）
SECOND_TYPE="test_l1_conflict_$(date +%s)"
api_post_json "$API_URL/admin/dict-type" "{\"dictName\":\"冲突测试\",\"dictType\":\"$SECOND_TYPE\",\"dictSort\":1}" > /dev/null
sleep 1
if [ -n "$CREATED_TYPE_ID" ] && [ "$CREATED_TYPE_ID" != "None" ] && [ "$CREATED_TYPE_ID" != "" ]; then
  CONFLICT_RESP=$(api_put_json "$API_URL/admin/dict-type/$CREATED_TYPE_ID" "{\"dictName\":\"冲突\",\"dictType\":\"$SECOND_TYPE\"}")
  parse_response "$CONFLICT_RESP"
  CONFLICT_MSG=$(json_field "$RESP_BODY" "msg")
  assert_contains "D1-P2-06" "编码冲突拦截" "已被其他" "$CONFLICT_MSG"
else
  skip_test "D1-P2-06" "编码冲突拦截" "主类型未创建"
fi

# ═══════════════════════════════════════════
# 2. 字典数据管理 (DictDataController)
# ═══════════════════════════════════════════
echo ""
echo "── 2. 字典数据管理 ──"

# 2a. 创建顶级字典数据
if [ -n "$CREATED_TYPE_ID" ] && [ "$CREATED_TYPE_ID" != "None" ] && [ "$CREATED_TYPE_ID" != "" ]; then
  CREATE_DATA_RESP=$(api_post_json "$API_URL/admin/dict-data" "{\"dictType\":\"$TEST_DICT_TYPE\",\"dictLabel\":\"L1测试数据\",\"dictValue\":\"test_val\",\"dictSort\":1,\"status\":\"ENABLED\"}")
  parse_response "$CREATE_DATA_RESP"
  CREATED_DATA_ID=$(json_field "$RESP_BODY" "data")
  assert_eq "D2-P0-02" "创建顶级字典数据" "200" "$RESP_CODE"

  # 2b. 创建子级字典数据
  if [ -n "$CREATED_DATA_ID" ] && [ "$CREATED_DATA_ID" != "None" ] && [ "$CREATED_DATA_ID" != "None" ]; then
    CREATE_CHILD_RESP=$(api_post_json "$API_URL/admin/dict-data" "{\"dictType\":\"$TEST_DICT_TYPE\",\"parentId\":$CREATED_DATA_ID,\"dictLabel\":\"L1子级数据\",\"dictValue\":\"child_val\",\"dictSort\":1,\"status\":\"ENABLED\"}")
    parse_response "$CREATE_CHILD_RESP"
    CHILD_DATA_ID=$(json_field "$RESP_BODY" "data")
    assert_eq "D2-P0-03" "创建子级字典数据" "200" "$RESP_CODE"
    sleep 1
  fi
  sleep 1

  # 2c. 查询字典数据树
  TREE_RESP=$(api_get "$API_URL/admin/dict-data/tree?dictType=$TEST_DICT_TYPE")
  parse_response "$TREE_RESP"
  assert_eq "D2-P0-01" "查询字典数据树" "200" "$RESP_CODE"
  # 应包含 children 字段
  assert_contains "D2-P0-01-children" "树结构含children" "children" "$RESP_BODY"

  # 2d. 不存在的字典类型查树
  EMPTY_TREE_RESP=$(api_get "$API_URL/admin/dict-data/tree?dictType=nonexistent_$(date +%s)")
  parse_response "$EMPTY_TREE_RESP"
  EMPTY_TREE_DATA=$(json_field "$RESP_BODY" "data")
  assert_eq "D2-P2-01" "不存在的字典类型返回空数组" "[]" "$EMPTY_TREE_DATA"

  # 2e. 缺少必填字段
  MISSING_DATA_RESP=$(api_post_json "$API_URL/admin/dict-data" "{\"dictType\":\"$TEST_DICT_TYPE\",\"dictValue\":\"no_label\"}")
  parse_response "$MISSING_DATA_RESP"
  MISSING_DATA_CODE=$(json_field "$RESP_BODY" "code")
    assert_eq "D2-P2-02" "字典数据缺label→4001" "4001" "$MISSING_DATA_CODE"

  # 2f. 更新字典数据
  if [ -n "$CREATED_DATA_ID" ] && [ "$CREATED_DATA_ID" != "None" ] && [ "$CREATED_DATA_ID" != "" ]; then
    UPD_DATA_RESP=$(api_put_json "$API_URL/admin/dict-data/$CREATED_DATA_ID" "{\"dictType\":\"$TEST_DICT_TYPE\",\"dictLabel\":\"L1数据(已更新)\",\"dictValue\":\"test_val_updated\",\"dictSort\":2,\"status\":\"ENABLED\"}")
    parse_response "$UPD_DATA_RESP"
    assert_eq "D2-P0-04" "更新字典数据" "200" "$RESP_CODE"
  else
    skip_test "D2-P0-04" "更新字典数据" "未成功创建"
  fi

  # 2g. 更新不存在的 ID
  UPD_NX_DATA_RESP=$(api_put_json "$API_URL/admin/dict-data/999999" "{\"dictType\":\"$TEST_DICT_TYPE\",\"dictLabel\":\"不存在\",\"dictValue\":\"nx\"}")
  parse_response "$UPD_NX_DATA_RESP"
  UPD_NX_DATA_MSG=$(json_field "$RESP_BODY" "msg")
  assert_eq "D2-P2-03" "更新不存在的数据" "字典数据不存在" "$UPD_NX_DATA_MSG"

  # 2h. 级联删除（删父节点，子节点也应删除）
  if [ -n "$CREATED_DATA_ID" ] && [ "$CREATED_DATA_ID" != "None" ] && [ "$CREATED_DATA_ID" != "" ]; then
    DEL_DATA_RESP=$(api_delete "$API_URL/admin/dict-data/$CREATED_DATA_ID")
    parse_response "$DEL_DATA_RESP"
    assert_eq "D2-P0-05" "级联删除字典数据" "200" "$RESP_CODE"
    sleep 1
    # 验证树中已不存在父节点（级联删除验证）
    TREE_AFTER_RESP=$(api_get "$API_URL/admin/dict-data/tree?dictType=$TEST_DICT_TYPE")
    parse_response "$TREE_AFTER_RESP"
    TOTAL=$((TOTAL+1))
    if echo "$RESP_BODY" | grep -q "\"id\":$CREATED_DATA_ID"; then
      FAIL=$((FAIL+1)); echo -e "${RED}❌ [D2-P0-05-verify] 删后树中仍有该数据 id=$CREATED_DATA_ID${NC}"
    else
      PASS=$((PASS+1)); echo -e "${GREEN}✅ [D2-P0-05-verify] 级联删除已生效，树中无 id=$CREATED_DATA_ID${NC}"
    fi
  fi
else
  skip_test "D2-P0-02" "创建字典数据" "字典类型未创建"
  skip_test "D2-P0-03" "创建子级数据" "字典类型未创建"
  skip_test "D2-P0-01" "查询数据树" "字典类型未创建"
  skip_test "D2-P0-04" "更新字典数据" "字典类型未创建"
  skip_test "D2-P0-05" "级联删除" "字典类型未创建"
fi

# ═══════════════════════════════════════════
# 3. 权限/认证拦截
# ═══════════════════════════════════════════
echo ""
echo "── 3. 权限拦截 ──"

# 3a. 未登录调接口
NOAUTH1=$(api_get_no_token "$API_URL/admin/dict-type/list?page=1&size=10")
check_401 "D1-P3-01" "未登录调字典类型列表" "$NOAUTH1"

NOAUTH2=$(api_get_no_token "$API_URL/admin/dict-data/tree?dictType=gender")
check_401 "D2-P3-01" "未登录调字典数据树" "$NOAUTH2"

# 3b. 无权限调创建（需要无 system:dict:add 权限的 Token）
# 尝试创建一个无管理权限的用户来测试
NO_PERM_TOKEN=""
# 先尝试用登录接口获取一个已知无权限账号的 Token
NO_PERM_RESP=$(api_post_no_token "$API_URL/admin/login" "{\"account\":\"guest\",\"password\":\"000000\"}")
parse_response "$NO_PERM_RESP"
NO_PERM_TOKEN_CANDIDATE=$(json_field "$RESP_BODY" "data.token")
if [ -n "$NO_PERM_TOKEN_CANDIDATE" ] && [ "$NO_PERM_TOKEN_CANDIDATE" != "" ] && [ ${#NO_PERM_TOKEN_CANDIDATE} -gt 5 ]; then
  NO_PERM_TOKEN="$NO_PERM_TOKEN_CANDIDATE"
fi

if [ -n "$NO_PERM_TOKEN" ]; then
  NO_PERM_RESP=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/admin/dict-type" -H "X-Auth-Token: $NO_PERM_TOKEN" -H "Content-Type: application/json" -d '{"dictName":"noperm","dictType":"noperm"}')
  check_403 "D1-P3-02" "无权限创建字典类型" "$NO_PERM_RESP"

  NO_PERM_DATA_RESP=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/admin/dict-data" -H "X-Auth-Token: $NO_PERM_TOKEN" -H "Content-Type: application/json" -d '{"dictType":"gender","dictLabel":"noperm","dictValue":"np"}')
  check_403 "D2-P3-02" "无权限创建字典数据" "$NO_PERM_DATA_RESP"
else
  skip_test "D1-P3-02" "无权限创建字典类型" "无测试用低权限账号"
  skip_test "D2-P3-02" "无权限创建字典数据" "无测试用低权限账号"
fi

# ═══════════════════════════════════════════
# 4. 清理
# ═══════════════════════════════════════════
echo ""
echo "── 4. 清理测试数据 ──"

# 删除第二个字典类型（冲突测试用的）
if [ -n "$SECOND_TYPE" ]; then
  # 查出来删除
  CLEAN_LIST=$(api_get "$API_URL/admin/dict-type/list?page=1&size=100&keyword=$SECOND_TYPE")
  CLEAN_BODY=$(echo "$CLEAN_LIST" | sed '$d')
  CLEAN_ID=$(echo "$CLEAN_BODY" | python3 -c "
import sys,json
try:
    records=json.load(sys.stdin).get('data',{}).get('records',[])
    if records: print(records[0]['id'])
except: pass
" 2>/dev/null)
  if [ -n "$CLEAN_ID" ]; then
    api_delete "$API_URL/admin/dict-type/$CLEAN_ID" > /dev/null
    echo "✅ 清理冲突测试类型 id=$CLEAN_ID"
  fi
fi

# 删除主测试字典类型（级联删除其下的 dict data）
if [ -n "$CREATED_TYPE_ID" ] && [ "$CREATED_TYPE_ID" != "None" ] && [ "$CREATED_TYPE_ID" != "" ]; then
  api_delete "$API_URL/admin/dict-type/$CREATED_TYPE_ID" > /dev/null
  echo "✅ 清理主测试类型 id=$CREATED_TYPE_ID"
fi

# ═══════════════════════════════════════════
# 5. 结果汇总
# ═══════════════════════════════════════════
echo ""
echo "=========================================="
echo " 测试结果汇总"
echo "=========================================="
echo -e " TOTAL: $TOTAL"
echo -e " ${GREEN}PASS:  $PASS${NC}"
echo -e " ${RED}FAIL:  $FAIL${NC}"
echo -e " ${YELLOW}SKIP:  $SKIP${NC}"
echo "=========================================="

if [ "$FAIL" -gt 0 ]; then
  echo -e "${RED}有失败用例，请检查！${NC}"
  exit 1
else
  echo -e "${GREEN}全部通过！${NC}"
  exit 0
fi
