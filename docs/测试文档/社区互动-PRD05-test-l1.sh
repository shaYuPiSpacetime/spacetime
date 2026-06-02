#!/bin/bash
# ================================================================
# PRD-05 社区互动 - L1 接口测试脚本
# 范围：小程序社区接口 + 后台审核/举报/配置接口
# ================================================================
API_URL="${API_URL:-http://localhost:8080}"
ADMIN_USERNAME="${ADMIN_USERNAME:-peter}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-000000}"
MINIAPP_TOKEN="${MINIAPP_TOKEN:-}"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'; NC='\033[0m'
PASS=0; FAIL=0

api_post_no_token() { curl -s -w "\n%{http_code}" -X POST "$1" -H "Content-Type: application/json" -d "$2"; }
api_get_no_token()  { curl -s -w "\n%{http_code}" -X GET "$1"; }
api_delete_no_token(){ curl -s -w "\n%{http_code}" -X DELETE "$1"; }
api_get()           { curl -s -w "\n%{http_code}" -X GET "$1" -H "X-Auth-Token: ${TOKEN}"; }
api_post_json()     { curl -s -w "\n%{http_code}" -X POST "$1" -H "X-Auth-Token: ${TOKEN}" -H "Content-Type: application/json" -d "$2"; }
api_put_json()      { curl -s -w "\n%{http_code}" -X PUT "$1" -H "X-Auth-Token: ${TOKEN}" -H "Content-Type: application/json" -d "$2"; }
api_get_miniapp()   { curl -s -w "\n%{http_code}" -X GET "$1" -H "X-Auth-Token: ${MINIAPP_TOKEN}"; }
api_post_miniapp()  { curl -s -w "\n%{http_code}" -X POST "$1" -H "X-Auth-Token: ${MINIAPP_TOKEN}" -H "Content-Type: application/json" -d "$2"; }
api_delete_miniapp(){ curl -s -w "\n%{http_code}" -X DELETE "$1" -H "X-Auth-Token: ${MINIAPP_TOKEN}"; }

parse_response() { RESP_CODE=$(echo "$1" | tail -1); RESP_BODY=$(echo "$1" | sed '$d'); }
json_field() {
  echo "$1" | python3 -c "
import sys,json
d=json.load(sys.stdin)
for k in '$2'.split('.'):
    if isinstance(d, dict): d=d.get(k)
    else: d=None
print('' if d is None else d)
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

echo "=========================================="
echo "  PRD-05 社区互动 L1 接口冒烟测试"
echo "  API: $API_URL"
echo "=========================================="

login_admin

echo -e "\n${YELLOW}[后台] 社区配置与审核${NC}"

RESP=$(api_get "$API_URL/admin/community/configs")
parse_response "$RESP"
check_code "社区配置查询" 200 "$RESP_CODE"

RESP=$(api_get "$API_URL/admin/community/home-tabs")
parse_response "$RESP"
check_code "社区首页Tab查询" 200 "$RESP_CODE"

if [ -n "$MINIAPP_TOKEN" ]; then
  echo -e "\n${YELLOW}[小程序] 社区主链路${NC}"

  RESP=$(api_get_miniapp "$API_URL/miniapp/community/posts?postType=community&page=1&size=10")
  parse_response "$RESP"
  check_code "社区动态列表" 200 "$RESP_CODE"

  RESP=$(api_get_miniapp "$API_URL/miniapp/community/config")
  parse_response "$RESP"
  check_code "社区配置查询" 200 "$RESP_CODE"

  RESP=$(api_post_miniapp "$API_URL/miniapp/community/posts" '{"postType":"community","content":"L1测试社区动态","topicId":1,"imageUrls":[],"mentionUserIds":[]}')
  parse_response "$RESP"
  check_code "发布社区动态" 200 "$RESP_CODE"
  POST_ID=$(json_field "$RESP_BODY" "data")

  RESP=$(api_post_miniapp "$API_URL/miniapp/community/posts" '{"postType":"community","content":"无话题动态","imageUrls":[],"mentionUserIds":[]}')
  parse_response "$RESP"
  check_code "发布动态缺少话题" 200 "$RESP_CODE"

  if [ -n "$POST_ID" ] && [ "$POST_ID" != "None" ]; then
    RESP=$(api_get_miniapp "$API_URL/miniapp/community/posts/$POST_ID")
    parse_response "$RESP"
    check_code "查询内容详情" 200 "$RESP_CODE"

    RESP=$(api_post_miniapp "$API_URL/miniapp/community/comments" "{\"postId\":$POST_ID,\"content\":\"L1测试评论\"}")
    parse_response "$RESP"
    check_code "发表评论" 200 "$RESP_CODE"
    COMMENT_ID=$(json_field "$RESP_BODY" "data")

    RESP=$(api_get_miniapp "$API_URL/miniapp/community/posts/$POST_ID/comments?page=1&size=10")
    parse_response "$RESP"
    check_code "评论列表" 200 "$RESP_CODE"

    RESP=$(api_post_miniapp "$API_URL/miniapp/community/posts/$POST_ID/like" "{}")
    parse_response "$RESP"
    check_code "点赞动态" 200 "$RESP_CODE"

    RESP=$(api_post_miniapp "$API_URL/miniapp/community/posts/$POST_ID/like" "{}")
    parse_response "$RESP"
    check_code "取消点赞动态" 200 "$RESP_CODE"

    RESP=$(api_post_miniapp "$API_URL/miniapp/community/follows/2" "{}")
    parse_response "$RESP"
    check_code "关注用户" 200 "$RESP_CODE"

    RESP=$(api_post_miniapp "$API_URL/miniapp/community/follows/2" "{}")
    parse_response "$RESP"
    check_code "取消关注用户" 200 "$RESP_CODE"

    RESP=$(api_post_miniapp "$API_URL/miniapp/community/reports" "{\"targetType\":\"post\",\"targetId\":$POST_ID,\"reasonCode\":\"spam\",\"extraText\":\"L1脚本举报\"}")
    parse_response "$RESP"
    check_code "举报动态" 200 "$RESP_CODE"
    REPORT_ID=$(json_field "$RESP_BODY" "data")

    if [ -n "$COMMENT_ID" ] && [ "$COMMENT_ID" != "None" ]; then
      RESP=$(api_delete_miniapp "$API_URL/miniapp/community/comments/$COMMENT_ID")
      parse_response "$RESP"
      check_code "删除自己的评论" 200 "$RESP_CODE"
    fi

    RESP=$(api_delete_miniapp "$API_URL/miniapp/community/posts/$POST_ID")
    parse_response "$RESP"
    check_code "删除自己的动态" 200 "$RESP_CODE"

    echo -e "\n${YELLOW}[后台] 社区审核与举报处理${NC}"
    RESP=$(api_get "$API_URL/admin/community/posts/list?page=1&size=10")
    parse_response "$RESP"
    check_code "社区内容审核列表" 200 "$RESP_CODE"

    RESP=$(api_get "$API_URL/admin/community/comments/list?page=1&size=10")
    parse_response "$RESP"
    check_code "评论审核列表" 200 "$RESP_CODE"

    RESP=$(api_get "$API_URL/admin/community/reports/list?page=1&size=10")
    parse_response "$RESP"
    check_code "举报列表" 200 "$RESP_CODE"

    if [ -n "$REPORT_ID" ] && [ "$REPORT_ID" != "None" ]; then
      RESP=$(api_put_json "$API_URL/admin/community/reports/$REPORT_ID/handle" '{"status":"RESOLVED","handleAction":"DISMISS","handleRemark":"L1脚本处理"}')
      parse_response "$RESP"
      check_code "处理举报" 200 "$RESP_CODE"
    fi
  fi
else
  echo -e "\n${YELLOW}[小程序] 跳过 (未设置 MINIAPP_TOKEN，如需测试请设置后运行)${NC}"
fi

RESP=$(api_get_no_token "$API_URL/admin/community/posts/list?page=1&size=10")
parse_response "$RESP"
check_code "无token访问后台社区接口" 401 "$RESP_CODE"

RESP=$(api_post_no_token "$API_URL/miniapp/community/posts" '{"postType":"community","content":"未登录","topicId":1}')
parse_response "$RESP"
check_code "未登录发布动态" 401 "$RESP_CODE"

echo -e "\n=========================================="
echo -e "  测试结果: ${GREEN}通过 $PASS${NC} / ${RED}失败 $FAIL${NC}"
echo "=========================================="

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
