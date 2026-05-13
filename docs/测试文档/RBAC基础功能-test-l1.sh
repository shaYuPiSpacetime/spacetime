#!/bin/bash
# ================================================================
# RBAC基础功能 - L1 接口测试脚本
# 数据计划：
#   链式：登录获取 Token → (创建角色/菜单/用户) → 查列表验证 → 删除清理
#   自构建优先，自发现兜底，不可行则 skip
# ================================================================
API_URL="${API_URL:-http://localhost:8080}"
TOKEN="${TOKEN:-}"
ADMIN_USERNAME="${ADMIN_USERNAME:-admin}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin123}"

# ── 认证头使用 X-Auth-Token ──
api_post()          { curl -s -w "\n%{http_code}" -X POST "$1" -H "X-Auth-Token: ${TOKEN}"; }
api_post_json()     { curl -s -w "\n%{http_code}" -X POST "$1" -H "X-Auth-Token: ${TOKEN}" -H "Content-Type: application/json" -d "$2"; }
api_get()           { curl -s -w "\n%{http_code}" -X GET  "$1" -H "X-Auth-Token: ${TOKEN}"; }
api_put_json()      { curl -s -w "\n%{http_code}" -X PUT "$1" -H "X-Auth-Token: ${TOKEN}" -H "Content-Type: application/json" -d "$2"; }
api_delete()        { curl -s -w "\n%{http_code}" -X DELETE "$1" -H "X-Auth-Token: ${TOKEN}"; }
api_post_no_token() { curl -s -w "\n%{http_code}" -X POST "$1" -H "Content-Type: application/json" -d "$2"; }
api_get_no_token()  { curl -s -w "\n%{http_code}" -X GET  "$1"; }

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
json_error_msg() { json_field "$1" "msg"; }

TOTAL=0; PASS=0; FAIL=0; SKIP=0
assert_eq()       { local id="$1" d="$2" e="$3" a="$4"; TOTAL=$((TOTAL+1)); [ "$e" = "$a" ] && { PASS=$((PASS+1)); echo "✅ [$id] $d"; } || { FAIL=$((FAIL+1)); echo "❌ [$id] $d exp=$e act=$a"; }; }
assert_contains() { local id="$1" d="$2" k="$3" a="$4"; TOTAL=$((TOTAL+1)); echo "$a" | grep -q "$k" && { PASS=$((PASS+1)); echo "✅ [$id] $d"; } || { FAIL=$((FAIL+1)); echo "❌ [$id] $d need:$k got:$a"; }; }
skip_test()       { TOTAL=$((TOTAL+1)); SKIP=$((SKIP+1)); echo "⏭️  [$1] $2 | $3"; }

check_no_token_401() {
  local id="$1" desc="$2" resp="$3"
  parse_response "$resp"
  TOTAL=$((TOTAL+1))
  if [ "$RESP_CODE" = "401" ]; then
    PASS=$((PASS+1)); echo "✅ [$id] $desc | 401 已拦截"
  else
    FAIL=$((FAIL+1)); echo "❌ [$id] $desc | 未被拦截！HTTP $RESP_CODE"
  fi
}

query_record() {
  local url="$1" condition="$2"
  parse_response "$(api_get "$url")"
  echo "$RESP_BODY" | python3 -c "
import sys,json
try:
    for r in json.load(sys.stdin).get('data',{}).get('records',[]):
        $condition
except: pass
" 2>/dev/null
}

echo "=========================================="
echo " Spacetime RBAC L1 接口测试"
echo " API_URL: $API_URL"
echo "=========================================="

# ═══════════════════════════════════════════
# 0. 环境检查
# ═══════════════════════════════════════════
echo ""
echo "── 0. 环境检查 ──"

parse_response "$(api_get "$API_URL/admin/routers")"
if [ "$RESP_CODE" = "000" ]; then
  echo "❌ 后端 $API_URL 无法连接"
  exit 1
fi
echo "✅ 后端 $API_URL 可达 (HTTP $RESP_CODE)"

# ═══════════════════════════════════════════
# 1. 数据准备 — 登录获取 Token
# ═══════════════════════════════════════════
echo ""
echo "── 1. 数据准备 ──"

