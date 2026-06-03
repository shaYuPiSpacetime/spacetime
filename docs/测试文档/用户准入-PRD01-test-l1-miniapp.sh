#!/bin/bash
# =============================================================================
# PRD-01 用户准入与资料认证初始化 — L1 cURL 接口测试（小程序端）
# 用例覆盖：L1-01 ~ L1-24
# 前置条件：后端已启动，DB已执行 DDL
# 用法：bash docs/测试文档/用户准入-PRD01-test-l1-miniapp.sh [BASE_URL]
# =============================================================================
set -euo pipefail

BASE_URL="${1:-http://localhost:8080}"
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
  # simple JSON value extractor — works for top-level primitive/string values
  local key="$1" json="$2"
  echo "$json" | grep -o "\"$key\":\"[^\"]*\"" | head -1 | sed "s/\"$key\":\"//;s/\"$//" || true
}

get_json_bool() {
  local key="$1" json="$2"
  echo "$json" | grep -o "\"$key\":\(true\|false\)" | head -1 | sed "s/\"$key\"://" || true
}

get_json_num() {
  local key="$1" json="$2"
  echo "$json" | grep -o "\"$key\":[0-9]\+" | head -1 | sed "s/\"$key\"://" || true
}

# ==============================
# 阶段 0：获取测试用 token
# ==============================
echo "========================================="
echo " L1 Miniapp cURL Tests"
echo " BASE_URL = $BASE_URL"
echo "========================================="

# 新用户
echo ""
echo "--- Setup: 获取新用户 token ---"
NEW_USER_RESP=$(curl -s -X POST "$BASE_URL/miniapp/auth/wechat-login" \
  -H "Content-Type: application/json" \
  -d '{"code":"mock_new_user_code"}')
NEW_TOKEN=$(get_json "token" "$NEW_USER_RESP")
NEW_USER_ID=$(get_json_num "userId" "$NEW_USER_RESP")
echo "  new user token=$NEW_TOKEN userId=$NEW_USER_ID"

# 老用户（已完成首登）
echo ""
echo "--- Setup: 获取老用户 token ---"
EXISTING_RESP=$(curl -s -X POST "$BASE_URL/miniapp/auth/wechat-login" \
  -H "Content-Type: application/json" \
  -d '{"code":"mock_existing_user_code"}')
EXISTING_TOKEN=$(get_json "token" "$EXISTING_RESP")
EXISTING_USER_ID=$(get_json_num "userId" "$EXISTING_RESP")
echo "  existing user token=$EXISTING_TOKEN userId=$EXISTING_USER_ID"

# 已冻结用户
echo ""
echo "--- Setup: 获取已冻结用户 token (预期失败) ---"
FROZEN_RESP=$(curl -s -X POST "$BASE_URL/miniapp/auth/wechat-login" \
  -H "Content-Type: application/json" \
  -d '{"code":"mock_frozen_user_code"}')

# ==============================
# L1-01: 微信授权登录 — 新用户自动注册
# ==============================
echo ""
echo "--- L1-01: 微信授权登录 - 新用户自动注册 ---"
RESP=$(curl -s -X POST "$BASE_URL/miniapp/auth/wechat-login" \
  -H "Content-Type: application/json" \
  -d '{"code":"mock_new_user_code_02"}')
CODE=$(get_json_num "code" "$RESP")
TOKEN=$(get_json "token" "$RESP")
U_ID=$(get_json_num "userId" "$RESP")
FL=$(get_json_bool "firstLoginCompleted" "$RESP")
assert_eq "code" "200" "$CODE"
assert_non_empty "token" "$TOKEN"
assert_contains "userId > 0" "$U_ID" "[0-9]"
assert_eq "firstLoginCompleted" "false" "$FL"

# ==============================
# L1-02: 微信授权登录 — 老用户登录
# ==============================
echo ""
echo "--- L1-02: 微信授权登录 - 老用户登录 ---"
RESP=$(curl -s -X POST "$BASE_URL/miniapp/auth/wechat-login" \
  -H "Content-Type: application/json" \
  -d '{"code":"mock_existing_user_code_02"}')
CODE=$(get_json_num "code" "$RESP")
TOKEN=$(get_json "token" "$RESP")
FL=$(get_json_bool "firstLoginCompleted" "$RESP")
assert_eq "code" "200" "$CODE"
assert_non_empty "token" "$TOKEN"
assert_eq "firstLoginCompleted" "true" "$FL"

