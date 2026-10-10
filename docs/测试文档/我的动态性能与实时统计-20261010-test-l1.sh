#!/usr/bin/env bash
# 只读链：正常登录会话 -> 本人统计/动态/互动/关注/隐藏名单 -> 从 published 动态发现互动用户 ID。
# 不发送短信，不写生产数据；API_URL/TOKEN 必须由环境提供，不读取 Redis 凭据。
set -euo pipefail
: "${API_URL:?请配置 API_URL}"
: "${TOKEN:?请配置有效小程序 TOKEN}"
export API_URL TOKEN
python3 - <<'PY'
import json, os, time, urllib.request
base = os.environ['API_URL'].rstrip('/')
token = os.environ['TOKEN']
passed = failed = skipped = 0
posts = []
paths = ['meta', 'me/profile-summary', 'me/posts?page=1&size=50',
         *['me/interactions?type='+kind+'&page=1&size=50' for kind in ['commented','liked','unlocked','viewed']],
         'me/view-history?page=1&size=50', 'me/follows?relation=following&page=1&size=50',
         'me/follows?relation=fans&page=1&size=50', 'me/hidden-authors?page=1&size=50']
for path in paths:
    start = time.perf_counter()
    try:
        req = urllib.request.Request(base+'/miniapp/community/'+path, headers={'X-Auth-Token': token})
        with urllib.request.urlopen(req, timeout=25) as response: result=json.load(response)
        assert result.get('code') == 200, 'business code '+str(result.get('code'))
        data=result.get('data') or {}
        if path.startswith('me/posts'): posts=data.get('records',[])
        if 'records' in data: assert len(data['records']) <= 50
        passed+=1
        print('PASS',path,'seconds',round(time.perf_counter()-start,3),'records',len(data.get('records',[])),'total',data.get('total'))
    except Exception as error:
        failed+=1; print('FAIL',path,type(error).__name__)
published=next((p for p in posts if p.get('status')=='published'),None)
for kind in ['liked','commented']:
    if not published:
        skipped+=1; print('SKIP post-interactors',kind,'no published post'); continue
    try:
        req=urllib.request.Request(base+'/miniapp/community/posts/'+str(published['id'])+'/interactors?type='+kind+'&page=1&size=50',headers={'X-Auth-Token':token})
        with urllib.request.urlopen(req,timeout=25) as response: result=json.load(response)
        assert result.get('code')==200
        passed+=1; print('PASS post-interactors',kind,'records',len(result['data']['records']))
    except Exception as error: failed+=1; print('FAIL post-interactors',kind,type(error).__name__)
print('passed',passed,'failed',failed,'skipped',skipped)
raise SystemExit(bool(failed))
PY
