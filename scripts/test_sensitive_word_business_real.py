"""Real miniapp submissions -> moderation -> admin evidence. Retain user-requested records.
Derived from E2E-01..09 in docs/测试文档/敏感词管理-testcase.md.
Credentials come only from the process environment; no direct business DB writes.
"""
from pathlib import Path
from datetime import datetime
import json, os, sys, time, unicodedata, urllib.request, urllib.error, urllib.parse
import pymysql
from apply_sensitive_word_migration import ROOT, load_env

OUT = ROOT / 'docs/test-artifacts/sensitive-word-business-real-20260909.json'
PREFIX = '敏感词回归0909'
NORMAL = '这是一条流程验收记录，今天读书散步，心情平静。'
REPORT = {'startedAt': datetime.now().astimezone().isoformat(), 'prefix': PREFIX,
          'authentication': 'normal configured development phone login; real admin login',
          'wechatProviders': True, 'responsesMocked': False, 'directBusinessDbWrites': False,
          'recordsRetained': True, 'cases': [], 'records': {}}

def save():
    REPORT['updatedAt'] = datetime.now().astimezone().isoformat()
    OUT.write_text(json.dumps(REPORT, ensure_ascii=False, indent=2), encoding='utf-8')

def case(case_id, function):
    if any(c['id'] == case_id and c['result'] == 'PASS' for c in REPORT['cases']):
        return
    REPORT['cases'] = [c for c in REPORT['cases'] if c['id'] != case_id]
    try:
        detail = function()
        REPORT['cases'].append({'id': case_id, 'result': 'PASS', 'detail': detail})
        print(case_id + ' PASS', flush=True)
    except Exception as exc:
        REPORT['cases'].append({'id': case_id, 'result': 'FAIL', 'error': str(exc)[:400]})
        print(case_id + ' FAIL ' + str(exc)[:240], flush=True)
    save()

