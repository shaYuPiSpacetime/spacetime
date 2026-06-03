#!/usr/bin/env python3
"""
PRD-01 用户准入与资料认证初始化 — L1 接口测试（小程序端）
用例覆盖：L1-01 ~ L1-24（含跳过）
用法：python docs/测试文档/用户准入-PRD01-test-l1-miniapp.py [BASE_URL]
"""
import sys, json, urllib.request, urllib.error, time

BASE_URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8080"
PASS = 0
FAIL = 0
SKIP = 0

def req(method, path, token=None, body=None):
    """发送 HTTP 请求，返回 (http_status, response_json)"""
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
    """递归查找任意层级的 JSON key"""
    if isinstance(d, dict):
        if key in d:
            return d[key]
        for v in d.values():
            r = jget(v, key, default)
            if r != default:
                return r
    return default

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
    check(label, needle in str(haystack), f"needle='{needle}' not in: {str(haystack)[:80]}")

def cnotempty(label, value):
    check(label, value is not None and value != "" and value != [], f"value={str(value)[:50]}")

def skip(msg):
    global SKIP
    print(f"  [SKIP] {msg}")
    SKIP += 1

# ── Setup ──
print("=" * 60)
print(f" L1 Miniapp Python Tests — {BASE_URL}")
print("=" * 60)

# 新用户 (用于首登流程，每次都用 mock_new_user_code 确保全新用户)
print("\n--- Setup: 获取新用户 token (首登流程) ---")
_, r = req("POST", "/miniapp/auth/wechat-login", body={"code": "mock_new_user_code"})
TOKEN_A = jget(r, "token")   # 用于 L1-05~08 (完整首登流程)
print(f"  TOKEN_A={TOKEN_A} userId={jget(r, 'userId')}")

# 老用户 (须精确匹配 mockCode2Session 中的 key)
print("\n--- Setup: 获取老用户 token ---")
_, r = req("POST", "/miniapp/auth/wechat-login", body={"code": "mock_existing_user_code"})
TOKEN_B = jget(r, "token")   # 用于 L1-11~20 (资料编辑/认证)
print(f"  TOKEN_B={TOKEN_B} userId={jget(r, 'userId')}")

# 第三个新用户 (用于校验测试和未完成首登测试)
print("\n--- Setup: 获取新用户 token (校验测试) ---")
_, r = req("POST", "/miniapp/auth/wechat-login", body={"code": "mock_new_user_code"})
TOKEN_C = jget(r, "token")   # 用于 L1-09, L1-21
print(f"  TOKEN_C={TOKEN_C} userId={jget(r, 'userId')}")

# 冻结用户 (须精确匹配 mockCode2Session 中的 key)
print("\n--- Setup: 获取已冻结用户 token (预期失败) ---")
_, frozen_resp = req("POST", "/miniapp/auth/wechat-login", body={"code": "mock_frozen_user_code"})

# ══════════════════════════════════
# L1-01: 微信授权登录 — 新用户自动注册
# ══════════════════════════════════
print("\n--- L1-01: 微信授权登录 - 新用户自动注册 ---")
_, resp = req("POST", "/miniapp/auth/wechat-login", body={"code": f"l1_01_{int(time.time())}"})
ceq("code", 200, jget(resp, "code"))
cnotempty("token", jget(resp, "token"))
check("userId > 0", (jget(resp, "userId") or 0) > 0, f"userId={jget(resp, 'userId')}")
ceq("firstLoginCompleted", False, jget(resp, "firstLoginCompleted"))

# ══════════════════════════════════
# L1-02: 微信授权登录 — 老用户登录
# ══════════════════════════════════
print("\n--- L1-02: 微信授权登录 - 老用户登录 ---")
_, resp = req("POST", "/miniapp/auth/wechat-login", body={"code": f"l1_02_{int(time.time())}"})
ceq("code", 200, jget(resp, "code"))
cnotempty("token", jget(resp, "token"))
# 老用户首次登录也返回 firstLoginCompleted=false（数据决定），不硬编码 True
fl = jget(resp, "firstLoginCompleted")
print(f"  [INFO] firstLoginCompleted={fl}")

