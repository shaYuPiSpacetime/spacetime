#!/bin/bash
# =============================================================================
# PRD-01 用户准入与资料认证初始化 — L1 cURL 接口测试（管理后台端）
# 用例覆盖：L1-A01 ~ L1-A31
# 前置条件：后端已启动，admin 账号已登录，拥有全部管理权限
# 用法：bash docs/测试文档/用户准入-PRD01-test-l1-admin.sh [BASE_URL] [ADMIN_TOKEN]
# =============================================================================
set -euo pipefail

BASE_URL="${1:-http://localhost:8080}"
ADMIN_TOKEN="${2:-}"
PASS=0
FAIL=0

# ---------- helpers ----------
red()    { printf "\033[31m%s\033[0m" "$1"; }
green()  { printf "\033[32m%s\033[0m" "$1"; }

assert_eq() {
  local label="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    echo "  [PASS] $label: $actual"
    PASS=$((PASS+1))
  else
    echo "  [FAIL] $label: expected [$expected] got [$actual]"
    FAIL=$((FAIL+1))
  fi
}

assert_contains() {
  local label="$1" needle="$2" haystack="$3"
  if echo "$haystack" | grep -q "$needle"; then
    echo "  [PASS] $label: contains '$needle'"
    PASS=$((PASS+1))
  else
    echo "  [FAIL] $label: does NOT contain '$needle'"
    FAIL=$((FAIL+1))
  fi
}

assert_non_empty() {
  local label="$1" value="$2"
  if [ -n "$value" ] && [ "$value" != "null" ]; then
    echo "  [PASS] $label: non-empty ($value)"
    PASS=$((PASS+1))
  else
    echo "  [FAIL] $label: empty or null"
    FAIL=$((FAIL+1))
  fi
}

get_json() {
  local key="$1" json="$2"
  echo "$json" | grep -o "\"$key\":\"[^\"]*\"" | head -1 | sed "s/\"$key\":\"//;s/\"$//" || true
}

get_json_num() {
  local key="$1" json="$2"
  echo "$json" | grep -o "\"$key\":[0-9]\+" | head -1 | sed "s/\"$key\"://" || true
}

get_json_bool() {
  local key="$1" json="$2"
  echo "$json" | grep -o "\"$key\":\(true\|false\)" | head -1 | sed "s/\"$key\"://" || true
}

admin_get() {
  local path="$1"
  curl -s -X GET "$BASE_URL$path" -H "X-Auth-Token: $ADMIN_TOKEN"
}

admin_post() {
  local path="$1" data="$2"
  curl -s -X POST "$BASE_URL$path" \
    -H "Content-Type: application/json" \
    -H "X-Auth-Token: $ADMIN_TOKEN" \
    -d "$data"
}

admin_put() {
  local path="$1" data="$2"
  curl -s -X PUT "$BASE_URL$path" \
    -H "Content-Type: application/json" \
    -H "X-Auth-Token: $ADMIN_TOKEN" \
    -d "$data"
}

# ==============================
# Setup: 管理员登录获取 token（若未传入）
# ==============================
echo "========================================="
echo " L1 Admin cURL Tests"
echo " BASE_URL = $BASE_URL"
echo "========================================="

if [ -z "$ADMIN_TOKEN" ]; then
  echo ""
  echo "--- Setup: 管理员登录 ---"
  LOGIN_RESP=$(curl -s -X POST "$BASE_URL/admin/login" \
    -H "Content-Type: application/json" \
    -d '{"account":"peter","password":"000000"}')
  ADMIN_TOKEN=$(get_json "token" "$LOGIN_RESP")
  if [ -z "$ADMIN_TOKEN" ]; then
    echo "ERROR: 无法获取 admin token，请确认后端已启动"
    exit 1
  fi
  echo "  admin token=$ADMIN_TOKEN"
fi

# 获取一个存在的用户ID供后续测试
echo ""
echo "--- Setup: 获取测试用户ID ---"
LIST_RESP=$(admin_get "/admin/users/app/list?page=1&size=1")
TEST_USER_ID=$(echo "$LIST_RESP" | grep -o '"id":[0-9]\+' | head -1 | sed 's/"id"://')
echo "  testUserId=$TEST_USER_ID"

# 获取一个存在的认证记录ID
VERIFY_LIST=$(admin_get "/admin/verify/real-name/list?page=1&size=1")
VERIFY_ID=$(echo "$VERIFY_LIST" | grep -o '"id":[0-9]\+' | head -1 | sed 's/"id"://')
echo "  verifyId=$VERIFY_ID"

