#!/usr/bin/env bash
set -euo pipefail

API_URL="${API_URL:-http://127.0.0.1:8080}"

school_json="$(curl -fsS --get "${API_URL}/miniapp/dict/schools" \
  --data-urlencode 'keyword=浙大' --data-urlencode 'limit=10')"
python -c 'import json,sys; d=json.loads(sys.argv[1]); assert d["code"]==200; assert any(x["name"]=="浙江大学" for x in d["data"]); print("SCHOOL-06 PASS", len(d["data"]))' "$school_json"

if [[ -z "${TOKEN:-}" ]]; then
  echo 'SONG-01..03 SKIP: 请通过 TOKEN 环境变量传入真实小程序登录 token'
  exit 0
fi

song_json="$(curl -fsS --get "${API_URL}/miniapp/profile/songs/search" \
  -H "X-Auth-Token: ${TOKEN}" --data-urlencode 'keyword=晴天' --data-urlencode 'limit=10')"
save_body="$(python -c 'import json,sys; x=json.loads(sys.argv[1])["data"][0]; print(json.dumps({"songId":x["songId"],"songName":x["songName"],"artistName":x.get("artistName"),"coverUrl":x.get("coverUrl")},ensure_ascii=False))' "$song_json")"
saved_json="$(curl -fsS -X PUT "${API_URL}/miniapp/profile/favorite-song" \
  -H 'Content-Type: application/json' -H "X-Auth-Token: ${TOKEN}" -d "$save_body")"
detail_json="$(curl -fsS "${API_URL}/miniapp/profile/home-detail" -H "X-Auth-Token: ${TOKEN}")"
python -c 'import json,sys; s=json.loads(sys.argv[1]); d=json.loads(sys.argv[2]); assert s["code"]==200 and d["code"]==200; assert s["data"]["favoriteSongId"]==d["data"]["profile"]["favoriteSongId"]; print("SONG-01..03 PASS", s["data"]["favoriteSongName"])' "$saved_json" "$detail_json"
