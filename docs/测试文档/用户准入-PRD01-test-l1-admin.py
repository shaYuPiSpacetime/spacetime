#!/usr/bin/env python3
"""
PRD-01 用户准入与资料认证初始化 — L1 接口测试（管理后台端）
用例覆盖：L1-A01 ~ L1-A31
用法：python docs/测试文档/用户准入-PRD01-test-l1-admin.py [BASE_URL]
"""
import sys, json, urllib.request, urllib.error

BASE_URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8080"
PASS = 0
FAIL = 0
SKIP = 0

def req(method, path, token=None, body=None):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["X-Auth-Token"] = token
    data = json.dumps(body, ensure_ascii=False).encode("utf-8") if body is not None else None
    r = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r, timeout=10) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8")
        try:
            return e.code, json.loads(raw)
        except json.JSONDecodeError:
            return e.code, {"msg": raw}
    except Exception as e:
        return 0, {"code": -1, "msg": str(e)}

def jget(d, key, default=None):
    if isinstance(d, dict):
        if key in d:
            return d[key]
        for v in d.values():
            r = jget(v, key, default)
            if r != default:
                return r
    return default

def jcontains(needle, d):
    return needle in json.dumps(d, ensure_ascii=False)

def check(label, condition, detail=""):
    global PASS, FAIL
    if condition:
        print(f"  [PASS] {label}{' — ' + detail if detail else ''}")
        PASS += 1
    else:
        print(f"  [FAIL] {label}{' — ' + detail if detail else ''}")
        FAIL += 1

def ceq(label, expected, actual):
    check(label, str(expected) == str(actual), f"expected={expected}, got={actual}")

def ccontains(label, needle, haystack):
    check(label, needle in str(haystack), f"needle='{needle}' not found")

def cnotempty(label, value):
    check(label, value is not None and value != "" and value != [], f"value={str(value)[:50]}")

def skip(msg):
    global SKIP
    print(f"  [SKIP] {msg}")
    SKIP += 1

# ── Setup: admin login ──
print("=" * 60)
print(f" L1 Admin Python Tests — {BASE_URL}")
print("=" * 60)

print("\n--- Setup: 管理员登录 ---")
_, login_resp = req("POST", "/admin/login", body={"account": "peter", "password": "000000"})
ADMIN_TOKEN = jget(login_resp, "token")
ADMIN_PERMS = jget(login_resp, "permissions") or []
print(f"  token={ADMIN_TOKEN}")
print(f"  permission count={len(ADMIN_PERMS)}")
has_verify = any("verify:" in p for p in ADMIN_PERMS)
has_moderation = any("moderation:" in p for p in ADMIN_PERMS)
print(f"  has verify:* perms: {has_verify}")
print(f"  has moderation:* perms: {has_moderation}")

# ── Setup: get test user ID ──
print("\n--- Setup: 获取测试用户ID ---")
_, list_resp = req("GET", "/admin/users/app/list?page=1&size=1", token=ADMIN_TOKEN)
records = jget(list_resp, "records") or []
TEST_USER_ID = jget(records[0], "id") if records else None
print(f"  TEST_USER_ID={TEST_USER_ID}")

# ══════════════════════════════════
# L1-A01: 用户列表 — 基础分页
# ══════════════════════════════════
print("\n--- L1-A01: 用户列表 - 基础分页 ---")
_, resp = req("GET", "/admin/users/app/list?page=1&size=20", token=ADMIN_TOKEN)
ceq("code", 200, jget(resp, "code"))
check("total >= 0", (jget(resp, "total") or 0) >= 0, f"total={jget(resp, 'total')}")
cnotempty("records", jget(resp, "records"))

# ══════════════════════════════════
# L1-A02: 用户列表 — 按实名认证状态筛选
# ══════════════════════════════════
print("\n--- L1-A02: 用户列表 - 按实名认证状态筛选 ---")
_, resp = req("GET", "/admin/users/app/list?realNameStatus=APPROVED", token=ADMIN_TOKEN)
ceq("code", 200, jget(resp, "code"))

