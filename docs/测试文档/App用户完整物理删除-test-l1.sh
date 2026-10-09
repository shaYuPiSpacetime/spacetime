#!/bin/bash

# 破坏性 L1：必须显式给出目标 ID、期望昵称并设置 ALLOW_DESTRUCTIVE_TEST=DELETE_VERIFIED_USER。
# 示例只说明变量名，不提供真实地址、Token 或测试数据。
API_URL="${API_URL:-}"
TOKEN="${TOKEN:-}"
TARGET_USER_ID="${TARGET_USER_ID:-}"
EXPECTED_NICKNAME="${EXPECTED_NICKNAME:-}"
DELETE_REASON="${DELETE_REASON:-按用户要求彻底清理测试账号及全部关联数据}"
ALLOW_DESTRUCTIVE_TEST="${ALLOW_DESTRUCTIVE_TEST:-}"
export DELETE_REASON

TOTAL=0
PASS=0
FAIL=0
SKIP=0

pass_test() { TOTAL=$((TOTAL+1)); PASS=$((PASS+1)); echo "✅ [$1] $2"; }
fail_test() { TOTAL=$((TOTAL+1)); FAIL=$((FAIL+1)); echo "❌ [$1] $2"; }
skip_test() { TOTAL=$((TOTAL+1)); SKIP=$((SKIP+1)); echo "⏭️  [$1] $2 | $3"; }

finish() {
  printf "L1 总计 %d 通过 %d 失败 %d 跳过 %d\n" "$TOTAL" "$PASS" "$FAIL" "$SKIP"
  exit "$FAIL"
}

if [ -z "$API_URL" ] || [ -z "$TOKEN" ]; then
  skip_test "F1-P0-01" "删除前身份核验" "缺少 API_URL 或 TOKEN"
  skip_test "F1-P0-02" "完整物理删除" "环境未配置"
  skip_test "F1-P0-03" "删除后不可查询" "环境未配置"
  finish
fi

unauthorized_status=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE \
  "$API_URL/admin/users/app/0" \
  -H "Content-Type: application/json" \
  -d '{"reason":"权限验证"}')
if [ "$unauthorized_status" = "401" ]; then
  pass_test "G-P3-01" "未登录删除请求被 401 拦截"
else
  fail_test "G-P3-01" "未登录删除请求应返回 401，实际为 $unauthorized_status"
fi

if [ -z "$TARGET_USER_ID" ] || [ -z "$EXPECTED_NICKNAME" ]; then
  skip_test "F1-P0-01" "删除前身份核验" "缺少 TARGET_USER_ID 或 EXPECTED_NICKNAME"
  skip_test "F1-P0-02" "完整物理删除" "目标身份未核验"
  skip_test "F1-P0-03" "删除后不可查询" "目标未删除"
  finish
fi

detail_body=$(curl -s -X GET \
  "$API_URL/admin/users/app/$TARGET_USER_ID" \
  -H "X-Auth-Token: $TOKEN")
identity=$(printf "%s" "$detail_body" | python3 -c \
  'import json,sys; d=json.load(sys.stdin); x=d.get("data") or {}; print(f"{d.get('"'"'code'"'"')}|{x.get('"'"'id'"'"')}|{x.get('"'"'nickname'"'"','"'"''"'"')}")' 2>/dev/null)
expected_identity="200|$TARGET_USER_ID|$EXPECTED_NICKNAME"
if [ "$identity" = "$expected_identity" ]; then
  pass_test "F1-P0-01" "目标 ID 与昵称核验通过"
else
  fail_test "F1-P0-01" "目标身份不匹配，期望 $expected_identity，实际 $identity"
  skip_test "F1-P0-02" "完整物理删除" "身份核验失败，安全停止"
  skip_test "F1-P0-03" "删除后不可查询" "目标未删除"
  finish
fi

if [ "$ALLOW_DESTRUCTIVE_TEST" != "DELETE_VERIFIED_USER" ]; then
  skip_test "F1-P0-02" "完整物理删除" "未设置 ALLOW_DESTRUCTIVE_TEST=DELETE_VERIFIED_USER"
  skip_test "F1-P0-03" "删除后不可查询" "目标未删除"
  finish
fi

delete_payload=$(python3 -c 'import json,os; print(json.dumps({"reason": os.environ["DELETE_REASON"]}, ensure_ascii=False))')
delete_body=$(curl -s -X DELETE \
  "$API_URL/admin/users/app/$TARGET_USER_ID" \
  -H "X-Auth-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$delete_payload")
delete_code=$(printf "%s" "$delete_body" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("code",""))' 2>/dev/null)
if [ "$delete_code" = "200" ]; then
  pass_test "F1-P0-02" "完整物理删除接口返回成功"
else
  fail_test "F1-P0-02" "删除接口失败：$delete_body"
  skip_test "F1-P0-03" "删除后不可查询" "删除接口失败"
  finish
fi

sleep 1
after_body=$(curl -s -X GET \
  "$API_URL/admin/users/app/$TARGET_USER_ID" \
  -H "X-Auth-Token: $TOKEN")
after_result=$(printf "%s" "$after_body" | python3 -c \
  'import json,sys; d=json.load(sys.stdin); print(f"{d.get('"'"'code'"'"')}|{d.get('"'"'msg'"'"','"'"''"'"')}")' 2>/dev/null)
if [ "$after_result" = "5001|用户不存在" ]; then
  pass_test "F1-P0-03" "删除后详情接口确认用户不存在"
else
  fail_test "F1-P0-03" "删除后仍可查询或响应异常：$after_body"
fi

finish
