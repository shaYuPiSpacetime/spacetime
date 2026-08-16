#!/usr/bin/env bash
set -euo pipefail

: "${API_BASE_URL:?请设置 API_BASE_URL，例如 https://admin.example.com/api}"
: "${TOKEN:?请设置固定验收账号 TOKEN}"

command -v curl >/dev/null || { echo "缺少 curl" >&2; exit 1; }
command -v jq >/dev/null || { echo "缺少 jq" >&2; exit 1; }

api_base="${API_BASE_URL%/}"
test_run_id="${TEST_RUN_ID:-$(date +%Y%m%d%H%M%S)}"

api() {
  local method="$1"
  local path="$2"
  local payload="${3:-}"
  local response

  if [[ -n "$payload" ]]; then
    response="$(curl -fsS -X "$method" "${api_base}${path}" \
      -H "X-Auth-Token: ${TOKEN}" \
      -H 'Content-Type: application/json' \
      --data "$payload")"
  else
    response="$(curl -fsS -X "$method" "${api_base}${path}" \
      -H "X-Auth-Token: ${TOKEN}" \
      -H 'Content-Type: application/json')"
  fi

  if [[ "$(jq -r '.code' <<<"$response")" != "200" ]]; then
    jq -c '{code,msg}' <<<"$response" >&2
    return 1
  fi
  jq -c '.data' <<<"$response"
}

assert_jq() {
  local json="$1"
  local expression="$2"
  local message="$3"
  if ! jq -e "$expression" >/dev/null <<<"$json"; then
    echo "断言失败：${message}" >&2
    return 1
  fi
}

preferences="$(api GET '/miniapp/recommend/preferences')"
candidates="$(api GET '/miniapp/recommend/candidates')"
replay="$(api GET '/miniapp/recommend/replay')"
meta="$(api GET '/miniapp/ideal/meta')"
records="$(api GET '/miniapp/ideal/search-records')"
unlocks_all="$(api GET '/miniapp/ideal/unlocks?status=all')"
unlocks_active="$(api GET '/miniapp/ideal/unlocks?status=active')"
unlocks_inactive="$(api GET '/miniapp/ideal/unlocks?status=inactive')"

assert_jq "$candidates" '(.items | length) > 0 and (.waitingReason == null)' '推荐首屏必须有候选且非等待态'
assert_jq "$replay" '(.items | length) > 0' '三天回看必须有数据'
assert_jq "$meta" '(.conditions | map(.category) | unique | length) == 6' '理想型必须包含六大分类'
assert_jq "$records" '.total > 0' '筛选记录必须有数据'
assert_jq "$unlocks_all" '(.items | length) >= 6' '历史解锁总数至少 6 条'
assert_jq "$unlocks_active" '(.items | length) >= 3' '有效解锁至少 3 条'
assert_jq "$unlocks_inactive" '(.items | length) >= 3' '失效解锁至少 3 条'

preference_version="$(jq -r '.preferenceVersion' <<<"$meta")"
target_city_codes="$(jq -c '[.targetCities[].code]' <<<"$meta")"
min_age="$(jq -r '.minAge' <<<"$meta")"
max_age="$(jq -r '.maxAge' <<<"$meta")"

cases=(
  'APPEARANCE:M08-IDEAL-height-165'
  'EDUCATION:M08-IDEAL-overseas'
  'ECONOMY:M08-IDEAL-home-owner'
  'FAMILY:M08-IDEAL-local'
  'INTEREST:M08-IDEAL-interest-similar'
  'RELATIONSHIP:M08-IDEAL-marry-2y'
)

echo "category,result_count,idempotent,seeded_cards"
for item in "${cases[@]}"; do
  category="${item%%:*}"
  condition_code="${item#*:}"
  request_id="REG-L1-${test_run_id}-${category}"
  payload="$(jq -nc \
    --arg requestId "$request_id" \
    --arg conditionCode "$condition_code" \
    --argjson preferenceVersion "$preference_version" \
    --argjson targetCityCodes "$target_city_codes" \
    --argjson minAge "$min_age" \
    --argjson maxAge "$max_age" \
    '{requestId:$requestId,preferenceVersion:$preferenceVersion,targetCityCodes:$targetCityCodes,minAge:$minAge,maxAge:$maxAge,conditionCodes:[$conditionCode]}')"

  first="$(api POST '/miniapp/ideal/search' "$payload")"
  second="$(api POST '/miniapp/ideal/search' "$payload")"
  first_snapshot="$(jq -r '.snapshotNo' <<<"$first")"
  second_snapshot="$(jq -r '.snapshotNo' <<<"$second")"
  result_count="$(jq -r '.resultCount' <<<"$second")"

  [[ "$first_snapshot" == "$second_snapshot" ]] || {
    echo "断言失败：${category} 相同 requestId 未返回同一快照" >&2
    exit 1
  }
  (( result_count > 0 )) || {
    echo "断言失败：${category} 真实筛选未命中候选" >&2
    exit 1
  }

  generated_page="$(api GET "/miniapp/ideal/snapshots/${second_snapshot}/results")"
  assert_jq "$generated_page" '(.items | length) > 0 and .status == "active"' "${category} 真实结果页无数据"

  seeded_page="$(api GET "/miniapp/ideal/snapshots/REG-RI-SNAPSHOT-${category}/results")"
  seeded_cards="$(jq -r '.items | length' <<<"$seeded_page")"
  [[ "$seeded_cards" == "4" ]] || {
    echo "断言失败：${category} 固定快照应有 4 张候选卡，实际 ${seeded_cards}" >&2
    exit 1
  }

  echo "${category},${result_count},true,${seeded_cards}"
done

echo "recommend_candidates=$(jq -r '.items | length' <<<"$candidates")"
echo "recommend_replay=$(jq -r '.items | length' <<<"$replay")"
echo "ideal_records=$(jq -r '.total' <<<"$records")"
echo "ideal_unlocks_active=$(jq -r '.items | length' <<<"$unlocks_active")"
echo "ideal_unlocks_inactive=$(jq -r '.items | length' <<<"$unlocks_inactive")"
echo "PRD-08 推荐与理想型分类数据 L1 回归通过"
