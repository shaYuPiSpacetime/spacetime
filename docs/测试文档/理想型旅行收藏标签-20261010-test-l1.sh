#!/usr/bin/env bash
set -euo pipefail
# Pre-analysis: existing authenticated account -> meta -> free search -> snapshot results.
# API_URL and TOKEN are supplied by the caller; only counts are logged, never credentials.
# This creates one free search history entry; it does not unlock or change preferences.
: "${API_URL:?API_URL required}"
: "${TOKEN:?TOKEN required}"
export API_URL TOKEN
python - <<'PY'
import json, os, uuid, urllib.request

def request(path, body=None):
    req = urllib.request.Request(os.environ['API_URL'].rstrip('/') + path,
        data=None if body is None else json.dumps(body).encode(),
        headers={'Content-Type': 'application/json', 'X-Auth-Token': os.environ['TOKEN']})
    with urllib.request.urlopen(req, timeout=30) as response:
        result = json.load(response)
    assert result['code'] == 200, 'API failed: ' + str(result.get('code'))
    return result['data']

before = request('/miniapp/recommend/preferences')
meta = request('/miniapp/ideal/meta')
result = request('/miniapp/ideal/search', {
    'requestId': 'travel-regression-' + uuid.uuid4().hex,
    'preferenceVersion': meta['preferenceVersion'],
    'targetCityCodes': [city['code'] for city in meta['targetCities']],
    'minAge': meta['minAge'], 'maxAge': meta['maxAge'],
    'conditionCodes': ['M08-IDEAL-travel']})
page = request('/miniapp/ideal/snapshots/' + result['snapshotNo'] + '/results')
unchanged = before == request('/miniapp/recommend/preferences')
print(json.dumps({'resultCount': result['resultCount'], 'pageItems': len(page['items']),
    'preferencesUnchanged': unchanged}, ensure_ascii=False))
assert result['resultCount'] > 0, 'Travel search still returned zero'
assert page['items'], 'Search results page empty'
assert all('喜欢旅行' in item['matchedConditionNames'] for item in page['items'])
assert unchanged, 'Saved preferences changed'
print('L1-01 PASS')
PY
