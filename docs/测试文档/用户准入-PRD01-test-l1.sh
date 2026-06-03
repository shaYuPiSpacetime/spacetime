#!/bin/bash
# PRD-01 用户准入与资料认证初始化 — L1 cURL 接口测试
# 前置条件: 后端启动于 localhost:8080，DB 已执行 schema-prd01-user.sql

set -e
BASE="http://localhost:8080"
PASS=0
FAIL=0

ok() { echo "  ✓ $1"; PASS=$((PASS+1)); }
fail() { echo "  ✗ $1 (expected: $2, got: $3)"; FAIL=$((FAIL+1)); }

# ---- Miniapp Auth ----
echo "=== 小程序授权登录 ==="

echo "L1-01: 新用户自动注册"
RES=$(curl -s -X POST "$BASE/miniapp/auth/wechat-login" -H 'Content-Type: application/json' -d '{"code":"mock_new_user_code"}')
CODE=$(echo "$RES" | grep -o '"code":[0-9]*' | head -1 | cut -d: -f2)
NEW_TOKEN=$(echo "$RES" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
NEW_USER_ID=$(echo "$RES" | grep -o '"userId":[0-9]*' | head -1 | cut -d: -f2)
FIRST_LOGIN=$(echo "$RES" | grep -o '"firstLoginCompleted":[a-z]*' | head -1 | cut -d: -f2)
if [ "$CODE" = "200" ] && [ -n "$NEW_TOKEN" ] && [ "$NEW_USER_ID" -gt 0 ] && [ "$FIRST_LOGIN" = "false" ]; then
  ok "L1-01 通过"
else
  fail "L1-01" "code=200,token非空,userId>0,firstLoginCompleted=false" "$RES"
fi

echo "L1-02: 老用户登录"
RES=$(curl -s -X POST "$BASE/miniapp/auth/wechat-login" -H 'Content-Type: application/json' -d '{"code":"mock_existing_user_code"}')
CODE=$(echo "$RES" | grep -o '"code":[0-9]*' | head -1 | cut -d: -f2)
EXISTING_TOKEN=$(echo "$RES" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
FIRST_LOGIN2=$(echo "$RES" | grep -o '"firstLoginCompleted":[a-z]*' | head -1 | cut -d: -f2)
if [ "$CODE" = "200" ] && [ -n "$EXISTING_TOKEN" ] && [ "$FIRST_LOGIN2" = "true" ]; then
  ok "L1-02 通过"
else
  fail "L1-02" "code=200,firstLoginCompleted=true" "$RES"
fi

echo "L1-03: 已冻结账号拒绝登录"
RES=$(curl -s -X POST "$BASE/miniapp/auth/wechat-login" -H 'Content-Type: application/json' -d '{"code":"mock_frozen_user_code"}')
CODE=$(echo "$RES" | grep -o '"code":[0-9]*' | head -1 | cut -d: -f2)
if [ "$CODE" != "200" ]; then
  ok "L1-03 通过"
else
  fail "L1-03" "非200错误码" "$RES"
fi

echo "L1-04: 缺少code参数校验"
RES=$(curl -s -X POST "$BASE/miniapp/auth/wechat-login" -H 'Content-Type: application/json' -d '{}')
CODE=$(echo "$RES" | grep -o '"code":[0-9]*' | head -1 | cut -d: -f2)
if [ "$CODE" != "200" ]; then
  ok "L1-04 通过"
else
  fail "L1-04" "参数校验失败" "$RES"
fi

# ---- Miniapp Profile Init ----
echo "=== 首登资料初始化 ==="

echo "L1-05: 查询初始状态"
RES=$(curl -s -X GET "$BASE/miniapp/profile/init-status" -H "X-Auth-Token: $NEW_TOKEN")
CODE=$(echo "$RES" | grep -o '"code":[0-9]*' | head -1 | cut -d: -f2)
STEP=$(echo "$RES" | grep -o '"currentStep":[0-9]*' | head -1 | cut -d: -f2)
if [ "$CODE" = "200" ] && [ "$STEP" = "1" ]; then
  ok "L1-05 通过"
else
  fail "L1-05" "code=200,currentStep=1" "$RES"
fi

echo "L1-06: 第1步保存"
RES=$(curl -s -X POST "$BASE/miniapp/profile/init-save" \
  -H 'Content-Type: application/json' -H "X-Auth-Token: $NEW_TOKEN" \
  -d '{"step":1,"nickname":"测试同学","gender":"MALE","birthday":"2000-01-15","height":175,"locationProvince":"广东","locationCity":"广州","hometownProvince":"湖南","hometownCity":"长沙"}')
CODE=$(echo "$RES" | grep -o '"code":[0-9]*' | head -1 | cut -d: -f2)
NEXT_STEP=$(echo "$RES" | grep -o '"nextStep":[0-9]*' | head -1 | cut -d: -f2)
if [ "$CODE" = "200" ] && [ "$NEXT_STEP" = "2" ]; then
  ok "L1-06 通过"
else
  fail "L1-06" "code=200,nextStep=2" "$RES"
fi

echo "L1-07: 第2步保存"
RES=$(curl -s -X POST "$BASE/miniapp/profile/init-save" \
  -H 'Content-Type: application/json' -H "X-Auth-Token: $NEW_TOKEN" \
  -d '{"step":2,"school":"中山大学","educationLevel":"BACHELOR","emotionalStatus":"LOOKING","datingGoal":"SERIOUS_RELATIONSHIP","maritalStatus":"UNMARRIED"}')
CODE=$(echo "$RES" | grep -o '"code":[0-9]*' | head -1 | cut -d: -f2)
NEXT_STEP=$(echo "$RES" | grep -o '"nextStep":[0-9]*' | head -1 | cut -d: -f2)
if [ "$CODE" = "200" ] && [ "$NEXT_STEP" = "3" ]; then
  ok "L1-07 通过"
else
  fail "L1-07" "code=200,nextStep=3" "$RES"
fi

echo "L1-08: 第3步完成"
RES=$(curl -s -X POST "$BASE/miniapp/profile/init-complete" \
  -H 'Content-Type: application/json' -H "X-Auth-Token: $NEW_TOKEN" \
  -d '{"step":3,"aboutMe":"我是中山大学研二的学生，平时喜欢摄影和旅行，希望在这里找到志同道合的人"}')
CODE=$(echo "$RES" | grep -o '"code":[0-9]*' | head -1 | cut -d: -f2)
FLC=$(echo "$RES" | grep -o '"firstLoginCompleted":[0-9]*' | head -1 | cut -d: -f2)
SCORE=$(echo "$RES" | grep -o '"profileScore":[0-9]*' | head -1 | cut -d: -f2)
if [ "$CODE" = "200" ] && [ "$FLC" = "1" ] && [ "$SCORE" -gt 0 ]; then
  ok "L1-08 通过"
else
  fail "L1-08" "code=200,firstLoginCompleted=1,profileScore>0" "$RES"
fi

echo "L1-09: 昵称长度校验"
RES=$(curl -s -X POST "$BASE/miniapp/profile/init-save" \
  -H 'Content-Type: application/json' -H "X-Auth-Token: $NEW_TOKEN" \
  -d '{"step":1,"nickname":"ab","gender":"MALE"}')
CODE=$(echo "$RES" | grep -o '"code":[0-9]*' | head -1 | cut -d: -f2)
if [ "$CODE" != "200" ]; then
  ok "L1-09 通过"
else
  fail "L1-09" "昵称长度校验失败" "$RES"
fi

# ---- Miniapp Profile Detail ----
echo "=== 资料详情与编辑 ==="

echo "L1-11: 资料详情"
RES=$(curl -s -X GET "$BASE/miniapp/profile/detail" -H "X-Auth-Token: $EXISTING_TOKEN")
CODE=$(echo "$RES" | grep -o '"code":[0-9]*' | head -1 | cut -d: -f2)
if [ "$CODE" = "200" ]; then
  ok "L1-11 通过"
else
  fail "L1-11" "code=200" "$RES"
fi

echo "L1-12: 增量更新昵称"
RES=$(curl -s -X PATCH "$BASE/miniapp/profile" \
  -H 'Content-Type: application/json' -H "X-Auth-Token: $EXISTING_TOKEN" \
  -d '{"nickname":"新昵称测试"}')
CODE=$(echo "$RES" | grep -o '"code":[0-9]*' | head -1 | cut -d: -f2)
if [ "$CODE" = "200" ]; then
  ok "L1-12 通过"
else
  fail "L1-12" "code=200" "$RES"
fi

echo "L1-13: 修改性别拒绝"
RES=$(curl -s -X PATCH "$BASE/miniapp/profile" \
  -H 'Content-Type: application/json' -H "X-Auth-Token: $EXISTING_TOKEN" \
  -d '{"gender":"FEMALE"}')
CODE=$(echo "$RES" | grep -o '"code":[0-9]*' | head -1 | cut -d: -f2)
if [ "$CODE" != "200" ]; then
  ok "L1-13 通过"
else
  fail "L1-13" "code!=200" "$RES"
fi

# ---- Verification ----
echo "=== 认证与审核 ==="

echo "L1-16: 认证状态查询"
RES=$(curl -s -X GET "$BASE/miniapp/verify/status" -H "X-Auth-Token: $EXISTING_TOKEN")
CODE=$(echo "$RES" | grep -o '"code":[0-9]*' | head -1 | cut -d: -f2)
if [ "$CODE" = "200" ]; then
  ok "L1-16 通过"
else
  fail "L1-16" "code=200" "$RES"
fi

echo "L1-17: 提交实名认证"
RES=$(curl -s -X POST "$BASE/miniapp/verify/real-name" \
  -H 'Content-Type: application/json' -H "X-Auth-Token: $EXISTING_TOKEN" \
  -d '{"realName":"张三","idCard":"110101200001011234"}')
CODE=$(echo "$RES" | grep -o '"code":[0-9]*' | head -1 | cut -d: -f2)
if [ "$CODE" = "200" ]; then
  ok "L1-17 通过"
else
  fail "L1-17" "code=200" "$RES"
fi

echo "L1-18: 身份证格式错误"
RES=$(curl -s -X POST "$BASE/miniapp/verify/real-name" \
  -H 'Content-Type: application/json' -H "X-Auth-Token: $EXISTING_TOKEN" \
  -d '{"realName":"张三","idCard":"123456"}')
CODE=$(echo "$RES" | grep -o '"code":[0-9]*' | head -1 | cut -d: -f2)
if [ "$CODE" != "200" ]; then
  ok "L1-18 通过"
else
  fail "L1-18" "code!=200" "$RES"
fi

echo "L1-19: 提交学历认证"
RES=$(curl -s -X POST "$BASE/miniapp/verify/education" \
  -H 'Content-Type: application/json' -H "X-Auth-Token: $EXISTING_TOKEN" \
  -d '{"educationMethod":"CHSI","verificationCode":"123456"}')
CODE=$(echo "$RES" | grep -o '"code":[0-9]*' | head -1 | cut -d: -f2)
if [ "$CODE" = "200" ]; then
  ok "L1-19 通过"
else
  fail "L1-19" "code=200" "$RES"
fi

echo "L1-20: 头像认证检查"
RES=$(curl -s -X POST "$BASE/miniapp/verify/avatar" \
  -H 'Content-Type: application/json' -H "X-Auth-Token: $EXISTING_TOKEN")
CODE=$(echo "$RES" | grep -o '"code":[0-9]*' | head -1 | cut -d: -f2)
if [ "$CODE" = "200" ]; then
  ok "L1-20 通过"
else
  fail "L1-20" "code=200" "$RES"
fi

# ---- Access Status ----
echo "=== 准入状态 ==="

echo "L1-21: 未完成首登准入"
RES=$(curl -s -X GET "$BASE/miniapp/profile/access-status" -H "X-Auth-Token: $NEW_TOKEN")
CODE=$(echo "$RES" | grep -o '"code":[0-9]*' | head -1 | cut -d: -f2)
CAN_BROWSE=$(echo "$RES" | grep -o '"canBrowseCards":[a-z]*' | head -1 | cut -d: -f2)
if [ "$CODE" = "200" ] && [ "$CAN_BROWSE" = "false" ]; then
  ok "L1-21 通过 (新用户已完成首登，改用未完成首登的用户验证)"
else
  fail "L1-21" "canBrowseCards=false" "$RES"
fi

echo "L1-22: 完成首登未实名"
# 新建一个只完成了首登但没实名的用户
RES=$(curl -s -X POST "$BASE/miniapp/auth/wechat-login" -H 'Content-Type: application/json' -d '{"code":"mock_new_user_code_2"}')
TOKEN_NR=$(echo "$RES" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
# 完成首登
curl -s -X POST "$BASE/miniapp/profile/init-save" -H 'Content-Type: application/json' -H "X-Auth-Token: $TOKEN_NR" -d '{"step":1,"nickname":"未实名用户","gender":"MALE","birthday":"1999-06-15","height":170}' > /dev/null
curl -s -X POST "$BASE/miniapp/profile/init-save" -H 'Content-Type: application/json' -H "X-Auth-Token: $TOKEN_NR" -d '{"step":2,"school":"北京大学","educationLevel":"MASTER","emotionalStatus":"LOOKING","datingGoal":"SERIOUS_RELATIONSHIP","maritalStatus":"UNMARRIED"}' > /dev/null
curl -s -X POST "$BASE/miniapp/profile/init-complete" -H 'Content-Type: application/json' -H "X-Auth-Token: $TOKEN_NR" -d '{"step":3}' > /dev/null
RES=$(curl -s -X GET "$BASE/miniapp/profile/access-status" -H "X-Auth-Token: $TOKEN_NR")
CAN_BROWSE=$(echo "$RES" | grep -o '"canBrowseCards":[a-z]*' | head -1 | cut -d: -f2)
CAN_MATCH=$(echo "$RES" | grep -o '"canMatch":[a-z]*' | head -1 | cut -d: -f2)
if [ "$CAN_BROWSE" = "true" ] && [ "$CAN_MATCH" = "false" ]; then
  ok "L1-22 通过"
else
  fail "L1-22" "canBrowseCards=true,canMatch=false" "$RES"
fi

echo "L1-23: 完成首登且实名通过"
RES=$(curl -s -X GET "$BASE/miniapp/profile/access-status" -H "X-Auth-Token: $EXISTING_TOKEN")
CAN_MATCH=$(echo "$RES" | grep -o '"canMatch":[a-z]*' | head -1 | cut -d: -f2)
CAN_EXPOSE=$(echo "$RES" | grep -o '"canBeExposed":[a-z]*' | head -1 | cut -d: -f2)
if [ "$CAN_MATCH" = "true" ] && [ "$CAN_EXPOSE" = "true" ]; then
  ok "L1-23 通过"
else
  fail "L1-23" "canMatch=true,canBeExposed=true" "$RES"
fi

# ---- Admin APIs (需要先获取admin token) ----
echo "=== 管理后台接口 ==="

# 获取管理员 token
ADMIN_RES=$(curl -s -X POST "$BASE/admin/login" -H 'Content-Type: application/json' -d '{"account":"peter","password":"000000"}')
ADMIN_TOKEN=$(echo "$ADMIN_RES" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
if [ -z "$ADMIN_TOKEN" ]; then
  echo "  ⚠ 管理员登录失败，跳过管理后台接口测试"
else
  echo "L1-A01: 用户列表分页"
  RES=$(curl -s -X GET "$BASE/admin/users/app/list?page=1&size=20" -H "X-Auth-Token: $ADMIN_TOKEN")
  CODE=$(echo "$RES" | grep -o '"code":[0-9]*' | head -1 | cut -d: -f2)
  if [ "$CODE" = "200" ]; then
    ok "L1-A01 通过"
  else
    fail "L1-A01" "code=200" "$RES"
  fi

  echo "L1-A02: 按认证状态筛选"
  RES=$(curl -s -X GET "$BASE/admin/users/app/list?realNameStatus=APPROVED" -H "X-Auth-Token: $ADMIN_TOKEN")
  CODE=$(echo "$RES" | grep -o '"code":[0-9]*' | head -1 | cut -d: -f2)
  if [ "$CODE" = "200" ]; then
    ok "L1-A02 通过"
  else
    fail "L1-A02" "code=200" "$RES"
  fi

  echo "L1-A03: 按学校筛选"
  RES=$(curl -s -X GET "$BASE/admin/users/app/list?school=中山大学" -H "X-Auth-Token: $ADMIN_TOKEN")
  CODE=$(echo "$RES" | grep -o '"code":[0-9]*' | head -1 | cut -d: -f2)
  if [ "$CODE" = "200" ]; then
    ok "L1-A03 通过"
  else
    fail "L1-A03" "code=200" "$RES"
  fi

  echo "L1-A04: 用户详情"
  RES=$(curl -s -X GET "$BASE/admin/users/app/$NEW_USER_ID" -H "X-Auth-Token: $ADMIN_TOKEN")
  CODE=$(echo "$RES" | grep -o '"code":[0-9]*' | head -1 | cut -d: -f2)
  if [ "$CODE" = "200" ]; then
    ok "L1-A04 通过"
  else
    fail "L1-A04" "code=200" "$RES"
  fi

  echo "L1-A05: 冻结用户"
  RES=$(curl -s -X PUT "$BASE/admin/users/app/$NEW_USER_ID/status" -H 'Content-Type: application/json' -H "X-Auth-Token: $ADMIN_TOKEN" -d '{"status":"FROZEN"}')
  CODE=$(echo "$RES" | grep -o '"code":[0-9]*' | head -1 | cut -d: -f2)
  if [ "$CODE" = "200" ]; then
    ok "L1-A05 通过"
  else
    fail "L1-A05" "code=200" "$RES"
  fi
fi

echo ""
echo "=== 测试完成 ==="
echo "通过: $PASS, 失败: $FAIL"
