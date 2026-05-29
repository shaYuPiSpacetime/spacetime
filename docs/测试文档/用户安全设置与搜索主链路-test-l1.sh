#!/usr/bin/env bash
set -u

API="${API_URL:-http://localhost:8080}"
ADMIN_ACCOUNT="${ADMIN_ACCOUNT:-peter}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-000000}"
MINI_TOKEN="${MINI_TOKEN:-e2e-miniapp-token}"

ADMIN_TOKEN="$(
  curl -s -X POST "$API/admin/login" \
    -H 'Content-Type: application/json' \
    -d "{\"account\":\"$ADMIN_ACCOUNT\",\"password\":\"$ADMIN_PASSWORD\"}" \
    | sed -n 's/.*"token":"\([^"]*\)".*/\1/p'
)"

pass=0
fail=0

run() {
  name="$1"
  shift
  expect="$1"
  shift
  out=$(mktemp)
  code=$(curl -s -o "$out" -w '%{http_code}' "$@")
  body=$(cat "$out")
  rm "$out"
  if [[ "$code" == "$expect" && "$body" == *'"code":200'* ]]; then
    echo "PASS $name HTTP=$code"
    pass=$((pass + 1))
  else
    echo "FAIL $name HTTP=$code $body"
    fail=$((fail + 1))
  fi
}

run_status() {
  name="$1"
  shift
  expect="$1"
  shift
  out=$(mktemp)
  code=$(curl -s -o "$out" -w '%{http_code}' "$@")
  body=$(cat "$out")
  rm "$out"
  if [[ "$code" == "$expect" ]]; then
    echo "PASS $name HTTP=$code"
    pass=$((pass + 1))
  else
    echo "FAIL $name HTTP=$code $body"
    fail=$((fail + 1))
  fi
}

if [[ -z "${ADMIN_TOKEN:-}" ]]; then
  echo "FAIL admin login did not return token"
  exit 1
fi

run 'F1-P0-01 我的页聚合' 200 "$API/miniapp/profile/home" -H "X-Auth-Token: $MINI_TOKEN"
run 'F1-P0-02 认证中心聚合' 200 "$API/miniapp/profile/certification-center" -H "X-Auth-Token: $MINI_TOKEN"
run 'F1-P0-03 设置页聚合' 200 "$API/miniapp/settings/home" -H "X-Auth-Token: $MINI_TOKEN"
run 'F2-P0-02 保存隐私设置' 200 -X PUT "$API/miniapp/settings/privacy" -H "X-Auth-Token: $MINI_TOKEN" -H 'Content-Type: application/json' -d '{"showDistance":false,"personalizedPush":true}'
run 'F2-P0-01 查询隐私设置' 200 "$API/miniapp/settings/privacy" -H "X-Auth-Token: $MINI_TOKEN"
run 'F2-P0-04 保存通知设置' 200 -X PUT "$API/miniapp/settings/notifications" -H "X-Auth-Token: $MINI_TOKEN" -H 'Content-Type: application/json' -d '{"chat":false,"asset":true}'
run 'F2-P0-03 查询通知设置' 200 "$API/miniapp/settings/notifications" -H "X-Auth-Token: $MINI_TOKEN"
run 'F3-P0-01 加入黑名单' 200 -X POST "$API/miniapp/settings/blocks/blacklist" -H "X-Auth-Token: $MINI_TOKEN" -H 'Content-Type: application/json' -d '{"targetUserId":910000,"sourceScene":"E2E"}'
run 'F3-P0-02 查询黑名单列表' 200 "$API/miniapp/settings/blocks/blacklist?page=1&size=5" -H "X-Auth-Token: $MINI_TOKEN"
run 'F3-P0-04 加入不看TA动态' 200 -X POST "$API/miniapp/settings/blocks/hidden-dynamics" -H "X-Auth-Token: $MINI_TOKEN" -H 'Content-Type: application/json' -d '{"targetUserId":910101,"sourceScene":"E2E"}'
run 'F3-P0-05 查询不看TA动态列表' 200 "$API/miniapp/settings/blocks/hidden-dynamics?page=1&size=5" -H "X-Auth-Token: $MINI_TOKEN"
run 'F4-P0-01 新增个人关键词' 200 -X POST "$API/miniapp/settings/keyword-blocks" -H "X-Auth-Token: $MINI_TOKEN" -H 'Content-Type: application/json' -d '{"keyword":"E2E关键词"}'
run 'F4-P0-02 查询个人关键词' 200 "$API/miniapp/settings/keyword-blocks" -H "X-Auth-Token: $MINI_TOKEN"
run 'F5-P0-01 提交反馈' 200 -X POST "$API/miniapp/feedback" -H "X-Auth-Token: $MINI_TOKEN" -H 'Content-Type: application/json' -d '{"feedbackType":"BUG","content":"E2E feedback content","imageUrls":[],"contact":"13800000000"}'
run 'F5-P0-02 后台反馈列表' 200 "$API/admin/user-security/feedback/list?page=1&size=5" -H "X-Auth-Token: $ADMIN_TOKEN"

