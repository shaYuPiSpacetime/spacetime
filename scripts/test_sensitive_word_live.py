"""Real admin CRUD acceptance. Requires configured account/session and completed seed."""
from pathlib import Path
import json,os,sys,uuid,urllib.request,urllib.error
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from apply_sensitive_word_migration import load_env
cfg=load_env(ROOT/'frontend/e2e-tests/.env')
base=cfg.get('API_URL','').rstrip('/')
token=os.environ.get('SENSITIVE_WORD_ADMIN_TOKEN') or cfg.get('TOKEN')
user=os.environ.get('SENSITIVE_WORD_ADMIN_USERNAME') or cfg.get('ADMIN_USERNAME')
password=os.environ.get('SENSITIVE_WORD_ADMIN_PASSWORD') or cfg.get('ADMIN_PASSWORD')
checks=[]
def call(method,path,body=None):
    headers={'Content-Type':'application/json'}
    if token:headers['X-Auth-Token']=token
    request=urllib.request.Request(base+path,data=json.dumps(body,ensure_ascii=False).encode() if body is not None else None,headers=headers,method=method)
    try:
        with urllib.request.urlopen(request,timeout=15) as response:return response.status,json.load(response)
    except urllib.error.HTTPError as response:return response.code,json.load(response)
def ok(method,path,body=None):
    http,result=call(method,path,body)
    if result.get('code')!=200:raise RuntimeError(method+' '+path+' rejected with HTTP '+str(http)+' / code '+str(result.get('code')))
    checks.append({'method':method,'path':path,'httpStatus':http,'code':200})
    return result.get('data')
def main():
    global token
    if not base:raise RuntimeError('API_URL must be configured')
    if not token:
        if not user or not password:print('SKIPPED: configure a real TOKEN or ADMIN_USERNAME / ADMIN_PASSWORD');return 2
        login=ok('POST','/admin/login',{'account':user,'password':password});token=login['token']
    categories=ok('GET','/admin/sensitive-words/categories')
    assert len(categories)==18
    original=ok('GET','/admin/sensitive-words?page=1&size=20')
    baseline=json.loads((ROOT/'docs/test-artifacts/sensitive-word-dev-data-verification-20260909.json').read_text(encoding='utf-8'))
    if original['total']<baseline['activeWords']:print('SKIPPED: complete the approved seed before creating test words');return 2
    word='敏感词验收_'+uuid.uuid4().hex
    changed=word+'_edited'
    record_id=None;deleted=False
    try:
        record_id=ok('POST','/admin/sensitive-words',{'word':word,'categoryCode':'OTHER','status':'ENABLED','remark':'独立接口验收'})
        assert ok('GET','/admin/sensitive-words/'+str(record_id))['word']==word
        _,duplicate=call('POST','/admin/sensitive-words',{'word':word,'categoryCode':'POLITICS','status':'DISABLED','remark':''})
        assert duplicate.get('code')!=200
        ok('PUT','/admin/sensitive-words/'+str(record_id),{'word':changed,'categoryCode':'OTHER','status':'ENABLED','remark':''})
        ok('PATCH','/admin/sensitive-words/'+str(record_id)+'/status',{'status':'DISABLED'})
        detail=ok('GET','/admin/sensitive-words/'+str(record_id))
        assert detail['word']==changed and detail['status']=='DISABLED' and not detail.get('remark')
        ok('DELETE','/admin/sensitive-words/'+str(record_id));deleted=True
        _,missing=call('GET','/admin/sensitive-words/'+str(record_id))
        assert missing.get('code')!=200
        report={'result':'PASS','originalActiveWords':original['total'],'categories':len(categories),'checks':checks,'ownTestWordLogicallyDeleted':True}
        (ROOT/'docs/test-artifacts/sensitive-word-live-crud.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
        print(json.dumps({'result':'PASS','requests':len(checks),'categories':len(categories)},ensure_ascii=False));return 0
    finally:
        if record_id and not deleted:
            _,detail=call('GET','/admin/sensitive-words/'+str(record_id))
            if detail.get('code')==200 and detail.get('data',{}).get('word') in (word,changed):
                call('DELETE','/admin/sensitive-words/'+str(record_id))
if __name__=='__main__':raise SystemExit(main())
