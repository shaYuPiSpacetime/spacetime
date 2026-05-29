#!/bin/bash
# ================================================================
# 公共内容配置模块 - L1 接口测试脚本
#
# 执行前置：
#   1. 公共内容配置模块已按 tcdesign 实现并完成 schema-content.sql 初始化。
#   2. 默认使用 peter/000000 登录获取 Token。可通过环境变量覆盖：
#      TOKEN=xxx bash docs/测试文档/公共内容配置-test-l1.sh
#      或 ADMIN_ACCOUNT=xxx ADMIN_PASSWORD=xxx bash docs/测试文档/公共内容配置-test-l1.sh
#   3. 可选提供 LOW_PRIV_TOKEN，用于 403 权限用例；缺失则跳过该用例。
#   4. API_URL 默认 http://localhost:8080，可通过环境变量或 frontend/e2e-tests/.env 覆盖。
#
# 数据计划：
#   链式自构建测试数据 → 测试 CRUD/公共查询 → 删除测试数据 → 恢复原配置。
#   修改 app_config 前会读取原值，退出时按原值恢复，避免覆盖测试环境配置。
# ================================================================

ENV_FILE="${ENV_FILE:-frontend/e2e-tests/.env}"
if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
fi

API_URL="${API_URL:-http://localhost:8080}"
API_URL="${API_URL%/}"
ADMIN_ACCOUNT="${ADMIN_ACCOUNT:-${ADMIN_USERNAME:-peter}}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-000000}"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'; NC='\033[0m'
RUN_ID="$(date +%s)"
ARTICLE_H5_TITLE="L1测试公告_H5_${RUN_ID}"
ARTICLE_NATIVE_TITLE="L1测试帮助_NATIVE_${RUN_ID}"
ENTRY_KEY="l1_test_entry_${RUN_ID}"
HOT_WORD="L1测试热词_${RUN_ID}"
BLOCK_WORD="L1违规测试词_${RUN_ID}"

# ── HTTP 工具函数 ──
api_post_no_token() { curl -s -w "\n%{http_code}" -X POST "$1" -H "Content-Type: application/json" -d "$2"; }
api_get_no_token()  { curl -s -w "\n%{http_code}" -X GET  "$1"; }
api_post_json()     { curl -s -w "\n%{http_code}" -X POST "$1" -H "X-Auth-Token: ${TOKEN}" -H "Content-Type: application/json" -d "$2"; }
api_get()           { curl -s -w "\n%{http_code}" -X GET  "$1" -H "X-Auth-Token: ${TOKEN}"; }
api_put_json()      { curl -s -w "\n%{http_code}" -X PUT "$1" -H "X-Auth-Token: ${TOKEN}" -H "Content-Type: application/json" -d "$2"; }
api_delete()        { curl -s -w "\n%{http_code}" -X DELETE "$1" -H "X-Auth-Token: ${TOKEN}"; }
api_get_with_token(){ curl -s -w "\n%{http_code}" -X GET "$2" -H "X-Auth-Token: $1"; }

parse_response() { RESP_CODE=$(echo "$1" | tail -1); RESP_BODY=$(echo "$1" | sed '$d'); }

json_field() {
  echo "$1" | python3 -c "
import sys,json
try:
    d=json.load(sys.stdin)
    for k in '$2'.split('.'):
        if isinstance(d, dict):
            d=d.get(k)
        elif isinstance(d, list) and k.isdigit():
            d=d[int(k)] if int(k)<len(d) else None
        else:
            d=None
    v=d if d is not None else ''
    print(str(v).lower() if isinstance(v, bool) else v)
except Exception:
    print('')
" 2>/dev/null
}

config_item_from_body() {
  echo "$1" | python3 -c '
import json, sys
try:
    root = json.load(sys.stdin)
    data = root.get("data") or {}
    if not data.get("configKey"):
        sys.exit(1)
    item = {
        "configKey": data.get("configKey", ""),
        "configValue": data.get("configValue", ""),
        "configGroup": data.get("configGroup", "DEFAULT"),
        "configType": data.get("configType", "TEXT"),
        "publicVisible": data.get("publicVisible", 0),
        "status": data.get("status", "ENABLED"),
        "remark": data.get("remark", "")
    }
    print(json.dumps(item, ensure_ascii=False))
except Exception:
    sys.exit(1)
' 2>/dev/null
}

TOTAL=0; PASS=0; FAIL=0; SKIP=0

assert_eq() {
  local id="$1" desc="$2" expected="$3" actual="$4"
  TOTAL=$((TOTAL+1))
  if [ "$expected" = "$actual" ]; then
    PASS=$((PASS+1)); echo -e "${GREEN}✅ [$id] $desc${NC}"
  else
    FAIL=$((FAIL+1)); echo -e "${RED}❌ [$id] $desc | exp=$expected act=$actual${NC}"
  fi
}

assert_contains() {
  local id="$1" desc="$2" needle="$3" actual="$4"
  TOTAL=$((TOTAL+1))
  if echo "$actual" | grep -q "$needle"; then
    PASS=$((PASS+1)); echo -e "${GREEN}✅ [$id] $desc${NC}"
  else
    FAIL=$((FAIL+1)); echo -e "${RED}❌ [$id] $desc | need:$needle${NC}"
  fi
}

assert_not_contains() {
  local id="$1" desc="$2" needle="$3" actual="$4"
  TOTAL=$((TOTAL+1))
  if ! echo "$actual" | grep -q "$needle"; then
    PASS=$((PASS+1)); echo -e "${GREEN}✅ [$id] $desc${NC}"
  else
    FAIL=$((FAIL+1)); echo -e "${RED}❌ [$id] $desc | should NOT contain:$needle${NC}"
  fi
}

assert_rejected() {
  local id="$1" desc="$2"
  local biz_code
  biz_code=$(json_field "$RESP_BODY" "code")
  TOTAL=$((TOTAL+1))
  if [ "$RESP_CODE" = "400" ] || [ "$biz_code" = "4001" ] || [ "$biz_code" = "5001" ]; then
    PASS=$((PASS+1)); echo -e "${GREEN}✅ [$id] $desc${NC}"
  else
    FAIL=$((FAIL+1)); echo -e "${RED}❌ [$id] $desc | expected reject, http=$RESP_CODE biz=$biz_code${NC}"
  fi
}

skip_test() {
  TOTAL=$((TOTAL+1)); SKIP=$((SKIP+1)); echo -e "${YELLOW}⏭️  [$1] $2 | $3${NC}"
}

check_401() {
  local id="$1" desc="$2" resp="$3"
  parse_response "$resp"
  TOTAL=$((TOTAL+1))
  if [ "$RESP_CODE" = "401" ]; then
    PASS=$((PASS+1)); echo -e "${GREEN}✅ [$id] $desc | 401${NC}"
  else
    FAIL=$((FAIL+1)); echo -e "${RED}❌ [$id] $desc | expected 401 got $RESP_CODE${NC}"
  fi
}

check_403_or_skip() {
  local id="$1" desc="$2" url="$3"
  if [ -z "$LOW_PRIV_TOKEN" ]; then
    skip_test "$id" "$desc" "未提供 LOW_PRIV_TOKEN"
    return
  fi
  parse_response "$(api_get_with_token "$LOW_PRIV_TOKEN" "$url")"
  TOTAL=$((TOTAL+1))
  if [ "$RESP_CODE" = "403" ]; then
    PASS=$((PASS+1)); echo -e "${GREEN}✅ [$id] $desc | 403${NC}"
  else
    FAIL=$((FAIL+1)); echo -e "${RED}❌ [$id] $desc | expected 403 got $RESP_CODE${NC}"
  fi
}

valid_id() {
  [ -n "$1" ] && [ "$1" != "null" ] && [ "$1" != "None" ] && [ "$1" != "none" ]
}

restore_configs() {
  if [ -z "$TOKEN" ]; then
    return
  fi
  local items=""
  if [ -n "$ORIG_USER_AGREEMENT" ]; then
    items="$ORIG_USER_AGREEMENT"
  fi
  if [ -n "$ORIG_EMPTY_TEXT" ]; then
    if [ -n "$items" ]; then
      items="$items,$ORIG_EMPTY_TEXT"
    else
      items="$ORIG_EMPTY_TEXT"
    fi
  fi
  if [ -n "$items" ]; then
    api_post_json "$API_URL/admin/content/app-config/batch" "{\"items\":[$items]}" > /dev/null
    echo "  恢复原配置"
  fi
}

silent_cleanup() {
  if [ -z "$TOKEN" ]; then
    return
  fi
  if valid_id "$ARTICLE_H5_ID"; then api_delete "$API_URL/admin/content/articles/$ARTICLE_H5_ID" > /dev/null; fi
  if valid_id "$ARTICLE_NATIVE_ID"; then api_delete "$API_URL/admin/content/articles/$ARTICLE_NATIVE_ID" > /dev/null; fi
  if valid_id "$ENTRY_ID"; then api_delete "$API_URL/admin/content/mobile-entries/$ENTRY_ID" > /dev/null; fi
  if valid_id "$HOT_WORD_ID"; then api_delete "$API_URL/admin/content/search-hot-words/$HOT_WORD_ID" > /dev/null; fi
  if valid_id "$BLOCK_WORD_ID"; then api_delete "$API_URL/admin/content/search-block-words/$BLOCK_WORD_ID" > /dev/null; fi
  restore_configs
}

trap silent_cleanup EXIT

echo "=========================================="
echo " 公共内容配置模块 L1 接口测试"
echo " API_URL: ${API_URL}"
echo "=========================================="

echo ""
echo "── 0. 环境检查 & 认证 ──"

parse_response "$(api_get_no_token "$API_URL/admin/login")"
if [ "$RESP_CODE" = "000" ]; then
  echo -e "${RED}❌ 后端 $API_URL 无法连接${NC}"
  exit 1
fi
echo -e "${GREEN}✅ 后端连通${NC}"

if [ -n "$TOKEN" ]; then
  echo -e "${GREEN}✅ 使用环境变量 TOKEN${NC}"
else
  LOGIN_RESP=$(api_post_no_token "$API_URL/admin/login" "{\"account\":\"$ADMIN_ACCOUNT\",\"password\":\"$ADMIN_PASSWORD\"}")
  parse_response "$LOGIN_RESP"
  TOKEN=$(json_field "$RESP_BODY" "data.token")
  if [ -z "$TOKEN" ]; then
    echo -e "${RED}❌ 登录失败（$ADMIN_ACCOUNT），无法获取 Token${NC}"
    echo "Response: $RESP_BODY"
    exit 1
  fi
  echo -e "${GREEN}✅ 登录成功（$ADMIN_ACCOUNT），已获取 Token${NC}"
fi

parse_response "$(api_get "$API_URL/admin/content/articles/list?page=1&size=1")"
if [ "$RESP_CODE" = "404" ]; then
  echo -e "${RED}❌ 公共内容配置接口尚未实现或路由未注册，当前脚本面向实现完成后的方案验证。${NC}"
  exit 2
fi
if [ "$RESP_CODE" = "401" ] || [ "$RESP_CODE" = "403" ]; then
  echo -e "${RED}❌ 管理员 Token 无法访问公共内容配置接口，HTTP $RESP_CODE。请确认 Token 有 content:* 权限。${NC}"
  exit 2
fi

ORIG_USER_AGREEMENT=""
ORIG_EMPTY_TEXT=""
parse_response "$(api_get "$API_URL/admin/content/app-config/agreement.user_agreement")"
if [ "$RESP_CODE" = "200" ]; then
  ORIG_USER_AGREEMENT=$(config_item_from_body "$RESP_BODY" || true)
fi
parse_response "$(api_get "$API_URL/admin/content/app-config/search.empty_state_text")"
if [ "$RESP_CODE" = "200" ]; then
  ORIG_EMPTY_TEXT=$(config_item_from_body "$RESP_BODY" || true)
fi
CAN_WRITE_CONFIGS=0
if [ -n "$ORIG_USER_AGREEMENT" ] && [ -n "$ORIG_EMPTY_TEXT" ]; then
  CAN_WRITE_CONFIGS=1
fi

# ═══════════════════════════════════════════
# 1. 内容文章管理
# ═══════════════════════════════════════════
echo ""
echo "── 1. 内容文章管理 ──"

check_401 "CA-P1-04" "未登录访问文章列表" "$(api_get_no_token "$API_URL/admin/content/articles/list?page=1&size=10")"

RESP=$(api_post_json "$API_URL/admin/content/articles" "{
  \"type\": \"ANNOUNCEMENT\",
  \"title\": \"$ARTICLE_H5_TITLE\",
  \"summary\": \"测试摘要\",
  \"contentType\": \"H5\",
  \"contentUrl\": \"https://example.com/notice1\",
  \"sort\": 1,
  \"status\": \"ENABLED\",
  \"effectiveTime\": \"2020-01-01 00:00:00\"
}")
parse_response "$RESP"
ARTICLE_H5_ID=$(json_field "$RESP_BODY" "data")
assert_eq "CA-P0-01" "创建公告（H5）" "200" "$RESP_CODE"

RESP=$(api_post_json "$API_URL/admin/content/articles" "{
  \"type\": \"HELP_DOC\",
  \"title\": \"$ARTICLE_NATIVE_TITLE\",
  \"summary\": \"帮助摘要\",
  \"contentType\": \"NATIVE\",
  \"contentBody\": \"<p>这是帮助内容</p>\",
  \"sort\": 2,
  \"status\": \"ENABLED\"
}")
parse_response "$RESP"
ARTICLE_NATIVE_ID=$(json_field "$RESP_BODY" "data")
assert_eq "CA-P0-02" "创建帮助文档（NATIVE）" "200" "$RESP_CODE"

RESP=$(api_post_json "$API_URL/admin/content/articles" '{
  "type": "ANNOUNCEMENT",
  "title": "缺URL公告",
  "contentType": "H5",
  "contentUrl": ""
}')
parse_response "$RESP"
assert_rejected "CA-P1-01" "H5类型缺URL被拒绝"

RESP=$(api_post_json "$API_URL/admin/content/articles" '{
  "type": "HELP_DOC",
  "title": "缺正文帮助",
  "contentType": "NATIVE",
  "contentBody": ""
}')
parse_response "$RESP"
assert_rejected "CA-P1-02" "NATIVE类型缺正文被拒绝"

RESP=$(api_post_json "$API_URL/admin/content/articles" '{
  "type": "ANNOUNCEMENT",
  "contentType": "H5",
  "contentUrl": "https://example.com"
}')
parse_response "$RESP"
assert_rejected "CA-P1-03" "缺少必填字段 title 被拒绝"

RESP=$(api_get "$API_URL/admin/content/articles/list?type=ANNOUNCEMENT&page=1&size=10")
parse_response "$RESP"
assert_eq "CA-P0-03" "分页查询公告列表" "200" "$RESP_CODE"
if valid_id "$ARTICLE_H5_ID"; then
  assert_contains "CA-P0-03b" "列表含测试公告" "$ARTICLE_H5_TITLE" "$RESP_BODY"
else
  skip_test "CA-P0-03b" "列表含测试公告" "公告创建失败"
fi

if valid_id "$ARTICLE_H5_ID"; then
  RESP=$(api_get "$API_URL/admin/content/articles/$ARTICLE_H5_ID")
  parse_response "$RESP"
  assert_eq "CA-P0-04" "查询文章详情" "200" "$RESP_CODE"
  DETAIL_TITLE=$(json_field "$RESP_BODY" "data.title")
  assert_eq "CA-P0-04b" "详情标题匹配" "$ARTICLE_H5_TITLE" "$DETAIL_TITLE"

  ARTICLE_H5_UPDATED_TITLE="${ARTICLE_H5_TITLE}_已更新"
  RESP=$(api_put_json "$API_URL/admin/content/articles/$ARTICLE_H5_ID" "{
    \"type\": \"ANNOUNCEMENT\",
    \"title\": \"$ARTICLE_H5_UPDATED_TITLE\",
    \"contentType\": \"H5\",
    \"contentUrl\": \"https://example.com/notice1-updated\",
    \"sort\": 1,
    \"status\": \"ENABLED\"
  }")
  parse_response "$RESP"
  assert_eq "CA-P0-05" "更新文章" "200" "$RESP_CODE"

  RESP=$(api_put_json "$API_URL/admin/content/articles/$ARTICLE_H5_ID/status" '{"status": "DISABLED"}')
  parse_response "$RESP"
  assert_eq "CA-P0-06" "下线文章" "200" "$RESP_CODE"
else
  skip_test "CA-P0-04/05/06" "文章详情/更新/状态" "公告创建失败"
fi

# ═══════════════════════════════════════════
# 2. 应用配置管理
# ═══════════════════════════════════════════
echo ""
echo "── 2. 应用配置管理 ──"

check_401 "AC-P1-03" "未登录访问配置列表" "$(api_get_no_token "$API_URL/admin/content/app-config/list?group=AGREEMENT")"

RESP=$(api_get "$API_URL/admin/content/app-config/list?group=AGREEMENT")
parse_response "$RESP"
assert_eq "AC-P0-01" "查询AGREEMENT配置列表" "200" "$RESP_CODE"

RESP=$(api_get "$API_URL/admin/content/app-config/agreement.user_agreement")
parse_response "$RESP"
assert_eq "AC-P0-02" "查询单个配置" "200" "$RESP_CODE"

if [ "$CAN_WRITE_CONFIGS" = "1" ]; then
  RESP=$(api_post_json "$API_URL/admin/content/app-config/batch" '{
    "items": [
      {"configKey": "agreement.user_agreement", "configValue": "https://example.com/user-agreement", "configGroup": "AGREEMENT", "configType": "URL", "publicVisible": 1, "status": "ENABLED"},
      {"configKey": "search.empty_state_text", "configValue": "L1测试空状态文案", "configGroup": "SEARCH", "configType": "TEXT", "publicVisible": 1, "status": "ENABLED"}
    ]
  }')
  parse_response "$RESP"
  assert_eq "AC-P0-03" "批量保存配置" "200" "$RESP_CODE"

  RESP=$(api_get "$API_URL/admin/content/app-config/agreement.user_agreement")
  parse_response "$RESP"
  CONFIG_VAL=$(json_field "$RESP_BODY" "data.configValue")
  assert_eq "AC-P2-01" "保存后值已更新" "https://example.com/user-agreement" "$CONFIG_VAL"

  RESP=$(api_post_json "$API_URL/admin/content/app-config/batch" '{
    "items": [
      {"configKey": "agreement.user_agreement", "configValue": "not-a-url", "configGroup": "AGREEMENT", "configType": "URL", "publicVisible": 1, "status": "ENABLED"}
    ]
  }')
  parse_response "$RESP"
  assert_rejected "AC-P1-01" "URL类型非法值被拒绝"

  RESP=$(api_post_json "$API_URL/admin/content/app-config/batch" '{
    "items": [
      {"configKey": "search.invalid_json_l1", "configValue": "{invalid", "configGroup": "SEARCH", "configType": "JSON", "publicVisible": 0, "status": "ENABLED"}
    ]
  }')
  parse_response "$RESP"
  assert_rejected "AC-P1-02" "JSON类型非法值被拒绝"
else
  skip_test "AC-P0-03/AC-P2-01/AC-P1-01/AC-P1-02" "配置写入与校验" "未能读取原始配置，避免覆盖环境配置"
fi

# ═══════════════════════════════════════════
# 3. 移动端入口配置
# ═══════════════════════════════════════════
echo ""
echo "── 3. 移动端入口配置 ──"

check_401 "ME-P1-03" "未登录访问入口列表" "$(api_get_no_token "$API_URL/admin/content/mobile-entries/list?pageCode=MY_PAGE")"

RESP=$(api_get "$API_URL/admin/content/mobile-entries/list?pageCode=MY_PAGE")
parse_response "$RESP"
assert_eq "ME-P0-01" "查询MY_PAGE入口列表" "200" "$RESP_CODE"

RESP=$(api_post_json "$API_URL/admin/content/mobile-entries" "{
  \"pageCode\": \"MY_PAGE\",
  \"entryKey\": \"$ENTRY_KEY\",
  \"entryName\": \"L1测试入口\",
  \"icon\": \"test\",
  \"jumpType\": \"NATIVE_ROUTE\",
  \"jumpTarget\": \"/pages/test/index\",
  \"badgeType\": \"NONE\",
  \"loginRequired\": 0,
  \"sort\": 99,
  \"status\": \"ENABLED\"
}")
parse_response "$RESP"
ENTRY_ID=$(json_field "$RESP_BODY" "data")
assert_eq "ME-P0-02" "创建入口配置" "200" "$RESP_CODE"

if valid_id "$ENTRY_ID"; then
  RESP=$(api_post_json "$API_URL/admin/content/mobile-entries" "{
    \"pageCode\": \"MY_PAGE\",
    \"entryKey\": \"$ENTRY_KEY\",
    \"entryName\": \"重复入口\",
    \"jumpType\": \"NATIVE_ROUTE\",
    \"jumpTarget\": \"/pages/dup/index\",
    \"badgeType\": \"NONE\",
    \"loginRequired\": 0,
    \"sort\": 100,
    \"status\": \"ENABLED\"
  }")
  parse_response "$RESP"
  BIZ_CODE=$(json_field "$RESP_BODY" "code")
  assert_eq "ME-P1-01" "重复entryKey被拒绝" "5001" "$BIZ_CODE"

  RESP=$(api_post_json "$API_URL/admin/content/mobile-entries" '{
    "pageCode": "MY_PAGE",
    "entryKey": "l1_test_h5_empty",
    "entryName": "H5空目标",
    "jumpType": "H5",
    "jumpTarget": "",
    "badgeType": "NONE",
    "loginRequired": 0,
    "sort": 101,
    "status": "ENABLED"
  }')
  parse_response "$RESP"
  assert_rejected "ME-P1-02" "H5入口缺jumpTarget被拒绝"

  RESP=$(api_put_json "$API_URL/admin/content/mobile-entries/$ENTRY_ID" "{
    \"pageCode\": \"MY_PAGE\",
    \"entryKey\": \"$ENTRY_KEY\",
    \"entryName\": \"L1测试入口_已更新\",
    \"icon\": \"test\",
    \"jumpType\": \"NATIVE_ROUTE\",
    \"jumpTarget\": \"/pages/test/updated\",
    \"badgeType\": \"TEXT\",
    \"badgeText\": \"NEW\",
    \"loginRequired\": 1,
    \"sort\": 99,
    \"status\": \"ENABLED\"
  }")
  parse_response "$RESP"
  assert_eq "ME-P0-03" "更新入口配置" "200" "$RESP_CODE"

  RESP=$(api_put_json "$API_URL/admin/content/mobile-entries/$ENTRY_ID/status" '{"status": "DISABLED"}')
  parse_response "$RESP"
  assert_eq "ME-P0-04" "更新入口状态" "200" "$RESP_CODE"

  RESP=$(api_put_json "$API_URL/admin/content/mobile-entries/sort" "{\"items\": [{\"id\": $ENTRY_ID, \"sort\": 1}]}")
  parse_response "$RESP"
  assert_eq "ME-P0-05" "批量排序" "200" "$RESP_CODE"
else
  skip_test "ME-P1-01/02/ME-P0-03/04/05" "入口链式测试" "入口创建失败"
fi

# ═══════════════════════════════════════════
# 4. 搜索热词管理
# ═══════════════════════════════════════════
echo ""
echo "── 4. 搜索热词管理 ──"

check_401 "HW-P1-03" "未登录访问热词列表" "$(api_get_no_token "$API_URL/admin/content/search-hot-words/list?page=1&size=10")"

RESP=$(api_post_json "$API_URL/admin/content/search-hot-words" "{
  \"word\": \"$HOT_WORD\",
  \"scene\": \"GLOBAL\",
  \"sort\": 1,
  \"status\": \"ENABLED\"
}")
parse_response "$RESP"
HOT_WORD_ID=$(json_field "$RESP_BODY" "data")
assert_eq "HW-P0-02" "创建热词" "200" "$RESP_CODE"

if valid_id "$HOT_WORD_ID"; then
  RESP=$(api_post_json "$API_URL/admin/content/search-hot-words" "{
    \"word\": \"$HOT_WORD\",
    \"scene\": \"GLOBAL\",
    \"sort\": 2,
    \"status\": \"ENABLED\"
  }")
  parse_response "$RESP"
  BIZ_CODE=$(json_field "$RESP_BODY" "code")
  assert_eq "HW-P1-01" "重复热词被拒绝" "5001" "$BIZ_CODE"

  RESP=$(api_post_json "$API_URL/admin/content/search-hot-words" '{
    "word": "abcdefghijklmnopqrstuvwxyz12345",
    "scene": "GLOBAL",
    "sort": 3,
    "status": "ENABLED"
  }')
  parse_response "$RESP"
  assert_rejected "HW-P1-02" "超长热词被拒绝"
else
  skip_test "HW-P1-01/HW-P1-02" "热词异常校验" "热词创建失败"
fi

RESP=$(api_get "$API_URL/admin/content/search-hot-words/list?page=1&size=10")
parse_response "$RESP"
assert_eq "HW-P0-01" "分页查询热词列表" "200" "$RESP_CODE"
if valid_id "$HOT_WORD_ID"; then
  assert_contains "HW-P0-01b" "列表含测试热词" "$HOT_WORD" "$RESP_BODY"

  HOT_WORD_UPDATED="${HOT_WORD}_已更新"
  RESP=$(api_put_json "$API_URL/admin/content/search-hot-words/$HOT_WORD_ID" "{
    \"word\": \"$HOT_WORD_UPDATED\",
    \"scene\": \"GLOBAL\",
    \"sort\": 1,
    \"status\": \"ENABLED\"
  }")
  parse_response "$RESP"
  assert_eq "HW-P0-03" "更新热词" "200" "$RESP_CODE"

  RESP=$(api_put_json "$API_URL/admin/content/search-hot-words/$HOT_WORD_ID/status" '{"status": "DISABLED"}')
  parse_response "$RESP"
  assert_eq "HW-P0-04" "更新热词状态" "200" "$RESP_CODE"
else
  skip_test "HW-P0-01b/HW-P0-03/HW-P0-04" "热词链式测试" "热词创建失败"
fi

# ═══════════════════════════════════════════
# 5. 搜索屏蔽词管理
# ═══════════════════════════════════════════
echo ""
echo "── 5. 搜索屏蔽词管理 ──"

check_401 "BW-P1-02" "未登录访问屏蔽词列表" "$(api_get_no_token "$API_URL/admin/content/search-block-words/list?page=1&size=10")"
check_403_or_skip "BW-P3-01" "低权限用户访问屏蔽词列表" "$API_URL/admin/content/search-block-words/list?page=1&size=10"

RESP=$(api_post_json "$API_URL/admin/content/search-block-words" "{
  \"word\": \"$BLOCK_WORD\",
  \"blockType\": \"SEARCH_VIOLATION\",
  \"matchType\": \"FUZZY\",
  \"hitMessage\": \"该搜索内容不支持展示\",
  \"status\": \"ENABLED\"
}")
parse_response "$RESP"
BLOCK_WORD_ID=$(json_field "$RESP_BODY" "data")
assert_eq "BW-P0-02" "创建屏蔽词" "200" "$RESP_CODE"

if valid_id "$BLOCK_WORD_ID"; then
  RESP=$(api_post_json "$API_URL/admin/content/search-block-words" "{
    \"word\": \"$BLOCK_WORD\",
    \"blockType\": \"SEARCH_VIOLATION\",
    \"matchType\": \"EXACT\",
    \"status\": \"ENABLED\"
  }")
  parse_response "$RESP"
  BIZ_CODE=$(json_field "$RESP_BODY" "code")
  assert_eq "BW-P1-01" "重复屏蔽词被拒绝" "5001" "$BIZ_CODE"
else
  skip_test "BW-P1-01" "重复屏蔽词校验" "屏蔽词创建失败"
fi

RESP=$(api_get "$API_URL/admin/content/search-block-words/list?page=1&size=10")
parse_response "$RESP"
assert_eq "BW-P0-01" "分页查询屏蔽词列表" "200" "$RESP_CODE"

if valid_id "$BLOCK_WORD_ID"; then
  BLOCK_WORD_UPDATED="${BLOCK_WORD}_已更新"
  RESP=$(api_put_json "$API_URL/admin/content/search-block-words/$BLOCK_WORD_ID" "{
    \"word\": \"$BLOCK_WORD_UPDATED\",
    \"blockType\": \"SEARCH_VIOLATION\",
    \"matchType\": \"EXACT\",
    \"status\": \"ENABLED\"
  }")
  parse_response "$RESP"
  assert_eq "BW-P0-03" "更新屏蔽词" "200" "$RESP_CODE"

  RESP=$(api_put_json "$API_URL/admin/content/search-block-words/$BLOCK_WORD_ID/status" '{"status": "DISABLED"}')
  parse_response "$RESP"
  assert_eq "BW-P0-04" "更新屏蔽词状态" "200" "$RESP_CODE"
else
  skip_test "BW-P0-03/BW-P0-04" "屏蔽词更新/状态" "屏蔽词创建失败"
fi

# ═══════════════════════════════════════════
# 6. 操作日志查询
# ═══════════════════════════════════════════
echo ""
echo "── 6. 操作日志查询 ──"

check_401 "OL-P1-02" "未登录访问操作日志" "$(api_get_no_token "$API_URL/admin/content/operation-logs/list?page=1&size=10")"

RESP=$(api_get "$API_URL/admin/content/operation-logs/list?page=1&size=100")
parse_response "$RESP"
assert_eq "OL-P0-01" "分页查询操作日志" "200" "$RESP_CODE"
assert_contains "CA-P2-04" "状态变更写文章审计日志" "ARTICLE" "$RESP_BODY"
if [ "$CAN_WRITE_CONFIGS" = "1" ]; then
  assert_contains "AC-P2-02" "批量保存写配置审计日志" "APP_CONFIG" "$RESP_BODY"
else
  skip_test "AC-P2-02" "批量保存写配置审计日志" "配置写入已跳过"
fi
assert_contains "BW-P2-01" "屏蔽词操作写审计日志" "BLOCK_WORD" "$RESP_BODY"

RESP=$(api_get "$API_URL/admin/content/operation-logs/list?bizType=ARTICLE&page=1&size=10")
parse_response "$RESP"
assert_eq "OL-P1-01" "按bizType筛选操作日志" "200" "$RESP_CODE"

# ═══════════════════════════════════════════
# 7. 小程序公共接口
# ═══════════════════════════════════════════
echo ""
echo "── 7. 小程序公共接口（免登录） ──"

if valid_id "$ARTICLE_H5_ID"; then
  api_put_json "$API_URL/admin/content/articles/$ARTICLE_H5_ID/status" '{"status": "ENABLED"}' > /dev/null
fi

RESP=$(api_get_no_token "$API_URL/miniapp/content/announcements?page=1&size=10")
parse_response "$RESP"
assert_eq "MP-P0-01" "小程序公告列表免登录" "200" "$RESP_CODE"

RESP=$(api_get_no_token "$API_URL/miniapp/content/help-docs?page=1&size=10")
parse_response "$RESP"
assert_eq "MP-P0-02" "小程序帮助文档列表" "200" "$RESP_CODE"

RESP=$(api_get_no_token "$API_URL/miniapp/content/rules?type=RULE")
parse_response "$RESP"
assert_eq "MP-P0-03" "小程序规则内容列表" "200" "$RESP_CODE"

if valid_id "$ARTICLE_NATIVE_ID"; then
  RESP=$(api_get_no_token "$API_URL/miniapp/content/articles/$ARTICLE_NATIVE_ID")
  parse_response "$RESP"
  assert_eq "MP-P0-04" "小程序内容详情" "200" "$RESP_CODE"
else
  skip_test "MP-P0-04" "小程序内容详情" "帮助文档创建失败"
fi

RESP=$(api_get_no_token "$API_URL/miniapp/content/config?keys=agreement.user_agreement,about.app_version")
parse_response "$RESP"
assert_eq "MP-P0-05" "小程序获取公开配置" "200" "$RESP_CODE"
assert_contains "MP-P0-05b" "配置含user_agreement" "user_agreement" "$RESP_BODY"

if [ "$CAN_WRITE_CONFIGS" = "1" ]; then
  api_post_json "$API_URL/admin/content/app-config/batch" '{
    "items": [
      {"configKey": "agreement.user_agreement", "configValue": "https://example.com/user-agreement", "configGroup": "AGREEMENT", "configType": "URL", "publicVisible": 0, "status": "ENABLED"}
    ]
  }' > /dev/null
  RESP=$(api_get_no_token "$API_URL/miniapp/content/config?keys=agreement.user_agreement")
  parse_response "$RESP"
  assert_eq "MP-P1-04" "非公开配置查询仍成功" "200" "$RESP_CODE"
  assert_not_contains "MP-P1-04b" "public_visible=0 配置不返回" "user_agreement" "$RESP_BODY"
