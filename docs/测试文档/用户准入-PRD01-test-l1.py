#!/usr/bin/env python3
"""PRD-01 L1 API test — Python + requests, UTF-8 safe
Response: {"code":200,"msg":"success","data":{...}}
"""

import requests
import urllib.parse
import sys

BASE = "http://localhost:8080"
PASS = 0
FAIL = 0

def ok(name):
    global PASS
    print(f"  [PASS] {name}")
    PASS += 1

def fail(name, expected, got):
    global FAIL
    print(f"  [FAIL] {name}")
    print(f"         expected: {expected}")
    print(f"         got: {got}")
    FAIL += 1

def code_of(resp):
    return resp.json().get("code")

def data_of(resp):
    """Extract the 'data' dict from response"""
    return resp.json().get("data") or {}

# ============================================================
# Miniapp Auth
# ============================================================
print("=== Miniapp Auth ===")

print("L1-01: new user auto-register")
resp = requests.post(f"{BASE}/miniapp/auth/wechat-login",
                     json={"code": "mock_new_user_code"})
d = data_of(resp)
code = code_of(resp)
NEW_TOKEN = d.get("token")
NEW_USER_ID = d.get("userId")
first_login = d.get("firstLoginCompleted")
if code == 200 and NEW_TOKEN and NEW_USER_ID and NEW_USER_ID > 0 and first_login is False:
    ok("L1-01")
    print(f"       userId={NEW_USER_ID} firstLoginCompleted=false")
else:
    fail("L1-01", "code=200, token, userId>0, firstLoginCompleted=false",
         f"code={code} token={NEW_TOKEN} userId={NEW_USER_ID} flc={first_login}")

print("L1-02: existing user login")
resp = requests.post(f"{BASE}/miniapp/auth/wechat-login",
                     json={"code": "mock_existing_user_code"})
d = data_of(resp)
code = code_of(resp)
EXISTING_TOKEN = d.get("token")
EXISTING_USER_ID = d.get("userId")
first_login2 = d.get("firstLoginCompleted")
if code == 200 and EXISTING_TOKEN and first_login2 is True:
    ok("L1-02")
    print(f"       userId={EXISTING_USER_ID} firstLoginCompleted=true")
else:
    fail("L1-02", "code=200, firstLoginCompleted=true",
         f"code={code} flc={first_login2}")

print("L1-03: frozen user rejected")
resp = requests.post(f"{BASE}/miniapp/auth/wechat-login",
                     json={"code": "mock_frozen_user_code"})
if code_of(resp) != 200:
    ok("L1-03")
else:
    fail("L1-03", "status != 200", resp.text[:200])

print("L1-04: missing code rejected")
resp = requests.post(f"{BASE}/miniapp/auth/wechat-login", json={})
if code_of(resp) != 200:
    ok("L1-04")
else:
    fail("L1-04", "status != 200", resp.text[:200])

# ============================================================
# Profile Init
# ============================================================
print("=== Profile Init ===")

print("L1-05: init status (step=1)")
resp = requests.get(f"{BASE}/miniapp/profile/init-status",
                    headers={"X-Auth-Token": NEW_TOKEN})
d = data_of(resp)
code = code_of(resp)
step = d.get("currentStep")
if code == 200 and step == 1:
    ok("L1-05")
else:
    fail("L1-05", "code=200 currentStep=1", f"code={code} step={step}")

print("L1-06: step 1 save (UTF-8 Chinese)")
resp = requests.post(f"{BASE}/miniapp/profile/init-save",
    json={"step": 1, "nickname": "测试同学",
          "gender": "MALE", "birthday": "2000-01-15", "height": 175,
          "locationProvince": "广东",
          "locationCity": "广州",
          "hometownProvince": "湖南",
          "hometownCity": "长沙"},
    headers={"X-Auth-Token": NEW_TOKEN})
d = data_of(resp)
code = code_of(resp)
next_step = d.get("nextStep")
if code == 200 and next_step == 2:
    ok("L1-06")
else:
    fail("L1-06", "code=200 nextStep=2", f"code={code} nextStep={next_step} body={resp.text[:200]}")

print("L1-07: step 2 save")
resp = requests.post(f"{BASE}/miniapp/profile/init-save",
    json={"step": 2, "school": "中山大学",
          "educationLevel": "BACHELOR", "emotionalStatus": "LOOKING",
          "datingGoal": "SERIOUS_RELATIONSHIP", "maritalStatus": "UNMARRIED"},
    headers={"X-Auth-Token": NEW_TOKEN})
d = data_of(resp)
code = code_of(resp)
next_step = d.get("nextStep")
if code == 200 and next_step == 3:
    ok("L1-07")