if [ -z "$TOKEN" ]; then
  LOGIN_JSON=$(printf '{"username":"%s","password":"%s"}' "$ADMIN_USERNAME" "$ADMIN_PASSWORD")
  parse_response "$(api_post_no_token "$API_URL/admin/login" "$LOGIN_JSON")"
  TOKEN=$(json_field "$RESP_BODY" "data.token")
  if [ -n "$TOKEN" ] && [ "$TOKEN" != "none" ]; then
    echo "✅ 登录成功，获取 Token: ${TOKEN:0:12}..."
    ADMIN_PERMISSIONS=$(echo "$RESP_BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('data',{}).get('permissions',[])))" 2>/dev/null)
    echo "   权限数量: $ADMIN_PERMISSIONS"
  else
    echo "❌ 登录失败，无法获取 Token"
    echo "   body: $RESP_BODY"
    exit 1
  fi
else
  echo "✅ 使用已配置的 Token: ${TOKEN:0:12}..."
fi

# ═══════════════════════════════════════════
# 2. 无 Token 安全验证
# ═══════════════════════════════════════════
echo ""
echo "── 2. 无 Token 安全验证 ──"

check_no_token_401 "F2-P3-02" "用户列表未登录应返回 401" "$(api_get_no_token "$API_URL/admin/user/list")"
check_no_token_401 "F3-P3-01" "角色列表未登录应返回 401" "$(api_get_no_token "$API_URL/admin/role/list")"
check_no_token_401 "F5-P3-01" "动态路由未登录应返回 401" "$(api_get_no_token "$API_URL/admin/routers")"

# ═══════════════════════════════════════════
# 3. 缺参 / 参数校验
# ═══════════════════════════════════════════
echo ""
echo "── 3. 缺参 / 参数校验 ──"

# 登录缺参 - 验证失败返回 200 HTTP 但 code=4001 (PARAM_ERROR)
parse_response "$(api_post_no_token "$API_URL/admin/login" '{"username":"admin"}')"
assert_eq "F1-P2-05" "登录缺密码-HTTP状态" "200" "$RESP_CODE"
assert_contains "F1-P2-05" "登录缺密码-非成功" "4001" "$RESP_BODY"

parse_response "$(api_post_no_token "$API_URL/admin/login" '{"password":"xxx"}')"
assert_eq "F1-P2-04" "登录缺用户名-HTTP状态" "200" "$RESP_CODE"
assert_contains "F1-P2-04" "登录缺用户名-非成功" "4001" "$RESP_BODY"

# 创建用户缺必填字段
parse_response "$(api_post_json "$API_URL/admin/user" '{"username":"test_missing"}')"
assert_eq "F2-P2-05" "创建用户缺password-HTTP状态" "200" "$RESP_CODE"
assert_contains "F2-P2-05" "创建用户缺password-非成功" "4001" "$RESP_BODY"

# ═══════════════════════════════════════════
# 4. 无效 ID
# ═══════════════════════════════════════════
echo ""
echo "── 4. 无效 ID ──"

parse_response "$(api_get "$API_URL/admin/user/999999")"
assert_eq "F2-P2-03" "查询不存在用户" "200" "$RESP_CODE"
code=$(json_field "$RESP_BODY" "code")
data=$(json_field "$RESP_BODY" "data")
if [ "$code" = "200" ] && [ "$data" = "none" ]; then
  echo "✅ 查询不存在用户返回 data=null"
else
  echo "⚠️  查询不存在用户 code=$code data=$data"
fi

# ═══════════════════════════════════════════
# 5. 只读接口
# ═══════════════════════════════════════════
echo ""
echo "── 5. 只读接口 ──"

# 动态路由
parse_response "$(api_get "$API_URL/admin/routers")"
assert_eq "F5-P0-01" "获取动态路由" "200" "$RESP_CODE"
router_count=$(echo "$RESP_BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('data',[])))" 2>/dev/null)
echo "   路由数量: $router_count"

# 菜单树
parse_response "$(api_get "$API_URL/admin/menu/tree")"
assert_eq "F4-P0-02" "菜单树查询" "200" "$RESP_CODE"

# 菜单列表
parse_response "$(api_get "$API_URL/admin/menu/list")"
assert_eq "F4-P0-01" "菜单列表查询" "200" "$RESP_CODE"

# 角色全部
parse_response "$(api_get "$API_URL/admin/role/all")"
assert_eq "F3-P0-02" "全部角色查询" "200" "$RESP_CODE"