class RealFlow:
    def __init__(self):
        self.env = load_env(ROOT / 'frontend/e2e-tests/.env')
        self.base = self.env['API_URL'].rstrip('/')
        cfg = load_env(ROOT / 'backend/.env.local')
        self.db = pymysql.connect(host=cfg['DEV_DB_HOST'], port=int(cfg['DEV_DB_PORT']),
            user=cfg['DEV_DB_USER'], password=cfg['DEV_DB_PASSWORD'], database=cfg['DEV_DB_NAME'],
            charset='utf8mb4', connect_timeout=5, read_timeout=15, autocommit=True)
        with self.db.cursor() as cur:
            cur.execute("SELECT word FROM content_sensitive_word WHERE deleted=0 AND status='ENABLED'")
            self.words = {self.norm(r[0]) for r in cur.fetchall()}
        self.mini = None
        self.admin = None
        self.host = None
        self.first_comment = None

    @staticmethod
    def norm(text): return unicodedata.normalize('NFKC', text).lower()

    def call(self, method, path, body=None, token=None):
        headers = {'Content-Type': 'application/json'}
        if token: headers['X-Auth-Token'] = token
        req = urllib.request.Request(self.base + path, headers=headers, method=method,
            data=json.dumps(body, ensure_ascii=False).encode() if body is not None else None)
        try:
            with urllib.request.urlopen(req, timeout=40) as response: result = json.load(response)
        except urllib.error.HTTPError as response: result = json.load(response)
        if result.get('code') != 200:
            raise RuntimeError(method + ' ' + path + ': ' + str(result.get('code')) + ' ' + str(result.get('msg')))
        return result.get('data')

    def login(self):
        phone = os.environ['SENSITIVE_WORD_MINIAPP_PHONE']
        try:
            self.call('POST', '/miniapp/auth/sms-code', {'phone': phone})
        except RuntimeError as exc:
            if 'AUTH_SMS_COOLDOWN' not in str(exc): raise
        data = self.call('POST', '/miniapp/auth/phone-login', {'phone': phone,
            'smsCode': os.environ['SENSITIVE_WORD_MINIAPP_SMS_CODE'], 'agreeProtocol': True})
        self.mini = data['token']; self.user = data['userId']
        assert self.user == int(os.environ['SENSITIVE_WORD_MINIAPP_USER_ID']), 'unexpected test user'
        data = self.call('POST', '/admin/login', {'account': os.environ['SENSITIVE_WORD_ADMIN_USERNAME'],
            'password': os.environ['SENSITIVE_WORD_ADMIN_PASSWORD']})
        self.admin = data['token']
        REPORT['userId'] = self.user
        access = self.call('GET', '/miniapp/profile/access-status', token=self.mini)
        assert access['canCommunity'] and access['coreAccessStatus'] == 'CORE_ALLOWED'
        self.before_intro = self.call('GET', '/miniapp/profile/introduction', token=self.mini)
        REPORT['initialAccess'] = access['coreAccessStatus']
        save()

    def content(self, label, hit=False):
        text = PREFIX + ' ' + label + ' ' + NORMAL + (' 赌博。' if hit else '')
        matches = [word for word in self.words if word and word in self.norm(text)]
        assert bool(matches) == hit, 'sample local-match condition differs: ' + repr(matches[:5])
        return text

    @staticmethod
    def private_receipt(receipt):
        data = json.dumps(receipt, ensure_ascii=False)
        assert 'local-sensitive-word' not in data and 'wordId' not in data and 'machineEvidence' not in data
        return receipt

    def text(self, key, label, hit, question=None):
        content = self.content(label, hit)
        body = {'questionKey': question, 'contentText': content} if question else {'aboutMe': content}
        path = '/miniapp/profile/about-me' if question else '/miniapp/profile/introduction'
        receipt = self.call('POST', path, body, self.mini)
        self.private_receipt(receipt)
        rows = self.call('GET', '/admin/moderation/texts/list?page=1&size=100&userId=' + str(self.user), token=self.admin)['records']
        found = [r for r in rows if r.get('textSummary', '').startswith(PREFIX + ' ' + label)]
        assert len(found) == 1, 'submitted text missing from real admin list'
        record_id = found[0]['id']
        detail = self.call('GET', '/admin/moderation/texts/' + str(record_id), token=self.admin)
        data = {'id': record_id, 'type': 'text', 'label': label, 'content': content,
                'receipt': receipt, 'status': detail['status'], 'machineEvidence': detail.get('machineEvidence')}
        with self.db.cursor(pymysql.cursors.DictCursor) as cur:
            cur.execute('SELECT provider_task_id,status,content_text,machine_signal_json FROM app_user_audit_record WHERE id=%s AND deleted=0', (record_id,))
            row = cur.fetchone(); assert row and row['content_text'] == content
            cur.execute('SELECT provider_code,task_status,mocked FROM external_provider_task WHERE id=%s AND deleted=0', (row['provider_task_id'],))
            provider = cur.fetchone(); assert provider
            data['provider'] = provider
            assert provider['mocked'] == 0, 'provider task was mocked'
        REPORT['records'][key] = data; save()
        if hit:
            assert receipt['auditStatus'] == 'REJECTED' and detail['status'] == 'REJECTED'
            assert detail['machineEvidence']['source'] == 'local-sensitive-word'
            assert detail['machineEvidence']['word'] in content
        else:
            assert detail.get('machineEvidence') is None
            assert receipt['auditStatus'] == 'APPROVED', 'real WeChat text did not approve: ' + str(data['provider'])
        if not question:
            current = self.call('GET', '/miniapp/profile/introduction', token=self.mini)
            assert current['latestContent'] == content
            if hit: assert current.get('effectiveContent') == self.before_intro.get('effectiveContent')
        return {'recordId': record_id, 'status': detail['status'], 'provider': provider}

    def post(self, key, label, kind, hit):
        content = self.content(label, hit)
        query = urllib.parse.urlencode({'page': 1, 'size': 100, 'userId': self.user, 'keyword': PREFIX + ' ' + label})
        existing = self.call('GET', '/admin/community/posts/list?' + query, token=self.admin)['records']
        existing = [r for r in existing if r.get('content') == content and r.get('contentType') == kind]
        assert len(existing) <= 1, 'duplicate retained sample; inspect before retrying'
        if existing:
            record_id = existing[0]['id']
            owner = self.call('GET', '/miniapp/community/posts/' + existing[0]['postNo'], token=self.mini)
            receipt = {k: owner[k] for k in ('postNo', 'status') if k in owner}
            receipt['postNo'] = existing[0]['postNo']
            receipt_source = 'real owner detail; initial submit succeeded before harness ID parsing was corrected'
        else:
            receipt = self.call('POST', '/miniapp/community/posts',
                {'contentType': kind, 'content': content, 'imageUrls': []}, self.mini)
            self.private_receipt(receipt)
            record_id = receipt['postId']
            receipt_source = 'real submission response'
        detail = self.call('GET', '/admin/community/posts/' + str(record_id), token=self.admin)
        data = {'id': record_id, 'type': 'post', 'label': label, 'content': content,
                'postNo': receipt['postNo'], 'contentType': kind, 'receipt': receipt,
                'status': detail['status'], 'machineResult': detail.get('machineResult'), 'auditLogs': detail.get('auditLogs', []), 'receiptSource': receipt_source}
        REPORT['records'][key] = data; save()
        if key == 'host': self.host = data
        if hit:
            assert receipt['status'] == 'rejected' and detail['machineResult'] == 'reject'
            evidence = [a.get('machineEvidence') for a in detail['auditLogs'] if a.get('machineEvidence')]
            assert evidence and evidence[0]['source'] == 'local-sensitive-word'
            assert evidence[0]['word'] in content
            public = self.call('GET', '/miniapp/community/users/' + str(self.user) + '/posts?page=1&size=100', token=self.mini)
            assert all(r['id'] != record_id for r in public['records'])
        else:
            assert detail['machineResult'] == 'pass', 'real WeChat did not pass: ' + str(data['auditLogs'])[:200]
            assert receipt['status'] == ('pending_manual' if kind == 'sincere_post' else 'published')
        return {'recordId': record_id, 'postNo': receipt['postNo'], 'status': receipt['status'], 'machineResult': detail['machineResult']}

    def sincere_flow(self):
        self.post('sincere_pending', '甲六待人工', 'sincere_post', False)
        self.post('sincere_manual', '甲六乙', 'sincere_post', False)
        row = REPORT['records']['sincere_manual']
        self.call('PUT', '/admin/community/posts/' + str(row['id']) + '/audit',
            {'auditStatus': 'APPROVED', 'auditRemark': PREFIX + ' 人工流程验收'}, self.admin)
        detail = self.call('GET', '/admin/community/posts/' + str(row['id']), token=self.admin)
        owner = self.call('GET', '/miniapp/community/posts/' + row['postNo'], token=self.mini)
        assert detail['status'] == owner['status'] == 'published'
        assert len(detail.get('auditLogs', [])) >= 2
        row['status'] = detail['status']; row['auditLogs'] = detail['auditLogs']
        return {'pendingRecord': REPORT['records']['sincere_pending']['postNo'], 'approvedRecord': row['postNo']}

    def ensure_host(self):
        assert self.host, 'real host submission unavailable'
        detail = self.call('GET', '/admin/community/posts/' + str(self.host['id']), token=self.admin)
        if detail['status'] == 'pending_manual':
            self.call('PUT', '/admin/community/posts/' + str(self.host['id']) + '/audit',
                {'auditStatus': 'APPROVED', 'auditRemark': PREFIX + ' 正常内容人工审核，用于评论链路验收'}, self.admin)
            self.host['manualHostPreparation'] = True; save()
        detail = self.call('GET', '/admin/community/posts/' + str(self.host['id']), token=self.admin)
        assert detail['status'] == 'published', 'test host is not commentable'
        return detail

    def comment(self, key, label, hit, parent=None):
        before = self.ensure_host()
        content = self.content(label, hit)
        body = {'postId': self.host['postNo'], 'content': content}
        if parent: body.update(parentCommentId=parent, replyUserId=self.user)
        receipt = self.call('POST', '/miniapp/community/comments', body, self.mini)
        self.private_receipt(receipt)
        record_id = receipt['commentId']
        detail = self.call('GET', '/admin/community/comments/' + str(record_id), token=self.admin)
        data = {'id': record_id, 'type': 'comment', 'label': label, 'content': content,
                'commentNo': receipt['commentNo'], 'postNo': self.host['postNo'],
                'receipt': receipt, 'status': detail['status'], 'machineResult': detail.get('machineResult'),
                'auditLogs': detail.get('auditLogs', [])}
        REPORT['records'][key] = data; save()
        after = self.call('GET', '/admin/community/posts/' + str(self.host['id']), token=self.admin)
        public = self.call('GET', '/miniapp/community/posts/' + self.host['postNo'] + '/comments?page=1&size=100', token=self.mini)
        ids = {r['id'] for r in public['records']}
        if hit:
            assert receipt['status'] == 'rejected' and record_id not in ids
            assert after['commentCount'] == before['commentCount']
            assert any(a.get('machineEvidence', {}).get('source') == 'local-sensitive-word'
                       for a in detail['auditLogs'] if a.get('machineEvidence'))
        else:
            assert receipt['status'] == 'published' and record_id in ids
            assert after['commentCount'] == before['commentCount'] + 1
            assert detail['machineResult'] == 'pass'
        return {'recordId': record_id, 'commentNo': receipt['commentNo'], 'status': receipt['status'],
                'commentCountBefore': before['commentCount'], 'commentCountAfter': after['commentCount']}

    def normal_comments(self):
        self.comment('comment_pass', '甲八评论', False)
        parent = REPORT['records']['comment_pass']['id']
        return self.comment('comment_reply', '甲八回复', False, parent)