else:
    fail("L1-07", "code=200 nextStep=3", f"code={code} nextStep={next_step} body={resp.text[:200]}")

print("L1-08: step 3 complete")
resp = requests.post(f"{BASE}/miniapp/profile/init-complete",
    json={"step": 3, "aboutMe": "我是中山大学研二的学生，平时喜欢摄影和旅行"},
    headers={"X-Auth-Token": NEW_TOKEN})
d = data_of(resp)
code = code_of(resp)
flc = d.get("firstLoginCompleted")
score = d.get("profileScore")
if code == 200 and flc == 1 and score and score > 0:
    ok("L1-08")
else:
    fail("L1-08", "code=200 firstLoginCompleted=1 profileScore>0",
         f"code={code} flc={flc} score={score} body={resp.text[:200]}")

print("L1-09: nickname min length 2 (valid)")
# Code: nickname.length() < 2 rejects; "ab" length=2 passes
# Need a fresh user since the main test user already completed init
resp = requests.post(f"{BASE}/miniapp/auth/wechat-login",
                     json={"code": "mock_new_user_nickname_test"})
d = data_of(resp)
tmp_token = d.get("token")
if not tmp_token:
    fail("L1-09", "got token", resp.text[:200])
else:
    resp = requests.post(f"{BASE}/miniapp/profile/init-save",
        json={"step": 1, "nickname": "ab", "gender": "MALE"},
        headers={"X-Auth-Token": tmp_token})
    code = code_of(resp)
    if code == 200:
        ok("L1-09")
    else:
        fail("L1-09", "code=200 (2 chars valid)", f"code={code}")

# ============================================================
# Profile Detail & Edit
# ============================================================
print("=== Profile Detail & Edit ===")

print("L1-11: profile detail")
resp = requests.get(f"{BASE}/miniapp/profile/detail",
                    headers={"X-Auth-Token": EXISTING_TOKEN})
if code_of(resp) == 200:
    ok("L1-11")
else:
    fail("L1-11", "code=200", f"code={code_of(resp)}")

print("L1-12: update nickname")
resp = requests.patch(f"{BASE}/miniapp/profile",
    json={"nickname": "新昵称测试"},
    headers={"X-Auth-Token": EXISTING_TOKEN})
if code_of(resp) == 200:
    ok("L1-12")
else:
    fail("L1-12", "code=200", resp.text[:200])

print("L1-13: gender field silently ignored (not in DTO)")
# ProfileUpdateReq has no 'gender' field; Jackson ignores unknown keys
resp = requests.patch(f"{BASE}/miniapp/profile",
    json={"gender": "FEMALE"},
    headers={"X-Auth-Token": EXISTING_TOKEN})
if code_of(resp) == 200:
    ok("L1-13")
else:
    fail("L1-13", "code=200", resp.text[:200])

# ============================================================
# Verification
# ============================================================
print("=== Verification ===")

print("L1-16: verification status")
resp = requests.get(f"{BASE}/miniapp/verify/status",
                    headers={"X-Auth-Token": EXISTING_TOKEN})
if code_of(resp) == 200:
    ok("L1-16")
else:
    fail("L1-16", "code=200", f"code={code_of(resp)}")

print("L1-17: submit real-name verification (dup=5001, else=200)")
resp = requests.post(f"{BASE}/miniapp/verify/real-name",
    json={"realName": "张三", "idCard": "110101200001011234"},
    headers={"X-Auth-Token": EXISTING_TOKEN})
c = code_of(resp)
if c == 200 or c == 5001:
    ok("L1-17")
else:
    fail("L1-17", "code=200 or 5001", resp.text[:200])

print("L1-18: invalid id card rejected")
resp = requests.post(f"{BASE}/miniapp/verify/real-name",
    json={"realName": "张三", "idCard": "123456"},
    headers={"X-Auth-Token": EXISTING_TOKEN})
if code_of(resp) != 200:
    ok("L1-18")
else:
    fail("L1-18", "status != 200", f"code={code_of(resp)}")

print("L1-19: education verify (dup=5001, else=200)")
resp = requests.post(f"{BASE}/miniapp/verify/education",
    json={"educationMethod": "CHSI", "verificationCode": "123456"},
    headers={"X-Auth-Token": EXISTING_TOKEN})
c = code_of(resp)
if c == 200 or c == 5001:
    ok("L1-19")
else:
    fail("L1-19", "code=200 or 5001", resp.text[:200])

print("L1-20: avatar verify (dup=5001, else=200)")
resp = requests.post(f"{BASE}/miniapp/verify/avatar",
    json={}, headers={"X-Auth-Token": EXISTING_TOKEN})
c = code_of(resp)
if c == 200 or c == 5001:
    ok("L1-20")
else:
    fail("L1-20", "code=200 or 5001", resp.text[:200])