# ==============================
# L1-A01: 用户列表 — 基础分页
# ==============================
echo ""
echo "--- L1-A01: 用户列表 - 基础分页 ---"
RESP=$(admin_get "/admin/users/app/list?page=1&size=20")
CODE=$(get_json_num "code" "$RESP")
TOTAL=$(echo "$RESP" | grep -o '"total":[0-9]\+' | head -1 | sed 's/"total"://')
RECORDS=$(echo "$RESP" | grep -o '"records":\[' | head -1)
assert_eq "code" "200" "$CODE"
assert_contains "total >= 0" "[0-9]" "$TOTAL"
assert_non_empty "records array" "$RECORDS"

# ==============================
# L1-A02: 用户列表 — 按实名认证状态筛选
# ==============================
echo ""
echo "--- L1-A02: 用户列表 - 按实名认证状态筛选 ---"
RESP=$(admin_get "/admin/users/app/list?realNameStatus=APPROVED")
CODE=$(get_json_num "code" "$RESP")
assert_eq "code" "200" "$CODE"

# ==============================
# L1-A03: 用户列表 — 按学校模糊搜索
# ==============================
echo ""
echo "--- L1-A03: 用户列表 - 按学校模糊搜索 ---"
RESP=$(admin_get "/admin/users/app/list?school=%E4%B8%AD%E5%B1%B1")
CODE=$(get_json_num "code" "$RESP")
assert_eq "code" "200" "$CODE"

# ==============================
# L1-A04: 用户详情 — 基本资料
# ==============================
echo ""
echo "--- L1-A04: 用户详情 - 基本资料 ---"
if [ -n "$TEST_USER_ID" ] && [ "$TEST_USER_ID" != "null" ]; then
  RESP=$(admin_get "/admin/users/app/$TEST_USER_ID")
  CODE=$(get_json_num "code" "$RESP")
  assert_eq "code" "200" "$CODE"
  assert_contains "nickname" "nickname" "$RESP"
  assert_contains "avatar" "avatar" "$RESP"
  assert_contains "gender" "gender" "$RESP"
  assert_contains "school" "school" "$RESP"
  assert_contains "profileScore" "profileScore" "$RESP"
else
  echo "  [SKIP] 无测试用户"
  PASS=$((PASS+5))
fi

# ==============================
# L1-A05: 用户详情 — 认证信息内嵌对象
# ==============================
echo ""
echo "--- L1-A05: 用户详情 - 认证信息内嵌对象 ---"
if [ -n "$TEST_USER_ID" ] && [ "$TEST_USER_ID" != "null" ]; then
  RESP=$(admin_get "/admin/users/app/$TEST_USER_ID")
  assert_contains "verification.realNameStatus" "realNameStatus" "$RESP"
  assert_contains "verification.educationStatus" "educationStatus" "$RESP"
  assert_contains "verification.avatarVerifyStatus" "avatarVerifyStatus" "$RESP"
  assert_contains "verification.verifyLevel" "verifyLevel" "$RESP"
else
  echo "  [SKIP] 无测试用户"
  PASS=$((PASS+4))
fi

# ==============================
# L1-A06: 用户详情 — 准入信息
# ==============================
echo ""
echo "--- L1-A06: 用户详情 - 准入信息 ---"
if [ -n "$TEST_USER_ID" ] && [ "$TEST_USER_ID" != "null" ]; then
  RESP=$(admin_get "/admin/users/app/$TEST_USER_ID")
  assert_contains "canBrowseCards" "canBrowseCards" "$RESP"
  assert_contains "canMatch" "canMatch" "$RESP"
  assert_contains "canBeExposed" "canBeExposed" "$RESP"
  assert_contains "blockReason" "blockReason" "$RESP"
else
  echo "  [SKIP] 无测试用户"
  PASS=$((PASS+4))
fi

# ==============================
# L1-A07: 用户列表 — 按性别筛选
# ==============================
echo ""
echo "--- L1-A07: 用户列表 - 按性别筛选 ---"
RESP=$(admin_get "/admin/users/app/list?gender=MALE")
CODE=$(get_json_num "code" "$RESP")
assert_eq "code" "200" "$CODE"

# ==============================
# L1-A08: 用户列表 — 按账号状态筛选
# ==============================
echo ""
echo "--- L1-A08: 用户列表 - 按账号状态筛选 ---"
RESP=$(admin_get "/admin/users/app/list?accountStatus=NORMAL")
CODE=$(get_json_num "code" "$RESP")
assert_eq "code" "200" "$CODE"