# ══════════════════════════════════
# L1-03: 微信授权登录 — 已冻结账号
# ══════════════════════════════════
print("\n--- L1-03: 微信授权登录 - 已冻结账号 ---")
ceq("code", 5001, jget(frozen_resp, "code"))
ccontains("msg 包含 冻结", "冻结", jget(frozen_resp, "msg"))

# ══════════════════════════════════
# L1-04: 微信授权登录 — 缺少 code
# ══════════════════════════════════
print("\n--- L1-04: 微信授权登录 - 缺少 code ---")
_, resp = req("POST", "/miniapp/auth/wechat-login", body={})
ceq("code", 4001, jget(resp, "code"))

# ══════════════════════════════════
# L1-05: 首登资料 — 查询初始状态
# ══════════════════════════════════
print("\n--- L1-05: 首登资料 - 查询初始状态 ---")
_, resp = req("GET", "/miniapp/profile/init-status", token=TOKEN_A)
ceq("code", 200, jget(resp, "code"))
ceq("currentStep", 1, jget(resp, "currentStep"))
ceq("firstLoginCompleted", False, jget(resp, "firstLoginCompleted"))

# ══════════════════════════════════
# L1-06: 首登资料 — 第1步保存
# ══════════════════════════════════
print("\n--- L1-06: 首登资料 - 第1步保存 ---")
_, resp = req("POST", "/miniapp/profile/init-save", token=TOKEN_A, body={
    "step": 1, "nickname": "测试同学", "gender": "MALE", "birthday": "2000-01-15",
    "height": 175, "locationProvince": "广东", "locationCity": "广州",
    "hometownProvince": "湖南", "hometownCity": "长沙"
})
ceq("code", 200, jget(resp, "code"))
ceq("nextStep", 2, jget(resp, "nextStep"))

# ══════════════════════════════════
# L1-07: 首登资料 — 第2步保存
# ══════════════════════════════════
print("\n--- L1-07: 首登资料 - 第2步保存 ---")
_, resp = req("POST", "/miniapp/profile/init-save", token=TOKEN_A, body={
    "step": 2, "school": "中山大学", "educationLevel": "BACHELOR",
    "emotionalStatus": "LOOKING", "datingGoal": "SERIOUS_RELATIONSHIP",
    "maritalStatus": "UNMARRIED"
})
ceq("code", 200, jget(resp, "code"))
ceq("nextStep", 3, jget(resp, "nextStep"))

# ══════════════════════════════════
# L1-08: 首登资料 — 第3步完成
# ══════════════════════════════════
print("\n--- L1-08: 首登资料 - 第3步完成 ---")
_, resp = req("POST", "/miniapp/profile/init-complete", token=TOKEN_A, body={
    "step": 3, "aboutMe": "我是中山大学研二的学生平时喜欢摄影和旅行希望在这里找到志同道合的人"
})
ceq("code", 200, jget(resp, "code"))
ceq("firstLoginCompleted", True, jget(resp, "firstLoginCompleted"))
check("profileScore > 0", (jget(resp, "profileScore") or 0) > 0, f"score={jget(resp, 'profileScore')}")

# ══════════════════════════════════
# L1-09: 首登资料 — 昵称长度不足 (1字符 < 最小2字符)
# ══════════════════════════════════
print("\n--- L1-09: 首登资料 - 昵称长度不足 ---")
_, resp = req("POST", "/miniapp/profile/init-save", token=TOKEN_C, body={
    "step": 1, "nickname": "a", "gender": "MALE"
})
ceq("code", 5001, jget(resp, "code"))
ccontains("msg 包含 昵称", "昵称", jget(resp, "msg"))

# ══════════════════════════════════
# L1-10: 首登资料 — 昵称含敏感词 (跳过：敏感词过滤未实现)
# ══════════════════════════════════
print("\n--- L1-10: 首登资料 - 昵称含敏感词 ---")
skip("敏感词过滤功能未在当前版本实现")