else
  skip_test "MP-P1-04" "public_visible=0 配置不返回" "配置写入已跳过"
fi

RESP=$(api_get_no_token "$API_URL/miniapp/mobile-config/entries?pageCode=MY_PAGE")
parse_response "$RESP"
assert_eq "MP-P0-06" "小程序移动端入口" "200" "$RESP_CODE"

RESP=$(api_get_no_token "$API_URL/miniapp/search/hot-words?limit=10")
parse_response "$RESP"
assert_eq "MP-P0-07" "小程序热门搜索词" "200" "$RESP_CODE"

RESP=$(api_get_no_token "$API_URL/miniapp/search/config")
parse_response "$RESP"
assert_eq "MP-P0-08" "小程序搜索展示配置" "200" "$RESP_CODE"
assert_contains "MP-P0-08b" "配置含emptyStateText" "emptyStateText" "$RESP_BODY"

if valid_id "$ARTICLE_H5_ID"; then
  api_put_json "$API_URL/admin/content/articles/$ARTICLE_H5_ID/status" '{"status": "DISABLED"}' > /dev/null
  RESP=$(api_get_no_token "$API_URL/miniapp/content/announcements?page=1&size=100")
  parse_response "$RESP"
  assert_eq "MP-P1-01a" "已下线公告列表查询成功" "200" "$RESP_CODE"
  assert_not_contains "MP-P1-01" "已下线公告不出现" "${ARTICLE_H5_UPDATED_TITLE:-$ARTICLE_H5_TITLE}" "$RESP_BODY"