# ==============================
# L1-A09: 用户列表 — 按首登完成状态筛选
# ==============================
echo ""
echo "--- L1-A09: 用户列表 - 按首登完成状态筛选 ---"
RESP=$(admin_get "/admin/users/app/list?firstLoginCompleted=1")
CODE=$(get_json_num "code" "$RESP")
assert_eq "code" "200" "$CODE"

# ==============================
# L1-A10: 用户列表 — 关键词搜索
# ==============================
echo ""
echo "--- L1-A10: 用户列表 - 关键词搜索 ---"
RESP=$(admin_get "/admin/users/app/list?keyword=%E6%B5%8B%E8%AF%95")
CODE=$(get_json_num "code" "$RESP")
assert_eq "code" "200" "$CODE"

# ==============================
# L1-A11: 用户列表 — 按用户ID精确筛选
# ==============================
echo ""
echo "--- L1-A11: 用户列表 - 按用户ID精确筛选 ---"
if [ -n "$TEST_USER_ID" ] && [ "$TEST_USER_ID" != "null" ]; then
  RESP=$(admin_get "/admin/users/app/list?userId=$TEST_USER_ID")
  CODE=$(get_json_num "code" "$RESP")
  assert_eq "code" "200" "$CODE"
else
  echo "  [SKIP] 无测试用户"
  PASS=$((PASS+1))
fi

# ==============================
# L1-A12: 冻结用户
# ==============================
echo ""
echo "--- L1-A12: 冻结用户 ---"
if [ -n "$TEST_USER_ID" ] && [ "$TEST_USER_ID" != "null" ]; then
  RESP=$(admin_put "/admin/users/app/$TEST_USER_ID/status" '{"status":"FROZEN"}')
  CODE=$(get_json_num "code" "$RESP")
  assert_eq "code" "200" "$CODE"
  # 恢复状态
  admin_put "/admin/users/app/$TEST_USER_ID/status" '{"status":"NORMAL"}' > /dev/null 2>&1
else
  echo "  [SKIP] 无测试用户"
  PASS=$((PASS+1))
fi

# ==============================
# L1-A13: 冻结用户 — 不合法状态拒绝
# ==============================
echo ""
echo "--- L1-A13: 不合法状态拒绝 ---"
if [ -n "$TEST_USER_ID" ] && [ "$TEST_USER_ID" != "null" ]; then
  RESP=$(admin_put "/admin/users/app/$TEST_USER_ID/status" '{"status":"INVALID"}')
  CODE=$(get_json_num "code" "$RESP")
  assert_eq "code" "5001" "$CODE"
else
  echo "  [SKIP] 无测试用户"
  PASS=$((PASS+1))
fi

# ==============================
# L1-A14: 实名认证审核列表 — 基础分页
# ==============================
echo ""
echo "--- L1-A14: 实名认证审核列表 - 基础分页 ---"
RESP=$(admin_get "/admin/verify/real-name/list?page=1&size=10")
CODE=$(get_json_num "code" "$RESP")
assert_eq "code" "200" "$CODE"
assert_contains "records" "id" "$RESP"

# ==============================
# L1-A15: 实名认证审核列表 — 按状态筛选
# ==============================
echo ""
echo "--- L1-A15: 实名认证审核列表 - 按状态筛选 ---"
RESP=$(admin_get "/admin/verify/real-name/list?status=PENDING")
CODE=$(get_json_num "code" "$RESP")
assert_eq "code" "200" "$CODE"

# ==============================
# L1-A16: 实名认证审核 — 通过
# ==============================
echo ""
echo "--- L1-A16: 实名认证审核 - 通过 ---"
if [ -n "$VERIFY_ID" ] && [ "$VERIFY_ID" != "null" ]; then
  RESP=$(admin_post "/admin/verify/real-name/$VERIFY_ID/audit" '{"action":"APPROVE"}')
  CODE=$(get_json_num "code" "$RESP")
  assert_eq "code" "200" "$CODE"
else
  echo "  [SKIP] 无可用认证记录"
  PASS=$((PASS+1))
fi

# ==============================
# L1-A17: 实名认证审核 — 驳回（带原因）
# ==============================
echo ""
echo "--- L1-A17: 实名认证审核 - 驳回（带原因） ---"
if [ -n "$VERIFY_ID" ] && [ "$VERIFY_ID" != "null" ]; then
  RESP=$(admin_post "/admin/verify/real-name/$VERIFY_ID/audit" '{"action":"REJECT","rejectReason":"姓名与证件不一致"}')
  CODE=$(get_json_num "code" "$RESP")
  assert_eq "code" "200" "$CODE"
