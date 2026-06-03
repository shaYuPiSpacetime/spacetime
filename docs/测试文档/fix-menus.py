#!/usr/bin/env python3
"""
修复管理后台菜单问题：
1. 修复 "App用户管理" path 从 /users/app 改为 /customers
2. 创建缺失的 verify/moderation 目录(M)和菜单(C)条目
3. 将所有菜单绑定到 peter 的角色(role_id=1)
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
print("=== 1. Login as peter ===")
_, login = req("POST", "/admin/login", body={"account": "peter", "password": "000000"})
TOKEN = jget(login, "token")
print(f"  token={TOKEN}")

# 2. Query current menu tree to see what exists
print("\n=== 2. Current Menu List ===")
_, menu_list = req("GET", "/admin/menu/list", token=TOKEN)
menus = jget(menu_list, "data") or []
existing = {}  # menuName -> menu
for m in menus:
    existing[m.get('menuName')] = m
    print(f"  id={m['id']} type={m.get('menuType')} name={m.get('menuName')} path={m.get('path')} perms={m.get('perms')} parentId={m.get('parentId')}")

# 3. Fix "App用户管理" path
print("\n=== 3. Fix 'App用户管理' path ===")
app_user_menu = existing.get('App用户管理')
if app_user_menu:
    old_path = app_user_menu.get('path')
    if old_path == '/users/app':
        code, resp = req("PUT", f"/admin/menu/{app_user_menu['id']}", token=TOKEN, body={
            "menuName": "App用户管理",
            "menuType": "C",
            "path": "/customers",
            "component": "users/AppUserManagement",
            "perms": "user:app:list",
            "menuSort": 1,
            "status": "ENABLED",
            "visible": 1,
        })
        print(f"  Updated path: /users/app -> /customers, code={code}")
    else:
        print(f"  Path already correct: {old_path}")
else:
    print("  [WARN] 'App用户管理' not found in menu list!")

# 4. Create missing directory (M) and menu (C) entries
print("\n=== 4. Create Missing Menu Entries ===")

# Define the full structure needed
# Format: (menuName, menuType, parentName, path, component, perms, icon, sort)
needed_menus = [
    # Directories
    ("用户准入", "M", None, "", "", "", "UserCheck", 50),
    ("认证审核", "M", None, "", "", "", "Shield", 60),
    ("内容审核", "M", None, "", "", "", "ShieldAlert", 70),
    # Menus under 用户准入
    ("App用户管理", "C", "用户准入", "/customers", "users/AppUserManagement", "user:app:list", "", 1),
    # Menus under 认证审核
    ("实名认证审核", "C", "认证审核", "/verify/real-name", "verify/VerificationManagementPage", "verify:realname:list", "", 1),
    ("学历认证审核", "C", "认证审核", "/verify/education", "verify/VerificationManagementPage", "verify:education:list", "", 2),
    ("头像认证审核", "C", "认证审核", "/verify/avatar", "verify/VerificationManagementPage", "verify:avatar:list", "", 3),
    # Menus under 内容审核
    ("资料照片审核", "C", "内容审核", "/moderation/photos", "moderation/ModerationPage", "moderation:photo:list", "", 1),
    ("文字内容审核", "C", "内容审核", "/moderation/texts", "moderation/ModerationPage", "moderation:text:list", "", 2),
    # Buttons (F) for verify
    ("实名审核", "F", "实名认证审核", "", "", "verify:realname:audit", "", 1),
    ("学历审核", "F", "认证审核", "", "", "verify:education:audit", "", 2),
    ("头像审核", "F", "头像认证审核", "", "", "verify:avatar:audit", "", 1),
    # Buttons (F) for moderation
    ("照片审核按钮", "F", "资料照片审核", "", "", "moderation:photo:audit", "", 1),
    ("文字审核按钮", "F", "文字内容审核", "", "", "moderation:text:audit", "", 1),
]

created_ids = {}
for menu_name, menu_type, parent_name, path, component, perms, icon, sort in needed_menus:
    if menu_name in existing:
        print(f"  [SKIP] Already exists: {menu_name} (id={existing[menu_name]['id']})")
        created_ids[menu_name] = existing[menu_name]['id']
        continue

    body = {
        "menuName": menu_name,
        "menuType": menu_type,
        "menuSort": sort,
        "status": "ENABLED",
        "visible": 1,
    }
    if path:
        body["path"] = path
    if component:
        body["component"] = component
    if perms:
        body["perms"] = perms
    if icon:
        body["icon"] = icon

    code, resp = req("POST", "/admin/menu", token=TOKEN, body=body)
    menu_id = jget(resp, "data")
    if menu_id:
        print(f"  [OK] Created: {menu_name} type={menu_type} id={menu_id}")
        created_ids[menu_name] = menu_id
    else:
        print(f"  [FAIL] {menu_name}: code={code} resp={json.dumps(resp, ensure_ascii=False)[:200]}")

# 5. Set parent_id relationships for newly created entries
print("\n=== 5. Set parent_id relationships ===")
# Re-fetch menu list to get updated IDs
_, menu_list = req("GET", "/admin/menu/list", token=TOKEN)
menus = jget(menu_list, "data") or []
menu_by_name = {m['menuName']: m for m in menus}

for menu_name, menu_type, parent_name, path, component, perms, icon, sort in needed_menus:
    if not parent_name:
        continue  # Directories have no parent

    menu = menu_by_name.get(menu_name)
    parent = menu_by_name.get(parent_name)
    if not menu or not parent:
        continue

    current_parent = menu.get('parentId')
    expected_parent = parent['id']

    if current_parent is None or current_parent == 0 or current_parent != expected_parent:
        body = {
            "menuName": menu_name,
            "menuType": menu_type,
            "parentId": expected_parent,
            "path": menu.get('path', ''),
            "component": menu.get('component', ''),
            "perms": menu.get('perms', ''),
            "icon": menu.get('icon', ''),
            "menuSort": menu.get('menuSort', 1),
            "status": "ENABLED",
            "visible": 1,
        }
        code, resp = req("PUT", f"/admin/menu/{menu['id']}", token=TOKEN, body=body)
        if code == 200:
            print(f"  [OK] Set {menu_name}.parentId = {expected_parent} ({parent_name})")
        else:
            print(f"  [FAIL] {menu_name}: code={code}")
    else:
        # Already correct, but might need path update
        if menu_type == "C" and menu.get('path') != path and path:
            body = {
                "menuName": menu_name,
                "menuType": menu_type,
                "parentId": current_parent,
                "path": path,
                "component": menu.get('component', ''),
                "perms": menu.get('perms', ''),
                "icon": menu.get('icon', ''),
                "menuSort": menu.get('menuSort', 1),
                "status": "ENABLED",
                "visible": 1,
            }
            code, resp = req("PUT", f"/admin/menu/{menu['id']}", token=TOKEN, body=body)
            print(f"  [OK] Updated {menu_name}.path = {path}")

# 6. Collect all menu IDs that need to be bound to role 1
print("\n=== 6. Bind all PRD-01 menus to role 1 ===")
_, menu_list = req("GET", "/admin/menu/list", token=TOKEN)
menus = jget(menu_list, "data") or []
prd01_menu_ids = []
for m in menus:
    perms = m.get('perms', '')
    name = m.get('menuName', '')
    if (perms and ('verify:' in perms or 'moderation:' in perms or 'user:app:' in perms)) or \
       name in ['用户准入', '认证审核', '内容审核', 'App用户管理', '实名认证审核', '学历认证审核', '头像认证审核', '资料照片审核', '文字内容审核']:
        prd01_menu_ids.append(m['id'])
        print(f"  Binding: id={m['id']} name={name} type={m.get('menuType')} perms={perms}")

print(f"\n  Total PRD-01 menu IDs: {prd01_menu_ids}")

# Get current role menus
_, role_detail = req("GET", "/admin/role/1", token=TOKEN)
detail = jget(role_detail, "data") or role_detail
current_menu_ids = detail.get('menuIds', []) if isinstance(detail, dict) else []

# Merge
merged = list(set(list(current_menu_ids) + prd01_menu_ids))
print(f"  Current role menus: {len(current_menu_ids)}")
print(f"  After merge: {len(merged)}")

# Bind
code, bind_resp = req("PUT", "/admin/role/1/menus", token=TOKEN, body={"menuIds": merged})
print(f"  Bind result: code={code}")

# 7. Verify — check routers
print("\n=== 7. Verify — GET /admin/routers ===")
_, routers = req("GET", "/admin/routers", token=TOKEN)
data = jget(routers, "data") or []

def print_tree(items, indent=0):
    for item in items:
        name = item.get('meta', {}).get('title', item.get('name', '?'))
        path = item.get('path', '')
        print(f"  {'  ' * indent}- {name} ({path})")
        children = item.get('children', [])
        if children:
            print_tree(children, indent + 1)

print_tree(data)

# Check specifically for the issues
has_customers = any(m.get('path') == '/customers' for m in menus)
has_verify_dir = any(m.get('menuName') == '认证审核' and m.get('menuType') == 'M' for m in menus)
has_moderation_dir = any(m.get('menuName') == '内容审核' and m.get('menuType') == 'M' for m in menus)

print(f"\n  'App用户管理' path=/customers: {has_customers} ✓" if has_customers else "\n  [WARN] 'App用户管理' path != /customers")
print(f"  '认证审核' directory exists: {has_verify_dir}")
print(f"  '内容审核' directory exists: {has_moderation_dir}")

# Check routers for verify/moderation
router_str = json.dumps(data, ensure_ascii=False)
has_verify_route = '/verify/' in router_str
has_moderation_route = '/moderation/' in router_str
print(f"  Router tree has /verify/ routes: {has_verify_route}")
print(f"  Router tree has /moderation/ routes: {has_moderation_route}")

if has_customers and has_verify_route and has_moderation_route:
    print("\n=== SUCCESS: All menu issues fixed! ===")
else:
    print("\n=== Some issues remain, check above output ===")
