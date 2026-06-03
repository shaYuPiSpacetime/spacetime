#!/usr/bin/env python3
"""
为 peter 添加 verify:* 和 moderation:* 权限
通过 admin API 创建菜单+绑定角色
"""
import sys, json, urllib.request, urllib.error

BASE_URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8080"

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

# 1. Login
print("=== 1. Admin Login ===")
_, login = req("POST", "/admin/login", body={"account": "peter", "password": "000000"})
TOKEN = jget(login, "token")
print(f"  token={TOKEN}")

# 2. Get all roles
print("\n=== 2. List Roles ===")
_, roles_resp = req("GET", "/admin/role/all", token=TOKEN)
roles = jget(roles_resp, "data") or roles_resp
if isinstance(roles, dict):
    roles = roles.get("records") or []
role_id = None
if isinstance(roles, list):
    for r in roles:
        print(f"  role: id={r.get('id')}, name={r.get('roleName')}")
        if r.get('roleName') == 'admin' or r.get('roleKey') == 'admin':
            role_id = r.get('id')
if not role_id and isinstance(roles, list) and roles:
    role_id = roles[0].get('id')
print(f"  using role_id={role_id}")

# 3. Create menu entries
perms_to_create = [
    ("verify:realname:list", "实名认证审核列表", 1),
    ("verify:education:list", "学历认证审核列表", 2),
    ("verify:avatar:list", "头像认证审核列表", 3),
    ("verify:realname:audit", "实名认证审核操作", 4),
    ("verify:education:audit", "学历认证审核操作", 5),
    ("verify:avatar:audit", "头像认证审核操作", 6),
    ("moderation:photo:list", "资料照片审核列表", 7),
    ("moderation:text:list", "文字内容审核列表", 8),
    ("moderation:photo:audit", "资料照片审核操作", 9),
    ("moderation:text:audit", "文字内容审核操作", 10),
]

print("\n=== 3. Create Menu Entries ===")
new_menu_ids = []
for perms, name, sort in perms_to_create:
    body = {
        "menuName": name,
        "menuType": "F",
        "perms": perms,
        "menuSort": sort,
        "status": "ENABLED",
        "visible": 1,
    }
    code, resp = req("POST", "/admin/menu", token=TOKEN, body=body)
    menu_id = jget(resp, "data")
    print(f"  [{code}] {perms} -> id={menu_id}")
    if menu_id:
        new_menu_ids.append(menu_id)

# 4. Also query existing menu list to make sure we have all IDs
print("\n=== 4. Query existing menus for verify/moderation ===")
_, menu_list = req("GET", "/admin/menu/list", token=TOKEN)
all_menus = jget(menu_list, "data") or []
existing_verify_ids = []
for m in all_menus:
    p = m.get('perms', '')
    if p.startswith('verify:') or p.startswith('moderation:'):
        existing_verify_ids.append(m['id'])
        print(f"  existing: id={m['id']} perms={p} name={m.get('menuName')}")

# Combine all IDs
all_ids = list(set(new_menu_ids + existing_verify_ids))
print(f"\n  total menu IDs to bind: {all_ids}")

# 5. Get current role's menu bindings
print("\n=== 5. Get current role menu bindings ===")
_, role_detail = req("GET", f"/admin/role/{role_id}", token=TOKEN)
detail = jget(role_detail, "data") or role_detail
current_menu_ids = detail.get('menuIds', []) if isinstance(detail, dict) else []
print(f"  current menu IDs: {len(current_menu_ids)} entries")

# Merge existing with new
merged_ids = list(set(current_menu_ids + all_ids))
print(f"  merged menu IDs: {len(merged_ids)} entries")

# 6. Bind menus to role
print("\n=== 6. Bind Menus to Role ===")
code, bind_resp = req("PUT", f"/admin/role/{role_id}/menus", token=TOKEN, body={
    "menuIds": merged_ids
})
print(f"  result: code={code}, resp={json.dumps(bind_resp, ensure_ascii=False)[:200]}")

# 7. Verify - re-login to check permissions
print("\n=== 7. Verify - Re-login ===")
_, new_login = req("POST", "/admin/login", body={"account": "peter", "password": "000000"})
new_perms = jget(new_login, "permissions") or []
has_verify = any("verify:" in p for p in new_perms)
has_mod = any("moderation:" in p for p in new_perms)
print(f"  has verify:* = {has_verify}")
print(f"  has moderation:* = {has_mod}")
for p in sorted(new_perms):
    if 'verify:' in p or 'moderation:' in p:
        print(f"    {p}")

if has_verify and has_mod:
    print("\n=== SUCCESS: Permissions added! ===")
else:
    print("\n=== WARNING: Some permissions missing ===")
    sys.exit(1)