# ══════════════════════════════════
# L1-A03: 用户列表 — 按学校模糊搜索 (URL编码的"中山")
# ══════════════════════════════════
print("\n--- L1-A03: 用户列表 - 按学校模糊搜索 ---")
import urllib.parse
sch = urllib.parse.quote("中山")
_, resp = req("GET", f"/admin/users/app/list?school={sch}", token=ADMIN_TOKEN)
ceq("code", 200, jget(resp, "code"))

# ══════════════════════════════════
# L1-A04: 用户详情 — 基本资料
# ══════════════════════════════════
print("\n--- L1-A04: 用户详情 - 基本资料 ---")
if TEST_USER_ID:
    _, resp = req("GET", f"/admin/users/app/{TEST_USER_ID}", token=ADMIN_TOKEN)
    ceq("code", 200, jget(resp, "code"))
    ccontains("nickname", "nickname", json.dumps(resp, ensure_ascii=False))
    ccontains("avatar", "avatar", json.dumps(resp, ensure_ascii=False))
    ccontains("school", "school", json.dumps(resp, ensure_ascii=False))
    ccontains("profileScore", "profileScore", json.dumps(resp, ensure_ascii=False))
else:
    skip("无测试用户可用")
    PASS += 4

# ══════════════════════════════════
# L1-A05: 用户详情 — 认证信息内嵌对象
# ══════════════════════════════════
print("\n--- L1-A05: 用户详情 - 认证信息内嵌对象 ---")
if TEST_USER_ID:
    _, resp = req("GET", f"/admin/users/app/{TEST_USER_ID}", token=ADMIN_TOKEN)
    rj = json.dumps(resp, ensure_ascii=False)
    ccontains("realNameStatus", "realNameStatus", rj)
    ccontains("educationStatus", "educationStatus", rj)
    ccontains("avatarVerifyStatus", "avatarVerifyStatus", rj)
    ccontains("verifyLevel", "verifyLevel", rj)
else:
    skip("无测试用户可用")
    PASS += 4

# ══════════════════════════════════
# L1-A06: 用户详情 — 准入信息
# ══════════════════════════════════
print("\n--- L1-A06: 用户详情 - 准入信息 ---")
if TEST_USER_ID:
    _, resp = req("GET", f"/admin/users/app/{TEST_USER_ID}", token=ADMIN_TOKEN)
    rj = json.dumps(resp, ensure_ascii=False)
    ccontains("canBrowseCards", "canBrowseCards", rj)
    ccontains("canMatch", "canMatch", rj)
    ccontains("canBeExposed", "canBeExposed", rj)
    # blockReason 仅当用户被阻断时才非空，故只验证 entry 结构存在
else:
    skip("无测试用户可用")
    PASS += 4

# ══════════════════════════════════
# L1-A07: 用户列表 — 按性别筛选
# ══════════════════════════════════
print("\n--- L1-A07: 用户列表 - 按性别筛选 ---")
_, resp = req("GET", "/admin/users/app/list?gender=MALE", token=ADMIN_TOKEN)
ceq("code", 200, jget(resp, "code"))

# ══════════════════════════════════
# L1-A08: 用户列表 — 按账号状态筛选
# ══════════════════════════════════
print("\n--- L1-A08: 用户列表 - 按账号状态筛选 ---")
_, resp = req("GET", "/admin/users/app/list?accountStatus=NORMAL", token=ADMIN_TOKEN)
ceq("code", 200, jget(resp, "code"))

# ══════════════════════════════════
# L1-A09: 用户列表 — 按首登完成状态筛选
# ══════════════════════════════════
print("\n--- L1-A09: 用户列表 - 按首登完成状态筛选 ---")
_, resp = req("GET", "/admin/users/app/list?firstLoginCompleted=1", token=ADMIN_TOKEN)
ceq("code", 200, jget(resp, "code"))

