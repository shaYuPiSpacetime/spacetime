#!/usr/bin/env bash
set -euo pipefail
# 仅用于当前 mock 环境及已经确认存在的手机号账号；不会自动切换运行模式。
# API_URL、TEST_PHONE 从私有运行环境传入，禁止开启 shell xtrace。
python3 - <<'PY'
import json
import os
import urllib.error
import urllib.request

base = os.environ['API_URL'].rstrip('/')
phone = os.environ['TEST_PHONE']

def post(path, body):
    request = urllib.request.Request(base + path, data=json.dumps(body).encode(),
                                     headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        return json.load(error)

sent = post('/miniapp/auth/sms-code', {'phone': phone})
assert sent.get('code') == 200, '获取验证码失败或受频控限制'
assert sent['data'].get('providerCode') == 'FIXED', '当前不是 mock 模式，停止固定码验证'
body = {'phone': phone, 'smsCode': '0000', 'agreeProtocol': True}
login = post('/miniapp/auth/phone-login', body)
assert login.get('code') == 200, '固定码登录失败'
assert login['data'].get('isNewUser') is False, '必须使用已确认存在的账号'
assert login['data'].get('token'), '登录未返回会话'
replay = post('/miniapp/auth/phone-login', body)
assert replay.get('code') != 200 and 'AUTH_SMS_INVALID' in (replay.get('msg') or ''), '验证码未正确消费'
print(json.dumps({'result': 'passed', 'providerCode': 'FIXED',
                  'maskedPhone': login['data'].get('maskedPhone'),
                  'existingAccount': True, 'loginSucceeded': True, 'replayRejected': True}, ensure_ascii=False))
PY
