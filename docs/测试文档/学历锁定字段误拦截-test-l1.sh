#!/usr/bin/env bash
# 只读：公开健康→无Token基本资料鉴权→可选授权反显；不保存或替用户推进资料流程。
# API_URL 必须显式设置且含部署context path；不猜地址，不伪造Token，不创建外部测试账号。
set -u
: "${API_URL:?Set the verified API_URL, including context path}"
pass=0; fail=0; skip=0
CURL_BIN="${CURL_BIN:-curl}"
check_get() {
  local id="$1" route="$2" expected_http="$3" expected_code="$4" auth="${5:-}"
  local response http body code
  local headers=()
  if [ -n "$auth" ]; then headers=(-H "X-Auth-Token: $auth"); fi
  if ! response=$("$CURL_BIN" --silent --show-error --connect-timeout 8 --max-time 20 -w $'\n%{http_code}' "${headers[@]}" "${API_URL%/}$route"); then
    printf 'FAIL %s transport\n' "$id"; fail=$((fail+1)); return
  fi
  http="${response##*$'\n'}"; body="${response%$'\n'*}"
  code=$(printf '%s' "$body" | node -e "let s='';process.stdin.on('data',c=>s+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(s).code)}catch{process.exit(1)}})") || code=invalid
  if [ "$http" = "$expected_http" ] && [ "$code" = "$expected_code" ]; then
    printf 'PASS %s HTTP=%s code=%s\n' "$id" "$http" "$code"; pass=$((pass+1))
  else
    printf 'FAIL %s HTTP=%s code=%s\n' "$id" "$http" "$code"; fail=$((fail+1))
  fi
}
check_get L1-health /health 200 200
check_get L1-no-auth /miniapp/profile/basic 401 401
if [ -n "${TOKEN:-}" ]; then
  check_get L1-authorized-read /miniapp/profile/basic 200 200 "$TOKEN"
else
  printf 'SKIP L1-authorized-read no valid target session supplied\n'; skip=$((skip+1))
fi
printf 'L1 total=%d pass=%d fail=%d skip=%d\n' "$((pass+fail+skip))" "$pass" "$fail" "$skip"
exit "$fail"