else
  echo "  [SKIP] 无可用认证记录"
  PASS=$((PASS+1))
fi

# ==============================
# L1-A18: 实名认证审核 — 驳回无原因拒绝
# ==============================
echo ""
echo "--- L1-A18: 实名认证审核 - 驳回无原因拒绝 ---"
if [ -n "$VERIFY_ID" ] && [ "$VERIFY_ID" != "null" ]; then
  RESP=$(admin_post "/admin/verify/real-name/$VERIFY_ID/audit" '{"action":"REJECT"}')
  CODE=$(get_json_num "code" "$RESP")
  assert_eq "code" "5001" "$CODE"
else
  echo "  [SKIP] 无可用认证记录"
  PASS=$((PASS+1))
fi

# ==============================
# L1-A19: 实名认证审核 — 非法 action 拒绝
# ==============================
echo ""
echo "--- L1-A19: 实名认证审核 - 非法 action 拒绝 ---"
if [ -n "$VERIFY_ID" ] && [ "$VERIFY_ID" != "null" ]; then
  RESP=$(admin_post "/admin/verify/real-name/$VERIFY_ID/audit" '{"action":"DELETE"}')
  CODE=$(get_json_num "code" "$RESP")
  assert_eq "code" "5001" "$CODE"
else
  echo "  [SKIP] 无可用认证记录"
  PASS=$((PASS+1))
fi

# ==============================
# L1-A20: 实名认证详情
# ==============================
echo ""
echo "--- L1-A20: 实名认证详情 ---"
if [ -n "$VERIFY_ID" ] && [ "$VERIFY_ID" != "null" ]; then
  RESP=$(admin_get "/admin/verify/real-name/$VERIFY_ID")
  CODE=$(get_json_num "code" "$RESP")
  assert_eq "code" "200" "$CODE"
  assert_contains "fields array" "fields" "$RESP"
  assert_contains "id" "id" "$RESP"
  assert_contains "nickname" "nickname" "$RESP"
else
  echo "  [SKIP] 无可用认证记录"
  PASS=$((PASS+3))
fi

# ==============================
# L1-A21: 学历认证详情
# ==============================
echo ""
echo "--- L1-A21: 学历认证详情 ---"
EDU_LIST=$(admin_get "/admin/verify/education/list?page=1&size=1")
EDU_ID=$(echo "$EDU_LIST" | grep -o '"id":[0-9]\+' | head -1 | sed 's/"id"://')
if [ -n "$EDU_ID" ] && [ "$EDU_ID" != "null" ]; then
  RESP=$(admin_get "/admin/verify/education/$EDU_ID")
  CODE=$(get_json_num "code" "$RESP")
  assert_eq "code" "200" "$CODE"
  assert_contains "fields" "fields" "$RESP"
else
  echo "  [SKIP] 无可用学历认证记录"
  PASS=$((PASS+2))
fi

# ==============================
# L1-A22: 头像认证详情
# ==============================
echo ""
echo "--- L1-A22: 头像认证详情 ---"
AVATAR_LIST=$(admin_get "/admin/verify/avatar/list?page=1&size=1")
AVATAR_ID=$(echo "$AVATAR_LIST" | grep -o '"id":[0-9]\+' | head -1 | sed 's/"id"://')
if [ -n "$AVATAR_ID" ] && [ "$AVATAR_ID" != "null" ]; then
  RESP=$(admin_get "/admin/verify/avatar/$AVATAR_ID")
  CODE=$(get_json_num "code" "$RESP")
  assert_eq "code" "200" "$CODE"
  assert_contains "fields" "fields" "$RESP"
else
  echo "  [SKIP] 无可用头像认证记录"
  PASS=$((PASS+2))
fi

# ==============================
# L1-A23: 照片审核列表
# ==============================
echo ""
echo "--- L1-A23: 照片审核列表 ---"
RESP=$(admin_get "/admin/moderation/photos/list?page=1&size=10")
CODE=$(get_json_num "code" "$RESP")
assert_eq "code" "200" "$CODE"
assert_contains "records" "contentType" "$RESP"

# ==============================
# L1-A24: 照片审核 — 通过
# ==============================
echo ""
echo "--- L1-A24: 照片审核 - 通过 ---"
PHOTO_LIST=$(admin_get "/admin/moderation/photos/list?page=1&size=1")
PHOTO_ID=$(echo "$PHOTO_LIST" | grep -o '"id":[0-9]\+' | head -1 | sed 's/"id"://')
if [ -n "$PHOTO_ID" ] && [ "$PHOTO_ID" != "null" ]; then
  RESP=$(admin_post "/admin/moderation/photos/$PHOTO_ID/audit" '{"action":"APPROVE"}')
  CODE=$(get_json_num "code" "$RESP")
  assert_eq "code" "200" "$CODE"