else
  skip_test "MP-P1-01" "已下线公告不出现" "公告创建失败"
fi

RESP=$(api_get_no_token "$API_URL/miniapp/mobile-config/entries?pageCode=MY_PAGE")
parse_response "$RESP"
assert_eq "MP-P1-06a" "禁用入口列表查询成功" "200" "$RESP_CODE"
assert_not_contains "MP-P1-06" "已禁用入口不返回" "$ENTRY_KEY" "$RESP_BODY"

RESP=$(api_get_no_token "$API_URL/miniapp/search/hot-words?limit=100")
parse_response "$RESP"
assert_eq "MP-P1-08a" "禁用热词列表查询成功" "200" "$RESP_CODE"
assert_not_contains "MP-P1-08" "已禁用热词不返回" "${HOT_WORD_UPDATED:-$HOT_WORD}" "$RESP_BODY"

# ═══════════════════════════════════════════
# 8. 清理测试数据
# ═══════════════════════════════════════════
echo ""
echo "── 8. 清理测试数据 ──"

if valid_id "$ARTICLE_H5_ID"; then
  RESP=$(api_delete "$API_URL/admin/content/articles/$ARTICLE_H5_ID")
  parse_response "$RESP"
  assert_eq "CA-P0-07" "删除公告" "200" "$RESP_CODE"
  ARTICLE_H5_ID=""