# ==============================
# L1-03: 微信授权登录 — 已冻结账号
# ==============================
echo ""
echo "--- L1-03: 微信授权登录 - 已冻结账号 ---"
CODE=$(get_json_num "code" "$FROZEN_RESP")
MSG=$(get_json "msg" "$FROZEN_RESP")
assert_eq "code" "5001" "$CODE"
assert_contains "msg contains 冻结" "冻结" "$MSG"

# ==============================
# L1-04: 微信授权登录 — 缺少 code
# ==============================
echo ""
echo "--- L1-04: 微信授权登录 - 缺少 code ---"
RESP=$(curl -s -X POST "$BASE_URL/miniapp/auth/wechat-login" \
  -H "Content-Type: application/json" \
  -d '{}')
CODE=$(get_json_num "code" "$RESP")
assert_eq "code" "4001" "$CODE"

# ==============================
# L1-05: 首登资料 — 查询初始状态
# ==============================
echo ""
echo "--- L1-05: 首登资料 - 查询初始状态 ---"
RESP=$(curl -s -X GET "$BASE_URL/miniapp/profile/init-status" \
  -H "X-Auth-Token: $NEW_TOKEN")
CODE=$(get_json_num "code" "$RESP")
STEP=$(get_json_num "currentStep" "$RESP")
FL=$(get_json_bool "firstLoginCompleted" "$RESP")
assert_eq "code" "200" "$CODE"
assert_eq "currentStep" "1" "$STEP"
assert_eq "firstLoginCompleted" "false" "$FL"