feedback_id=$(curl -s "$API/admin/user-security/feedback/list?page=1&size=1" -H "X-Auth-Token: $ADMIN_TOKEN" | sed -n 's/.*"id":\([0-9][0-9]*\).*/\1/p' | head -1)
if [[ -n "${feedback_id:-}" ]]; then
  run 'F5-P0-03 后台反馈详情' 200 "$API/admin/user-security/feedback/$feedback_id" -H "X-Auth-Token: $ADMIN_TOKEN"
  run 'F5-P0-04 后台处理反馈' 200 -X PUT "$API/admin/user-security/feedback/$feedback_id/status" -H "X-Auth-Token: $ADMIN_TOKEN" -H 'Content-Type: application/json' -d '{"status":"RESOLVED","remark":"E2E handled"}'
else
  echo 'FAIL F5 detail no feedback id'
  fail=$((fail + 1))
fi

run 'F6-P0-01 查询注销状态' 200 "$API/miniapp/account/cancel-status" -H "X-Auth-Token: $MINI_TOKEN"
run 'F6-P0-02 提交注销申请' 200 -X POST "$API/miniapp/account/cancel" -H "X-Auth-Token: $MINI_TOKEN" -H 'Content-Type: application/json' -d '{"confirm":true,"reason":"E2E cancel"}'
run 'F6-P0-03 撤销注销申请' 200 -X POST "$API/miniapp/account/cancel/revoke" -H "X-Auth-Token: $MINI_TOKEN"
run 'F6-P0-05 后台注销列表' 200 "$API/admin/user-security/cancel-requests/list?page=1&size=5" -H "X-Auth-Token: $ADMIN_TOKEN"

cancel_id=$(curl -s "$API/admin/user-security/cancel-requests/list?page=1&size=1" -H "X-Auth-Token: $ADMIN_TOKEN" | sed -n 's/.*"id":\([0-9][0-9]*\).*/\1/p' | head -1)
if [[ -n "${cancel_id:-}" ]]; then
  run 'F6-P0-06 后台注销详情' 200 "$API/admin/user-security/cancel-requests/$cancel_id" -H "X-Auth-Token: $ADMIN_TOKEN"
  run 'F6-P0-07 后台注销备注' 200 -X PUT "$API/admin/user-security/cancel-requests/$cancel_id/remark" -H "X-Auth-Token: $ADMIN_TOKEN" -H 'Content-Type: application/json' -d '{"remark":"E2E remark"}'
else
  echo 'FAIL F6 detail no cancel id'
  fail=$((fail + 1))
fi

run 'F7-P0-01 搜索全部类型' 200 "$API/miniapp/search/results?keyword=peter&type=all&page=1&size=5" -H "X-Auth-Token: $MINI_TOKEN"
run 'F7-P1-03 搜索动态占位' 200 "$API/miniapp/search/results?keyword=test&type=post&page=1&size=5" -H "X-Auth-Token: $MINI_TOKEN"
run_status 'F7-P3-01 未登录搜索' 401 "$API/miniapp/search/results?keyword=test"
run 'F8-P0-01 后台用户安全摘要' 200 "$API/admin/user-security/users/1/summary" -H "X-Auth-Token: $ADMIN_TOKEN"
run 'F8-P0-02 后台用户隐私' 200 "$API/admin/user-security/users/1/privacy" -H "X-Auth-Token: $ADMIN_TOKEN"
run 'F8-P0-03 后台用户通知' 200 "$API/admin/user-security/users/1/notifications" -H "X-Auth-Token: $ADMIN_TOKEN"
run 'F8-P0-04 后台用户黑名单' 200 "$API/admin/user-security/users/1/blacklist?page=1&size=5" -H "X-Auth-Token: $ADMIN_TOKEN"
run 'F8-P0-05 后台用户动态屏蔽' 200 "$API/admin/user-security/users/1/hidden-dynamics?page=1&size=5" -H "X-Auth-Token: $ADMIN_TOKEN"
run 'F8-P0-06 后台用户关键词' 200 "$API/admin/user-security/users/1/keyword-blocks" -H "X-Auth-Token: $ADMIN_TOKEN"

echo "SUMMARY pass=$pass fail=$fail"
[[ $fail -eq 0 ]]