fi
if valid_id "$ARTICLE_NATIVE_ID"; then
  api_delete "$API_URL/admin/content/articles/$ARTICLE_NATIVE_ID" > /dev/null
  ARTICLE_NATIVE_ID=""
fi
if valid_id "$ENTRY_ID"; then
  RESP=$(api_delete "$API_URL/admin/content/mobile-entries/$ENTRY_ID")
  parse_response "$RESP"
  assert_eq "ME-P0-06" "删除入口" "200" "$RESP_CODE"
  ENTRY_ID=""
fi
if valid_id "$HOT_WORD_ID"; then
  RESP=$(api_delete "$API_URL/admin/content/search-hot-words/$HOT_WORD_ID")
  parse_response "$RESP"
  assert_eq "HW-P0-05" "删除热词" "200" "$RESP_CODE"
  HOT_WORD_ID=""
fi
if valid_id "$BLOCK_WORD_ID"; then
  RESP=$(api_delete "$API_URL/admin/content/search-block-words/$BLOCK_WORD_ID")
  parse_response "$RESP"
  assert_eq "BW-P0-05" "删除屏蔽词" "200" "$RESP_CODE"
  BLOCK_WORD_ID=""
fi
restore_configs
ORIG_USER_AGREEMENT=""
ORIG_EMPTY_TEXT=""

# ═══════════════════════════════════════════
# 9. 测试报告
# ═══════════════════════════════════════════
echo ""
echo "=========================================="
echo " 测试完成"
echo "=========================================="
echo -e " 总计: $TOTAL | ${GREEN}通过: $PASS${NC} | ${RED}失败: $FAIL${NC} | ${YELLOW}跳过: $SKIP${NC}"
echo ""

if [ $FAIL -gt 0 ]; then
  echo -e "${RED}⚠️  存在失败用例，请检查${NC}"
  exit 1
else
  echo -e "${GREEN}✅ 全部通过${NC}"
  exit 0
fi