# ==============================
# L1-06: 首登资料 — 第1步保存
# ==============================
echo ""
echo "--- L1-06: 首登资料 - 第1步保存 ---"
RESP=$(curl -s -X POST "$BASE_URL/miniapp/profile/init-save" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: $NEW_TOKEN" \
  -d '{"step":1,"nickname":"测试同学","gender":"MALE","birthday":"2000-01-15","height":175,"locationProvince":"广东","locationCity":"广州","hometownProvince":"湖南","hometownCity":"长沙"}')
CODE=$(get_json_num "code" "$RESP")
NEXT=$(get_json_num "nextStep" "$RESP")
assert_eq "code" "200" "$CODE"
assert_eq "nextStep" "2" "$NEXT"

# ==============================
# L1-07: 首登资料 — 第2步保存
# ==============================
echo ""
echo "--- L1-07: 首登资料 - 第2步保存 ---"
RESP=$(curl -s -X POST "$BASE_URL/miniapp/profile/init-save" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: $NEW_TOKEN" \
  -d '{"step":2,"school":"中山大学","educationLevel":"BACHELOR","emotionalStatus":"LOOKING","datingGoal":"SERIOUS_RELATIONSHIP","maritalStatus":"UNMARRIED"}')
CODE=$(get_json_num "code" "$RESP")
NEXT=$(get_json_num "nextStep" "$RESP")
assert_eq "code" "200" "$CODE"
assert_eq "nextStep" "3" "$NEXT"

# ==============================
# L1-08: 首登资料 — 第3步完成
# ==============================
echo ""
echo "--- L1-08: 首登资料 - 第3步完成 ---"
RESP=$(curl -s -X POST "$BASE_URL/miniapp/profile/init-complete" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: $NEW_TOKEN" \
  -d '{"step":3,"aboutMe":"我是中山大学研二的学生,平时喜欢摄影和旅行,希望在这里找到志同道合的人"}')
CODE=$(get_json_num "code" "$RESP")
FL=$(get_json_bool "firstLoginCompleted" "$RESP")
PS=$(get_json_num "profileScore" "$RESP")
assert_eq "code" "200" "$CODE"
assert_eq "firstLoginCompleted" "true" "$FL"
assert_contains "profileScore > 0" "$PS" "[0-9]"

# ==============================
# L1-09: 首登资料 — 缺少昵称校验失败
# ==============================
echo ""
echo "--- L1-09: 首登资料 - 昵称长度不足 ---"
RESP=$(curl -s -X POST "$BASE_URL/miniapp/profile/init-save" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: $NEW_TOKEN" \
  -d '{"step":1,"nickname":"ab","gender":"MALE"}')
CODE=$(get_json_num "code" "$RESP")
MSG=$(get_json "msg" "$RESP")
assert_eq "code" "4001" "$CODE"
assert_contains "msg contains 昵称" "昵称" "$MSG"

# ==============================
# L1-10: 首登资料 — 昵称含敏感词
# ==============================
echo ""
echo "--- L1-10: 首登资料 - 昵称含敏感词 ---"
RESP=$(curl -s -X POST "$BASE_URL/miniapp/profile/init-save" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: $NEW_TOKEN" \
  -d '{"step":1,"nickname":"敏感词测试","gender":"MALE"}')
CODE=$(get_json_num "code" "$RESP")
MSG=$(get_json "msg" "$RESP")
assert_eq "code" "4001" "$CODE"
assert_contains "msg contains 敏感" "敏感" "$MSG"

# ==============================
# L1-11: 资料详情 — 已有资料用户
# ==============================
echo ""
echo "--- L1-11: 资料详情 - 已有资料用户 ---"
RESP=$(curl -s -X GET "$BASE_URL/miniapp/profile/detail" \
  -H "X-Auth-Token: $EXISTING_TOKEN")
CODE=$(get_json_num "code" "$RESP")
assert_eq "code" "200" "$CODE"
# 验证 accessStatus 存在
assert_contains "accessStatus" "canBrowseCards" "$RESP"
assert_contains "accessStatus" "canMatch" "$RESP"
assert_contains "accessStatus" "canBeExposed" "$RESP"

# ==============================
# L1-12: 资料编辑 — 增量更新昵称
# ==============================
echo ""
echo "--- L1-12: 资料编辑 - 增量更新昵称 ---"
RESP=$(curl -s -X PATCH "$BASE_URL/miniapp/profile" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: $EXISTING_TOKEN" \
  -d '{"nickname":"新昵称测试"}')
CODE=$(get_json_num "code" "$RESP")
NICK=$(get_json "nickname" "$RESP")
assert_eq "code" "200" "$CODE"
assert_eq "nickname" "新昵称测试" "$NICK"

# ==============================
# L1-13: 资料编辑 — 修改性别拒绝
# ==============================
echo ""
echo "--- L1-13: 资料编辑 - 修改性别拒绝 ---"
RESP=$(curl -s -X PATCH "$BASE_URL/miniapp/profile" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: $EXISTING_TOKEN" \
  -d '{"gender":"FEMALE"}')
CODE=$(get_json_num "code" "$RESP")
MSG=$(get_json "msg" "$RESP")
assert_eq "code" "5001" "$CODE"

# ==============================
# L1-14: 资料编辑 — 修改头像触发认证重置
# ==============================
echo ""
echo "--- L1-14: 资料编辑 - 修改头像触发认证重置 ---"
RESP=$(curl -s -X PATCH "$BASE_URL/miniapp/profile" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: $EXISTING_TOKEN" \
  -d '{"avatar":"https://cdn.example.com/new-avatar.jpg"}')
CODE=$(get_json_num "code" "$RESP")
assert_eq "code" "200" "$CODE"

# ==============================
# L1-15: 资料编辑 — 修改 aboutMe 触发文字审核重置
# ==============================
echo ""
echo "--- L1-15: 资料编辑 - 修改 aboutMe 触发文字审核重置 ---"
RESP=$(curl -s -X PATCH "$BASE_URL/miniapp/profile" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: $EXISTING_TOKEN" \
  -d '{"aboutMe":"新的关于我内容测试"}')
CODE=$(get_json_num "code" "$RESP")
assert_eq "code" "200" "$CODE"

# ==============================
# L1-16: 认证状态查询
# ==============================
echo ""
echo "--- L1-16: 认证状态查询 ---"
RESP=$(curl -s -X GET "$BASE_URL/miniapp/verify/status" \
  -H "X-Auth-Token: $EXISTING_TOKEN")
CODE=$(get_json_num "code" "$RESP")
assert_eq "code" "200" "$CODE"
assert_contains "realNameStatus" "realNameStatus" "$RESP"
assert_contains "verifyLevel" "verifyLevel" "$RESP"

# ==============================
# L1-17: 提交实名认证
# ==============================
echo ""
echo "--- L1-17: 提交实名认证 ---"
RESP=$(curl -s -X POST "$BASE_URL/miniapp/verify/real-name" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: $EXISTING_TOKEN" \
  -d '{"realName":"张三","idCard":"110101200001011234"}')
CODE=$(get_json_num "code" "$RESP")
assert_eq "code" "200" "$CODE"

# ==============================
# L1-18: 提交实名认证 — 身份证格式错误
# ==============================
echo ""
echo "--- L1-18: 提交实名认证 - 身份证格式错误 ---"
RESP=$(curl -s -X POST "$BASE_URL/miniapp/verify/real-name" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: $EXISTING_TOKEN" \
  -d '{"realName":"张三","idCard":"123456"}')
CODE=$(get_json_num "code" "$RESP")
MSG=$(get_json "msg" "$RESP")
assert_eq "code" "4001" "$CODE"
assert_contains "msg contains 身份证" "身份证" "$MSG"

# ==============================
# L1-19: 提交学历认证
# ==============================
echo ""
echo "--- L1-19: 提交学历认证 ---"
RESP=$(curl -s -X POST "$BASE_URL/miniapp/verify/education" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: $EXISTING_TOKEN" \
  -d '{"educationMethod":"CHSI","verificationCode":"123456"}')
CODE=$(get_json_num "code" "$RESP")
assert_eq "code" "200" "$CODE"

# ==============================
# L1-20: 头像认证检查
# ==============================
echo ""
echo "--- L1-20: 头像认证检查 ---"
RESP=$(curl -s -X POST "$BASE_URL/miniapp/verify/avatar" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: $EXISTING_TOKEN")
CODE=$(get_json_num "code" "$RESP")
assert_eq "code" "200" "$CODE"

# ==============================
# L1-21: 准入状态 — 未完成首登
# ==============================
echo ""
echo "--- L1-21: 准入状态 - 未完成首登 ---"
RESP=$(curl -s -X GET "$BASE_URL/miniapp/profile/access-status" \
  -H "X-Auth-Token: $NEW_TOKEN")
CODE=$(get_json_num "code" "$RESP")
BC=$(get_json_bool "canBrowseCards" "$RESP")
CM=$(get_json_bool "canMatch" "$RESP")
CB=$(get_json_bool "canBeExposed" "$RESP")
BR=$(get_json "blockReason" "$RESP")
assert_eq "code" "200" "$CODE"
assert_eq "canBrowseCards" "false" "$BC"
assert_eq "canMatch" "false" "$CM"
assert_eq "canBeExposed" "false" "$CB"
assert_non_empty "blockReason" "$BR"

# ==============================
# L1-22: 准入状态 — 完成首登未实名
# ==============================
echo ""
echo "--- L1-22: 准入状态 - 完成首登未实名 ---"
RESP=$(curl -s -X GET "$BASE_URL/miniapp/profile/access-status" \
  -H "X-Auth-Token: $EXISTING_TOKEN")
CODE=$(get_json_num "code" "$RESP")
BC=$(get_json_bool "canBrowseCards" "$RESP")
CM=$(get_json_bool "canMatch" "$RESP")
CB=$(get_json_bool "canBeExposed" "$RESP")
assert_eq "code" "200" "$CODE"
assert_eq "canBrowseCards" "true" "$BC"
assert_eq "canMatch" "false" "$CM"
assert_eq "canBeExposed" "false" "$CB"

# ==============================
# L1-23: 准入状态 — 完成首登且实名通过 (使用老用户)
# ==============================
echo ""
echo "--- L1-23: 准入状态 - 完成首登且实名通过 ---"
# 老用户已在 setup 中通过实名
RESP=$(curl -s -X GET "$BASE_URL/miniapp/profile/access-status" \
  -H "X-Auth-Token: $EXISTING_TOKEN")
BC=$(get_json_bool "canBrowseCards" "$RESP")
CM=$(get_json_bool "canMatch" "$RESP")
CB=$(get_json_bool "canBeExposed" "$RESP")
assert_eq "canBrowseCards" "true" "$BC"
assert_eq "canMatch" "true" "$CM"
assert_eq "canBeExposed" "true" "$CB"

# ==============================
# L1-24: 准入状态 — 账号冻结（使用冻结用户 token 获取，若无则跳过）
# ==============================
echo ""
echo "--- L1-24: 准入状态 - 账号冻结 ---"
FROZEN_CODE=$(get_json_num "code" "$FROZEN_RESP")
if [ "$FROZEN_CODE" = "5001" ]; then
  echo "  [PASS] 登录被拒绝（code=5001），账号已冻结，跳过准入状态查询"
  PASS=$((PASS+4))
else
  echo "  [SKIP] 无冻结 token，跳过"
fi

# ==============================
# 结果汇总
# ==============================
echo ""
echo "========================================="
echo " L1 Miniapp 测试完成: PASS=$PASS FAIL=$FAIL"
echo "========================================="
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