# 用户分页
parse_response "$(api_get "$API_URL/admin/user/list?page=1&size=10")"
assert_eq "F2-P0-01" "用户分页查询" "200" "$RESP_CODE"
user_total=$(json_field "$RESP_BODY" "data.total")
echo "   用户总数: $user_total"
# 取首个用户 ID 给后续用
FIRST_USER_ID=$(echo "$RESP_BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); recs=d.get('data',{}).get('records',[]); print(recs[0]['id'] if recs else '')" 2>/dev/null)

# 角色分页
parse_response "$(api_get "$API_URL/admin/role/list?page=1&size=10")"
assert_eq "F3-P0-01" "角色分页查询" "200" "$RESP_CODE"
FIRST_ROLE_ID=$(echo "$RESP_BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); recs=d.get('data',{}).get('records',[]); print(recs[0]['id'] if recs else '')" 2>/dev/null)

# 首个菜单 ID
parse_response "$(api_get "$API_URL/admin/menu/list")"
FIRST_MENU_ID=$(echo "$RESP_BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); recs=d.get('data',[]); print(recs[0]['id'] if recs else '')" 2>/dev/null)

# 用户详情
if [ -n "$FIRST_USER_ID" ]; then
  parse_response "$(api_get "$API_URL/admin/user/$FIRST_USER_ID")"
  assert_eq "F2-P0-02" "用户详情查询" "200" "$RESP_CODE"
else
  skip_test "F2-P0-02" "用户详情查询" "无用户数据"
fi

# 角色详情
if [ -n "$FIRST_ROLE_ID" ]; then
  parse_response "$(api_get "$API_URL/admin/role/$FIRST_ROLE_ID")"
  assert_eq "F3-P0-03" "角色详情查询" "200" "$RESP_CODE"
else
  skip_test "F3-P0-03" "角色详情查询" "无角色数据"
fi

# 菜单详情
if [ -n "$FIRST_MENU_ID" ]; then
  parse_response "$(api_get "$API_URL/admin/menu/$FIRST_MENU_ID")"
  assert_eq "F4-P0-03" "菜单详情查询" "200" "$RESP_CODE"
else
  skip_test "F4-P0-03" "菜单详情查询" "无菜单数据"
fi

# 按关键词搜索用户
parse_response "$(api_get "$API_URL/admin/user/list?page=1&size=10&keyword=admin")"
assert_eq "F2-P2-01" "用户关键词搜索" "200" "$RESP_CODE"

# 按状态筛选用户
parse_response "$(api_get "$API_URL/admin/user/list?page=1&size=10&status=ENABLED")"
assert_eq "F2-P2-02" "用户状态筛选" "200" "$RESP_CODE"

# ═══════════════════════════════════════════
# 6. 写入/链式测试
# ═══════════════════════════════════════════
echo ""
echo "── 6. 写入/链式测试 ──"

# 6.1 创建角色
TEST_ROLE_CODE="test_role_$(date +%s)"
ROLE_CREATE_JSON=$(printf '{"roleName":"%s","roleCode":"%s","roleSort":99}' '测试角色' "$TEST_ROLE_CODE")
parse_response "$(api_post_json "$API_URL/admin/role" "$ROLE_CREATE_JSON")"
assert_eq "F3-P0-04" "创建角色" "200" "$RESP_CODE"
CREATED_ROLE_ID=$(json_field "$RESP_BODY" "data.id")
if [ -z "$CREATED_ROLE_ID" ] || [ "$CREATED_ROLE_ID" = "none" ]; then
  # 尝试从列表反查
  CREATED_ROLE_ID=$(query_record "$API_URL/admin/role/list?page=1&size=100" "if r.get('roleCode')=='$TEST_ROLE_CODE': print(r['id'])")
fi
echo "   创建角色 ID: $CREATED_ROLE_ID"

# 6.2 角色编码重复
ROLE_DUP_JSON=$(printf '{"roleName":"%s","roleCode":"%s","roleSort":0}' '重复角色' "$TEST_ROLE_CODE")
parse_response "$(api_post_json "$API_URL/admin/role" "$ROLE_DUP_JSON")"
assert_eq "F3-P2-01" "角色编码重复" "200" "$RESP_CODE"
assert_contains "F3-P2-01" "角色编码重复msg" "角色编码已存在" "$(json_error_msg "$RESP_BODY")"