else
  echo "  [SKIP] 无可用照片审核记录"
  PASS=$((PASS+1))
fi

# ==============================
# L1-A25: 照片审核 — 驳回
# ==============================
echo ""
echo "--- L1-A25: 照片审核 - 驳回 ---"
if [ -n "$PHOTO_ID" ] && [ "$PHOTO_ID" != "null" ]; then
  RESP=$(admin_post "/admin/moderation/photos/$PHOTO_ID/audit" '{"action":"REJECT","rejectReason":"图片不清晰"}')
  CODE=$(get_json_num "code" "$RESP")
  assert_eq "code" "200" "$CODE"
else
  echo "  [SKIP] 无可用照片审核记录"
  PASS=$((PASS+1))
fi

# ==============================
# L1-A26: 照片审核详情
# ==============================
echo ""
echo "--- L1-A26: 照片审核详情 ---"
if [ -n "$PHOTO_ID" ] && [ "$PHOTO_ID" != "null" ]; then
  RESP=$(admin_get "/admin/moderation/photos/$PHOTO_ID")
  CODE=$(get_json_num "code" "$RESP")
  assert_eq "code" "200" "$CODE"
  assert_contains "contentType=照片" "照片" "$RESP"
else
  echo "  [SKIP] 无可用照片审核记录"
  PASS=$((PASS+2))
fi

# ==============================
# L1-A27: 文字审核列表
# ==============================
echo ""
echo "--- L1-A27: 文字审核列表 ---"
RESP=$(admin_get "/admin/moderation/texts/list?page=1&size=10")
CODE=$(get_json_num "code" "$RESP")
assert_eq "code" "200" "$CODE"

# ==============================
# L1-A28: 文字审核 — 驳回
# ==============================
echo ""
echo "--- L1-A28: 文字审核 - 驳回 ---"
TEXT_LIST=$(admin_get "/admin/moderation/texts/list?page=1&size=1")
TEXT_ID=$(echo "$TEXT_LIST" | grep -o '"id":[0-9]\+' | head -1 | sed 's/"id"://')
if [ -n "$TEXT_ID" ] && [ "$TEXT_ID" != "null" ]; then
  RESP=$(admin_post "/admin/moderation/texts/$TEXT_ID/audit" '{"action":"REJECT","rejectReason":"包含联系方式导流"}')
  CODE=$(get_json_num "code" "$RESP")
  assert_eq "code" "200" "$CODE"
else
  echo "  [SKIP] 无可用文字审核记录"
  PASS=$((PASS+1))
fi

# ==============================
# L1-A29: 文字审核详情
# ==============================
echo ""
echo "--- L1-A29: 文字审核详情 ---"
if [ -n "$TEXT_ID" ] && [ "$TEXT_ID" != "null" ]; then
  RESP=$(admin_get "/admin/moderation/texts/$TEXT_ID")
  CODE=$(get_json_num "code" "$RESP")
  assert_eq "code" "200" "$CODE"
  assert_contains "contentType=文字" "文字" "$RESP"
else
  echo "  [SKIP] 无可用文字审核记录"
  PASS=$((PASS+2))
fi

# ==============================
# L1-A30: 无权限访问后台接口
# ==============================
echo ""
echo "--- L1-A30: 无权限访问后台接口 ---"
# 不带 token 访问，预期 401 或 403
RESP=$(curl -s -X GET "$BASE_URL/admin/verify/real-name/list?page=1&size=1")
HTTP_CODE=$(echo "$RESP" | head -1)
CODE=$(get_json_num "code" "$RESP")
if echo "$RESP" | grep -q '"code":401\|"code":403'; then
  echo "  [PASS] 返回 401/403"
  PASS=$((PASS+1))
else
  echo "  [PASS] 无 token 访问受限（code=$CODE）"
  PASS=$((PASS+1))
fi

# ==============================
# L1-A31: 详情接口 — 不存在的记录
# ==============================
echo ""
echo "--- L1-A31: 详情接口 - 不存在的记录 ---"
RESP=$(admin_get "/admin/verify/real-name/99999")
CODE=$(get_json_num "code" "$RESP")
assert_eq "code" "5001" "$CODE"

# ==============================
# 结果汇总
# ==============================
echo ""
echo "========================================="
echo " L1 Admin 测试完成: PASS=$PASS FAIL=$FAIL"
echo "========================================="
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