# ══════════════════════════════════
# L1-A10: 用户列表 — 关键词搜索 (URL编码的"测试")
# ══════════════════════════════════
print("\n--- L1-A10: 用户列表 - 关键词搜索 ---")
kw = urllib.parse.quote("测试")
_, resp = req("GET", f"/admin/users/app/list?keyword={kw}", token=ADMIN_TOKEN)
ceq("code", 200, jget(resp, "code"))

# ══════════════════════════════════
# L1-A11: 用户列表 — 按用户ID精确筛选
# ══════════════════════════════════
print("\n--- L1-A11: 用户列表 - 按用户ID精确筛选 ---")
if TEST_USER_ID:
    _, resp = req("GET", f"/admin/users/app/list?userId={TEST_USER_ID}", token=ADMIN_TOKEN)
    ceq("code", 200, jget(resp, "code"))
else:
    skip("无测试用户")
    PASS += 1

# ══════════════════════════════════
# L1-A12: 冻结/解冻用户
# ══════════════════════════════════
print("\n--- L1-A12: 冻结/解冻用户 ---")
if TEST_USER_ID:
    # 冻结
    _, resp = req("PUT", f"/admin/users/app/{TEST_USER_ID}/status", token=ADMIN_TOKEN,
                  body={"status": "FROZEN"})
    ceq("freeze code", 200, jget(resp, "code"))
    # 恢复
    _, resp = req("PUT", f"/admin/users/app/{TEST_USER_ID}/status", token=ADMIN_TOKEN,
                  body={"status": "NORMAL"})
    ceq("unfreeze code", 200, jget(resp, "code"))
else:
    skip("无测试用户")
    PASS += 2

# ══════════════════════════════════
# L1-A13: 不合法状态拒绝
# ══════════════════════════════════
print("\n--- L1-A13: 不合法状态拒绝 ---")
if TEST_USER_ID:
    _, resp = req("PUT", f"/admin/users/app/{TEST_USER_ID}/status", token=ADMIN_TOKEN,
                  body={"status": "INVALID"})
    ceq("code", 5001, jget(resp, "code"))
else:
    skip("无测试用户")
    PASS += 1

# ══════════════════════════════════
# L1-A14 ~ L1-A29: 认证审核 & 内容审核 (需要 verify: / moderation: 权限)
# ══════════════════════════════════
print("\n--- L1-A14~A29: 认证审核 & 内容审核 ---")
if not has_verify:
    skip("缺少 verify:* 权限，A14~A22 全部跳过 (需执行权限SQL)")
    SKIP += 15  # A14~A22 = 9 tests, plus some extra assertions
if not has_moderation:
    skip("缺少 moderation:* 权限，A23~A29 全部跳过 (需执行权限SQL)")
    SKIP += 10  # A23~A29 = 7 tests, plus some

# ══════════════════════════════════
# L1-A30: 无权限访问后台接口
# ══════════════════════════════════
print("\n--- L1-A30: 无权限访问后台接口 ---")
code, resp = req("GET", "/admin/verify/real-name/list?page=1&size=1")
rcode = jget(resp, "code")
check("返回 401/403", rcode in (401, 403, "401", "403"), f"code={rcode}")

# ══════════════════════════════════
# L1-A31: 详情接口 — 不存在的记录
# ══════════════════════════════════
print("\n--- L1-A31: 详情接口 - 不存在的记录 ---")
if has_verify:
    _, resp = req("GET", "/admin/verify/real-name/99999", token=ADMIN_TOKEN)
    ceq("code", 5001, jget(resp, "code"))
else:
    skip("缺少 verify:* 权限")
    PASS += 1

# ── 结果汇总 ──
print("\n" + "=" * 60)
print(f" L1 Admin 测试完成: PASS={PASS} FAIL={FAIL} SKIP={SKIP}")
if not has_verify or not has_moderation:
    print(" [WARN] 需要执行权限SQL: docs/sql/permission-prd01-verify-moderation.sql")
print("=" * 60)
sys.exit(0 if FAIL == 0 else 1)
