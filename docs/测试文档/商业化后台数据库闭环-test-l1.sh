#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$ROOT_DIR/frontend/e2e-tests/.env"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

API_URL="${API_URL:-${BASE_URL:-}}"
TOKEN="${TOKEN:-}"
RUN_WRITE_TESTS="${RUN_WRITE_TESTS:-0}"

if [[ -z "$API_URL" || -z "$TOKEN" ]]; then
  echo "SKIP: 缺少 API_URL/BASE_URL 或 TOKEN，仅保留 L1 脚本，未执行真实接口写入。"
  exit 2
fi

BASE_URL="${API_URL%/}"
if [[ "$BASE_URL" != */api ]]; then
  BASE_URL="$BASE_URL/api"
fi
CONFIG_URL="$BASE_URL/admin/commercial/config"
WORK_DIR="$(mktemp -d)"
RESTORE_NEEDED=0

cleanup() {
  if [[ "$RESTORE_NEEDED" == "1" && -f "$WORK_DIR/original-payload.json" ]]; then
    curl -fsS -X PUT "$CONFIG_URL" \
      -H "Authorization: Bearer $TOKEN" \
      -H 'Content-Type: application/json' \
      --data-binary "@$WORK_DIR/original-payload.json" >/dev/null || true
  fi
  rm -rf "$WORK_DIR"
}
trap cleanup EXIT

request_config() {
  curl -fsS "$CONFIG_URL" -H "Authorization: Bearer $TOKEN"
}

save_config() {
  local payload="$1"
  curl -fsS -X PUT "$CONFIG_URL" \
    -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' \
    --data-binary "@$payload"
}

request_config >"$WORK_DIR/original.json"
jq -e '.code == 200' "$WORK_DIR/original.json" >/dev/null
jq -e '
  (.data.vipBenefits | length) == 9 and
  (.data.vipPackages | length) == 3 and
  (.data.coinPackages | length) == 3 and
  (.data.coinScenes | length) == 8 and
  ([.data.vipBenefits[], .data.vipPackages[], .data.coinPackages[], .data.coinScenes[]] | all(.id != null))
' "$WORK_DIR/original.json" >/dev/null
echo "PASS F1-P0-01: 聚合配置数量和稳定 ID 正确。"

if [[ "$RUN_WRITE_TESTS" != "1" ]]; then
  echo "SKIP: RUN_WRITE_TESTS!=1，未执行真实接口修改与恢复测试。"
  exit 0
fi

jq '{
  vipBenefits: .data.vipBenefits,
  vipPackages: .data.vipPackages,
  coinPackages: .data.coinPackages,
  coinScenes: .data.coinScenes,
  settings: .data.settings,
  changeSummary: "L1 商业化闭环测试恢复原配置"
}' "$WORK_DIR/original.json" >"$WORK_DIR/original-payload.json"

SCENE_ID="$(jq -r '.data.coinScenes[0].id' "$WORK_DIR/original.json")"
SCENE_NAME="$(jq -r '.data.coinScenes[0].mobileName' "$WORK_DIR/original.json")"
COIN_PACKAGE_ID="$(jq -r '.data.coinPackages[0].id' "$WORK_DIR/original.json")"
COIN_PACKAGE_NAME="$(jq -r '.data.coinPackages[0].packageName' "$WORK_DIR/original.json")"

jq --argjson sceneId "$SCENE_ID" --arg sceneName "$SCENE_NAME [L1]" \
  --argjson packageId "$COIN_PACKAGE_ID" --arg packageName "$COIN_PACKAGE_NAME [L1]" '{
  vipBenefits: .data.vipBenefits,
  vipPackages: .data.vipPackages,
  coinPackages: (.data.coinPackages | map(if .id == $packageId then .packageName = $packageName else . end)),
  coinScenes: (.data.coinScenes | map(if .id == $sceneId then .mobileName = $sceneName else . end)),
  settings: .data.settings,
  changeSummary: "L1 消费场景与币包稳定 ID 回显测试"
}' "$WORK_DIR/original.json" >"$WORK_DIR/changed-payload.json"

RESTORE_NEEDED=1
save_config "$WORK_DIR/changed-payload.json" >"$WORK_DIR/changed-result.json"
jq -e '.code == 200' "$WORK_DIR/changed-result.json" >/dev/null
request_config >"$WORK_DIR/reloaded.json"
jq -e --argjson id "$SCENE_ID" --arg name "$SCENE_NAME [L1]" \
  '.data.coinScenes | any(.id == $id and .mobileName == $name)' "$WORK_DIR/reloaded.json" >/dev/null
jq -e --argjson id "$COIN_PACKAGE_ID" --arg name "$COIN_PACKAGE_NAME [L1]" \
  '(.data.coinPackages | length) == 3 and any(.id == $id and .packageName == $name)' "$WORK_DIR/reloaded.json" >/dev/null
echo "PASS F1-P0-02/F1-P0-03: 修改已写库，刷新回显且 ID、记录数保持稳定。"

save_config "$WORK_DIR/original-payload.json" >"$WORK_DIR/restored-result.json"
jq -e '.code == 200' "$WORK_DIR/restored-result.json" >/dev/null
RESTORE_NEEDED=0
request_config >"$WORK_DIR/restored.json"
jq -e --argjson sceneId "$SCENE_ID" --arg sceneName "$SCENE_NAME" --argjson packageId "$COIN_PACKAGE_ID" --arg packageName "$COIN_PACKAGE_NAME" '
  (.data.coinScenes | any(.id == $sceneId and .mobileName == $sceneName)) and
  (.data.coinPackages | any(.id == $packageId and .packageName == $packageName))
' "$WORK_DIR/restored.json" >/dev/null
echo "PASS: 原配置已恢复。"