# ============================================================
# Access Status
# ============================================================
print("=== Access Status ===")

print("L1-21: access status (new user, after init)")
resp = requests.get(f"{BASE}/miniapp/profile/access-status",
                    headers={"X-Auth-Token": NEW_TOKEN})
d = data_of(resp)
code = code_of(resp)
can_browse = d.get("canBrowseCards")
if code == 200 and can_browse is True:
    ok("L1-21")
else:
    fail("L1-21", "code=200 canBrowseCards=true",
         f"code={code} canBrowseCards={can_browse}")

print("L1-22: init complete + no real-name => browse=true, match=false")
# Create fresh user, complete init, check access
resp = requests.post(f"{BASE}/miniapp/auth/wechat-login",
                     json={"code": "mock_new_user_code_2"})
d = data_of(resp)
TOKEN_NR = d.get("token")
if not TOKEN_NR:
    fail("L1-22", "got token", resp.text[:200])
else:
    headers = {"X-Auth-Token": TOKEN_NR}
    requests.post(f"{BASE}/miniapp/profile/init-save",
        json={"step": 1, "nickname": "未实名用户",
              "gender": "MALE", "birthday": "1999-06-15", "height": 170},
        headers=headers)
    requests.post(f"{BASE}/miniapp/profile/init-save",
        json={"step": 2, "school": "北京大学",
              "educationLevel": "MASTER", "emotionalStatus": "LOOKING",
              "datingGoal": "SERIOUS_RELATIONSHIP", "maritalStatus": "UNMARRIED"},
        headers=headers)
    requests.post(f"{BASE}/miniapp/profile/init-complete",
        json={"step": 3}, headers=headers)
    resp = requests.get(f"{BASE}/miniapp/profile/access-status", headers=headers)
    d = data_of(resp)
    can_browse = d.get("canBrowseCards")
    can_match = d.get("canMatch")
    if can_browse is True and can_match is False:
        ok("L1-22")
    else:
        fail("L1-22", "canBrowseCards=true, canMatch=false",
             f"browse={can_browse} match={can_match}")

print("L1-23: init + real-name => browse=true, match=true, exposed=true")
resp = requests.get(f"{BASE}/miniapp/profile/access-status",
                    headers={"X-Auth-Token": EXISTING_TOKEN})
d = data_of(resp)
can_match = d.get("canMatch")
can_expose = d.get("canBeExposed")
if can_match is True and can_expose is True:
    ok("L1-23")
else:
    fail("L1-23", "canMatch=true, canBeExposed=true",
         f"match={can_match} expose={can_expose}")

# ============================================================
# Admin APIs
# ============================================================
print("=== Admin APIs ===")

resp = requests.post(f"{BASE}/admin/login",
                     json={"account": "peter", "password": "000000"})
ADMIN_TOKEN = data_of(resp).get("token")
if not ADMIN_TOKEN:
    print(f"  WARN: admin login failed, skipping admin tests. response={resp.text[:200]}")
else:
    h = {"X-Auth-Token": ADMIN_TOKEN}

    print("L1-A01: user list paging")
    resp = requests.get(f"{BASE}/admin/users/app/list?page=1&size=20", headers=h)
    if code_of(resp) == 200:
        ok("L1-A01")
    else:
        fail("L1-A01", "code=200", resp.text[:200])

    print("L1-A02: filter by realNameStatus")
    resp = requests.get(f"{BASE}/admin/users/app/list?realNameStatus=APPROVED", headers=h)
    if code_of(resp) == 200:
        ok("L1-A02")
    else:
        fail("L1-A02", "code=200", resp.text[:200])

    print("L1-A03: filter by school (URL-encoded Chinese)")
    resp = requests.get(
        f"{BASE}/admin/users/app/list?school={urllib.parse.quote('中山大学')}",
        headers=h)
    if code_of(resp) == 200:
        ok("L1-A03")
    else:
        fail("L1-A03", "code=200", resp.text[:200])

    print("L1-A04: user detail")
    resp = requests.get(f"{BASE}/admin/users/app/{NEW_USER_ID}", headers=h)
    if code_of(resp) == 200:
        ok("L1-A04")
    else:
        fail("L1-A04", "code=200", f"code={code_of(resp)} userId={NEW_USER_ID}")

    print("L1-A05: freeze user")
    resp = requests.put(f"{BASE}/admin/users/app/{NEW_USER_ID}/status",
                        json={"status": "FROZEN"}, headers=h)
    if code_of(resp) == 200:
        ok("L1-A05")
    else:
        fail("L1-A05", "code=200", resp.text[:200])

print()
print(f"=== Done: {PASS} passed, {FAIL} failed ===")
if FAIL > 0:
    sys.exit(1)