def main():
    global REPORT
    if OUT.exists():
        if '--resume' not in sys.argv: raise RuntimeError('Retained report exists; inspect it and use --resume to continue failed cases')
        REPORT = json.loads(OUT.read_text(encoding='utf-8'))
        REPORT.setdefault('previousAttempts', []).append({'cases': REPORT['cases'], 'reason': 'Resume inspected incomplete cases; reuse already-created records'})
    flow = RealFlow()
    try:
        flow.login()
        flow.host = REPORT['records'].get('host')
        case('E2E-01', lambda: flow.text('introduction_hit', '甲一自我介绍', True))
        case('E2E-02', lambda: flow.text('qa_hit', '甲二关于我', True, 'meetingPreference'))
        case('E2E-03', lambda: flow.post('post_hit', '甲三普通动态', 'community_post', True))
        case('E2E-04', lambda: flow.post('sincere_hit', '甲四诚意贴', 'sincere_post', True))
        case('E2E-05', lambda: flow.post('host', '甲五正常内容', 'community_post', False))
        case('E2E-06', flow.sincere_flow)
        case('E2E-07', lambda: flow.comment('comment_hit', '甲七评论', True))
        case('E2E-08', flow.normal_comments)
        case('E2E-09', lambda: flow.text('qa_pass', '甲九正常问答', False, 'preferredActivities'))
        REPORT['passed'] = sum(c['result'] == 'PASS' for c in REPORT['cases'])
        REPORT['failed'] = sum(c['result'] == 'FAIL' for c in REPORT['cases'])
        save()
        print(json.dumps({'passed': REPORT['passed'], 'failed': REPORT['failed'],
                          'retainedRecords': len(REPORT['records'])}, ensure_ascii=False), flush=True)
        return 0 if REPORT['failed'] == 0 else 1
    finally: flow.db.close()

if __name__ == '__main__': raise SystemExit(main())