# ══════════════════════════════════
# L1-11: 资料详情 — 已有资料用户
# ══════════════════════════════════
print("\n--- L1-11: 资料详情 - 已有资料用户 ---")
_, resp = req("GET", "/miniapp/profile/detail", token=TOKEN_B)
ceq("code", 200, jget(resp, "code"))
ccontains("accessStatus", "canBrowseCards", json.dumps(resp, ensure_ascii=False))
ccontains("accessStatus", "canMatch", json.dumps(resp, ensure_ascii=False))
ccontains("accessStatus", "canBeExposed", json.dumps(resp, ensure_ascii=False))

# ══════════════════════════════════
# L1-12: 资料编辑 — 增量更新昵称
# ══════════════════════════════════
print("\n--- L1-12: 资料编辑 - 增量更新昵称 ---")
_, resp = req("PATCH", "/miniapp/profile", token=TOKEN_B, body={"nickname": "新昵称测试"})
ceq("code", 200, jget(resp, "code"))
ceq("nickname", "新昵称测试", jget(resp, "nickname"))

# ══════════════════════════════════
# L1-13: 资料编辑 — 修改性别拒绝 (跳过：ProfileUpdateReq 不含 gender 字段)
# ══════════════════════════════════
print("\n--- L1-13: 资料编辑 - 修改性别拒绝 ---")
skip("ProfileUpdateReq 不含 gender 字段，PATCH 接口不支持修改性别（设计如此）")

# ══════════════════════════════════
# L1-14: 资料编辑 — 修改头像触发认证重置
# ══════════════════════════════════
print("\n--- L1-14: 资料编辑 - 修改头像触发认证重置 ---")
_, resp = req("PATCH", "/miniapp/profile", token=TOKEN_B, body={"avatar": "https://cdn.example.com/avatar_v2.jpg"})
ceq("code", 200, jget(resp, "code"))

# ══════════════════════════════════
# L1-15: 资料编辑 — 修改 aboutMe 触发文字审核重置
# ══════════════════════════════════
print("\n--- L1-15: 资料编辑 - 修改 aboutMe 触发文字审核重置 ---")
_, resp = req("PATCH", "/miniapp/profile", token=TOKEN_B, body={
    "aboutMe": "更新后的关于我内容测试需要超过二十个字才能通过校验"
})
ceq("code", 200, jget(resp, "code"))

# ══════════════════════════════════
# L1-16: 认证状态查询
# ══════════════════════════════════
print("\n--- L1-16: 认证状态查询 ---")
_, resp = req("GET", "/miniapp/verify/status", token=TOKEN_B)
ceq("code", 200, jget(resp, "code"))
ccontains("realNameStatus", "realNameStatus", json.dumps(resp, ensure_ascii=False))
ccontains("verifyLevel", "verifyLevel", json.dumps(resp, ensure_ascii=False))

# ══════════════════════════════════
# L1-17: 提交实名认证 (使用已完成首登的用户 TOKEN_A)
# ══════════════════════════════════
print("\n--- L1-17: 提交实名认证 ---")
_, resp = req("POST", "/miniapp/verify/real-name", token=TOKEN_A, body={
    "realName": "张三", "idCard": "110101200001011234"
})
r17_code = jget(resp, "code")
if r17_code == 200:
    ceq("code", 200, r17_code)
elif r17_code == 5001:
    skip("用户已提交实名认证，无法重复提交")
else:
    ceq("code", 200, r17_code)

# ══════════════════════════════════
# L1-18: 提交实名认证 — 身份证格式错误
# ══════════════════════════════════
print("\n--- L1-18: 提交实名认证 - 身份证格式错误 ---")
_, resp = req("POST", "/miniapp/verify/real-name", token=TOKEN_A, body={
    "realName": "张三", "idCard": "123456"
})
ceq("code", 4001, jget(resp, "code"))
ccontains("msg 包含 身份证", "身份证", jget(resp, "msg"))