# 6.3 更新角色
if [ -n "$CREATED_ROLE_ID" ] && [ "$CREATED_ROLE_ID" != "none" ]; then
  ROLE_UPD_JSON=$(printf '{"roleName":"%s","roleCode":"%s","roleSort":99,"status":"ENABLED"}' '测试角色(已更新)' "$TEST_ROLE_CODE")
  parse_response "$(api_put_json "$API_URL/admin/role/$CREATED_ROLE_ID" "$ROLE_UPD_JSON")"
  assert_eq "F3-P0-05" "更新角色" "200" "$RESP_CODE"
else
  skip_test "F3-P0-05" "更新角色" "无创建成功的角色ID"
fi

# 6.4 创建菜单（目录）
TEST_MENU_NAME="test_menu_$(date +%s)"
MENU_CREATE_JSON=$(printf '{"menuName":"%s","menuType":"M","path":"/test","menuSort":99}' "$TEST_MENU_NAME")
parse_response "$(api_post_json "$API_URL/admin/menu" "$MENU_CREATE_JSON")"
assert_eq "F4-P0-04" "创建目录菜单" "200" "$RESP_CODE"
CREATED_MENU_ID=$(json_field "$RESP_BODY" "data.id")
if [ -z "$CREATED_MENU_ID" ] || [ "$CREATED_MENU_ID" = "none" ]; then
  # 菜单列表返回 data 为扁平数组（非分页），直接查询
  parse_response "$(api_get "$API_URL/admin/menu/list")"
  CREATED_MENU_ID=$(echo "$RESP_BODY" | python3 -c "import sys,json; recs=json.load(sys.stdin).get('data',[]); print(next((str(r['id']) for r in recs if r.get('menuName')=='$TEST_MENU_NAME'), ''))" 2>/dev/null)
fi
echo "   创建菜单 ID: $CREATED_MENU_ID"

# 6.5 创建子菜单（页面）
if [ -n "$CREATED_MENU_ID" ] && [ "$CREATED_MENU_ID" != "none" ]; then
  SUBMENU_JSON=$(printf '{"parentId":%s,"menuName":"%s","menuType":"C","path":"/test/page","component":"/test/Page","menuSort":1}' "$CREATED_MENU_ID" '测试子页面')
  parse_response "$(api_post_json "$API_URL/admin/menu" "$SUBMENU_JSON")"
  assert_eq "F4-P0-05" "创建页面菜单" "200" "$RESP_CODE"
else
  skip_test "F4-P0-05" "创建页面菜单" "无父菜单ID"
fi

# 6.6 创建用户
TEST_USERNAME="testuser_$(date +%s)"
USER_CREATE_JSON=$(printf '{"username":"%s","password":"Test123456","nickname":"%s","status":"ENABLED"}' "$TEST_USERNAME" '测试用户')
parse_response "$(api_post_json "$API_URL/admin/user" "$USER_CREATE_JSON")"
assert_eq "F2-P0-03" "创建用户" "200" "$RESP_CODE"
CREATED_USER_ID=$(json_field "$RESP_BODY" "data.id")
if [ -z "$CREATED_USER_ID" ] || [ "$CREATED_USER_ID" = "none" ]; then
  CREATED_USER_ID=$(query_record "$API_URL/admin/user/list?page=1&size=100" "if r.get('username')=='$TEST_USERNAME': print(r['id'])")
fi
echo "   创建用户 ID: $CREATED_USER_ID"

# 6.7 用户名重复（需带 nickname 通过 @Valid 校验，才能进入 Service 层触发唯一性检查）
USER_DUP_JSON=$(printf '{"username":"%s","password":"Test123456","nickname":"%s"}' "$TEST_USERNAME" '重复测试')
parse_response "$(api_post_json "$API_URL/admin/user" "$USER_DUP_JSON")"
assert_eq "F2-P2-04" "用户名重复" "200" "$RESP_CODE"
assert_contains "F2-P2-04" "用户名重复msg" "用户名已存在" "$(json_error_msg "$RESP_BODY")"

