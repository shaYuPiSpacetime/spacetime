#!/usr/bin/env bash
set -euo pipefail
# 使用既有账号 token；不登录、不保存偏好、不浏览或喜欢。
# API_URL 和 TOKEN 通过私有环境传入，禁止开启 shell xtrace。
python3 - <<'PY'
import json
import os
import urllib.parse
import urllib.request

base = os.environ['API_URL'].rstrip('/')
token = os.environ['TOKEN']

def get(path):
    request = urllib.request.Request(base + path, headers={'X-Auth-Token': token})
    with urllib.request.urlopen(request, timeout=30) as response:
        result = json.load(response)
    assert result.get('code') == 200, 'API response was unsuccessful'
    return result['data']

before = get('/miniapp/recommend/preferences')
first = None
seen_cursors = set()
candidates = set()
cursor = None
pages = 0
while True:
    path = '/miniapp/recommend/candidates'
    if cursor:
        path += '?' + urllib.parse.urlencode({'cursor': cursor})
    page = get(path)
    pages += 1
    first = first or page
    assert page['preferenceVersion'] == before['version'], 'Preference changed during scan'
    assert page['nextResetAt'] == first['nextResetAt'], 'Browse cycle changed during scan'
    assert page['remainingBrowseCount'] == first['remainingBrowseCount'], 'Browse quota changed during scan'
    for item in page.get('items') or []:
        candidate = str(item['candidateNo'])
        assert candidate not in candidates, 'Duplicate candidate across pages'
        candidates.add(candidate)
    cursor = page.get('nextCursor')
    print(json.dumps({'page': pages, 'pageCount': len(page.get('items') or []),
                      'candidateCount': len(candidates), 'hasNext': bool(cursor),
                      'waitingReason': page.get('waitingReason')}, ensure_ascii=False), flush=True)
    if not cursor or len(candidates) >= first['remainingBrowseCount']:
        break
    assert page.get('waitingReason') != 'no_candidate', 'Empty continuation must not be terminal'
    assert cursor not in seen_cursors, 'Repeated scan cursor'
    seen_cursors.add(cursor)

after = get('/miniapp/recommend/preferences')
assert before == after, 'Saved preferences changed'
assert candidates, 'Specified eligible account still has no recommendation'
assert len(candidates) <= first['remainingBrowseCount'], 'Collected more than browse quota'
print(json.dumps({'result': 'passed', 'tests': 2, 'passed': 2, 'failed': 0,
                  'candidateCount': len(candidates), 'remainingBrowseCount': first['remainingBrowseCount'],
                  'preferenceVersion': before['version'], 'preferencesUnchanged': True,
                  'pages': pages}, ensure_ascii=False), flush=True)
PY