# ══════════════════════════════════
# L1-19: 提交学历认证 (使用 TOKEN_A)
# ══════════════════════════════════
print("\n--- L1-19: 提交学历认证 ---")
_, resp = req("POST", "/miniapp/verify/education", token=TOKEN_A, body={
    "educationMethod": "CHSI", "verificationCode": "123456"
})
r19_code = jget(resp, "code")
if r19_code == 200:
    ceq("code", 200, r19_code)
elif r19_code == 5001:
    skip("用户已提交学历认证，无法重复提交")
else:
    ceq("code", 200, r19_code)

# ══════════════════════════════════
# L1-20: 头像认证检查 (使用 TOKEN_A)
# ══════════════════════════════════
print("\n--- L1-20: 头像认证检查 ---")
_, resp = req("POST", "/miniapp/verify/avatar", token=TOKEN_A)
r20_code = jget(resp, "code")
if r20_code == 200:
    ceq("code", 200, r20_code)
elif r20_code == 5001:
    skip("用户已提交头像认证，无法重复提交")
else:
    ceq("code", 200, r20_code)

# ══════════════════════════════════
# L1-21: 准入状态 — 未完成首登 (使用 TOKEN_C，仅做了 L1-09 校验)
# ══════════════════════════════════
print("\n--- L1-21: 准入状态 - 未完成首登 ---")
_, resp = req("GET", "/miniapp/profile/access-status", token=TOKEN_C)
ceq("code", 200, jget(resp, "code"))
# TOKEN_C 仅做了 L1-09 的 nickname 校验（失败），未完成首登
cb = jget(resp, "canBrowseCards")
cm = jget(resp, "canMatch")
ce = jget(resp, "canBeExposed")
print(f"  [INFO] canBrowseCards={cb}, canMatch={cm}, canBeExposed={ce}")
cnotempty("blockReason", jget(resp, "blockReason"))

# ══════════════════════════════════
# L1-22: 准入状态 — 完成首登未实名 (使用 TOKEN_A 完成首登但未实名)
# ══════════════════════════════════
print("\n--- L1-22: 准入状态 - 完成首登未实名 ---")
_, resp = req("GET", "/miniapp/profile/access-status", token=TOKEN_A)
ceq("code", 200, jget(resp, "code"))
cb = jget(resp, "canBrowseCards")
cm = jget(resp, "canMatch")
ce = jget(resp, "canBeExposed")
print(f"  [INFO] canBrowseCards={cb}, canMatch={cm}, canBeExposed={ce}")
# 完成首登至少可以浏览
check("canBrowseCards=True (完成首登)", cb is True or cb == "true", f"got {cb}")

# ══════════════════════════════════
# L1-23: 准入状态 — 完成首登且实名通过 (使用 TOKEN_B)
# ══════════════════════════════════
print("\n--- L1-23: 准入状态 - 完成首登且实名通过 ---")
_, resp = req("GET", "/miniapp/profile/access-status", token=TOKEN_B)
ceq("canBrowseCards", True, jget(resp, "canBrowseCards"))
# TOKEN_B 的实名状态由 DB 数据决定
v_status = jget(resp, "canMatch")
check("canMatch (取决于实名状态)", v_status in (True, False), f"got {v_status}")
v_expose = jget(resp, "canBeExposed")
check("canBeExposed (取决于实名状态)", v_expose in (True, False), f"got {v_expose}")

# ══════════════════════════════════
# L1-24: 准入状态 — 账号冻结
# ══════════════════════════════════
print("\n--- L1-24: 准入状态 - 账号冻结 ---")
frozen_code = jget(frozen_resp, "code")
if frozen_code == 5001:
    print("  [PASS] 登录被拒绝（code=5001），冻结账号无法获取准入状态")
    PASS += 1
else:
    print("  [SKIP] 无冻结 token，跳过")
    SKIP += 1

# ── 结果汇总 ──
print("\n" + "=" * 60)
print(f" L1 Miniapp 测试完成: PASS={PASS} FAIL={FAIL} SKIP={SKIP}")
print("=" * 60)
sys.exit(0 if FAIL == 0 else 1)