# 6.8 更新用户
if [ -n "$CREATED_USER_ID" ] && [ "$CREATED_USER_ID" != "none" ]; then
  USER_UPD_JSON=$(printf '{"id":%s,"nickname":"%s","status":"ENABLED"}' "$CREATED_USER_ID" '测试用户(已更新)')
  parse_response "$(api_put_json "$API_URL/admin/user/$CREATED_USER_ID" "$USER_UPD_JSON")"
  assert_eq "F2-P0-04" "更新用户" "200" "$RESP_CODE"
  sleep 1
  # 验证更新
  parse_response "$(api_get "$API_URL/admin/user/$CREATED_USER_ID")"
  assert_contains "F2-P0-04" "验证用户更新" "测试用户(已更新)" "$RESP_BODY"
else
  skip_test "F2-P0-04" "更新用户" "无创建成功的用户ID"
fi

# 6.9 为用户分配角色
if [ -n "$CREATED_USER_ID" ] && [ "$CREATED_USER_ID" != "none" ] && [ -n "$CREATED_ROLE_ID" ] && [ "$CREATED_ROLE_ID" != "none" ]; then
  ASSIGN_ROLE_JSON=$(printf '{"roleIds":[%s]}' "$CREATED_ROLE_ID")
  parse_response "$(api_put_json "$API_URL/admin/user/$CREATED_USER_ID/roles" "$ASSIGN_ROLE_JSON")"
  assert_eq "F2-P0-07" "为用户分配角色" "200" "$RESP_CODE"
else
  skip_test "F2-P0-07" "为用户分配角色" "无用户ID或角色ID"
fi

# 6.10 角色绑定菜单
if [ -n "$CREATED_ROLE_ID" ] && [ "$CREATED_ROLE_ID" != "none" ] && [ -n "$CREATED_MENU_ID" ] && [ "$CREATED_MENU_ID" != "none" ]; then
  BIND_MENU_JSON=$(printf '{"menuIds":[%s]}' "$CREATED_MENU_ID")
  parse_response "$(api_put_json "$API_URL/admin/role/$CREATED_ROLE_ID/menus" "$BIND_MENU_JSON")"
  assert_eq "F3-P0-07" "角色绑定菜单" "200" "$RESP_CODE"
else
  skip_test "F3-P0-07" "角色绑定菜单" "无角色ID或菜单ID"
fi

# 6.11 重置密码
if [ -n "$CREATED_USER_ID" ] && [ "$CREATED_USER_ID" != "none" ]; then
  RESET_PWD_JSON='{"newPassword":"NewTest123"}'
  parse_response "$(api_put_json "$API_URL/admin/user/$CREATED_USER_ID/password" "$RESET_PWD_JSON")"
  assert_eq "F2-P0-06" "重置用户密码" "200" "$RESP_CODE"
else
  skip_test "F2-P0-06" "重置用户密码" "无创建成功的用户ID"
fi

# ═══════════════════════════════════════════
# 7. 清理（删除测试数据）
# ═══════════════════════════════════════════
echo ""
echo "── 7. 清理 ──"

# 删除用户
if [ -n "$CREATED_USER_ID" ] && [ "$CREATED_USER_ID" != "none" ]; then
  parse_response "$(api_delete "$API_URL/admin/user/$CREATED_USER_ID")"
  assert_eq "F2-P0-05" "删除用户" "200" "$RESP_CODE"
fi

# 删除角色
if [ -n "$CREATED_ROLE_ID" ] && [ "$CREATED_ROLE_ID" != "none" ]; then
  parse_response "$(api_delete "$API_URL/admin/role/$CREATED_ROLE_ID")"
  assert_eq "F3-P0-06" "删除角色" "200" "$RESP_CODE"
fi

# 删除菜单（级联）
if [ -n "$CREATED_MENU_ID" ] && [ "$CREATED_MENU_ID" != "none" ]; then
  parse_response "$(api_delete "$API_URL/admin/menu/$CREATED_MENU_ID")"
  assert_eq "F4-P0-08" "删除菜单(级联)" "200" "$RESP_CODE"
fi

# ═══════════════════════════════════════════
# 结果汇总
# ═══════════════════════════════════════════
echo ""
echo "=========================================="
printf "L1 总计 %d | 通过 %d | 失败 %d | 跳过 %d\n" $TOTAL $PASS $FAIL $SKIP
echo "=========================================="
exit $FAIL
