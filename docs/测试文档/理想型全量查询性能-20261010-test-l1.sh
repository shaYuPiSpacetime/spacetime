#!/usr/bin/env bash
set -euo pipefail
# Existing account -> actual meta -> free search -> first/second snapshot result pages.
# Creates two free search records. Never unlocks, charges, or changes saved preferences.
: "${API_URL:?API_URL required}"
: "${TOKEN:?TOKEN required}"
export API_URL TOKEN
python - <<'PY'
import json, os, time, uuid, urllib.request

def request(path, body=None):
    started = time.perf_counter()
    req = urllib.request.Request(os.environ['API_URL'].rstrip('/') + path,
        data=None if body is None else json.dumps(body).encode(),
        headers={'Content-Type': 'application/json', 'X-Auth-Token': os.environ['TOKEN']})
    with urllib.request.urlopen(req, timeout=30) as response:
        result = json.load(response)
    assert result['code'] == 200, 'API failed: ' + str(result.get('code'))
    return result['data'], round(time.perf_counter() - started, 3)

before, _ = request('/miniapp/recommend/preferences')
meta, _ = request('/miniapp/ideal/meta')
for conditions in [[], ['M08-IDEAL-travel']]:
    result, search_time = request('/miniapp/ideal/search', {
        'requestId': 'ideal-all-' + uuid.uuid4().hex,
        'preferenceVersion': meta['preferenceVersion'],
        'targetCityCodes': [city['code'] for city in meta['targetCities']],
        'minAge': meta['minAge'], 'maxAge': meta['maxAge'], 'conditionCodes': conditions})
    path = '/miniapp/ideal/snapshots/' + result['snapshotNo'] + '/results'
    first, first_time = request(path)
    assert result['resultCount'] > 0 and first['items']
    second, second_time = ({'items': []}, 0)
    if first.get('nextCursor'):
        second, second_time = request(path + '?cursor=' + first['nextCursor'])
    assert not ({item['itemNo'] for item in first['items']} & {item['itemNo'] for item in second['items']})
    if conditions:
        assert all('喜欢旅行' in item['matchedConditionNames'] for item in first['items'])
    print(json.dumps({'conditions': conditions, 'resultCount': result['resultCount'],
        'searchSeconds': search_time, 'firstPageSeconds': first_time, 'secondPageSeconds': second_time,
        'firstItems': len(first['items']), 'secondItems': len(second['items']), 'pagesDisjoint': True}, ensure_ascii=False))
after, _ = request('/miniapp/recommend/preferences')
assert before == after, 'Saved preferences changed'
print('L1-01/L1-02 PASS; preferences unchanged')
PY
